/**
 * Link de dados pro Power BI: GET /api/dados/clientes.csv?chave=<chave da empresa>
 * Cadastro de clientes — "ID do cliente" liga com a mesma coluna de `pedidos.csv`.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await empresaDaChave(event)
  // clientes.vendedor_id não tem FK pra vendedores (o PostgREST não consegue embutir) — cruza aqui
  const [clientes, vendedores] = await Promise.all([
    buscarTudoDaEmpresa(
      admin,
      'clientes',
      'id, nome, documento, inscricao_estadual, email, telefone, endereco, vendedor_id, ativo, criado_em',
      empresaId,
      'nome'
    ),
    buscarTudoDaEmpresa(admin, 'vendedores', 'id, nome', empresaId, 'nome')
  ])
  const nomeVendedor = new Map(vendedores.map((v) => [v.id, v.nome]))

  return responderCsv(
    event,
    [
      'ID do cliente',
      'Nome',
      'Documento',
      'Inscrição estadual',
      'E-mail',
      'Telefone',
      'Cidade',
      'UF',
      'Bairro',
      'CEP',
      'Vendedor',
      'Ativo',
      'Criado em'
    ],
    clientes.map((c) => [
      c.id,
      c.nome,
      c.documento,
      c.inscricao_estadual,
      c.email,
      c.telefone,
      c.endereco?.cidade,
      c.endereco?.uf,
      c.endereco?.bairro,
      c.endereco?.cep,
      nomeVendedor.get(c.vendedor_id),
      c.ativo,
      String(c.criado_em).slice(0, 10)
    ]),
    'Clientes'
  )
})
