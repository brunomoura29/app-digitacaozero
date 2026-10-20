/**
 * Condição de pagamento de uma fábrica (Cadastros → Condições de pagamento). `percentual` com
 * sinal, como nas políticas do cliente: negativo = desconto, positivo = acréscimo — vale pra
 * ordem de compra inteira, sobre o subtotal dos itens.
 */
export interface CondicaoPagamento {
  id: string
  empresa_id: string
  fabrica_id: string
  nome: string
  percentual: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
  fabricas?: { nome: string } | null
}

export interface CondicaoPagamentoInput {
  fabrica_id: string
  nome: string
  percentual: number
  ativo: boolean
}

/** Ajuste da condição sobre o subtotal, em centavos redondos (o banco faz a mesma conta ao salvar). */
export function valorDaCondicao(subtotal: number, percentual: number): number {
  return Math.round(subtotal * (percentual || 0)) / 100
}
