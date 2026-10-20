import type { CondicaoPagamento, CondicaoPagamentoInput } from '~/types/condicaoPagamento'

const COLUNAS = 'id, empresa_id, fabrica_id, nome, percentual, ativo, criado_em, atualizado_em, fabricas(nome)'

/** numeric do Postgres pode chegar como texto. */
function normalizar(c: any): CondicaoPagamento {
  return { ...c, percentual: Number(c.percentual) || 0 }
}

/**
 * Condições de pagamento por fábrica: o cadastro (/condicoes-pagamento) e a lista que o pedido
 * usa no seletor. Sem estado compartilhado: cada tela guarda a sua lista.
 */
export function useCondicoesPagamento() {
  const supabase = useSupabaseClient()

  async function listar(): Promise<CondicaoPagamento[]> {
    const { data, error } = await supabase.from('condicoes_pagamento').select(COLUNAS).order('nome', { ascending: true })
    if (error) throw error
    return ((data as any[]) ?? []).map(normalizar)
  }

  async function criar(dados: CondicaoPagamentoInput): Promise<CondicaoPagamento> {
    const { data, error } = await supabase.from('condicoes_pagamento').insert(dados as any).select(COLUNAS).single()
    if (error) throw traduzir(error)
    return normalizar(data)
  }

  async function atualizar(id: string, dados: CondicaoPagamentoInput): Promise<CondicaoPagamento> {
    const { data, error } = await supabase
      .from('condicoes_pagamento')
      .update({ ...dados, atualizado_em: new Date().toISOString() } as any)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw traduzir(error)
    return normalizar(data)
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('condicoes_pagamento').delete().eq('id', id)
    if (error) throw error
  }

  return { listar, criar, atualizar, remover }
}

/** Nome repetido na mesma fábrica (índice único) vira uma frase que faz sentido na tela. */
function traduzir(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('Essa fábrica já tem uma condição com esse nome.')
  return new Error(error.message)
}
