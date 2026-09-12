import type { Funcao, FuncaoFiltros, FuncaoInput } from '~/types/funcao'

const COLUNAS = 'id, empresa_id, nome, descricao, permissoes, criado_em, atualizado_em'

/**
 * CRUD de funções (papéis de acesso configuráveis por empresa). Mesmo formato
 * de `useVendedores` — estado compartilhado via `useState`, RLS garante o isolamento.
 */
export function useFuncoes() {
  const supabase = useSupabaseClient()

  const itens = useState<Funcao[]>('funcoes:itens', () => [])
  const carregando = useState<boolean>('funcoes:carregando', () => false)
  const filtros = useState<FuncaoFiltros>('funcoes:filtros', () => ({ q: '' }))

  async function carregar() {
    carregando.value = true
    try {
      let query = supabase.from('funcoes').select(COLUNAS).order('nome', { ascending: true })

      const termo = filtros.value.q.trim()
      if (termo) query = query.ilike('nome', `%${termo}%`)

      const { data, error } = await query
      if (error) throw error
      itens.value = (data as unknown as Funcao[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Funcao | null {
    return itens.value.find((f) => f.id === id) ?? null
  }

  async function buscarUm(id: string): Promise<Funcao | null> {
    const { data, error } = await supabase.from('funcoes').select(COLUNAS).eq('id', id).maybeSingle()
    if (error) throw error
    return (data as unknown as Funcao) ?? null
  }

  async function criar(dados: FuncaoInput): Promise<Funcao> {
    const { data, error } = await supabase.from('funcoes').insert(dados as any).select(COLUNAS).single()
    if (error) throw error
    const nova = data as unknown as Funcao
    itens.value = [nova, ...itens.value]
    return nova
  }

  async function atualizar(id: string, dados: FuncaoInput): Promise<Funcao> {
    const { data, error } = await supabase
      .from('funcoes')
      .update(dados)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    const atualizada = data as unknown as Funcao
    itens.value = itens.value.map((f) => (f.id === id ? atualizada : f))
    return atualizada
  }

  async function remover(id: string): Promise<void> {
    const { count, error: errContagem } = await supabase
      .from('perfis')
      .select('id', { count: 'exact', head: true })
      .eq('funcao_id', id)
    if (errContagem) throw errContagem
    if (count && count > 0) {
      throw new Error('Essa função está em uso por um ou mais acessos e não pode ser excluída.')
    }

    const { error } = await supabase.from('funcoes').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((f) => f.id !== id)
  }

  return { itens, carregando, filtros, carregar, porId, buscarUm, criar, atualizar, remover }
}
