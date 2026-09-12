import type { Cliente, ClienteFiltros, ClienteInput } from '~/types/cliente'

const COLUNAS =
  'id, empresa_id, nome, documento, inscricao_estadual, email, telefone, endereco, vendedor_id, observacoes, ativo, criado_em, atualizado_em'

/**
 * CRUD de clientes. Estado compartilhado via `useState` (SSR-safe) —
 * a lista, o loading e os filtros são os mesmos em qualquer componente.
 * Chama o Supabase direto; a RLS garante o isolamento por empresa.
 */
export function useClientes() {
  const supabase = useSupabaseClient()

  const itens = useState<Cliente[]>('clientes:itens', () => [])
  const carregando = useState<boolean>('clientes:carregando', () => false)
  const filtros = useState<ClienteFiltros>('clientes:filtros', () => ({ q: '', ativo: 'todos' }))

  /** Lista os clientes da empresa aplicando os filtros atuais. */
  async function carregar() {
    carregando.value = true
    try {
      let query = supabase.from('clientes').select(COLUNAS).order('nome', { ascending: true })

      const termo = filtros.value.q.trim()
      if (termo) query = query.ilike('nome', `%${termo}%`)
      if (filtros.value.ativo === 'ativos') query = query.eq('ativo', true)
      if (filtros.value.ativo === 'inativos') query = query.eq('ativo', false)

      const { data, error } = await query
      if (error) throw error
      itens.value = (data as unknown as Cliente[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Cliente | null {
    return itens.value.find((c) => c.id === id) ?? null
  }

  /** Busca um cliente direto no banco (tela de edição). */
  async function buscarUm(id: string): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from('clientes')
      .select(COLUNAS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Cliente) ?? null
  }

  async function criar(dados: ClienteInput): Promise<Cliente> {
    const { data, error } = await supabase.from('clientes').insert(dados).select(COLUNAS).single()
    if (error) throw error
    const novo = data as unknown as Cliente
    itens.value = [novo, ...itens.value]
    return novo
  }

  async function atualizar(id: string, dados: ClienteInput): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clientes')
      .update(dados)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    const atualizado = data as unknown as Cliente
    itens.value = itens.value.map((c) => (c.id === id ? atualizado : c))
    return atualizado
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((c) => c.id !== id)
  }

  return { itens, carregando, filtros, carregar, porId, buscarUm, criar, atualizar, remover }
}
