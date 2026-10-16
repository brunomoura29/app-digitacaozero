/**
 * Filtro "contém o termo em qualquer destas colunas" no formato do `.or()` do Supabase:
 * `descricao.ilike."%freio%",sku.ilike."%freio%"`. O termo vai entre aspas (escapadas) —
 * sem isso, vírgula ou parêntese digitado na busca quebraria o filtro.
 */
export function filtroContemEm(colunas: string[], termo: string): string {
  const valor = `"%${termo.replace(/[\\"]/g, '\\$&')}%"`
  return colunas.map((c) => `${c}.ilike.${valor}`).join(',')
}
