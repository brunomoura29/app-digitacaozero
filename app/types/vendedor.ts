export interface Vendedor {
  id: string
  empresa_id: string
  nome: string
  email: string | null
  telefone: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

/** Payload de criação/edição (o que o formulário manda). */
export interface VendedorInput {
  nome: string
  email: string | null
  telefone: string | null
  ativo: boolean
}

export type VendedorFiltroAtivo = 'todos' | 'ativos' | 'inativos'

export interface VendedorFiltros {
  q: string
  ativo: VendedorFiltroAtivo
}
