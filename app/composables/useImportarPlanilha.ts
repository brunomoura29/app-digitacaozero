import type { Celula, GradePlanilha } from '~/utils/gradePlanilha'

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

/**
 * Lê TODAS as abas (ex: balancete com uma aba por mês) como grade de células cruas — usado na
 * importação de dados, onde cada linha guarda a aba de onde veio. Achar a linha dos títulos e
 * montar as colunas fica com `montarAba` (utils/gradePlanilha.ts).
 */
export async function lerGradesPlanilha(arquivo: File): Promise<GradePlanilha[]> {
  const XLSX = await import('xlsx')
  const buffer = await arquivo.arrayBuffer()
  // cellDates: data do Excel vem como Date (e não como número serial)
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  const grades: GradePlanilha[] = []
  for (const nome of workbook.SheetNames) {
    const aba = workbook.Sheets[nome]
    if (!aba?.['!ref']) continue
    // sempre a partir de A1, pra coluna e linha da grade baterem com as do Excel
    const fim = XLSX.utils.decode_range(aba['!ref']).e
    const linhas = XLSX.utils.sheet_to_json<Celula[]>(aba, {
      header: 1,
      defval: null,
      blankrows: true,
      range: { s: { r: 0, c: 0 }, e: fim }
    })
    const mescladas = (aba['!merges'] ?? [])
      .filter((m) => m.e.c > m.s.c)
      .map((m) => ({ linha: m.s.r, de: m.s.c, ate: m.e.c }))
    grades.push({ nome, linhas, mescladas })
  }
  return grades
}
