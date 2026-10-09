import type { serverSupabaseServiceRole } from '#supabase/server'
import {
  campoPeriodoImportacao,
  catalogoImportacao,
  planoImportacao,
  type CampoRelatorio,
  type DadosRelatorio,
  type DefinicaoRelatorio,
  type FonteImportacao,
  type LinhaRelatorio
} from '#shared/utils/relatorios'

/**
 * Dados dos relatórios de importação. Um arquivo importado tem dezenas de milhares de linhas,
 * então elas não vão pro navegador: a função `relatorio_importacao_cubo` (no banco) devolve um
 * resumo — uma linha por combinação dos campos que o relatório usa pra separar e filtrar, com
 * as medidas já somadas — e o cálculo do navegador trabalha em cima dele.
 */

type Admin = ReturnType<typeof serverSupabaseServiceRole>

/** Acima disso o resumo vem cortado (relatório detalhado demais pro volume) e a tela avisa. */
const LIMITE_RESUMO = 30_000

/**
 * A fonte como ela está AGORA: confere que o conjunto é da empresa e remonta o catálogo a partir
 * do template (o que veio na planta pode estar velho, e é daqui que sai o que vai pra consulta).
 * `null` quando o conjunto não existe mais.
 */
export async function fonteImportacaoAtual(
  admin: Admin,
  empresaId: string,
  pedida: FonteImportacao | null | undefined
): Promise<FonteImportacao | null> {
  if (!pedida) return null
  const { data, error } = await admin
    .from('modelos')
    .select('id, nome, schema')
    .eq('id', pedida.modelo_id)
    .eq('empresa_id', empresaId)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const modelo = data as { id: string; nome: string; schema: any } | null
  if (!modelo) return null
  return {
    modelo_id: modelo.id,
    modelo_nome: modelo.nome,
    arquivos: pedida.arquivos,
    campos: catalogoImportacao(modelo.id, modelo.schema)
  }
}

/** Resumo das linhas dos arquivos escolhidos, agrupado por `dimensoes` (ids de campo). */
export async function resumirImportacao(
  admin: Admin,
  empresaId: string,
  fonte: FonteImportacao,
  opcoes: { dimensoes: string[]; medidas?: string[]; clienteId?: string | null; limite?: number }
): Promise<{ linhas: LinhaRelatorio[]; cortado: boolean }> {
  const porId = new Map(fonte.campos.map((c) => [c.id, c]))
  const paraBanco = (ids: string[], aceita: (c: CampoRelatorio) => boolean) =>
    ids
      .map((id) => porId.get(id))
      .filter((c): c is CampoRelatorio => !!c?.origem && aceita(c))
      .map((c) => ({ chave: c.id, origem: c.origem }))

  const limite = opcoes.limite ?? LIMITE_RESUMO
  const { data, error } = await admin.rpc('relatorio_importacao_cubo', {
    p_empresa_id: empresaId,
    p_modelo_id: fonte.modelo_id,
    p_importacoes: fonte.arquivos,
    p_cliente_id: opcoes.clienteId ?? null,
    p_dimensoes: paraBanco(opcoes.dimensoes, () => true),
    // só coluna numérica da linha pode ser somada
    p_medidas: paraBanco(opcoes.medidas ?? [], (c) => c.origem!.startsWith('l:') && (c.tipo === 'numero' || c.tipo === 'moeda')),
    // um a mais que o limite: é como se sabe que ficou coisa de fora
    p_limite: limite + 1
  } as never)
  if (error) {
    const faltaFuncao = /relatorio_importacao_cubo/.test(error.message) && /(not find|does not exist|schema cache)/i.test(error.message)
    throw createError({
      statusCode: 500,
      statusMessage: faltaFuncao
        ? 'Falta rodar no banco a migration dos relatórios de importação (20261007000001_relatorio_importacao_cubo.sql).'
        : error.message
    })
  }

  const linhas = ((data as LinhaRelatorio[] | null) ?? []).slice(0, limite)
  const periodo = campoPeriodoImportacao(fonte.modelo_id)
  for (const l of linhas) if (l[periodo] != null) l._data = l[periodo]!
  return { linhas, cortado: ((data as unknown[] | null)?.length ?? 0) > limite }
}

/** Linhas pro painel de um relatório de importação. Com `clienteId`, só os arquivos daquele cliente. */
export async function montarDadosImportacao(
  admin: Admin,
  empresaId: string,
  definicao: DefinicaoRelatorio,
  fonte: FonteImportacao,
  clienteId?: string | null
): Promise<DadosRelatorio> {
  const { dimensoes, medidas } = planoImportacao(definicao)
  const { linhas, cortado } = await resumirImportacao(admin, empresaId, fonte, { dimensoes, medidas, clienteId })
  return { pedidos: [], itens: [], linhas, cortado }
}

/** Valores que existem num campo (os mais frequentes primeiro) — pros filtros do editor. */
export async function valoresDoCampoImportacao(
  admin: Admin,
  empresaId: string,
  fonte: FonteImportacao,
  campoId: string,
  quantos: number
): Promise<string[]> {
  const { linhas } = await resumirImportacao(admin, empresaId, fonte, { dimensoes: [campoId], limite: quantos })
  return linhas.map((l) => l[campoId]).filter((v) => v != null && v !== '').map(String)
}

/** Roda `tarefa` em cada item, poucas de cada vez — cada uma é uma leitura inteira dos arquivos no banco. */
async function emLotes<T, R>(itens: T[], porVez: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = []
  for (let i = 0; i < itens.length; i += porVez) saida.push(...(await Promise.all(itens.slice(i, i + porVez).map(tarefa))))
  return saida
}

const AMOSTRA_VALORES = 8

/** Resumo dos dados pra IA: os valores que existem em cada campo (ela não recebe as linhas). */
export async function resumoImportacaoParaIA(admin: Admin, empresaId: string, fonte: FonteImportacao): Promise<string> {
  const { data: lista } = await admin
    .from('importacoes')
    .select('id, periodo, total_linhas')
    .eq('empresa_id', empresaId)
    .eq('modelo_id', fonte.modelo_id)
    .order('periodo', { ascending: true })
    .limit(1000)
  const escolhidos = fonte.arquivos ? new Set(fonte.arquivos) : null
  const importacoes = ((lista as { id: string; periodo: string; total_linhas: number }[] | null) ?? []).filter(
    (i) => !escolhidos || escolhidos.has(i.id)
  )
  const totalLinhas = importacoes.reduce((soma, i) => soma + (i.total_linhas ?? 0), 0)

  const numericos = fonte.campos.filter((c) => c.tipo === 'numero' || c.tipo === 'moeda')
  const outros = fonte.campos.filter((c) => c.tipo === 'texto' || c.tipo === 'data')

  const [faixas, amostras] = await Promise.all([
    numericos.length
      ? resumirImportacao(admin, empresaId, fonte, { dimensoes: [], medidas: numericos.map((c) => c.id) }).then((r) => r.linhas[0] ?? {})
      : Promise.resolve({} as LinhaRelatorio),
    emLotes(outros, 4, (c) =>
      // data pede mais valores: é deles que sai o "de … a …"
      valoresDoCampoImportacao(admin, empresaId, fonte, c.id, c.tipo === 'data' ? 400 : AMOSTRA_VALORES + 1)
    )
  ])
  const amostraDe = new Map(outros.map((c, i) => [c.id, amostras[i]!]))

  const linhas = fonte.campos.map((campo) => {
    let detalhe = 'sem dados'
    if (campo.tipo === 'numero' || campo.tipo === 'moeda') {
      if (Number(faixas[campo.id + '#n'])) detalhe = `de ${faixas[campo.id + '#min']} a ${faixas[campo.id + '#max']}`
    } else {
      const valores = amostraDe.get(campo.id) ?? []
      if (valores.length && campo.tipo === 'data') {
        const datas = valores.map((v) => v.slice(0, 10)).sort()
        detalhe = `de ${datas[0]} a ${datas[datas.length - 1]}`
      } else if (valores.length) {
        const amostra = valores.slice(0, AMOSTRA_VALORES).map((v) => `"${v.slice(0, 40)}"`).join(', ')
        detalhe =
          valores.length > AMOSTRA_VALORES
            ? `mais de ${AMOSTRA_VALORES} valores diferentes; os mais frequentes: ${amostra}, …`
            : `${valores.length} valor(es) diferente(s): ${amostra}`
      }
    }
    return `- id "${campo.id}": ${campo.nome} (${campo.tipo}) — ${detalhe}`
  })

  const periodos = importacoes.map((i) => i.periodo)
  const faixaPeriodos = periodos.length ? `, períodos de ${periodos[0]} a ${periodos[periodos.length - 1]}` : ''
  return `Conjunto de dados "${fonte.modelo_nome}": ${importacoes.length} arquivo(s) importado(s)${faixaPeriodos}, ${totalLinhas} linha(s) no total.\n${linhas.join('\n')}`
}
