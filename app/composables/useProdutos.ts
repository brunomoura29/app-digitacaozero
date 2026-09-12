import type { Produto, ProdutoFiltros, ProdutoInput } from '~/types/produto'

const COLUNAS =
  'id, empresa_id, sku, codigo_barras, descricao, marca_id, fabricante_id, modelo, numero_serie, unidade, ncm, ativo, criado_em, atualizado_em, marcas(nome), fabricantes(nome)'

/**
 * CRUD de produtos. Estado compartilhado via `useState` (SSR-safe) —
 * a lista, o loading e os filtros são os mesmos em qualquer componente.
 * Chama o Supabase direto; a RLS garante o isolamento por empresa.
 */
export function useProdutos() {
  const supabase = useSupabaseClient()

  const itens = useState<Produto[]>('produtos:itens', () => [])
  const carregando = useState<boolean>('produtos:carregando', () => false)
  const filtros = useState<ProdutoFiltros>('produtos:filtros', () => ({ q: '', ativo: 'todos' }))

  /** Lista os produtos da empresa aplicando os filtros atuais. */
  async function carregar() {
    carregando.value = true
    try {
      let query = supabase.from('produtos').select(COLUNAS).order('descricao', { ascending: true })

      const termo = filtros.value.q.trim()
      if (termo) query = query.ilike('descricao', `%${termo}%`)
      if (filtros.value.ativo === 'ativos') query = query.eq('ativo', true)
      if (filtros.value.ativo === 'inativos') query = query.eq('ativo', false)

      const { data, error } = await query
      if (error) throw error
      itens.value = (data as unknown as Produto[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Produto | null {
    return itens.value.find((p) => p.id === id) ?? null
  }

  /** Busca um produto direto no banco (tela de edição). */
  async function buscarUm(id: string): Promise<Produto | null> {
    const { data, error } = await supabase
      .from('produtos')
      .select(COLUNAS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Produto) ?? null
  }

  async function criar(dados: ProdutoInput): Promise<Produto> {
    const { data, error } = await supabase.from('produtos').insert(dados as any).select(COLUNAS).single()
    if (error) throw error
    const novo = data as unknown as Produto
    itens.value = [novo, ...itens.value]
    return novo
  }

  async function atualizar(id: string, dados: ProdutoInput): Promise<Produto> {
    const { data, error } = await supabase
      .from('produtos')
      .update(dados)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    const atualizado = data as unknown as Produto
    itens.value = itens.value.map((p) => (p.id === id ? atualizado : p))
    return atualizado
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((p) => p.id !== id)
  }

  return { itens, carregando, filtros, carregar, porId, buscarUm, criar, atualizar, remover }
}
