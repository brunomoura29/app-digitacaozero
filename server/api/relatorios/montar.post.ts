import { camposDasFontes, normalizarDefinicao, normalizarFontes, normalizarImportacao } from '#shared/utils/relatorios'
import { mensagemErroIA, montarRelatorioIA } from '../../utils/claude'

const TAMANHO_MAXIMO_PEDIDO = 2000

/**
 * POST /api/relatorios/montar — { fontes, pedido, definicaoAtual?, importacao? }
 * A IA lê o pedido do usuário + os campos das fontes escolhidas e devolve a planta do painel.
 * Com `definicaoAtual`, é um ajuste: ela devolve o painel inteiro já alterado. Só admin.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await adminDaSessao(event)

  const corpo = await readBody<{ fontes?: unknown; pedido?: unknown; definicaoAtual?: unknown; importacao?: unknown }>(event)
  const pedido = typeof corpo?.pedido === 'string' ? corpo.pedido.trim() : ''
  if (!pedido) throw createError({ statusCode: 400, statusMessage: 'Escreva o que você quer ver no relatório.' })
  if (pedido.length > TAMANHO_MAXIMO_PEDIDO) {
    throw createError({ statusCode: 413, statusMessage: 'O pedido está longo demais — resuma em até 2 mil caracteres.' })
  }

  const fontes = normalizarFontes(corpo?.fontes)
  const deImportacao = fontes.includes('importacao')
  // relatório de importação: o catálogo de campos sai do template, e é o de agora que vale
  const fonte = deImportacao ? await fonteImportacaoAtual(admin, empresaId, normalizarImportacao(corpo?.importacao)) : null
  if (deImportacao && !fonte) throw createError({ statusCode: 400, statusMessage: 'Escolha o conjunto de dados e os arquivos do relatório.' })

  const atual = corpo?.definicaoAtual ? normalizarDefinicao(corpo.definicaoAtual, fontes, fonte) : null
  const resumoDados = fonte
    ? await resumoImportacaoParaIA(admin, empresaId, fonte)
    : resumoParaIA(await montarDadosRelatorio(admin, empresaId, { fontes }), fontes)

  try {
    const planta = await montarRelatorioIA({
      origem: fonte ? 'importacao' : 'pedidos',
      idsCampos: camposDasFontes(fontes, fonte).map((c) => c.id),
      resumoDados,
      pedido,
      // os ids dos blocos não dizem nada à IA — saem pra ela não tentar reaproveitar
      painelAtual: atual?.blocos.length
        ? JSON.stringify({ cor: atual.cor, filtros: atual.filtros, blocos: atual.blocos.map(({ id: _id, ...resto }) => resto) })
        : undefined
    })
    return {
      definicao: normalizarDefinicao(planta, fontes, fonte),
      nome: String(planta.nome_sugerido ?? '').trim().slice(0, 80),
      resumo: String(planta.resumo ?? '').trim(),
      avisos: Array.isArray(planta.avisos) ? planta.avisos.map(String).filter(Boolean) : []
    }
  } catch (e) {
    throw createError({ statusCode: 502, statusMessage: mensagemErroIA(e, 'Falha ao montar o relatório.') })
  }
})
