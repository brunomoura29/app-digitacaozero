import { camposDasFontes, normalizarDefinicao, normalizarFontes } from '#shared/utils/relatorios'
import { mensagemErroIA, montarRelatorioIA } from '../../utils/claude'

const TAMANHO_MAXIMO_PEDIDO = 2000

/**
 * POST /api/relatorios/montar — { fontes, pedido, definicaoAtual? }
 * A IA lê o pedido do usuário + os campos das fontes escolhidas e devolve a planta do painel.
 * Com `definicaoAtual`, é um ajuste: ela devolve o painel inteiro já alterado. Só admin.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await adminDaSessao(event)

  const corpo = await readBody<{ fontes?: unknown; pedido?: unknown; definicaoAtual?: unknown }>(event)
  const pedido = typeof corpo?.pedido === 'string' ? corpo.pedido.trim() : ''
  if (!pedido) throw createError({ statusCode: 400, statusMessage: 'Escreva o que você quer ver no relatório.' })
  if (pedido.length > TAMANHO_MAXIMO_PEDIDO) {
    throw createError({ statusCode: 413, statusMessage: 'O pedido está longo demais — resuma em até 2 mil caracteres.' })
  }

  const fontes = normalizarFontes(corpo?.fontes)
  const atual = corpo?.definicaoAtual ? normalizarDefinicao(corpo.definicaoAtual, fontes) : null
  const dados = await montarDadosRelatorio(admin, empresaId, { fontes })

  try {
    const planta = await montarRelatorioIA({
      idsCampos: camposDasFontes(fontes).map((c) => c.id),
      resumoDados: resumoParaIA(dados, fontes),
      pedido,
      // os ids dos blocos não dizem nada à IA — saem pra ela não tentar reaproveitar
      painelAtual: atual?.blocos.length
        ? JSON.stringify({ cor: atual.cor, filtros: atual.filtros, blocos: atual.blocos.map(({ id: _id, ...resto }) => resto) })
        : undefined
    })
    return {
      definicao: normalizarDefinicao(planta, fontes),
      nome: String(planta.nome_sugerido ?? '').trim().slice(0, 80),
      resumo: String(planta.resumo ?? '').trim(),
      avisos: Array.isArray(planta.avisos) ? planta.avisos.map(String).filter(Boolean) : []
    }
  } catch (e) {
    throw createError({ statusCode: 502, statusMessage: mensagemErroIA(e, 'Falha ao montar o relatório.') })
  }
})
