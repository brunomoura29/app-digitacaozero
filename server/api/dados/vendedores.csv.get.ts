/**
 * Link de dados pro Power BI: GET /api/dados/vendedores.csv?chave=<chave da empresa>
 * Cadastro de vendedores.
 */
export default defineEventHandler(async (event) => {
  const { admin, empresaId } = await empresaDaChave(event)
  const vendedores = await buscarTudoDaEmpresa(
    admin,
    'vendedores',
    'id, nome, email, telefone, ativo, criado_em',
    empresaId,
    'nome'
  )

  return responderCsv(
    event,
    ['ID do vendedor', 'Nome', 'E-mail', 'Telefone', 'Ativo', 'Criado em'],
    vendedores.map((v) => [v.id, v.nome, v.email, v.telefone, v.ativo, String(v.criado_em).slice(0, 10)]),
    'Vendedores'
  )
})
