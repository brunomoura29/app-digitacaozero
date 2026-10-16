import type { StatusPedido } from '~/types/pedido'

/**
 * Regras puras do Dashboard: períodos, contagem por etapa do funil, série por dia e a
 * lista "Precisa da sua atenção". Sem Supabase aqui — quem busca é `useDashboard`.
 */

export type PeriodoDashboard = 'hoje' | '7d' | 'mes' | 'tudo'

export const PERIODOS_DASHBOARD: { valor: PeriodoDashboard; label: string }[] = [
  { valor: 'hoje', label: 'Hoje' },
  { valor: '7d', label: '7 dias' },
  { valor: 'mes', label: 'Mês' },
  { valor: 'tudo', label: 'Tudo' }
]

/** Dias sem mexer pra um rascunho/conferência contar como parado. */
export const DIAS_PARADO = 2
/** Dias com o link enviado sem resposta do cliente. */
export const DIAS_SEM_RESPOSTA = 3
/** Janela das falhas de leitura de arquivo que entram em "atenção". */
export const DIAS_FALHAS_LEITURA = 7

export interface PedidoResumo {
  id: string
  numero: string
  status: StatusPedido
  total: number
  criado_em: string
  atualizado_em: string
  clientes: { nome: string } | null
}

export interface LinkResumo {
  pedido_id: string
  criado_em: string
  expirado_em: string | null
}

export interface FalhaLeitura {
  id: string
  arquivo_nome: string | null
  erro: string | null
  criado_em: string
}

export interface EtapaFunil {
  status: StatusPedido
  label: string
  dica: string
  icone: string
  /** classes do ícone (fundo + cor) — mesmas cores do Kanban */
  cor: string
  /** cor sólida da etapa (barra do funil) */
  barra: string
}

/** As 5 etapas na ordem do fluxo, com as cores do Kanban (`PedidosKanban.vue`). */
export const ETAPAS_FUNIL: EtapaFunil[] = [
  {
    status: 'rascunho',
    label: 'Importados',
    dica: 'Rascunhos a revisar',
    icone: 'heroicons:arrow-down-tray',
    cor: 'bg-shift3-border/60 text-shift3-text-secondary',
    barra: 'bg-shift3-text-muted'
  },
  {
    status: 'em_validacao',
    label: 'Em conferência',
    dica: 'Validando itens e preços',
    icone: 'heroicons:clipboard-document-check',
    cor: 'bg-blue-500/15 text-blue-500',
    barra: 'bg-blue-500'
  },
  {
    status: 'em_aprovacao',
    label: 'Aguardando aprovação',
    dica: 'Link com o cliente',
    icone: 'heroicons:clock',
    cor: 'bg-warning/20 text-yellow-600',
    barra: 'bg-warning'
  },
  {
    status: 'aprovado',
    label: 'Aprovados',
    dica: 'Prontos pra faturar',
    icone: 'heroicons:check-circle',
    cor: 'bg-success/20 text-shift3-teal dark:text-success',
    barra: 'bg-success'
  },
  {
    status: 'rejeitado',
    label: 'Rejeitados',
    dica: 'Voltam pra correção',
    icone: 'heroicons:x-circle',
    cor: 'bg-danger/15 text-danger',
    barra: 'bg-danger'
  }
]

const DIA_MS = 24 * 60 * 60 * 1000

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export interface Intervalo {
  inicio: Date | null
  fim: Date
}

/**
 * Intervalo do período e o anterior de mesmo tamanho (pra comparação). "Mês" compara com
 * os mesmos dias do mês passado (1º até hoje), não com o mês inteiro — senão o começo do
 * mês sempre pareceria uma queda.
 */
export function intervalosDoPeriodo(periodo: PeriodoDashboard, agora = new Date()): { atual: Intervalo; anterior: Intervalo | null } {
  const hoje = inicioDoDia(agora)
  if (periodo === 'hoje') {
    return { atual: { inicio: hoje, fim: agora }, anterior: { inicio: new Date(hoje.getTime() - DIA_MS), fim: new Date(agora.getTime() - DIA_MS) } }
  }
  if (periodo === '7d') {
    const inicio = new Date(hoje.getTime() - 6 * DIA_MS)
    return {
      atual: { inicio, fim: agora },
      anterior: { inicio: new Date(inicio.getTime() - 7 * DIA_MS), fim: new Date(agora.getTime() - 7 * DIA_MS) }
    }
  }
  if (periodo === 'mes') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const inicioAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    // mesmo dia do mês passado — `Math.min` cobre 31 → mês de 30 dias
    const ultimoDiaAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0).getDate()
    const fimAnterior = new Date(
      agora.getFullYear(),
      agora.getMonth() - 1,
      Math.min(agora.getDate(), ultimoDiaAnterior),
      agora.getHours(),
      agora.getMinutes(),
      agora.getSeconds()
    )
    return { atual: { inicio, fim: agora }, anterior: { inicio: inicioAnterior, fim: fimAnterior } }
  }
  return { atual: { inicio: null, fim: agora }, anterior: null }
}

function dentro(iso: string, intervalo: Intervalo): boolean {
  const t = new Date(iso).getTime()
  return (!intervalo.inicio || t >= intervalo.inicio.getTime()) && t <= intervalo.fim.getTime()
}

export interface NumerosEtapa {
  quantidade: number
  valor: number
  /** variação % da quantidade vs período anterior; null = sem base pra comparar */
  variacao: number | null
}

/** Pedidos importados no período, agrupados pela etapa em que estão hoje. */
export function numerosPorEtapa(pedidos: PedidoResumo[], periodo: PeriodoDashboard, agora = new Date()) {
  const { atual, anterior } = intervalosDoPeriodo(periodo, agora)
  const resultado = {} as Record<StatusPedido, NumerosEtapa>
  for (const etapa of ETAPAS_FUNIL) {
    const doStatus = pedidos.filter((p) => p.status === etapa.status)
    const noPeriodo = doStatus.filter((p) => dentro(p.criado_em, atual))
    const qtdAnterior = anterior ? doStatus.filter((p) => dentro(p.criado_em, anterior)).length : 0
    resultado[etapa.status] = {
      quantidade: noPeriodo.length,
      valor: noPeriodo.reduce((s, p) => s + (Number(p.total) || 0), 0),
      variacao: anterior && qtdAnterior > 0 ? Math.round(((noPeriodo.length - qtdAnterior) / qtdAnterior) * 100) : null
    }
  }
  return resultado
}

export interface PontoSerie {
  /** rótulo curto do eixo ("14/10", "09h", "out/26") */
  rotulo: string
  /** rótulo do tooltip ("terça, 14 de outubro") */
  rotuloLongo: string
  quantidade: number
  valor: number
}

/** Pedidos importados por hora (hoje), por dia (7 dias / mês) ou por mês (tudo). */
export function seriePorTempo(pedidos: PedidoResumo[], periodo: PeriodoDashboard, agora = new Date()): PontoSerie[] {
  const { atual } = intervalosDoPeriodo(periodo, agora)
  const noPeriodo = pedidos.filter((p) => dentro(p.criado_em, atual))

  const baldes: { chave: string; rotulo: string; rotuloLongo: string }[] = []
  let chaveDe: (d: Date) => string

  if (periodo === 'hoje') {
    chaveDe = (d) => String(d.getHours())
    for (let h = 0; h <= agora.getHours(); h++) {
      baldes.push({ chave: String(h), rotulo: `${String(h).padStart(2, '0')}h`, rotuloLongo: `${String(h).padStart(2, '0')}h–${String(h + 1).padStart(2, '0')}h` })
    }
  } else if (periodo === 'tudo') {
    chaveDe = (d) => `${d.getFullYear()}-${d.getMonth()}`
    const primeiro = noPeriodo.reduce<Date>((min, p) => {
      const d = new Date(p.criado_em)
      return d < min ? d : min
    }, new Date(agora.getFullYear(), agora.getMonth() - 5, 1))
    const cursor = new Date(primeiro.getFullYear(), primeiro.getMonth(), 1)
    while (cursor <= agora) {
      baldes.push({
        chave: chaveDe(cursor),
        rotulo: cursor.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        rotuloLongo: cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else {
    chaveDe = (d) => inicioDoDia(d).toDateString()
    const cursor = new Date(atual.inicio!)
    while (cursor <= agora) {
      baldes.push({
        chave: chaveDe(cursor),
        rotulo: cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        rotuloLongo: cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
      })
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  const porChave = new Map(baldes.map((b) => [b.chave, { rotulo: b.rotulo, rotuloLongo: b.rotuloLongo, quantidade: 0, valor: 0 }]))
  for (const p of noPeriodo) {
    const ponto = porChave.get(chaveDe(new Date(p.criado_em)))
    if (!ponto) continue
    ponto.quantidade++
    ponto.valor += Number(p.total) || 0
  }
  return [...porChave.values()]
}

export interface ClienteRanking {
  nome: string
  quantidade: number
  valor: number
}

/** Clientes com mais valor importado no período (rejeitados não contam). */
export function topClientes(pedidos: PedidoResumo[], periodo: PeriodoDashboard, limite = 5, agora = new Date()): ClienteRanking[] {
  const { atual } = intervalosDoPeriodo(periodo, agora)
  const mapa = new Map<string, ClienteRanking>()
  for (const p of pedidos) {
    if (p.status === 'rejeitado' || p.status === 'cancelado' || !dentro(p.criado_em, atual)) continue
    const nome = p.clientes?.nome ?? 'Sem cliente'
    const atualCli = mapa.get(nome) ?? { nome, quantidade: 0, valor: 0 }
    atualCli.quantidade++
    atualCli.valor += Number(p.total) || 0
    mapa.set(nome, atualCli)
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor).slice(0, limite)
}

export type TipoAtencao = 'rejeitado' | 'link_expirado' | 'sem_resposta' | 'parado' | 'falha_leitura'

export interface ItemAtencao {
  chave: string
  tipo: TipoAtencao
  titulo: string
  detalhe: string
  /** dias desde o fato que gerou o alerta — ordena dentro do mesmo tipo */
  dias: number
  acao: string
  to: string
}

/** Ordem de urgência: o que trava dinheiro primeiro. */
const PESO_ATENCAO: Record<TipoAtencao, number> = {
  rejeitado: 0,
  link_expirado: 1,
  sem_resposta: 2,
  parado: 3,
  falha_leitura: 4
}

export const VISUAL_ATENCAO: Record<TipoAtencao, { icone: string; cor: string; rotulo: string }> = {
  rejeitado: { icone: 'heroicons:x-circle', cor: 'bg-danger/15 text-danger', rotulo: 'Rejeitado' },
  link_expirado: { icone: 'heroicons:link-slash', cor: 'bg-danger/15 text-danger', rotulo: 'Link expirado' },
  sem_resposta: { icone: 'heroicons:clock', cor: 'bg-warning/20 text-yellow-600', rotulo: 'Sem resposta' },
  parado: { icone: 'heroicons:pause-circle', cor: 'bg-blue-500/15 text-blue-500', rotulo: 'Parado' },
  falha_leitura: { icone: 'heroicons:document-minus', cor: 'bg-shift3-border/60 text-shift3-text-secondary', rotulo: 'Falha na leitura' }
}

function diasDesde(iso: string, agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / DIA_MS))
}

function textoDias(dias: number): string {
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'há 1 dia'
  return `há ${dias} dias`
}

/** Tudo que está em aberto pedindo ação — não depende do período escolhido. */
export function itensAtencao(
  pedidos: PedidoResumo[],
  links: LinkResumo[],
  falhas: FalhaLeitura[],
  agora = new Date()
): ItemAtencao[] {
  const itens: ItemAtencao[] = []
  const linkPorPedido = new Map<string, LinkResumo>()
  for (const l of links) {
    const atual = linkPorPedido.get(l.pedido_id)
    if (!atual || l.criado_em > atual.criado_em) linkPorPedido.set(l.pedido_id, l)
  }

  for (const p of pedidos) {
    const cliente = p.clientes?.nome ?? 'cliente'
    const nome = `${p.numero || 'Pedido'} · ${cliente}`

    if (p.status === 'rejeitado') {
      const dias = diasDesde(p.atualizado_em, agora)
      itens.push({ chave: `rej-${p.id}`, tipo: 'rejeitado', titulo: nome, detalhe: `Rejeitado ${textoDias(dias)} — corrigir e reenviar`, dias, acao: 'Corrigir', to: `/pedidos/${p.id}` })
      continue
    }

    if (p.status === 'em_aprovacao') {
      const link = linkPorPedido.get(p.id)
      if (link?.expirado_em && new Date(link.expirado_em) < agora) {
        const dias = diasDesde(link.expirado_em, agora)
        itens.push({ chave: `exp-${p.id}`, tipo: 'link_expirado', titulo: nome, detalhe: `Link expirou ${textoDias(dias)} sem resposta — gerar outro`, dias, acao: 'Abrir', to: `/pedidos/${p.id}` })
        continue
      }
      const desde = link?.criado_em ?? p.atualizado_em
      const dias = diasDesde(desde, agora)
      if (dias >= DIAS_SEM_RESPOSTA) {
        itens.push({ chave: `sr-${p.id}`, tipo: 'sem_resposta', titulo: nome, detalhe: `Cliente não respondeu ${textoDias(dias)} — vale um lembrete`, dias, acao: 'Abrir', to: `/pedidos/${p.id}` })
      }
      continue
    }

    if (p.status === 'rascunho' || p.status === 'em_validacao') {
      const dias = diasDesde(p.atualizado_em, agora)
      if (dias >= DIAS_PARADO) {
        const onde = p.status === 'rascunho' ? 'em rascunho' : 'em conferência'
        itens.push({ chave: `par-${p.id}`, tipo: 'parado', titulo: nome, detalhe: `Parado ${onde} ${textoDias(dias)}`, dias, acao: 'Continuar', to: `/pedidos/${p.id}` })
      }
    }
  }

  for (const f of falhas) {
    const dias = diasDesde(f.criado_em, agora)
    if (dias > DIAS_FALHAS_LEITURA) continue
    itens.push({
      chave: `fal-${f.id}`,
      tipo: 'falha_leitura',
      titulo: f.arquivo_nome || 'Arquivo sem nome',
      detalhe: `Não foi lido ${textoDias(dias)}${f.erro ? ` — ${f.erro}` : ''}`,
      dias,
      acao: 'Tentar de novo',
      to: '/pedidos/novo'
    })
  }

  return itens.sort((a, b) => PESO_ATENCAO[a.tipo] - PESO_ATENCAO[b.tipo] || b.dias - a.dias)
}

/** "Bom dia" / "Boa tarde" / "Boa noite". */
export function saudacao(agora = new Date()): string {
  const h = agora.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatarMoedaBR(valor: number): string {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** R$ 12,3 mil / R$ 1,2 mi — pra caber em cartão pequeno. */
export function formatarMoedaCurta(valor: number): string {
  const v = Number(valor) || 0
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (Math.abs(v) >= 10_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return formatarMoedaBR(v)
}
