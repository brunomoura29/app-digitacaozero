import type { Fabrica } from '~/types/fabrica'

const COLUNAS = 'id, empresa_id, nome, criado_em'

/**
 * Cadastro de apoio (fábricas/fornecedores da cotação) — sem tela própria, usado
 * pelo picker de busca-ou-cria no formulário de tabela de preço.
 */
export function useFabricas() {
  const supabase = useSupabaseClient()

  const itens = useState<Fabrica[]>('fabricas:itens', () => [])
  const carregando = useState<boolean>('fabricas:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase.from('fabricas').select(COLUNAS).order('nome', { ascending: true })
      if (error) throw error
      itens.value = (data as unknown as Fabrica[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Fabrica | null {
    return itens.value.find((f) => f.id === id) ?? null
  }

  async function criar(nome: string): Promise<Fabrica> {
    const { data, error } = await supabase.from('fabricas').insert({ nome }).select(COLUNAS).single()
    if (error) throw error
    const nova = data as unknown as Fabrica
    itens.value = [...itens.value, nova].sort((a, b) => a.nome.localeCompare(b.nome))
    return nova
  }

  return { itens, carregando, carregar, porId, criar }
}
