import type { Preco, PrecoFiltros, PrecoInput } from '~/types/preco'

const COLUNAS =
  'id, empresa_id, produto_id, fabrica_id, referencia_id, data_registro, competencia, valor, criado_em, atualizado_em, produtos!inner(descricao, sku), fabricas(nome), referencias_tabela(nome)'

export const PRECOS_POR_PAGINA_OPCOES = [25, 50, 100] as const

/**
 * CRUD da tabela de preço — log histórico plano (uma linha por cotação de
 * produto+fábrica+competência). Estado compartilhado via `useState`.
 * A lista é paginada no banco: com a importação por planilha são milhares de preços, e o
 * Supabase devolve no máximo 1000 linhas por consulta.
 */
export function usePrecos() {
  const supabase = useSupabaseClient()

  /** Preços da página atual. */
  const itens = useState<Preco[]>('precos:itens', () => [])
  const carregando = useState<boolean>('precos:carregando', () => false)
  const filtros = useState<PrecoFiltros>('precos:filtros', () => ({ q: '', competencia: '' }))
  const paginaAtual = useState<number>('precos:pagina:atual', () => 1)
  const porPagina = useState<number>('precos:pagina:tamanho', () => 50)
  const total = useState<number>('precos:pagina:total', () => 0)

  /**
   * Uma página de preços com os filtros atuais, mais recentes primeiro, e o total pra paginação.
   * `pagina` omitida = recarrega a atual (ex.: depois de excluir/importar).
   */
  async function carregar(pagina = paginaAtual.value) {
    carregando.value = true
    try {
      const montar = (p: number) => {
        let query = supabase
          .from('precos')
          .select(COLUNAS, { count: 'exact' })
          .order('competencia', { ascending: false })
          .order('criado_em', { ascending: false })
          .order('id', { ascending: true })
          .range((p - 1) * porPagina.value, p * porPagina.value - 1)

        const termo = filtros.value.q.trim()
        if (termo) query = query.or(filtroContemEm(['descricao', 'sku'], termo), { referencedTable: 'produtos' })
        if (filtros.value.competencia) query = query.eq('competencia', `${filtros.value.competencia}-01`)
        return query
      }

      let { data, error, count } = await montar(pagina)
      if (error) throw error
      // a página sumiu (excluiu os últimos, filtro diminuiu a lista): volta pra última que existe
      const ultima = Math.max(1, Math.ceil((count ?? 0) / porPagina.value))
      if (pagina > ultima) {
        pagina = ultima
        ;({ data, error, count } = await montar(pagina))
        if (error) throw error
      }

      itens.value = (data as unknown as Preco[]) ?? []
      total.value = count ?? 0
      paginaAtual.value = pagina
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Preco | null {
    return itens.value.find((p) => p.id === id) ?? null
  }

  /** Busca um preço direto no banco (tela de edição). */
  async function buscarUm(id: string): Promise<Preco | null> {
    const { data, error } = await supabase.from('precos').select(COLUNAS).eq('id', id).maybeSingle()
    if (error) throw error
    return (data as unknown as Preco) ?? null
  }

  async function criar(dados: PrecoInput): Promise<Preco> {
    const { data, error } = await supabase.from('precos').insert(dados as any).select(COLUNAS).single()
    if (error) throw error
    const novo = data as unknown as Preco
    itens.value = [novo, ...itens.value]
    return novo
  }

  async function atualizar(id: string, dados: PrecoInput): Promise<Preco> {
    const { data, error } = await supabase
      .from('precos')
      .update(dados)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    const atualizado = data as unknown as Preco
    itens.value = itens.value.map((p) => (p.id === id ? atualizado : p))
    return atualizado
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('precos').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((p) => p.id !== id)
  }

  /**
   * Preço mais recente (maior competência) pra um produto numa fábrica/lista — usado
   * pra preencher automaticamente o preço unitário quando o item do pedido ganha um
   * produto. `referenciaId` null busca em qualquer referência (não filtra a coluna).
   */
  async function buscarAtual(produtoId: string, fabricaId: string, referenciaId: string | null): Promise<number | null> {
    let query = supabase
      .from('precos')
      .select('valor')
      .eq('produto_id', produtoId)
      .eq('fabrica_id', fabricaId)
      .order('competencia', { ascending: false })
      .limit(1)
    if (referenciaId) query = query.eq('referencia_id', referenciaId)

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data ? Number(data.valor) : null
  }

  return { itens, carregando, filtros, paginaAtual, porPagina, total, carregar, porId, buscarUm, criar, atualizar, remover, buscarAtual }
}
