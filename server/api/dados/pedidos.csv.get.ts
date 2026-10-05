/**
 * Link de dados pro Power BI: GET /api/dados/pedidos.csv?chave=<chave da empresa>
 * Uma linha por pedido (Ordem de Compra), em qualquer situação.
 */
export default defineEventHandler(async (event) => {
  const { pedidos } = await pedidosDaChave(event)

  return responderCsv(
    event,
    [
      'ID do pedido',
      'ID do cliente',
      'Número',
      'Situação',
      'Emissão',
      'Cliente',
      'Documento do cliente',
      'Cidade',
      'UF',
      'Vendedor',
      'Fábrica',
      'Referência da tabela',
      'Condição de pagamento',
      'Prazo de entrega',
      'Subtotal',
      'Frete',
      'Desconto',
      'Total',
      'Decidido por',
      'Decidido em',
      'Criado em'
    ],
    pedidos.map((p) => [
      p.id,
      p.clienteId,
      p.numero,
      p.situacao,
      p.emissao,
      p.cliente,
      p.clienteDocumento,
      p.cidade,
      p.uf,
      p.vendedor,
      p.fabrica,
      p.referencia,
      p.condicaoPagamento,
      p.prazoEntrega,
      p.subtotal,
      p.frete,
      p.desconto,
      p.total,
      p.decididoPor,
      p.decididoEm,
      p.criadoEm
    ]),
    'Pedidos'
  )
})
