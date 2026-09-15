import type { Pedido, PedidoItem } from '~/types/pedido'

export function useCompartilhamentos() {
  const supabase = useSupabaseClient()

  async function criarLink(pedidoId: string): Promise<string> {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    const { error } = await supabase.from('compartilhamentos').insert({
      pedido_id: pedidoId,
      token,
      expirado_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    })

    if (error) throw error

    const baseUrl = window.location.origin
    return `${baseUrl}/public/share/${token}`
  }

  async function buscarPorToken(token: string): Promise<{ pedido: Pedido; itens: PedidoItem[] } | null> {
    const { data: pedidoData, error: erroPedido } = await supabase
      .rpc('buscar_pedido_por_token', { p_token: token })
      .single()

    if (erroPedido || !pedidoData) {
      throw new Error('Link inválido ou expirado')
    }

    const pedido: Pedido = {
      id: pedidoData.id,
      empresa_id: pedidoData.empresa_id,
      extracao_id: null,
      cliente_id: pedidoData.cliente_id,
      numero: pedidoData.numero,
      status: pedidoData.status,
      data_emissao: pedidoData.data_emissao,
      condicao_pagamento: pedidoData.condicao_pagamento,
      prazo_entrega: pedidoData.prazo_entrega,
      observacoes: pedidoData.observacoes,
      dados_extras: {},
      desconto_valor: pedidoData.desconto_valor,
      frete_valor: pedidoData.frete_valor,
      subtotal: pedidoData.subtotal,
      total: pedidoData.total,
      pdf_url: null,
      criado_em: '',
      atualizado_em: '',
      clientes: { nome: pedidoData.cliente_nome }
    }

    const { data: itens, error: erroItens } = await supabase.rpc('buscar_itens_por_token', { p_token: token })

    if (erroItens) throw erroItens

    return { pedido, itens: (itens as unknown as PedidoItem[]) ?? [] }
  }

  async function aprovar(token: string): Promise<void> {
    const { error } = await supabase.rpc('aprovar_pedido_por_token', { p_token: token })
    if (error) throw error
  }

  async function rejeitar(token: string): Promise<void> {
    const { error } = await supabase.rpc('rejeitar_pedido_por_token', { p_token: token })
    if (error) throw error
  }

  return { criarLink, buscarPorToken, aprovar, rejeitar }
}
