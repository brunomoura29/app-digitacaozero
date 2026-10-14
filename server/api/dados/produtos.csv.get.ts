/**
 * Link de dados pro Power BI: GET /api/dados/produtos.csv?chave=<chave da empresa>
 * Cadastro de produtos — "ID do produto" liga com a mesma coluna de `pedidos-itens.csv`.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await empresaDaChave(event)
  const produtos = await buscarTudoDaEmpresa(
    admin,
    'produtos',
    'id, sku, codigo_barras, descricao, modelo, numero_serie, unidade, ncm, ativo, criado_em, marcas(nome), fabricantes(nome), ' +
      'origem, oem, aplicacao, peso, altura, largura, comprimento, caixa_master, qtd_minima_venda, ipi, ' +
      'montadoras(nome), grupos(nome), subgrupos(nome)',
    empresaId,
    'descricao'
  )

  return responderCsv(
    event,
    [
      'ID do produto',
      'SKU',
      'Código de barras',
      'Descrição',
      'Modelo',
      'Número de série',
      'Unidade',
      'NCM',
      'Marca',
      'Fabricante',
      'Ativo',
      'Criado em',
      // colunas novas sempre no fim: quem já consome o link não muda de posição
      'Origem',
      'Montadora',
      'OEM',
      'Grupo',
      'Subgrupo',
      'Aplicação',
      'Peso (kg)',
      'Altura (cm)',
      'Largura (cm)',
      'Comprimento (cm)',
      'Caixa master',
      'Qtd. mínima de venda',
      '% IPI'
    ],
    produtos.map((p) => [
      p.id,
      p.sku,
      p.codigo_barras,
      p.descricao,
      p.modelo,
      p.numero_serie,
      p.unidade,
      p.ncm,
      p.marcas?.nome,
      p.fabricantes?.nome,
      p.ativo,
      String(p.criado_em).slice(0, 10),
      p.origem,
      p.montadoras?.nome,
      p.oem,
      p.grupos?.nome,
      p.subgrupos?.nome,
      p.aplicacao,
      p.peso,
      p.altura,
      p.largura,
      p.comprimento,
      p.caixa_master,
      p.qtd_minima_venda,
      p.ipi
    ]),
    'Produtos'
  )
})
