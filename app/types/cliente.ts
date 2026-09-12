export interface Endereco {
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
}

export interface Cliente {
  id: string
  empresa_id: string
  nome: string
  documento: string | null
  inscricao_estadual: string | null
  email: string | null
  telefone: string | null
  endereco: Endereco
  vendedor_id: string | null
  observacoes: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

/** Payload de criação/edição (o que o formulário manda). */
export interface ClienteInput {
  nome: string
  documento: string | null
  inscricao_estadual: string | null
  email: string | null
  telefone: string | null
  vendedor_id: string | null
  endereco: Endereco
  observacoes: string | null
  ativo: boolean
}

export type ClienteFiltroAtivo = 'todos' | 'ativos' | 'inativos'

export interface ClienteFiltros {
  q: string
  ativo: ClienteFiltroAtivo
}
