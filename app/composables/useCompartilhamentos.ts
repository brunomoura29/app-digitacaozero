import type { CabecalhoOC } from '~/types/empresa'
import type { Pedido, PedidoItem } from '~/types/pedido'

export function useCompartilhamentos() {
  const supabase = useSupabaseClient()

  async function criarLink(pedidoId: string): Promise<string> {
    // o token é a única credencial do link público — precisa ser imprevisível (Math.random não é)
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

    // um link válido por pedido: gerar outro invalida os anteriores (expirados ou não)
    const { error: erroAntigos } = await supabase.from('compartilhamentos').delete().eq('pedido_id', pedidoId)
    if (erroAntigos) throw erroAntigos

    const { error } = await supabase.from('compartilhamentos').insert({
      pedido_id: pedidoId,
      token,
      expirado_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    })

    if (error) throw error

    const baseUrl = window.location.origin
    return `${baseUrl}/public/share/${token}`
  }

  /** Link ainda válido do pedido (o mais recente), ou `null` se nunca foi gerado / já expirou. */
  async function buscarLinkAtual(pedidoId: string): Promise<{ url: string; expiraEm: string | null } | null> {
    const { data, error } = await supabase
      .from('compartilhamentos')
      .select('token, expirado_em')
      .eq('pedido_id', pedidoId)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error

    const linha = data as { token: string; expirado_em: string | null } | null
    if (!linha) return null
    if (linha.expirado_em && new Date(linha.expirado_em) <= new Date()) return null
    return { url: `${window.location.origin}/public/share/${linha.token}`, expiraEm: linha.expirado_em }
  }

  async function buscarPorToken(
    token: string
  ): Promise<{ pedido: Pedido; itens: PedidoItem[]; cabecalho: CabecalhoOC | null } | null> {
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
      decidido_por: pedidoData.decidido_por,
      decidido_em: pedidoData.decidido_em,
      criado_em: '',
      atualizado_em: '',
      clientes: { nome: pedidoData.cliente_nome }
    }

    const { data: itens, error: erroItens } = await supabase.rpc('buscar_itens_por_token', { p_token: token })

    if (erroItens) throw erroItens

    // representante (logo, CNPJ, contato) + dados completos do cliente. Se falhar, o
    // documento ainda abre — só fica sem esse cabeçalho.
    const { data: cabecalho, error: erroCabecalho } = await supabase.rpc('buscar_cabecalho_oc_por_token', {
      p_token: token
    })
    if (erroCabecalho) console.error('Erro ao buscar cabeçalho da OC:', erroCabecalho)

    return {
      pedido,
      itens: (itens as unknown as PedidoItem[]) ?? [],
      cabecalho: erroCabecalho ? null : ((cabecalho as unknown as CabecalhoOC) ?? null)
    }
  }

  async function aprovar(token: string, nome: string): Promise<void> {
    const { error } = await supabase.rpc('aprovar_pedido_por_token', { p_token: token, p_nome: nome })
    if (error) throw error
  }

  async function rejeitar(token: string, nome: string): Promise<void> {
    const { error } = await supabase.rpc('rejeitar_pedido_por_token', { p_token: token, p_nome: nome })
    if (error) throw error
  }

  return { criarLink, buscarLinkAtual, buscarPorToken, aprovar, rejeitar }
}
