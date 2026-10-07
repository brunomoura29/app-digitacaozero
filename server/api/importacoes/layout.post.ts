import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { analisarLayoutPlanilha, mensagemErroIA } from '../../utils/claude'
import type { SchemaModelo } from '~/types/modelo'

/** A amostra é montada no navegador (utils/layoutPlanilha.ts) e tem tamanho limitado por lá — isso aqui só barra abuso. */
const TAMANHO_MAXIMO_AMOSTRA = 80_000
const TAMANHO_MAXIMO_INSTRUCOES = 2000

/**
 * POST /api/importacoes/layout — { modeloId, amostra }
 * A IA lê uma amostra da planilha e devolve a "receita" de leitura pro template (onde estão os
 * títulos, que coluna é qual campo, o que ignorar). Só admin, como o resto da importação de dados.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const client = await serverSupabaseClient(event)
  const { data: perfil, error: erroPerfil } = await client
    .from('perfis')
    .select('empresa_id, papel')
    .eq('id', user.sub)
    .maybeSingle()
  if (erroPerfil) throw createError({ statusCode: 500, statusMessage: erroPerfil.message })
  if (!perfil || perfil.papel !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Só o administrador pode importar dados.' })
  }

  const corpo = await readBody<{ modeloId?: unknown; amostra?: unknown; instrucoes?: unknown }>(event)
  const modeloId = typeof corpo?.modeloId === 'string' ? corpo.modeloId : ''
  const amostra = typeof corpo?.amostra === 'string' ? corpo.amostra : ''
  const instrucoes = typeof corpo?.instrucoes === 'string' ? corpo.instrucoes : ''
  if (!modeloId || !amostra.trim()) throw createError({ statusCode: 400, statusMessage: 'Requisição inválida.' })
  if (instrucoes.length > TAMANHO_MAXIMO_INSTRUCOES) {
    throw createError({ statusCode: 413, statusMessage: 'As instruções estão longas demais — resuma em até 2 mil caracteres.' })
  }
  if (amostra.length > TAMANHO_MAXIMO_AMOSTRA) {
    throw createError({ statusCode: 413, statusMessage: 'Amostra da planilha grande demais.' })
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
  const campos = schema?.campos_item ?? []
  if (!campos.length) throw createError({ statusCode: 422, statusMessage: 'O template não tem colunas de dados.' })

  try {
    return await analisarLayoutPlanilha({ campos, amostra, dicas: schema.dicas?.geral, instrucoes })
  } catch (e) {
    throw createError({ statusCode: 502, statusMessage: mensagemErroIA(e, 'Falha ao analisar o layout da planilha.') })
  }
})
