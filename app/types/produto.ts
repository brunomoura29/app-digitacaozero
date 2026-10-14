export interface Produto {
  id: string
  empresa_id: string
  sku: string | null
  codigo_barras: string | null
  descricao: string
  marca_id: string | null
  fabricante_id: string | null
  modelo: string | null
  numero_serie: string | null
  unidade: string
  ncm: string | null
  /** Origem da mercadoria na nota fiscal: 0 a 8 (ver `ORIGENS_PRODUTO`). */
  origem: number | null
  montadora_id: string | null
  oem: string | null
  grupo_id: string | null
  subgrupo_id: string | null
  aplicacao: string | null
  /** kg */
  peso: number | null
  /** cm */
  altura: number | null
  /** cm */
  largura: number | null
  /** cm */
  comprimento: number | null
  /** Unidades por caixa master. */
  caixa_master: number | null
  qtd_minima_venda: number | null
  /** Alíquota em %, de 0 a 100. */
  ipi: number | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
  marcas: { nome: string } | null
  fabricantes: { nome: string } | null
  montadoras: { nome: string } | null
  grupos: { nome: string } | null
  subgrupos: { nome: string } | null
}

/** Payload de criação/edição (o que o formulário manda). */
export interface ProdutoInput {
  sku: string | null
  codigo_barras: string | null
  descricao: string
  marca_id: string | null
  fabricante_id: string | null
  modelo: string | null
  numero_serie: string | null
  unidade: string
  ncm: string | null
  origem: number | null
  montadora_id: string | null
  oem: string | null
  grupo_id: string | null
  subgrupo_id: string | null
  aplicacao: string | null
  peso: number | null
  altura: number | null
  largura: number | null
  comprimento: number | null
  caixa_master: number | null
  qtd_minima_venda: number | null
  ipi: number | null
  ativo: boolean
}

/** Origem da mercadoria (tabela A do CST da nota fiscal). */
export const ORIGENS_PRODUTO: { valor: number; label: string }[] = [
  { valor: 0, label: '0 — Nacional' },
  { valor: 1, label: '1 — Estrangeira, importação direta' },
  { valor: 2, label: '2 — Estrangeira, adquirida no mercado interno' },
  { valor: 3, label: '3 — Nacional, conteúdo de importação entre 40% e 70%' },
  { valor: 4, label: '4 — Nacional, produção conforme processos produtivos básicos' },
  { valor: 5, label: '5 — Nacional, conteúdo de importação até 40%' },
  { valor: 6, label: '6 — Estrangeira, importação direta, sem similar nacional (CAMEX)' },
  { valor: 7, label: '7 — Estrangeira, adquirida no mercado interno, sem similar nacional (CAMEX)' },
  { valor: 8, label: '8 — Nacional, conteúdo de importação acima de 70%' }
]

export function origemProdutoLabel(origem: number | null | undefined): string | null {
  if (origem === null || origem === undefined) return null
  return ORIGENS_PRODUTO.find((o) => o.valor === origem)?.label ?? String(origem)
}

export type ProdutoFiltroAtivo = 'todos' | 'ativos' | 'inativos'

export interface ProdutoFiltros {
  q: string
  ativo: ProdutoFiltroAtivo
}
