import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Peças comuns dos links de dados pro Power BI (/api/dados/*.csv?chave=...).
 *
 * Esses links não têm sessão de usuário — quem chama é o Power BI. A chave é a credencial:
 * o servidor acha a empresa dona dela (service role) e SEMPRE filtra por essa empresa.
 */

/** Teto de linhas por requisição do PostgREST — as consultas paginam nesse tamanho. */
export const PAGINA_DADOS = 1000

/** Confere a `?chave=` e devolve o cliente service role + a empresa dona da chave. */
export async function empresaDaChave(event: H3Event) {
  const query = getQuery(event)
  const chave = typeof query.chave === 'string' ? query.chave : ''
  if (!chave) throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })

  const admin = serverSupabaseServiceRole(event)
  const { data: dono } = await admin.from('chaves_dados').select('empresa_id').eq('chave', chave).maybeSingle()
  if (!dono) throw createError({ statusCode: 401, statusMessage: 'Chave inválida' })

  return { admin, empresaId: (dono as { empresa_id: string }).empresa_id }
}

/**
 * Todas as linhas de uma tabela da empresa, paginando até acabar. `ordem` precisa ser
 * estável entre as páginas — por isso o `id` entra sempre como desempate.
 */
export async function buscarTudoDaEmpresa(
  admin: Awaited<ReturnType<typeof empresaDaChave>>['admin'],
  tabela: string,
  colunas: string,
  empresaId: string,
  ordem: string
): Promise<any[]> {
  const tudo: any[] = []
  for (let inicio = 0; ; inicio += PAGINA_DADOS) {
    const { data, error } = await admin
      .from(tabela)
      .select(colunas)
      .eq('empresa_id', empresaId)
      .order(ordem, { ascending: true })
      .order('id', { ascending: true })
      .range(inicio, inicio + PAGINA_DADOS - 1)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    tudo.push(...(data ?? []))
    if (!data || data.length < PAGINA_DADOS) break
  }
  return tudo
}

function celula(valor: unknown): string {
  if (valor == null) return ''
  // decimal com vírgula: é como o Power BI e o Excel em português leem número
  if (typeof valor === 'number') return String(valor).replace('.', ',')
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  const texto = String(valor)
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Nomes de coluna únicos — o Power BI não aceita duas colunas com o mesmo nome. */
export function nomesUnicos(nomes: string[]): string[] {
  const usados = new Map<string, number>()
  return nomes.map((nome) => {
    const base = nome.trim() || 'Coluna'
    const vezes = (usados.get(base) ?? 0) + 1
    usados.set(base, vezes)
    return vezes === 1 ? base : `${base} (${vezes})`
  })
}

function linhaCsv(valores: unknown[]): string {
  return valores.map(celula).join(';')
}

function cabecalhosDaResposta(event: H3Event, nomeArquivo: string) {
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')
  if (getQuery(event).baixar) {
    const nome = nomeArquivo.replace(/[^\w\- ]+/g, '').trim() || 'dados'
    setHeader(event, 'Content-Disposition', `attachment; filename="${nome}.csv"`)
  }
}

/** Monta e devolve o CSV (separador `;`, UTF-8 com BOM). `?baixar=1` força o download com `nomeArquivo`. */
export function responderCsv(event: H3Event, cabecalho: string[], linhas: unknown[][], nomeArquivo: string): string {
  cabecalhosDaResposta(event, nomeArquivo)
  const saida = [cabecalho, ...linhas].map(linhaCsv)
  // BOM: sem ele o Excel abre os acentos trocados
  return '﻿' + saida.join('\r\n')
}

/**
 * Mesmo CSV do `responderCsv`, mas enviado aos poucos: cada bloco de linhas sai assim que é
 * lido, sem montar o arquivo inteiro na memória — pra conjunto que cresce sem teto (importações).
 * Blocos vazios não são aceitos (o gerador só deve entregar bloco com linha).
 *
 * Se a leitura falhar no meio, a conexão é derrubada em vez de encerrada: um CSV cortado que
 * terminasse "normalmente" entraria no Power BI como se fosse o dado completo.
 */
export async function responderCsvAosPoucos(
  event: H3Event,
  cabecalho: string[],
  blocos: AsyncIterable<unknown[][]>,
  nomeArquivo: string
): Promise<ReadableStream<Uint8Array>> {
  const iterador = blocos[Symbol.asyncIterator]()
  // o primeiro bloco é lido antes de responder: erro de cara ainda sai como erro HTTP comum
  let proximo = await iterador.next()

  cabecalhosDaResposta(event, nomeArquivo)
  const encoder = new TextEncoder()
  const codificar = (linhas: unknown[][]) => encoder.encode(linhas.map((l) => '\r\n' + linhaCsv(l)).join(''))

  return new ReadableStream<Uint8Array>({
    start(controller) {
      // BOM: sem ele o Excel abre os acentos trocados
      controller.enqueue(encoder.encode('﻿' + linhaCsv(cabecalho)))
    },
    async pull(controller) {
      try {
        if (proximo.done) return controller.close()
        controller.enqueue(codificar(proximo.value))
        proximo = await iterador.next()
      } catch (erro) {
        event.node.res.destroy(erro as Error)
        controller.error(erro)
      }
    },
    async cancel() {
      await iterador.return?.()
    }
  })
}
