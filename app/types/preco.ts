export interface Preco {
  id: string
  empresa_id: string
  produto_id: string
  fabrica_id: string
  referencia_id: string | null
  data_registro: string
  /** Primeiro dia do mês de competência (ex: "2026-09-01"). */
  competencia: string
  valor: number
  criado_em: string
  atualizado_em: string
  produtos: { descricao: string; sku: string | null } | null
  fabricas: { nome: string } | null
  referencias_tabela: { nome: string } | null
}

/** Payload de criação/edição (o que o formulário manda). */
export interface PrecoInput {
  produto_id: string
  fabrica_id: string
  referencia_id: string | null
  data_registro: string
  competencia: string
  valor: number
}

export interface PrecoFiltros {
  q: string
  /** "YYYY-MM" ou vazio (todos os meses). */
  competencia: string
}
