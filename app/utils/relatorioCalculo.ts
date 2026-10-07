import {
  campoRelatorio,
  NOME_OPERACAO,
  type BlocoRelatorio,
  type DadosRelatorio,
  type FiltroRelatorio,
  type GrupoBloco,
  type LinhaRelatorio,
  type MedidaBloco
} from '#shared/utils/relatorios'

/**
 * Cálculo dos blocos do relatório, no navegador, sobre as linhas que o servidor entregou.
 * Tudo aqui é puro (sem Vue): filtra, agrupa e soma. É o que deixa o filtro cruzado instantâneo.
 */

export const VAZIO = '(sem informação)'
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Seleção do filtro cruzado: chave do grupo (`campo@periodo`) → valores marcados. */
export type Selecoes = Record<string, string[]>

export interface IntervaloDatas {
  de: string | null
  ate: string | null
}

export function chaveGrupo(g: GrupoBloco): string {
  return g.periodo ? `${g.campo}@${g.periodo}` : g.campo
}

/** Valor de agrupamento de uma linha — datas viram o "balde" do período (ordenável como texto). */
export function valorGrupo(linha: LinhaRelatorio, g: GrupoBloco): string {
  const bruto = linha[g.campo]
  if (bruto == null || bruto === '') return VAZIO
  if (!g.periodo) return String(bruto)
  const data = String(bruto).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return VAZIO
  if (g.periodo === 'dia') return data
  if (g.periodo === 'mes') return data.slice(0, 7)
  if (g.periodo === 'ano') return data.slice(0, 4)
  return `${data.slice(0, 4)}-T${Math.ceil(Number(data.slice(5, 7)) / 3)}`
}

export function rotuloGrupo(valor: string, g: GrupoBloco): string {
  if (!g.periodo || valor === VAZIO) return valor
  if (g.periodo === 'dia') return `${valor.slice(8, 10)}/${valor.slice(5, 7)}/${valor.slice(0, 4)}`
  if (g.periodo === 'mes') return `${MESES[Number(valor.slice(5, 7)) - 1]}/${valor.slice(2, 4)}`
  if (g.periodo === 'trimestre') return `${valor.slice(5)} ${valor.slice(0, 4)}`
  return valor
}

export function rotuloMedida(m: MedidaBloco): string {
  const nome = campoRelatorio(m.campo)?.nome ?? m.campo
  if (m.op === 'soma') return nome
  if (m.op === 'contagem') return m.campo === 'pedido.numero' ? 'Qtd. de pedidos' : `Qtd. de ${nome.toLowerCase()}`
  return `${NOME_OPERACAO[m.op]} de ${nome.toLowerCase()}`
}

export function nomeGrupo(g: GrupoBloco): string {
  const nome = campoRelatorio(g.campo)?.nome ?? g.campo
  const sufixo = { dia: 'por dia', mes: 'por mês', trimestre: 'por trimestre', ano: 'por ano' } as Record<string, string>
  return g.periodo ? `${nome} (${sufixo[g.periodo]})` : nome
}

const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtMoedaCurta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1
})
const fmtNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const fmtNumeroCurto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export function formatarMedida(valor: number | null, m: MedidaBloco, curto = false): string {
  if (valor == null || !Number.isFinite(valor)) return '–'
  const moeda = m.op !== 'contagem' && campoRelatorio(m.campo)?.tipo === 'moeda'
  if (moeda) return (curto && Math.abs(valor) >= 10_000 ? fmtMoedaCurta : fmtMoeda).format(valor)
  return (curto && Math.abs(valor) >= 10_000 ? fmtNumeroCurto : fmtNumero).format(valor)
}

function semAcento(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function passaFiltro(linha: LinhaRelatorio, f: FiltroRelatorio): boolean {
  const valor = semAcento(String(linha[f.campo] ?? ''))
  const bate = f.valores.some((v) => semAcento(v) === valor)
  return f.op === 'igual' ? bate : !bate
}

interface Condicao {
  base: 'pedido' | 'item'
  testa: (linha: LinhaRelatorio) => boolean
}

function condicoes(filtros: FiltroRelatorio[], selecoes: Selecoes, intervalo: IntervaloDatas | null): Condicao[] {
  const lista: Condicao[] = []
  for (const f of filtros) {
    const campo = campoRelatorio(f.campo)
    if (campo) lista.push({ base: campo.base, testa: (l) => passaFiltro(l, f) })
  }
  for (const [chave, valores] of Object.entries(selecoes)) {
    if (!valores.length) continue
    const [campoId, periodo] = chave.split('@')
    const campo = campoRelatorio(campoId!)
    if (!campo) continue
    const grupo = { campo: campoId!, periodo: (periodo ?? '') as GrupoBloco['periodo'] }
    const marcados = new Set(valores)
    lista.push({ base: campo.base, testa: (l) => marcados.has(valorGrupo(l, grupo)) })
  }
  if (intervalo && (intervalo.de || intervalo.ate)) {
    lista.push({
      base: 'pedido',
      testa: (l) => {
        const data = String(l['pedido.emissao'] ?? '').slice(0, 10)
        if (!data) return false
        return (!intervalo.de || data >= intervalo.de) && (!intervalo.ate || data <= intervalo.ate)
      }
    })
  }
  return lista
}

/**
 * Aplica filtros, seleções do filtro cruzado e período aos dois conjuntos. Condição em campo de
 * item (produto, marca…) também corta os pedidos: fica o pedido que tem ao menos um item passando.
 */
export function filtrarDados(
  dados: DadosRelatorio,
  filtros: FiltroRelatorio[],
  selecoes: Selecoes = {},
  intervalo: IntervaloDatas | null = null
): DadosRelatorio {
  const lista = condicoes(filtros, selecoes, intervalo)
  if (!lista.length) return dados
  const dePedido = lista.filter((c) => c.base === 'pedido')
  const deItem = lista.filter((c) => c.base === 'item')

  let pedidos = dados.pedidos.filter((l) => dePedido.every((c) => c.testa(l)))
  // a linha de item traz os campos do pedido repetidos, então as duas listas valem pra ela
  const itens = dados.itens.filter((l) => lista.every((c) => c.testa(l)))
  if (deItem.length) {
    const comItem = new Set(itens.map((l) => l._pid))
    pedidos = pedidos.filter((l) => comItem.has(l._pid))
  }
  return { pedidos, itens }
}

/** O bloco lê as linhas de item quando usa algum campo de item/produto; senão, as de pedido. */
export function baseDoBloco(bloco: BlocoRelatorio): 'pedido' | 'item' {
  const usados = [...bloco.medidas.map((m) => m.campo), ...bloco.grupos.map((g) => g.campo)]
  return usados.some((id) => campoRelatorio(id)?.base === 'item') ? 'item' : 'pedido'
}

export function agregar(linhas: LinhaRelatorio[], m: MedidaBloco): number | null {
  if (m.op === 'contagem') {
    const vistos = new Set<string>()
    for (const l of linhas) {
      const v = l[m.campo]
      if (v != null && v !== '') vistos.add(String(v))
    }
    return vistos.size
  }

  // valor do pedido lido em linhas de item se repete a cada item — conta uma vez por pedido
  const umPorPedido = campoRelatorio(m.campo)?.base === 'pedido'
  const pedidosVistos = new Set<unknown>()
  let soma = 0
  let n = 0
  let min = Infinity
  let max = -Infinity
  for (const l of linhas) {
    const bruto = l[m.campo]
    if (bruto == null || bruto === '') continue
    if (umPorPedido && l._pid != null) {
      if (pedidosVistos.has(l._pid)) continue
      pedidosVistos.add(l._pid)
    }
    const v = Number(bruto)
    if (!Number.isFinite(v)) continue
    soma += v
    n++
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!n) return m.op === 'soma' ? 0 : null
  if (m.op === 'soma') return soma
  if (m.op === 'media') return soma / n
  return m.op === 'minimo' ? min : max
}

export interface CategoriaCalculada {
  valor: string
  rotulo: string
}

export interface SerieCalculada {
  nome: string
  medida: MedidaBloco
  valores: (number | null)[]
}

export interface ResultadoGrafico {
  categorias: CategoriaCalculada[]
  series: SerieCalculada[]
  /** Categorias que ficaram de fora pelo limite. */
  ocultas: number
}

const LIMITE_PADRAO: Record<string, number> = { colunas: 12, barras: 10, linha: 60, area: 60, rosca: 5 }
const MAX_SERIES = 6
export const OUTROS = 'Outros'

function agrupar(linhas: LinhaRelatorio[], g: GrupoBloco): Map<string, LinhaRelatorio[]> {
  const mapa = new Map<string, LinhaRelatorio[]>()
  for (const l of linhas) {
    const chave = valorGrupo(l, g)
    const lista = mapa.get(chave)
    if (lista) lista.push(l)
    else mapa.set(chave, [l])
  }
  return mapa
}

/** Categorias × séries de um bloco de gráfico (colunas, barras, linha, área, rosca). */
export function calcularGrafico(bloco: BlocoRelatorio, dados: DadosRelatorio): ResultadoGrafico {
  const linhas = baseDoBloco(bloco) === 'item' ? dados.itens : dados.pedidos
  const grupo = bloco.grupos[0]
  const medida = bloco.medidas[0]
  if (!grupo || !medida) return { categorias: [], series: [], ocultas: 0 }

  const porCategoria = agrupar(linhas, grupo)
  const totais = new Map<string, number>()
  for (const [valor, ls] of porCategoria) totais.set(valor, agregar(ls, medida) ?? 0)

  // data segue a ordem do tempo; o resto, a ordem pedida
  let valores = [...porCategoria.keys()]
  const temporal = !!grupo.periodo
  if (temporal || bloco.ordem === 'rotulo') valores.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  else valores.sort((a, b) => (totais.get(b)! - totais.get(a)!) * (bloco.ordem === 'valor_asc' ? -1 : 1))

  const limite = bloco.limite || LIMITE_PADRAO[bloco.tipo] || 12
  let ocultas = 0
  let resto: LinhaRelatorio[] = []
  if (valores.length > limite) {
    // no tempo, ficam os períodos mais recentes; fora dele, os primeiros da ordenação
    const mantidos = temporal ? valores.slice(-limite) : valores.slice(0, limite)
    const fora = valores.filter((v) => !mantidos.includes(v))
    ocultas = fora.length
    if (bloco.tipo === 'rosca') resto = fora.flatMap((v) => porCategoria.get(v)!)
    valores = mantidos
  }

  const categorias: CategoriaCalculada[] = valores.map((v) => ({ valor: v, rotulo: rotuloGrupo(v, grupo) }))
  const linhasDe = valores.map((v) => porCategoria.get(v)!)
  // na rosca o que ficou de fora vira uma fatia só, pra o total continuar fechando
  if (resto.length) {
    categorias.push({ valor: OUTROS, rotulo: OUTROS })
    linhasDe.push(resto)
    ocultas = 0
  }

  const serieGrupo = bloco.tipo === 'rosca' ? undefined : bloco.grupos[1]
  let series: SerieCalculada[]
  if (serieGrupo) {
    const visiveis = linhasDe.flat()
    const porSerie = agrupar(visiveis, serieGrupo)
    const ordenadas = [...porSerie.keys()].sort((a, b) =>
      serieGrupo.periodo
        ? a.localeCompare(b)
        : (agregar(porSerie.get(b)!, medida) ?? 0) - (agregar(porSerie.get(a)!, medida) ?? 0)
    )
    const principais = ordenadas.slice(0, MAX_SERIES)
    const temOutros = ordenadas.length > MAX_SERIES
    series = principais.map((s) => ({
      nome: rotuloGrupo(s, serieGrupo),
      medida,
      valores: linhasDe.map((ls) => agregar(ls.filter((l) => valorGrupo(l, serieGrupo) === s), medida))
    }))
    if (temOutros) {
      const conjunto = new Set(principais)
      series.push({
        nome: OUTROS,
        medida,
        valores: linhasDe.map((ls) => agregar(ls.filter((l) => !conjunto.has(valorGrupo(l, serieGrupo))), medida))
      })
    }
  } else {
    const medidas = bloco.tipo === 'rosca' ? [medida] : bloco.medidas
    series = medidas.map((m) => ({ nome: rotuloMedida(m), medida: m, valores: linhasDe.map((ls) => agregar(ls, m)) }))
  }

  return { categorias, series, ocultas }
}

/** Valor do cartão de número. */
export function calcularNumero(bloco: BlocoRelatorio, dados: DadosRelatorio): number | null {
  const medida = bloco.medidas[0]
  if (!medida) return null
  const linhas = campoRelatorio(medida.campo)?.base === 'item' ? dados.itens : dados.pedidos
  return agregar(linhas, medida)
}

export interface ResultadoTabela {
  colunas: { rotulo: string; numerica: boolean }[]
  /** Células já na ordem das colunas: texto do grupo ou número da medida. */
  linhas: (string | number | null)[][]
  /** Valor cru do 1º agrupamento de cada linha — é o que o clique marca no filtro cruzado. */
  chaves: string[]
  totais: (string | number | null)[]
  /** Linhas que existem além das mostradas. */
  ocultas: number
}

export function calcularTabela(bloco: BlocoRelatorio, dados: DadosRelatorio): ResultadoTabela {
  const linhasBase = baseDoBloco(bloco) === 'item' ? dados.itens : dados.pedidos
  const { grupos, medidas } = bloco
  const colunas = [
    ...grupos.map((g) => ({ rotulo: nomeGrupo(g), numerica: false })),
    ...medidas.map((m) => ({ rotulo: rotuloMedida(m), numerica: true }))
  ]

  const combinacoes = new Map<string, { chaves: string[]; linhas: LinhaRelatorio[] }>()
  for (const l of linhasBase) {
    const chaves = grupos.map((g) => valorGrupo(l, g))
    const id = chaves.join('\u0001')
    const atual = combinacoes.get(id)
    if (atual) atual.linhas.push(l)
    else combinacoes.set(id, { chaves, linhas: [l] })
  }

  let linhas = [...combinacoes.values()].map((c) => ({
    chaves: c.chaves,
    valores: medidas.map((m) => agregar(c.linhas, m))
  }))
  const temporal = !!grupos[0]?.periodo
  if (!medidas.length || temporal || bloco.ordem === 'rotulo') {
    linhas.sort((a, b) => a.chaves.join(' ').localeCompare(b.chaves.join(' '), 'pt-BR', { numeric: true }))
  } else {
    const sinal = bloco.ordem === 'valor_asc' ? -1 : 1
    linhas.sort((a, b) => ((b.valores[0] ?? 0) - (a.valores[0] ?? 0)) * sinal)
  }

  const limite = bloco.limite || 50
  const ocultas = Math.max(0, linhas.length - limite)
  linhas = linhas.slice(0, limite)

  return {
    colunas,
    linhas: linhas.map((l) => [...l.chaves.map((c, i) => rotuloGrupo(c, grupos[i]!)), ...l.valores]),
    chaves: linhas.map((l) => l.chaves[0] ?? ''),
    totais: [...grupos.map((_, i) => (i === 0 ? 'Total' : '')), ...medidas.map((m) => agregar(linhasBase, m))],
    ocultas
  }
}

// ───────────────────────── período ─────────────────────────

export type PresetPeriodo = 'tudo' | 'este_mes' | 'mes_passado' | 'ultimos_30' | 'ultimos_90' | 'este_ano' | 'personalizado'

export const PRESETS_PERIODO: { id: PresetPeriodo; nome: string }[] = [
  { id: 'tudo', nome: 'Todo o período' },
  { id: 'este_mes', nome: 'Este mês' },
  { id: 'mes_passado', nome: 'Mês passado' },
  { id: 'ultimos_30', nome: 'Últimos 30 dias' },
  { id: 'ultimos_90', nome: 'Últimos 90 dias' },
  { id: 'este_ano', nome: 'Este ano' },
  { id: 'personalizado', nome: 'Personalizado' }
]

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function intervaloDoPreset(preset: PresetPeriodo, hoje = new Date()): IntervaloDatas {
  const a = hoje.getFullYear()
  const m = hoje.getMonth()
  const diasAtras = (n: number) => new Date(a, m, hoje.getDate() - n)
  switch (preset) {
    case 'este_mes':
      return { de: iso(new Date(a, m, 1)), ate: iso(new Date(a, m + 1, 0)) }
    case 'mes_passado':
      return { de: iso(new Date(a, m - 1, 1)), ate: iso(new Date(a, m, 0)) }
    case 'ultimos_30':
      return { de: iso(diasAtras(29)), ate: iso(hoje) }
    case 'ultimos_90':
      return { de: iso(diasAtras(89)), ate: iso(hoje) }
    case 'este_ano':
      return { de: iso(new Date(a, 0, 1)), ate: iso(new Date(a, 11, 31)) }
    default:
      return { de: null, ate: null }
  }
}

/** O intervalo de mesmo tamanho imediatamente antes — base da comparação dos cartões. */
export function intervaloAnterior(intervalo: IntervaloDatas): IntervaloDatas | null {
  if (!intervalo.de || !intervalo.ate) return null
  const de = new Date(intervalo.de + 'T00:00:00')
  const ate = new Date(intervalo.ate + 'T00:00:00')
  const dias = Math.round((ate.getTime() - de.getTime()) / 86_400_000) + 1
  // mês cheio compara com o mês cheio anterior (28–31 dias não deslocam a janela)
  if (de.getDate() === 1 && iso(new Date(de.getFullYear(), de.getMonth() + 1, 0)) === intervalo.ate) {
    return { de: iso(new Date(de.getFullYear(), de.getMonth() - 1, 1)), ate: iso(new Date(de.getFullYear(), de.getMonth(), 0)) }
  }
  const fim = new Date(de.getFullYear(), de.getMonth(), de.getDate() - 1)
  const inicio = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate() - dias + 1)
  return { de: iso(inicio), ate: iso(fim) }
}
