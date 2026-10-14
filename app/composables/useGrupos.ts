import type { Grupo, Subgrupo } from '~/types/grupo'

const COLUNAS = 'id, empresa_id, nome, criado_em'
const COLUNAS_SUBGRUPO = 'id, empresa_id, grupo_id, nome, criado_em'

/**
 * Cadastro de apoio (grupos) — sem tela própria, usado pelo picker de busca-ou-cria
 * no formulário de produtos. Estado compartilhado via `useState`.
 */
export function useGrupos() {
  const supabase = useSupabaseClient()

  const itens = useState<Grupo[]>('grupos:itens', () => [])
  const carregando = useState<boolean>('grupos:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase.from('grupos').select(COLUNAS).order('nome', { ascending: true })
      if (error) throw error
      itens.value = (data as unknown as Grupo[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Grupo | null {
    return itens.value.find((g) => g.id === id) ?? null
  }

  async function criar(nome: string): Promise<Grupo> {
    const { data, error } = await supabase.from('grupos').insert({ nome } as any).select(COLUNAS).single()
    if (error) throw error
    const novo = data as unknown as Grupo
    itens.value = [...itens.value, novo].sort((a, b) => a.nome.localeCompare(b.nome))
    return novo
  }

  return { itens, carregando, carregar, porId, criar }
}

/**
 * Subgrupos de todos os grupos da empresa — quem usa filtra por `grupo_id` (`doGrupo`).
 * Criar exige o grupo: o subgrupo nasce dentro dele.
 */
export function useSubgrupos() {
  const supabase = useSupabaseClient()

  const itens = useState<Subgrupo[]>('subgrupos:itens', () => [])
  const carregando = useState<boolean>('subgrupos:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase
        .from('subgrupos')
        .select(COLUNAS_SUBGRUPO)
        .order('nome', { ascending: true })
      if (error) throw error
      itens.value = (data as unknown as Subgrupo[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function doGrupo(grupoId: string | null): Subgrupo[] {
    if (!grupoId) return []
    return itens.value.filter((s) => s.grupo_id === grupoId)
  }

  async function criar(nome: string, grupoId: string): Promise<Subgrupo> {
    const { data, error } = await supabase
      .from('subgrupos')
      .insert({ nome, grupo_id: grupoId } as any)
      .select(COLUNAS_SUBGRUPO)
      .single()
    if (error) throw error
    const novo = data as unknown as Subgrupo
    itens.value = [...itens.value, novo].sort((a, b) => a.nome.localeCompare(b.nome))
    return novo
  }

  return { itens, carregando, carregar, doGrupo, criar }
}
