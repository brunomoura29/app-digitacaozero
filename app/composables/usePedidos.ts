import type { Pedido, PedidoEdicao, PedidoFiltros, PedidoInput, PedidoItem, PedidoItemInput } from '~/types/pedido'

const COLUNAS =
  'id, empresa_id, extracao_id, cliente_id, fabrica_id, referencia_id, numero, status, data_emissao, condicao_pagamento, prazo_entrega, observacoes, dados_extras, desconto_valor, frete_valor, subtotal, total, pdf_url, decidido_por, decidido_em, criado_em, atualizado_em, clientes(nome, email, telefone), fabricas(nome), referencias_tabela(nome)'

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
      p_itens: dados.itens,
      p_fabrica_id: dados.fabrica_id,
      p_referencia_id: dados.referencia_id
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

  /**
   * Salva cabeçalho + itens atomicamente (RPC `atualizar_pedido`) — substitui todos os
   * itens e recalcula subtotal/total no servidor. Só vale pra pedido em rascunho/rejeitado.
   */
  async function atualizarComItens(id: string, campos: PedidoEdicao, itensPedido: PedidoItemInput[]): Promise<Pedido | null> {
    const { error } = await supabase.rpc('atualizar_pedido', {
      p_pedido_id: id,
      p_campos: campos,
      p_itens: itensPedido
    })
    if (error) throw error

    const atualizado = await buscarUm(id)
    const idx = itens.value.findIndex((p) => p.id === id)
    if (atualizado && idx >= 0) itens.value[idx] = atualizado
    return atualizado
  }

  /**
   * rascunho → em_validacao: exige ao menos 1 item. O número da OC já vem do `criar_pedido`
   * e não é regerado aqui — senão o pedido trocava de número a cada etapa.
   */
  async function validar(id: string): Promise<void> {
    const { count, error: erroItens } = await supabase
      .from('pedidos_itens')
      .select('id', { count: 'exact', head: true })
      .eq('pedido_id', id)
    if (erroItens) throw erroItens
    if (!count) throw new Error('Pedido precisa ter pelo menos 1 item')

    await atualizar(id, { status: 'em_validacao' })
  }

  /**
   * Devolve o pedido pra edição (rascunho). Apaga os links de aprovação do pedido — o
   * cliente não pode aprovar uma versão que está sendo alterada; quando o pedido voltar
   * pra aprovação, gera-se um link novo. (As RPCs por token também recusam pedido em
   * rascunho/em validação, então o link já "expira" mesmo se sobrar algum.)
   */
  async function voltarParaRascunho(id: string): Promise<void> {
    const { error } = await supabase.from('compartilhamentos').delete().eq('pedido_id', id)
    if (error) throw error
    await atualizar(id, { status: 'rascunho' })
  }

  async function remover(id: string): Promise<void> {
    // itens e links de aprovação saem junto (FK on delete cascade)
    const { data, error } = await supabase.from('pedidos').delete().eq('id', id).select('id')
    if (error) throw error
    // sem permissão a RLS não dá erro: só não apaga nada — sem isso o card sumiria da tela à toa
    if (!data?.length) throw new Error('Sem permissão para excluir este pedido')
    itens.value = itens.value.filter((p) => p.id !== id)
  }

  return { itens, carregando, filtros, carregar, porId, buscarUm, buscarItens, criar, atualizar, atualizarComItens, validar, voltarParaRascunho, remover }
}
