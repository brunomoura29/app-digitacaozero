export type AlcancePolitica = 'todos' | 'grupo' | 'produto'
export type TipoPolitica = 'percentual' | 'quantidade'

/** Faixa por quantidade: vale a partir de `a_partir_de` unidades. % com sinal (negativo = desconto). */
export interface FaixaPolitica {
  a_partir_de: number
  percentual: number
}

export interface PoliticaCliente {
  id: string
  empresa_id: string
  cliente_id: string
  fabrica_id: string
  alcance: AlcancePolitica
  grupo_id: string | null
  produto_id: string | null
  tipo: TipoPolitica
  /** % com sinal (negativo = desconto) — só no tipo `percentual`. */
  percentual: number | null
  faixas: FaixaPolitica[]
  /** "AAAA-MM-DD" ou null (sem prazo). */
  valida_ate: string | null
  ativo: boolean
  observacao: string | null
  criado_em: string
  atualizado_em: string
  fabricas: { nome: string } | null
  grupos: { nome: string } | null
  produtos: { descricao: string; sku: string | null } | null
}

export interface PoliticaClienteInput {
  cliente_id: string
  fabrica_id: string
  alcance: AlcancePolitica
  grupo_id: string | null
  produto_id: string | null
  tipo: TipoPolitica
  percentual: number | null
  faixas: FaixaPolitica[]
  valida_ate: string | null
  ativo: boolean
  observacao: string | null
}
