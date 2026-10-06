import type { LayoutSalvo, Modelo, ModeloFiltros, ModeloInput } from '~/types/modelo'

const COLUNAS = 'id, empresa_id, nome, descricao, versao, tipo, schema, arquivo_exemplo_url, ativo, criado_em, atualizado_em'

/**
 * CRUD de modelos (templates de extração). Mesmo formato de `useFuncoes` —
 * estado compartilhado via `useState`, RLS garante o isolamento (admin only, por ora).
 */
export function useModelos() {
  const supabase = useSupabaseClient()

  const itens = useState<Modelo[]>('modelos:itens', () => [])
  const carregando = useState<boolean>('modelos:carregando', () => false)
  const filtros = useState<ModeloFiltros>('modelos:filtros', () => ({ q: '' }))

  async function carregar() {
    carregando.value = true
    try {
      let query = supabase.from('modelos').select(COLUNAS).order('nome', { ascending: true })

      const termo = filtros.value.q.trim()
      if (termo) query = query.ilike('nome', `%${termo}%`)

      const { data, error } = await query
      if (error) throw error
      itens.value = (data as unknown as Modelo[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Modelo | null {
    return itens.value.find((m) => m.id === id) ?? null
  }

  async function buscarUm(id: string): Promise<Modelo | null> {
    const { data, error } = await supabase.from('modelos').select(COLUNAS).eq('id', id).maybeSingle()
    if (error) throw error
    return (data as unknown as Modelo) ?? null
  }

  async function criar(dados: ModeloInput): Promise<Modelo> {
    const { data, error } = await supabase.from('modelos').insert(dados as any).select(COLUNAS).single()
    if (error) throw error
    const novo = data as unknown as Modelo
    itens.value = [novo, ...itens.value]
    return novo
  }

  /** Toda edição incrementa `versao` — extrações antigas continuam referenciando o schema que usaram. */
  async function atualizar(id: string, dados: ModeloInput): Promise<Modelo> {
    const atual = porId(id)
    const proximaVersao = (atual?.versao ?? 1) + 1
    const { data, error } = await supabase
      .from('modelos')
      .update({ ...dados, versao: proximaVersao })
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    const atualizado = data as unknown as Modelo
    itens.value = itens.value.map((m) => (m.id === id ? atualizado : m))
    return atualizado
  }

  /**
   * Guarda como ler a planilha de um cliente nesse template (ver `SchemaModelo.layouts`). Não
   * é edição do template: não mexe na `versao`, e parte do schema que está no banco agora pra
   * não desfazer o que outra aba tenha salvado.
   */
  async function salvarLayout(id: string, clienteId: string, layout: LayoutSalvo): Promise<void> {
    const atual = await buscarUm(id)
    if (!atual) return
    const schema = { ...atual.schema, layouts: { ...(atual.schema.layouts ?? {}), [clienteId]: layout } }
    const { data, error } = await supabase
      .from('modelos')
      .update({ schema } as any)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    const atualizado = data as unknown as Modelo
    itens.value = itens.value.map((m) => (m.id === id ? atualizado : m))
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('modelos').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((m) => m.id !== id)
  }

  return { itens, carregando, filtros, carregar, porId, buscarUm, criar, atualizar, salvarLayout, remover }
}
