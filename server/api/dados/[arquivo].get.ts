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

  // filtros opcionais — sem eles o link traz tudo, como sempre
  const query = getQuery(event)
  const filtro = (nome: string, formato: RegExp) => {
    const valor = query[nome]
    if (valor == null || valor === '') return null
    if (typeof valor !== 'string' || !formato.test(valor)) {
      throw createError({ statusCode: 400, statusMessage: `Filtro "${nome}" inválido` })
    }
    return valor
  }
  const anoDe = filtro('ano_de', /^\d{4}$/)
  const anoAte = filtro('ano_ate', /^\d{4}$/)
  const clienteId = filtro('cliente', UUID)

  type ImportacaoLinha = {
    id: string
    periodo: string
    arquivo_nome: string | null
    criado_em: string
    cabecalho: Record<string, unknown> | null
    clientes: { nome: string; documento: string | null } | null
  }
  const importacoes: ImportacaoLinha[] = []
  for (let inicio = 0; ; inicio += PAGINA_DADOS) {
    let consulta = admin
      .from('importacoes')
      .select('id, periodo, arquivo_nome, criado_em, cabecalho, clientes(nome, documento)')
      .eq('empresa_id', empresaId)
      .eq('modelo_id', modeloId)
    // período é 'AAAA' ou 'AAAA-MM': comparar como texto pelo ano cobre os dois formatos
    if (anoDe) consulta = consulta.gte('periodo', anoDe)
    if (anoAte) consulta = consulta.lte('periodo', `${anoAte}-99`)
    if (clienteId) consulta = consulta.eq('cliente_id', clienteId)

    const { data, error } = await consulta
      .order('criado_em', { ascending: true })
      .order('id', { ascending: true })
      .range(inicio, inicio + PAGINA_DADOS - 1)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    importacoes.push(...((data ?? []) as unknown as ImportacaoLinha[]))
    if (!data || data.length < PAGINA_DADOS) break
  }

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

  // Uma importação por vez, continuando da última posição lida (e não pulando N linhas): cada
  // página custa o mesmo no banco, não importa quantas vieram antes. Usa o índice
  // (importacao_id, posicao).
  async function* blocos(): AsyncGenerator<unknown[][]> {
    for (const importacao of importacoes) {
      const fixas = [
        importacao.clientes?.nome,
        importacao.clientes?.documento,
        importacao.periodo
      ]
      const doArquivo = [
        importacao.arquivo_nome,
        importacao.criado_em.slice(0, 10),
        ...camposCabecalho.map((c) => importacao.cabecalho?.[c.id])
      ]

      for (let ultimaPosicao = 0; ; ) {
        const { data, error } = await admin
          .from('importacoes_linhas')
          .select('aba, posicao, dados')
          .eq('importacao_id', importacao.id)
          .gt('posicao', ultimaPosicao)
          .order('posicao', { ascending: true })
          .limit(PAGINA_DADOS)
        if (error) throw createError({ statusCode: 500, statusMessage: error.message })

        const linhas = (data ?? []) as unknown as {
          aba: string | null
          posicao: number
          dados: Record<string, unknown>
        }[]
        if (linhas.length) {
          yield linhas.map((linha) => [...fixas, linha.aba, ...doArquivo, ...camposItem.map((c) => linha.dados?.[c.id])])
        }
        if (linhas.length < PAGINA_DADOS) break
        ultimaPosicao = linhas[linhas.length - 1]!.posicao
      }
    }
  }

  return responderCsvAosPoucos(event, cabecalhoCsv, blocos(), (modelo as { nome: string }).nome)
})
