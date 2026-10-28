import { analisarLayoutPlanilha, mensagemErroIA } from '../../utils/claude'
import { contextoDoUsuario } from '../../utils/contextoUsuario'
import type { SchemaModelo } from '~/types/modelo'

/** A amostra é montada no navegador (utils/layoutPlanilha.ts) e tem tamanho limitado por lá — isso aqui só barra abuso. */
const TAMANHO_MAXIMO_AMOSTRA = 80_000
/** Pedido vai com uma amostra de cada aba (até 4). */
const TAMANHO_MAXIMO_AMOSTRA_PEDIDO = 240_000
const TAMANHO_MAXIMO_INSTRUCOES = 2000
const MAXIMO_ABAS = 100

/**
 * POST /api/importacoes/layout — { modeloId, amostra, instrucoes?, abas? }
 * A IA lê uma amostra da planilha e devolve a "receita" de leitura pro template (onde estão os
 * títulos, que coluna é qual campo, o que ignorar). Template de dados: só admin, como o resto da
 * importação de dados. Template de pedido (o arquivo que a loja manda): quem pode incluir pedido,
 * e aí vêm também as `abas` do arquivo e a receita diz em qual está o pedido e onde está o cabeçalho.
 */
export default defineEventHandler(async (event) => {
  const { client, papel } = await contextoDoUsuario(event)
  const perfil = { papel }

  const corpo = await readBody<{ modeloId?: unknown; amostra?: unknown; instrucoes?: unknown; abas?: unknown }>(event)
  const modeloId = typeof corpo?.modeloId === 'string' ? corpo.modeloId : ''
  const amostra = typeof corpo?.amostra === 'string' ? corpo.amostra : ''
  const instrucoes = typeof corpo?.instrucoes === 'string' ? corpo.instrucoes : ''
  if (!modeloId || !amostra.trim()) throw createError({ statusCode: 400, statusMessage: 'Requisição inválida.' })
  if (instrucoes.length > TAMANHO_MAXIMO_INSTRUCOES) {
    throw createError({ statusCode: 413, statusMessage: 'As instruções estão longas demais — resuma em até 2 mil caracteres.' })
  }

  // a RLS já limita à empresa do usuário
  const { data: modelo, error: erroModelo } = await client
    .from('modelos')
    .select('id, schema, ativo')
    .eq('id', modeloId)
    .maybeSingle()
  if (erroModelo) throw createError({ statusCode: 500, statusMessage: erroModelo.message })
  if (!modelo || !modelo.ativo) throw createError({ statusCode: 404, statusMessage: 'Template não encontrado.' })

  const schema = modelo.schema as SchemaModelo
  // template antigo, sem destino, é de pedido (ver destinoDoModelo)
  const ehPedido = (schema?.destino ?? 'pedido') === 'pedido'

  if (perfil.papel !== 'admin') {
    if (!ehPedido) throw createError({ statusCode: 403, statusMessage: 'Só o administrador pode importar dados.' })
    const { data: podeIncluir, error: erroPermissao } = await client.rpc('tem_permissao', {
      p_modulo: 'pedidos',
      p_acao: 'incluir'
    })
    if (erroPermissao) throw createError({ statusCode: 500, statusMessage: erroPermissao.message })
    if (!podeIncluir) throw createError({ statusCode: 403, statusMessage: 'Sem permissão pra importar pedidos.' })
  }

  if (amostra.length > (ehPedido ? TAMANHO_MAXIMO_AMOSTRA_PEDIDO : TAMANHO_MAXIMO_AMOSTRA)) {
    throw createError({ statusCode: 413, statusMessage: 'Amostra da planilha grande demais.' })
  }

  const campos = schema?.campos_item ?? []
  if (!campos.length) throw createError({ statusCode: 422, statusMessage: 'O template não tem colunas de dados.' })

  let pedido: { abas: string[]; camposCabecalho: SchemaModelo['campos'] } | undefined
  if (ehPedido) {
    const abas = Array.isArray(corpo?.abas)
      ? corpo.abas.filter((a): a is string => typeof a === 'string' && !!a.trim()).slice(0, MAXIMO_ABAS)
      : []
    if (!abas.length) throw createError({ statusCode: 400, statusMessage: 'Requisição inválida.' })
    pedido = { abas, camposCabecalho: schema.campos ?? [] }
  }

  try {
    return await analisarLayoutPlanilha({ campos, amostra, dicas: schema.dicas?.geral, instrucoes, pedido })
  } catch (e) {
    throw createError({ statusCode: 502, statusMessage: mensagemErroIA(e, 'Falha ao analisar o layout da planilha.') })
  }
})
