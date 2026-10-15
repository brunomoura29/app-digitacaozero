import type { PoliticaCliente, PoliticaClienteInput } from '~/types/politica'

const COLUNAS =
  'id, empresa_id, cliente_id, fabrica_id, alcance, grupo_id, produto_id, tipo, percentual, faixas, valida_ate, ' +
  'ativo, observacao, criado_em, atualizado_em, fabricas(nome), grupos(nome), produtos(descricao, sku)'

/** numeric do Postgres chega como número; jsonb das faixas pode vir com número em texto. */
function normalizar(p: any): PoliticaCliente {
  return {
    ...p,
    percentual: p.percentual === null ? null : Number(p.percentual),
    faixas: (Array.isArray(p.faixas) ? p.faixas : []).map((f: any) => ({
      a_partir_de: Number(f.a_partir_de),
      percentual: Number(f.percentual)
    }))
  }
}

/**
 * Políticas comerciais do cliente (aba no cadastro do cliente) e a leitura que o pedido usa.
 * Sem estado compartilhado: cada tela guarda a sua lista.
 */
export function usePoliticasCliente() {
  const supabase = useSupabaseClient()

  async function listar(clienteId: string): Promise<PoliticaCliente[]> {
    const { data, error } = await supabase
      .from('politicas_cliente')
      .select(COLUNAS)
      .eq('cliente_id', clienteId)
      .order('criado_em', { ascending: true })
    if (error) throw error
    return ((data as any[]) ?? []).map(normalizar)
  }

  /** As do cliente pra essa fábrica — o pedido filtra vigência pela data dele. */
  async function doClienteNaFabrica(clienteId: string, fabricaId: string): Promise<PoliticaCliente[]> {
    const { data, error } = await supabase
      .from('politicas_cliente')
      .select(COLUNAS)
      .eq('cliente_id', clienteId)
      .eq('fabrica_id', fabricaId)
      .eq('ativo', true)
    if (error) throw error
    return ((data as any[]) ?? []).map(normalizar)
  }

  async function criar(dados: PoliticaClienteInput): Promise<PoliticaCliente> {
    const { data, error } = await supabase.from('politicas_cliente').insert(dados as any).select(COLUNAS).single()
    if (error) throw error
    return normalizar(data)
  }

  async function atualizar(id: string, dados: PoliticaClienteInput): Promise<PoliticaCliente> {
    const { data, error } = await supabase
      .from('politicas_cliente')
      .update({ ...dados, atualizado_em: new Date().toISOString() } as any)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    return normalizar(data)
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('politicas_cliente').delete().eq('id', id)
    if (error) throw error
  }

  return { listar, doClienteNaFabrica, criar, atualizar, remover }
}
