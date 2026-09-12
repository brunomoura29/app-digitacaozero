import type { ReferenciaTabela } from '~/types/referenciaTabela'

const COLUNAS = 'id, empresa_id, nome, criado_em'

/**
 * Cadastro de apoio (referência/tipo da tabela de preço, ex: "Preço fábrica",
 * "Tabela distribuidor") — sem tela própria, busca-ou-cria no formulário.
 */
export function useReferenciasTabela() {
  const supabase = useSupabaseClient()

  const itens = useState<ReferenciaTabela[]>('referencias_tabela:itens', () => [])
  const carregando = useState<boolean>('referencias_tabela:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase
        .from('referencias_tabela')
        .select(COLUNAS)
        .order('nome', { ascending: true })
      if (error) throw error
      itens.value = (data as unknown as ReferenciaTabela[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): ReferenciaTabela | null {
    return itens.value.find((r) => r.id === id) ?? null
  }

  async function criar(nome: string): Promise<ReferenciaTabela> {
    const { data, error } = await supabase.from('referencias_tabela').insert({ nome }).select(COLUNAS).single()
    if (error) throw error
    const nova = data as unknown as ReferenciaTabela
    itens.value = [...itens.value, nova].sort((a, b) => a.nome.localeCompare(b.nome))
    return nova
  }

  return { itens, carregando, carregar, porId, criar }
}
