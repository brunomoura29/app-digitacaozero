/**
 * Link de dados pro Power BI: GET /api/dados/pedidos-itens.csv?chave=<chave da empresa>
 * Uma linha por item de pedido, já com os dados do pedido repetidos (cliente, situação,
 * fábrica…) — dá pra analisar produto sozinho, sem precisar relacionar com `pedidos.csv`.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId, pedidos } = await pedidosDaChave(event)
  const porId = new Map(pedidos.map((p) => [p.id, p]))

  const linhas: unknown[][] = []
  for (let inicio = 0; porId.size; inicio += PAGINA_DADOS) {
    const { data, error } = await admin
      .from('pedidos_itens')
      .select('id, pedido_id, produto_id, posicao, sku, descricao, descricao_original, quantidade, preco_unitario, total_linha')
      .eq('empresa_id', empresaId)
      .order('pedido_id', { ascending: true })
      .order('posicao', { ascending: true })
      .order('id', { ascending: true })
      .range(inicio, inicio + PAGINA_DADOS - 1)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    for (const item of (data ?? []) as any[]) {
      const p = porId.get(item.pedido_id)
      if (!p) continue
      linhas.push([
        p.id,
        p.numero,
        p.situacao,
        p.emissao,
        p.cliente,
        p.clienteDocumento,
        p.cidade,
        p.uf,
        p.vendedor,
        p.fabrica,
        item.posicao,
        item.produto_id,
        item.sku,
        item.descricao || item.descricao_original,
        Number(item.quantidade) || 0,
        Number(item.preco_unitario) || 0,
        Number(item.total_linha) || 0
      ])
    }
    if (!data || data.length < PAGINA_DADOS) break
  }

  return responderCsv(
    event,
    [
      'ID do pedido',
      'Número',
      'Situação',
      'Emissão',
      'Cliente',
      'Documento do cliente',
      'Cidade',
      'UF',
      'Vendedor',
      'Fábrica',
      'Posição',
      'ID do produto',
      'Código',
      'Descrição',
      'Quantidade',
      'Preço unitário',
      'Total do item'
    ],
    linhas,
    'Itens dos pedidos'
  )
})
