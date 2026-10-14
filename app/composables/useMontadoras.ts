import type { Montadora } from '~/types/montadora'

const COLUNAS = 'id, empresa_id, nome, criado_em'

/**
 * Cadastro de apoio (montadoras) — sem tela própria, usado pelo picker de busca-ou-cria
 * no formulário de produtos. Estado compartilhado via `useState`.
 */
export function useMontadoras() {
  const supabase = useSupabaseClient()

  const itens = useState<Montadora[]>('montadoras:itens', () => [])
  const carregando = useState<boolean>('montadoras:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase.from('montadoras').select(COLUNAS).order('nome', { ascending: true })
      if (error) throw error
      itens.value = (data as unknown as Montadora[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Montadora | null {
    return itens.value.find((m) => m.id === id) ?? null
  }

  async function criar(nome: string): Promise<Montadora> {
    const { data, error } = await supabase.from('montadoras').insert({ nome } as any).select(COLUNAS).single()
    if (error) throw error
    const nova = data as unknown as Montadora
    itens.value = [...itens.value, nova].sort((a, b) => a.nome.localeCompare(b.nome))
    return nova
  }

  return { itens, carregando, carregar, porId, criar }
}
