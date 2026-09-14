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
    const { data: compartilhamento, error: erroCompartilhamento } = await supabase
      .from('compartilhamentos')
      .select('pedido_id, expirado_em')
      .eq('token', token)
      .maybeSingle()

    if (erroCompartilhamento || !compartilhamento) {
      throw new Error('Link inválido ou expirado')
    }

    if (compartilhamento.expirado_em && new Date(compartilhamento.expirado_em) < new Date()) {
      throw new Error('Link expirado')
    }

    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos')
      .select('id, empresa_id, extracao_id, cliente_id, numero, status, data_emissao, condicao_pagamento, prazo_entrega, observacoes, dados_extras, desconto_valor, frete_valor, subtotal, total, pdf_url, criado_em, atualizado_em, clientes(nome)')
      .eq('id', compartilhamento.pedido_id)
      .maybeSingle()

    if (erroPedido || !pedido) {
      throw new Error('Pedido não encontrado')
    }

    const { data: itens, error: erroItens } = await supabase
      .from('pedidos_itens')
      .select('*')
      .eq('pedido_id', compartilhamento.pedido_id)
      .order('posicao', { ascending: true })

    if (erroItens) throw erroItens

    return { pedido: pedido as unknown as Pedido, itens: (itens as unknown as PedidoItem[]) ?? [] }
  }

  async function aprovar(token: string): Promise<void> {
    const { data: compartilhamento, error: erroCompartilhamento } = await supabase
      .from('compartilhamentos')
      .select('pedido_id')
      .eq('token', token)
      .maybeSingle()

    if (erroCompartilhamento || !compartilhamento) {
      throw new Error('Link inválido')
    }

    const { data: numero } = await supabase.rpc('proximo_numero_pedido')

    const { error: erroUpdate } = await supabase
      .from('pedidos')
      .update({ status: 'aprovado', numero: numero as string })
      .eq('id', compartilhamento.pedido_id)

    if (erroUpdate) throw erroUpdate
  }

  async function rejeitar(token: string): Promise<void> {
    const { data: compartilhamento, error: erroCompartilhamento } = await supabase
      .from('compartilhamentos')
      .select('pedido_id')
      .eq('token', token)
      .maybeSingle()

    if (erroCompartilhamento || !compartilhamento) {
      throw new Error('Link inválido')
    }

    const { error: erroUpdate } = await supabase.from('pedidos').update({ status: 'rejeitado' }).eq('id', compartilhamento.pedido_id)

    if (erroUpdate) throw erroUpdate
  }

  return { criarLink, buscarPorToken, aprovar, rejeitar }
}
