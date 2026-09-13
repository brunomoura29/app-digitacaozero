import type { Pedido, PedidoFiltros, PedidoInput, PedidoItem } from '~/types/pedido'

const COLUNAS =
  'id, empresa_id, extracao_id, cliente_id, numero, status, data_emissao, condicao_pagamento, prazo_entrega, observacoes, dados_extras, desconto_valor, frete_valor, subtotal, total, pdf_url, criado_em, atualizado_em, clientes(nome)'

/**
 * CRUD de pedidos. A criação (cabeçalho + itens) passa pela função `criar_pedido`
 * (RPC) — insere tudo numa transação só, evitando pedido órfão se os itens falharem.
 */
export function usePedidos() {
  const supabase = useSupabaseClient()

  const itens = useState<Pedido[]>('pedidos:itens', () => [])
  const carregando = useState<boolean>('pedidos:carregando', () => false)
  const filtros = useState<PedidoFiltros>('pedidos:filtros', () => ({ q: '' }))

  async function carregar() {
    carregando.value = true
    try {
      let query = supabase.from('pedidos').select(COLUNAS).order('criado_em', { ascending: false })

      const termo = filtros.value.q.trim()
      if (termo) query = query.ilike('numero', `%${termo}%`)

      const { data, error } = await query
      if (error) throw error
      itens.value = (data as unknown as Pedido[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Pedido | null {
    return itens.value.find((p) => p.id === id) ?? null
  }

  async function buscarUm(id: string): Promise<Pedido | null> {
    const { data, error } = await supabase.from('pedidos').select(COLUNAS).eq('id', id).maybeSingle()
    if (error) throw error
    return (data as unknown as Pedido) ?? null
  }

  async function buscarItens(pedidoId: string): Promise<PedidoItem[]> {
    const { data, error } = await supabase
      .from('pedidos_itens')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('posicao', { ascending: true })
    if (error) throw error
    return (data as unknown as PedidoItem[]) ?? []
  }

  /** Cria o pedido (cabeçalho + itens) atomicamente e devolve o id criado. */
  async function criar(dados: PedidoInput): Promise<string> {
    const { data, error } = await supabase.rpc('criar_pedido', {
      p_cliente_id: dados.cliente_id,
      p_extracao_id: dados.extracao_id,
      p_campos: dados.campos,
      p_itens: dados.itens
    })
    if (error) throw error
    return data as string
  }

  async function atualizar(id: string, dados: Partial<Pedido>): Promise<void> {
    const { error } = await supabase.from('pedidos').update(dados).eq('id', id)
    if (error) throw error
    const idx = itens.value.findIndex((p) => p.id === id)
    if (idx >= 0) {
      itens.value[idx] = { ...itens.value[idx], ...dados }
    }
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((p) => p.id !== id)
  }

  return { itens, carregando, filtros, carregar, porId, buscarUm, buscarItens, criar, atualizar, remover }
}
