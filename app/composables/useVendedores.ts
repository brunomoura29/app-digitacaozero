import type { Vendedor, VendedorFiltros, VendedorInput } from '~/types/vendedor'

const COLUNAS = 'id, empresa_id, nome, email, telefone, ativo, criado_em, atualizado_em'

/**
 * CRUD de vendedores. Estado compartilhado via `useState` (SSR-safe) —
 * a lista, o loading e os filtros são os mesmos em qualquer componente.
 * Chama o Supabase direto; a RLS garante o isolamento por empresa.
 */
export function useVendedores() {
  const supabase = useSupabaseClient()

  const itens = useState<Vendedor[]>('vendedores:itens', () => [])
  const carregando = useState<boolean>('vendedores:carregando', () => false)
  const filtros = useState<VendedorFiltros>('vendedores:filtros', () => ({ q: '', ativo: 'todos' }))

  /** Lista os vendedores da empresa aplicando os filtros atuais. */
  async function carregar() {
    carregando.value = true
    try {
      let query = supabase.from('vendedores').select(COLUNAS).order('nome', { ascending: true })

      const termo = filtros.value.q.trim()
      if (termo) query = query.ilike('nome', `%${termo}%`)
      if (filtros.value.ativo === 'ativos') query = query.eq('ativo', true)
      if (filtros.value.ativo === 'inativos') query = query.eq('ativo', false)

      const { data, error } = await query
      if (error) throw error
      itens.value = (data as unknown as Vendedor[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Vendedor | null {
    return itens.value.find((v) => v.id === id) ?? null
  }

  /** Busca um vendedor direto no banco (tela de edição). */
  async function buscarUm(id: string): Promise<Vendedor | null> {
    const { data, error } = await supabase
      .from('vendedores')
      .select(COLUNAS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Vendedor) ?? null
  }

  async function criar(dados: VendedorInput): Promise<Vendedor> {
    const { data, error } = await supabase.from('vendedores').insert(dados as any).select(COLUNAS).single()
    if (error) {
      console.error('Erro Supabase ao criar vendedor:', error)
      throw error
    }
    const novo = data as unknown as Vendedor
    itens.value = [novo, ...itens.value]
    return novo
  }

  async function atualizar(id: string, dados: VendedorInput): Promise<Vendedor> {
    const { data, error } = await supabase
      .from('vendedores')
      .update(dados)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    const atualizado = data as unknown as Vendedor
    itens.value = itens.value.map((v) => (v.id === id ? atualizado : v))
    return atualizado
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('vendedores').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((v) => v.id !== id)
  }

  return { itens, carregando, filtros, carregar, porId, buscarUm, criar, atualizar, remover }
}
