import type { Marca } from '~/types/marca'

const COLUNAS = 'id, empresa_id, nome, criado_em'

/**
 * Cadastro de apoio (marcas) — sem tela própria, usado pelo picker de busca-ou-cria
 * no formulário de produtos. Estado compartilhado via `useState`.
 */
export function useMarcas() {
  const supabase = useSupabaseClient()

  const itens = useState<Marca[]>('marcas:itens', () => [])
  const carregando = useState<boolean>('marcas:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase.from('marcas').select(COLUNAS).order('nome', { ascending: true })
      if (error) throw error
      itens.value = (data as unknown as Marca[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Marca | null {
    return itens.value.find((m) => m.id === id) ?? null
  }

  async function criar(nome: string): Promise<Marca> {
    const { data, error } = await supabase.from('marcas').insert({ nome }).select(COLUNAS).single()
    if (error) throw error
    const nova = data as unknown as Marca
    itens.value = [...itens.value, nova].sort((a, b) => a.nome.localeCompare(b.nome))
    return nova
  }

  return { itens, carregando, carregar, porId, criar }
}
