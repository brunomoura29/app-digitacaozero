import type { H3Event } from 'h3'

/**
 * Pedidos da empresa prontos pros links de dados do Power BI (`pedidos.csv` e
 * `pedidos-itens.csv`) — já com cliente, vendedor, fábrica e a situação por extenso.
 */

const SITUACOES: Record<string, string> = {
  rascunho: 'Rascunho',
  em_validacao: 'Em Validação',
  em_aprovacao: 'Em Aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  enviado: 'Enviado',
  cancelado: 'Cancelado'
}

export interface PedidoDados {
  id: string
  clienteId: string | null
  numero: string
  situacao: string
  emissao: string
  cliente: string | null
  clienteDocumento: string | null
  cidade: string | null
  uf: string | null
  vendedor: string | null
  fabrica: string | null
  referencia: string | null
  condicaoPagamento: string | null
  prazoEntrega: string | null
  subtotal: number
  frete: number
  desconto: number
  total: number
  decididoPor: string | null
  decididoEm: string | null
  criadoEm: string
}

type Admin = Awaited<ReturnType<typeof empresaDaChave>>['admin']

/** Todos os pedidos da empresa (qualquer situação — o Power BI filtra pela coluna Situação). */
export async function buscarPedidosDados(admin: Admin, empresaId: string): Promise<PedidoDados[]> {
  const { data: vendedores, error: erroVendedores } = await admin
    .from('vendedores')
    .select('id, nome')
    .eq('empresa_id', empresaId)
  if (erroVendedores) throw createError({ statusCode: 500, statusMessage: erroVendedores.message })
  const nomeVendedor = new Map(((vendedores ?? []) as { id: string; nome: string }[]).map((v) => [v.id, v.nome]))

  const pedidos: PedidoDados[] = []
  for (let inicio = 0; ; inicio += PAGINA_DADOS) {
    const { data, error } = await admin
      .from('pedidos')
      .select(
        'id, cliente_id, numero, status, data_emissao, condicao_pagamento, prazo_entrega, subtotal, frete_valor, desconto_valor, total, decidido_por, decidido_em, criado_em, clientes(nome, documento, endereco, vendedor_id), fabricas(nome), referencias_tabela(nome)'
      )
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: true })
      .order('id', { ascending: true })
      .range(inicio, inicio + PAGINA_DADOS - 1)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    for (const p of (data ?? []) as any[]) {
      pedidos.push({
        id: p.id,
        clienteId: p.cliente_id,
        numero: p.numero,
        situacao: SITUACOES[p.status] ?? p.status,
        emissao: p.data_emissao,
        cliente: p.clientes?.nome ?? null,
        clienteDocumento: p.clientes?.documento ?? null,
        cidade: p.clientes?.endereco?.cidade ?? null,
        uf: p.clientes?.endereco?.uf ?? null,
        vendedor: nomeVendedor.get(p.clientes?.vendedor_id) ?? null,
        fabrica: p.fabricas?.nome ?? null,
        referencia: p.referencias_tabela?.nome ?? null,
        condicaoPagamento: p.condicao_pagamento,
        prazoEntrega: p.prazo_entrega,
        subtotal: Number(p.subtotal) || 0,
        frete: Number(p.frete_valor) || 0,
        desconto: Number(p.desconto_valor) || 0,
        total: Number(p.total) || 0,
        decididoPor: p.decidido_por,
        decididoEm: p.decidido_em ? String(p.decidido_em).slice(0, 10) : null,
        criadoEm: String(p.criado_em).slice(0, 10)
      })
    }
    if (!data || data.length < PAGINA_DADOS) break
  }
  return pedidos
}

/** Handler comum dos dois links — só muda a montagem das linhas. */
export async function pedidosDaChave(event: H3Event) {
  const { admin, empresaId } = await empresaDaChave(event)
  return { admin, empresaId, pedidos: await buscarPedidosDados(admin, empresaId) }
}
