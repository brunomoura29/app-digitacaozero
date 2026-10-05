/**
 * Link de dados pro Power BI: GET /api/dados/tabela-preco.csv?chave=<chave da empresa>
 * Histórico da tabela de preço — uma linha por preço registrado (produto + fábrica +
 * referência + competência). "ID do produto" liga com `produtos.csv`.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await empresaDaChave(event)
  const precos = await buscarTudoDaEmpresa(
    admin,
    'precos',
    'id, produto_id, competencia, data_registro, valor, produtos(sku, descricao), fabricas(nome), referencias_tabela(nome)',
    empresaId,
    'competencia'
  )

  return responderCsv(
    event,
    ['ID do produto', 'SKU', 'Produto', 'Fábrica', 'Referência da tabela', 'Competência', 'Data de registro', 'Valor'],
    precos.map((p) => [
      p.produto_id,
      p.produtos?.sku,
      p.produtos?.descricao,
      p.fabricas?.nome,
      p.referencias_tabela?.nome,
      p.competencia,
      p.data_registro,
      Number(p.valor) || 0
    ]),
    'Tabela de preço'
  )
})
