/**
 * Relatórios montados pelo usuário: catálogo de fontes/campos e a "planta" do painel
 * (`DefinicaoRelatorio`). Usado no navegador (editor e link público) e no servidor (IA e dados).
 *
 * A planta só DESCREVE o painel — quem calcula os números é `app/utils/relatorioCalculo.ts`,
 * sobre as linhas reais. A IA nunca devolve valor, só a planta.
 */

export type FonteId = 'pedidos' | 'itens' | 'clientes' | 'vendedores' | 'produtos'
export type TipoCampoRelatorio = 'texto' | 'numero' | 'moeda' | 'data'
/** De qual conjunto de linhas o campo sai: uma linha por pedido ou uma por item. */
export type BaseCampo = 'pedido' | 'item'

export interface FonteRelatorio {
  id: FonteId
  nome: string
  descricao: string
  icone: string
  /** Fonte que precisa estar junto (Produtos só se liga aos pedidos pelos itens). */
  depende?: FonteId
  obrigatoria?: boolean
}

export interface CampoRelatorio {
  id: string
  nome: string
  tipo: TipoCampoRelatorio
  fonte: FonteId
  base: BaseCampo
}

export const FONTES_RELATORIO: FonteRelatorio[] = [
  {
    id: 'pedidos',
    nome: 'Pedidos',
    descricao: 'Uma linha por ordem de compra: situação, emissão, fábrica, pagamento e totais.',
    icone: 'heroicons:clipboard-document-list',
    obrigatoria: true
  },
  {
    id: 'itens',
    nome: 'Itens dos pedidos',
    descricao: 'Uma linha por item: código, descrição, quantidade, preço e total do item.',
    icone: 'heroicons:queue-list'
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    descricao: 'Cadastro do cliente de cada pedido: nome, documento, cidade e UF.',
    icone: 'heroicons:users'
  },
  {
    id: 'vendedores',
    nome: 'Vendedores',
    descricao: 'Vendedor responsável pelo cliente de cada pedido.',
    icone: 'heroicons:user-group'
  },
  {
    id: 'produtos',
    nome: 'Produtos',
    descricao: 'Cadastro do produto de cada item: marca, fabricante, unidade, NCM e modelo.',
    icone: 'heroicons:cube',
    depende: 'itens'
  }
]

export const CAMPOS_RELATORIO: CampoRelatorio[] = [
  { id: 'pedido.numero', nome: 'Número do pedido', tipo: 'texto', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.situacao', nome: 'Situação', tipo: 'texto', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.emissao', nome: 'Data de emissão', tipo: 'data', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.fabrica', nome: 'Fábrica', tipo: 'texto', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.referencia', nome: 'Tabela de referência', tipo: 'texto', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.condicao_pagamento', nome: 'Condição de pagamento', tipo: 'texto', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.prazo_entrega', nome: 'Prazo de entrega', tipo: 'texto', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.subtotal', nome: 'Subtotal do pedido', tipo: 'moeda', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.frete', nome: 'Frete', tipo: 'moeda', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.desconto', nome: 'Desconto', tipo: 'moeda', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.total', nome: 'Total do pedido', tipo: 'moeda', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.decidido_por', nome: 'Aprovado/rejeitado por', tipo: 'texto', fonte: 'pedidos', base: 'pedido' },
  { id: 'pedido.decidido_em', nome: 'Data da decisão', tipo: 'data', fonte: 'pedidos', base: 'pedido' },

  { id: 'item.codigo', nome: 'Código do item', tipo: 'texto', fonte: 'itens', base: 'item' },
  { id: 'item.descricao', nome: 'Descrição do item', tipo: 'texto', fonte: 'itens', base: 'item' },
  { id: 'item.quantidade', nome: 'Quantidade', tipo: 'numero', fonte: 'itens', base: 'item' },
  { id: 'item.preco_unitario', nome: 'Preço unitário', tipo: 'moeda', fonte: 'itens', base: 'item' },
  { id: 'item.total', nome: 'Total do item', tipo: 'moeda', fonte: 'itens', base: 'item' },

  { id: 'cliente.nome', nome: 'Cliente', tipo: 'texto', fonte: 'clientes', base: 'pedido' },
  { id: 'cliente.documento', nome: 'CPF/CNPJ do cliente', tipo: 'texto', fonte: 'clientes', base: 'pedido' },
  { id: 'cliente.cidade', nome: 'Cidade', tipo: 'texto', fonte: 'clientes', base: 'pedido' },
  { id: 'cliente.uf', nome: 'UF', tipo: 'texto', fonte: 'clientes', base: 'pedido' },

  { id: 'vendedor.nome', nome: 'Vendedor', tipo: 'texto', fonte: 'vendedores', base: 'pedido' },

  { id: 'produto.sku', nome: 'SKU do produto', tipo: 'texto', fonte: 'produtos', base: 'item' },
  { id: 'produto.descricao', nome: 'Produto (cadastro)', tipo: 'texto', fonte: 'produtos', base: 'item' },
  { id: 'produto.marca', nome: 'Marca', tipo: 'texto', fonte: 'produtos', base: 'item' },
  { id: 'produto.fabricante', nome: 'Fabricante', tipo: 'texto', fonte: 'produtos', base: 'item' },
  { id: 'produto.unidade', nome: 'Unidade', tipo: 'texto', fonte: 'produtos', base: 'item' },
  { id: 'produto.ncm', nome: 'NCM', tipo: 'texto', fonte: 'produtos', base: 'item' },
  { id: 'produto.modelo', nome: 'Modelo', tipo: 'texto', fonte: 'produtos', base: 'item' }
]

const CAMPO_POR_ID = new Map(CAMPOS_RELATORIO.map((c) => [c.id, c]))

export function campoRelatorio(id: string): CampoRelatorio | undefined {
  return CAMPO_POR_ID.get(id)
}

/** Fontes válidas e completas: Pedidos sempre entra, e quem depende de outra traz a outra junto. */
export function normalizarFontes(fontes: unknown): FonteId[] {
  const pedidas = new Set<string>(Array.isArray(fontes) ? fontes.map(String) : [])
  pedidas.add('pedidos')
  for (const f of FONTES_RELATORIO) if (f.depende && pedidas.has(f.id)) pedidas.add(f.depende)
  return FONTES_RELATORIO.filter((f) => pedidas.has(f.id)).map((f) => f.id)
}

export function camposDasFontes(fontes: FonteId[]): CampoRelatorio[] {
  return CAMPOS_RELATORIO.filter((c) => fontes.includes(c.fonte))
}

// ───────────────────────── a planta do painel ─────────────────────────

export const TIPOS_BLOCO = ['numero', 'colunas', 'barras', 'linha', 'area', 'rosca', 'tabela'] as const
export type TipoBloco = (typeof TIPOS_BLOCO)[number]

export const OPERACOES = ['soma', 'media', 'minimo', 'maximo', 'contagem'] as const
export type Operacao = (typeof OPERACOES)[number]

export const PERIODOS = ['', 'dia', 'mes', 'trimestre', 'ano'] as const
export type PeriodoGrupo = (typeof PERIODOS)[number]

export const ORDENS = ['valor_desc', 'valor_asc', 'rotulo'] as const
export type OrdemBloco = (typeof ORDENS)[number]

/** Largura do bloco numa grade de 12 colunas. */
export const LARGURAS = [3, 4, 6, 8, 12] as const

// ───────────────────────── aparência ─────────────────────────

/**
 * Cores que um bloco pode usar. São as mesmas 8 das séries dos gráficos (ver
 * app/utils/echartsBase.ts), na mesma ordem — cada uma com o tom do tema claro e do escuro.
 * `textoEscuro`: no cartão "cheio" (fundo na cor), o texto que dá contraste é o escuro.
 */
export const CORES_BLOCO = [
  { id: 'azul', nome: 'Azul', claro: '#2a78d6', escuro: '#3987e5', textoEscuro: false },
  { id: 'laranja', nome: 'Laranja', claro: '#eb6834', escuro: '#d95926', textoEscuro: true },
  { id: 'verde_agua', nome: 'Verde-água', claro: '#1baf7a', escuro: '#199e70', textoEscuro: true },
  { id: 'amarelo', nome: 'Amarelo', claro: '#eda100', escuro: '#c98500', textoEscuro: true },
  { id: 'rosa', nome: 'Rosa', claro: '#e87ba4', escuro: '#d55181', textoEscuro: true },
  { id: 'verde', nome: 'Verde', claro: '#008300', escuro: '#008300', textoEscuro: false },
  { id: 'violeta', nome: 'Violeta', claro: '#4a3aa7', escuro: '#9085e9', textoEscuro: false },
  { id: 'vermelho', nome: 'Vermelho', claro: '#e34948', escuro: '#e66767', textoEscuro: false }
] as const
export type CorBloco = (typeof CORES_BLOCO)[number]['id'] | ''
export const IDS_CORES: string[] = CORES_BLOCO.map((c) => c.id)

/** Ícones disponíveis pros blocos (Heroicons, sem o prefixo `heroicons:`). */
export const ICONES_BLOCO = [
  'banknotes',
  'currency-dollar',
  'shopping-cart',
  'shopping-bag',
  'clipboard-document-list',
  'document-text',
  'receipt-percent',
  'calculator',
  'cube',
  'archive-box',
  'tag',
  'truck',
  'building-office-2',
  'building-storefront',
  'users',
  'user-group',
  'user',
  'map-pin',
  'calendar-days',
  'clock',
  'chart-bar',
  'chart-pie',
  'presentation-chart-line',
  'arrow-trending-up',
  'arrow-trending-down',
  'scale',
  'check-circle',
  'x-circle',
  'exclamation-triangle',
  'star',
  'trophy',
  'bolt',
  'fire',
  'flag',
  'gift',
  'heart',
  'sparkles',
  'table-cells'
] as const

/** simples = cartão neutro · suave = fundo levemente tingido + sombra na cor · cheio = fundo na cor. */
export const ESTILOS_BLOCO = ['simples', 'suave', 'cheio'] as const
export type EstiloBloco = (typeof ESTILOS_BLOCO)[number]

export const CURVAS_BLOCO = ['reta', 'suave'] as const
export type CurvaBloco = (typeof CURVAS_BLOCO)[number]

export interface MedidaBloco {
  campo: string
  /** `contagem` conta valores DIFERENTES do campo (ex: contagem de "Número do pedido" = nº de pedidos). */
  op: Operacao
}

export interface GrupoBloco {
  campo: string
  /** Só pra campo de data: agrupa por dia, mês, trimestre ou ano. */
  periodo: PeriodoGrupo
}

export interface FiltroRelatorio {
  campo: string
  op: 'igual' | 'diferente'
  valores: string[]
}

export interface BlocoRelatorio {
  id: string
  tipo: TipoBloco
  titulo: string
  largura: number
  /** Gráficos e cartão usam a primeira; a tabela usa todas. Sem 2º grupo, várias medidas viram séries. */
  medidas: MedidaBloco[]
  /** 1º = categorias (eixo, fatias, linhas da tabela); 2º = séries (legenda). A tabela usa todos. */
  grupos: GrupoBloco[]
  ordem: OrdemBloco
  /** Quantas categorias mostrar (as maiores). 0 = padrão do tipo. */
  limite: number
  filtros: FiltroRelatorio[]
  /** '' = usa a cor do painel (ou o neutro). Pinta o ícone, o destaque e o gráfico de uma série só. */
  cor: CorBloco
  /** Nome do ícone ao lado do título ('' = sem ícone). */
  icone: string
  estilo: EstiloBloco
  /** Linha e área: traço reto de ponto a ponto, ou curva suave. */
  curva: CurvaBloco
  /** Gráficos: escreve o valor em cada barra/ponto (o padrão é ver o valor ao passar o mouse). */
  rotulos: boolean
}

export interface DefinicaoRelatorio {
  versao: 1
  fontes: FonteId[]
  /** Cor padrão dos blocos que não escolheram a própria ('' = neutro). */
  cor: CorBloco
  /** Valem pro painel inteiro (ex: Situação diferente de Cancelado). */
  filtros: FiltroRelatorio[]
  blocos: BlocoRelatorio[]
}

export const NOME_TIPO_BLOCO: Record<TipoBloco, string> = {
  numero: 'Cartão de número',
  colunas: 'Colunas',
  barras: 'Barras (ranking)',
  linha: 'Linha',
  area: 'Área',
  rosca: 'Rosca',
  tabela: 'Tabela'
}

export const NOME_OPERACAO: Record<Operacao, string> = {
  soma: 'Soma',
  media: 'Média',
  minimo: 'Mínimo',
  maximo: 'Máximo',
  contagem: 'Contagem'
}

export function novoIdBloco(): string {
  return 'b' + Math.random().toString(36).slice(2, 10)
}

export function definicaoVazia(fontes: FonteId[] = ['pedidos']): DefinicaoRelatorio {
  return { versao: 1, fontes: normalizarFontes(fontes), cor: '', filtros: [], blocos: [] }
}

function corValida(v: unknown): CorBloco {
  return IDS_CORES.includes(v as string) ? (v as CorBloco) : ''
}

/** Hex da cor no tema pedido, ou `null` pra cor vazia/desconhecida. */
export function hexDaCor(cor: string, escuro: boolean): string | null {
  const achada = CORES_BLOCO.find((c) => c.id === cor)
  return achada ? (escuro ? achada.escuro : achada.claro) : null
}

function normalizarFiltros(bruto: unknown, validos: Set<string>): FiltroRelatorio[] {
  if (!Array.isArray(bruto)) return []
  const filtros: FiltroRelatorio[] = []
  for (const f of bruto as any[]) {
    if (!f || !validos.has(f.campo)) continue
    const valores = Array.isArray(f.valores) ? f.valores.map((v: unknown) => String(v)).filter(Boolean) : []
    if (!valores.length) continue
    filtros.push({ campo: f.campo, op: f.op === 'diferente' ? 'diferente' : 'igual', valores })
  }
  return filtros
}

/**
 * Deixa a planta coerente, venha ela da IA, do banco ou do editor: tira campo que não existe
 * nas fontes escolhidas, medida numérica em campo de texto, bloco sem nada pra mostrar.
 * Nunca lança erro — o pior caso é um painel com menos blocos.
 */
export function normalizarDefinicao(bruta: unknown, fontesPedidas?: unknown): DefinicaoRelatorio {
  const entrada = (bruta ?? {}) as any
  const fontes = normalizarFontes(fontesPedidas ?? entrada.fontes)
  const validos = new Set(camposDasFontes(fontes).map((c) => c.id))

  const blocos: BlocoRelatorio[] = []
  const idsUsados = new Set<string>()
  for (const b of Array.isArray(entrada.blocos) ? (entrada.blocos as any[]) : []) {
    if (!b || !TIPOS_BLOCO.includes(b.tipo)) continue

    const medidas: MedidaBloco[] = []
    for (const m of Array.isArray(b.medidas) ? (b.medidas as any[]) : []) {
      const campo = m && validos.has(m.campo) ? campoRelatorio(m.campo)! : null
      if (!campo) continue
      const numerico = campo.tipo === 'numero' || campo.tipo === 'moeda'
      // conta em texto/data só faz sentido como contagem
      const op: Operacao = OPERACOES.includes(m.op) && (numerico || m.op === 'contagem') ? m.op : numerico ? 'soma' : 'contagem'
      medidas.push({ campo: campo.id, op })
    }

    const grupos: GrupoBloco[] = []
    for (const g of Array.isArray(b.grupos) ? (b.grupos as any[]) : []) {
      const campo = g && validos.has(g.campo) ? campoRelatorio(g.campo)! : null
      if (!campo || grupos.some((x) => x.campo === campo.id)) continue
      const periodo: PeriodoGrupo = campo.tipo === 'data' ? (PERIODOS.includes(g.periodo) && g.periodo ? g.periodo : 'mes') : ''
      grupos.push({ campo: campo.id, periodo })
    }

    const tipo = b.tipo as TipoBloco
    if (tipo === 'tabela' ? !medidas.length && !grupos.length : !medidas.length) continue
    if (tipo !== 'numero' && tipo !== 'tabela' && !grupos.length) continue

    let id = typeof b.id === 'string' && b.id ? b.id : novoIdBloco()
    while (idsUsados.has(id)) id = novoIdBloco()
    idsUsados.add(id)

    const largura = Number(b.largura)
    blocos.push({
      id,
      tipo,
      titulo: String(b.titulo ?? '').trim().slice(0, 80) || NOME_TIPO_BLOCO[tipo],
      largura: (LARGURAS as readonly number[]).includes(largura) ? largura : tipo === 'numero' ? 3 : 6,
      medidas: tipo === 'tabela' ? medidas.slice(0, 6) : tipo === 'numero' || tipo === 'rosca' ? medidas.slice(0, 1) : medidas.slice(0, 4),
      grupos: tipo === 'numero' ? [] : tipo === 'tabela' ? grupos.slice(0, 5) : tipo === 'rosca' ? grupos.slice(0, 1) : grupos.slice(0, 2),
      ordem: ORDENS.includes(b.ordem) ? b.ordem : 'valor_desc',
      limite: Math.max(0, Math.min(200, Math.trunc(Number(b.limite) || 0))),
      filtros: normalizarFiltros(b.filtros, validos),
      cor: corValida(b.cor),
      icone: (ICONES_BLOCO as readonly string[]).includes(b.icone) ? b.icone : '',
      // "cheio" é só do cartão de número: um gráfico sobre fundo colorido perde a leitura das séries
      estilo: ESTILOS_BLOCO.includes(b.estilo) ? (b.estilo === 'cheio' && tipo !== 'numero' ? 'suave' : b.estilo) : 'simples',
      curva: (tipo === 'linha' || tipo === 'area') && b.curva === 'suave' ? 'suave' : 'reta',
      rotulos: tipo !== 'numero' && tipo !== 'tabela' && b.rotulos === true
    })
  }

  return {
    versao: 1,
    fontes,
    cor: corValida(entrada.cor),
    filtros: normalizarFiltros(entrada.filtros, validos),
    blocos: blocos.slice(0, 24)
  }
}

/** Campos que a planta realmente usa — o link público só recebe essas colunas. */
export function camposUsados(def: DefinicaoRelatorio): string[] {
  const usados = new Set<string>(['pedido.emissao'])
  for (const f of def.filtros) usados.add(f.campo)
  for (const b of def.blocos) {
    for (const m of b.medidas) usados.add(m.campo)
    for (const g of b.grupos) usados.add(g.campo)
    for (const f of b.filtros) usados.add(f.campo)
  }
  return [...usados]
}

/** Linha de dados: chave = id do campo. `_pid` (id do pedido) liga item ↔ pedido. */
export type LinhaRelatorio = Record<string, string | number | null>

export interface DadosRelatorio {
  pedidos: LinhaRelatorio[]
  itens: LinhaRelatorio[]
}
