import { serverSupabaseServiceRole } from '#supabase/server'
import type { CampoSchema, SchemaModelo } from '~/types/modelo'

/**
 * Link de dados pro Power BI: GET /api/dados/<id do template>.csv?chave=<chave da empresa>
 * Devolve todas as linhas importadas daquele template (todos os clientes e períodos) em CSV.
 *
 * Não tem sessão de usuário — quem chama é o Power BI. A chave é a credencial: o servidor
 * acha a empresa dona dela (service role) e SEMPRE filtra por essa empresa.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGINA = 1000 // teto de linhas por requisição do PostgREST

function celula(valor: unknown): string {
  if (valor == null) return ''
  // decimal com vírgula: é como o Power BI e o Excel em português leem número
  if (typeof valor === 'number') return String(valor).replace('.', ',')
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  const texto = String(valor)
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Nomes de coluna únicos — o Power BI não aceita duas colunas com o mesmo nome. */
function nomesUnicos(nomes: string[]): string[] {
  const usados = new Map<string, number>()
  return nomes.map((nome) => {
    const base = nome.trim() || 'Coluna'
    const vezes = (usados.get(base) ?? 0) + 1
    usados.set(base, vezes)
    return vezes === 1 ? base : `${base} (${vezes})`
  })
}

export default defineEventHandler(async (event) => {
  const modeloId = (getRouterParam(event, 'arquivo') ?? '').replace(/\.csv$/i, '')
  const query = getQuery(event)
  const chave = typeof query.chave === 'string' ? query.chave : ''

  if (!chave || !UUID.test(modeloId)) throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })

  const admin = serverSupabaseServiceRole(event)

  const { data: dono } = await admin.from('chaves_dados').select('empresa_id').eq('chave', chave).maybeSingle()
  if (!dono) throw createError({ statusCode: 401, statusMessage: 'Chave inválida' })
  const empresaId = (dono as { empresa_id: string }).empresa_id

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
  const saida: string[] = [cabecalhoCsv.map(celula).join(';')]

  // pagina por id (ordem de inserção = ordem do arquivo) até acabar
  for (let inicio = 0; porId.size; inicio += PAGINA) {
    const { data: linhas, error } = await admin
      .from('importacoes_linhas')
      .select('importacao_id, aba, dados, importacoes!inner(modelo_id)')
      .eq('empresa_id', empresaId)
      .eq('importacoes.modelo_id', modeloId)
      .order('id', { ascending: true })
      .range(inicio, inicio + PAGINA - 1)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    for (const linha of (linhas ?? []) as unknown as {
      importacao_id: string
      aba: string | null
      dados: Record<string, unknown>
    }[]) {
      const importacao = porId.get(linha.importacao_id)
      if (!importacao) continue
      saida.push(
        [
          importacao.clientes?.nome,
          importacao.clientes?.documento,
          importacao.periodo,
          linha.aba,
          importacao.arquivo_nome,
          importacao.criado_em.slice(0, 10),
          ...camposCabecalho.map((c) => importacao.cabecalho?.[c.id]),
          ...camposItem.map((c) => linha.dados?.[c.id])
        ]
          .map(celula)
          .join(';')
      )
    }
    if (!linhas || linhas.length < PAGINA) break
  }

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')
  if (query.baixar) {
    const nome = (modelo as { nome: string }).nome.replace(/[^\w\- ]+/g, '').trim() || 'dados'
    setHeader(event, 'Content-Disposition', `attachment; filename="${nome}.csv"`)
  }
  // BOM: sem ele o Excel abre os acentos trocados
  return '﻿' + saida.join('\r\n')
})
