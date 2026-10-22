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

/** Abas da tela do cliente. */
export type AbaCliente = 'dados' | 'padroes' | 'politicas'

/** Fábrica de quem o cliente compra, com a tabela de preço padrão (aba "Padrões do pedido"). */
export interface ClienteFabrica {
  id: string
  cliente_id: string
  fabrica_id: string
  referencia_id: string | null
  principal: boolean
  fabricas: { nome: string } | null
  referencias_tabela: { nome: string } | null
}

/** O que a importação do pedido preenche ao escolher o cliente. */
export interface PadroesPedidoCliente {
  modeloId: string | null
  fabricas: ClienteFabrica[]
}
