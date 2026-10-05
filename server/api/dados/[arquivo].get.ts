import type { CampoSchema, SchemaModelo } from '~/types/modelo'

/**
 * Link de dados pro Power BI: GET /api/dados/<id do template>.csv?chave=<chave da empresa>
 * Devolve todas as linhas importadas daquele template (todos os clientes e períodos) em CSV.
 * Autenticação e formato do CSV: ver `server/utils/dadosCsv.ts`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const modeloId = (getRouterParam(event, 'arquivo') ?? '').replace(/\.csv$/i, '')
  if (!UUID.test(modeloId)) throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })

  const { admin, empresaId } = await empresaDaChave(event)

  const { data: modelo } = await admin
    .from('modelos')
    .select('id, nome, schema')
    .eq('id', modeloId)
    .eq('empresa_id', empresaId)
    .maybeSingle()
  if (!modelo) throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })

  const schema = (modelo as { schema: SchemaModelo }).schema
  const camposCabecalho: CampoSchema[] = schema?.campos ?? []
  const camposItem: CampoSchema[] = schema?.campos_item ?? []

  const { data: importacoes, error: erroImportacoes } = await admin
    .from('importacoes')
    .select('id, periodo, arquivo_nome, criado_em, cabecalho, clientes(nome, documento)')
    .eq('empresa_id', empresaId)
    .eq('modelo_id', modeloId)
  if (erroImportacoes) throw createError({ statusCode: 500, statusMessage: erroImportacoes.message })

  type ImportacaoLinha = {
    id: string
    periodo: string
    arquivo_nome: string | null
    criado_em: string
    cabecalho: Record<string, unknown> | null
    clientes: { nome: string; documento: string | null } | null
  }
  const porId = new Map(((importacoes ?? []) as unknown as ImportacaoLinha[]).map((i) => [i.id, i]))

  const cabecalhoCsv = nomesUnicos([
    'Cliente',
    'Documento do cliente',
    'Período',
    'Aba',
    'Arquivo',
    'Importado em',
    ...camposCabecalho.map((c) => c.nome),
    ...camposItem.map((c) => c.nome)
  ])
  const saida: unknown[][] = []

  // pagina por id (ordem de inserção = ordem do arquivo) até acabar
  for (let inicio = 0; porId.size; inicio += PAGINA_DADOS) {
    const { data: linhas, error } = await admin
      .from('importacoes_linhas')
      .select('importacao_id, aba, dados, importacoes!inner(modelo_id)')
      .eq('empresa_id', empresaId)
      .eq('importacoes.modelo_id', modeloId)
      .order('id', { ascending: true })
      .range(inicio, inicio + PAGINA_DADOS - 1)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    for (const linha of (linhas ?? []) as unknown as {
      importacao_id: string
      aba: string | null
      dados: Record<string, unknown>
    }[]) {
      const importacao = porId.get(linha.importacao_id)
      if (!importacao) continue
      saida.push([
        importacao.clientes?.nome,
        importacao.clientes?.documento,
        importacao.periodo,
        linha.aba,
        importacao.arquivo_nome,
        importacao.criado_em.slice(0, 10),
        ...camposCabecalho.map((c) => importacao.cabecalho?.[c.id]),
        ...camposItem.map((c) => linha.dados?.[c.id])
      ])
    }
    if (!linhas || linhas.length < PAGINA_DADOS) break
  }

  return responderCsv(event, cabecalhoCsv, saida, (modelo as { nome: string }).nome)
})
