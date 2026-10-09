import { normalizarDefinicao, normalizarFontes } from '#shared/utils/relatorios'

/**
 * POST /api/relatorios/dados — { fontes, clienteId?, definicao? }
 * Linhas pro editor de relatórios (admin): todos os campos das fontes escolhidas. Com
 * `clienteId`, só os pedidos daquele cliente — é o "ver como o cliente" do editor.
 *
 * Relatório de importação manda a `definicao` inteira: as linhas vêm resumidas pelo banco só
 * com os campos que a planta usa (ver server/utils/dadosImportacao.ts). A resposta leva junto
 * a `importacao` atualizada, pro editor enxergar colunas novas do template.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await adminDaSessao(event)

  const corpo = await readBody<{ fontes?: unknown; clienteId?: unknown; definicao?: unknown }>(event)
  const fontes = normalizarFontes(corpo?.fontes)
  const clienteId = typeof corpo?.clienteId === 'string' && corpo.clienteId ? corpo.clienteId : null

  if (fontes.includes('importacao')) {
    const pedida = normalizarDefinicao(corpo?.definicao, fontes)
    const fonte = await fonteImportacaoAtual(admin, empresaId, pedida.importacao)
    if (!fonte) throw createError({ statusCode: 404, statusMessage: 'O conjunto de dados deste relatório não existe mais.' })
    const definicao = normalizarDefinicao(pedida, fontes, fonte)
    return { ...(await montarDadosImportacao(admin, empresaId, definicao, fonte, clienteId)), importacao: fonte }
  }

  return await montarDadosRelatorio(admin, empresaId, { fontes, clienteId })
})
