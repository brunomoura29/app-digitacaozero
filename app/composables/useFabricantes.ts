import type { Fabricante } from '~/types/fabricante'

const COLUNAS = 'id, empresa_id, nome, criado_em'

/**
 * Cadastro de apoio (fabricantes) — sem tela própria, usado pelo picker de busca-ou-cria
 * no formulário de produtos. Estado compartilhado via `useState`.
 */
export function useFabricantes() {
  const supabase = useSupabaseClient()

  const itens = useState<Fabricante[]>('fabricantes:itens', () => [])
  const carregando = useState<boolean>('fabricantes:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase.from('fabricantes').select(COLUNAS).order('nome', { ascending: true })
      if (error) throw error
      itens.value = (data as unknown as Fabricante[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Fabricante | null {
    return itens.value.find((f) => f.id === id) ?? null
  }

  async function criar(nome: string): Promise<Fabricante> {
    const { data, error } = await supabase.from('fabricantes').insert({ nome }).select(COLUNAS).single()
    if (error) throw error
    const novo = data as unknown as Fabricante
    itens.value = [...itens.value, novo].sort((a, b) => a.nome.localeCompare(b.nome))
    return novo
  }

  return { itens, carregando, carregar, porId, criar }
}
