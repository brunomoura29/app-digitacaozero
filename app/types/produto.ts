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
  ativo: boolean
  criado_em: string
  atualizado_em: string
  marcas: { nome: string } | null
  fabricantes: { nome: string } | null
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
  ativo: boolean
}

export type ProdutoFiltroAtivo = 'todos' | 'ativos' | 'inativos'

export interface ProdutoFiltros {
  q: string
  ativo: ProdutoFiltroAtivo
}
