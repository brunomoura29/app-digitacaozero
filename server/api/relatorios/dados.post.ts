import { normalizarFontes } from '#shared/utils/relatorios'

/**
 * POST /api/relatorios/dados — { fontes, clienteId? }
 * Linhas pro editor de relatórios (admin): todos os campos das fontes escolhidas. Com
 * `clienteId`, só os pedidos daquele cliente — é o "ver como o cliente" do editor.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await adminDaSessao(event)

  const corpo = await readBody<{ fontes?: unknown; clienteId?: unknown }>(event)
  const fontes = normalizarFontes(corpo?.fontes)
  const clienteId = typeof corpo?.clienteId === 'string' && corpo.clienteId ? corpo.clienteId : null

  return await montarDadosRelatorio(admin, empresaId, { fontes, clienteId })
})
