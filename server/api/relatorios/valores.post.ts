import { normalizarImportacao } from '#shared/utils/relatorios'

/**
 * POST /api/relatorios/valores — { importacao, campo }
 * Valores que existem num campo dos arquivos escolhidos (os mais frequentes primeiro), pro
 * editor oferecer nos filtros. Nos relatórios de pedidos isso sai das linhas já carregadas;
 * nos de importação as linhas ficam no banco. Só admin.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await adminDaSessao(event)

  const corpo = await readBody<{ importacao?: unknown; campo?: unknown }>(event)
  const fonte = await fonteImportacaoAtual(admin, empresaId, normalizarImportacao(corpo?.importacao))
  const campo = typeof corpo?.campo === 'string' ? corpo.campo : ''
  if (!fonte || !fonte.campos.some((c) => c.id === campo)) return []

  return await valoresDoCampoImportacao(admin, empresaId, fonte, campo, 40)
})
