export interface PlanilhaLida {
  colunas: string[]
  linhas: Record<string, unknown>[]
}

/**
 * Lê a primeira aba de um XLSX/XLS/CSV inteiramente no navegador — dado já estruturado
 * não precisa passar pela extração via IA (mais rápido, sem custo, sem limite de
 * páginas/tokens). A primeira linha vira cabeçalho das colunas.
 */
export async function lerPlanilha(arquivo: File): Promise<PlanilhaLida> {
  const XLSX = await import('xlsx')
  const buffer = await arquivo.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const nomeAba = workbook.SheetNames[0]
  if (!nomeAba) return { colunas: [], linhas: [] }

  const aba = workbook.Sheets[nomeAba]
  const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(aba, { defval: null })
  const colunas = linhas.length ? Object.keys(linhas[0]) : []

  return { colunas, linhas }
}
