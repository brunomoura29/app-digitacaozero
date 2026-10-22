import type { ClienteFabrica, PadroesPedidoCliente } from '~/types/cliente'

const COLUNAS = 'id, cliente_id, fabrica_id, referencia_id, principal, fabricas(nome), referencias_tabela(nome)'

/** Principal primeiro, depois pelo nome da fábrica. */
function ordenar(lista: ClienteFabrica[]): ClienteFabrica[] {
  return [...lista].sort(
    (a, b) => Number(b.principal) - Number(a.principal) || (a.fabricas?.nome ?? '').localeCompare(b.fabricas?.nome ?? '')
  )
}

/**
 * Padrões do pedido do cliente: template (coluna `clientes.modelo_padrao_id`) e as fábricas de
 * quem ele compra com a tabela de preço de cada uma (`clientes_fabricas`, uma principal).
 * Usado na aba do cadastro do cliente e na importação do pedido. Sem estado compartilhado.
 */
export function usePadroesCliente() {
  const supabase = useSupabaseClient()

  async function carregar(clienteId: string): Promise<PadroesPedidoCliente> {
    const [cliente, fabricas] = await Promise.all([
      supabase.from('clientes').select('modelo_padrao_id').eq('id', clienteId).maybeSingle(),
      supabase.from('clientes_fabricas').select(COLUNAS).eq('cliente_id', clienteId)
    ])
    if (cliente.error) throw cliente.error
    if (fabricas.error) throw fabricas.error
    return {
      modeloId: (cliente.data as any)?.modelo_padrao_id ?? null,
      fabricas: ordenar((fabricas.data as unknown as ClienteFabrica[]) ?? [])
    }
  }

  async function definirModelo(clienteId: string, modeloId: string | null): Promise<void> {
    const { data, error } = await supabase
      .from('clientes')
      .update({ modelo_padrao_id: modeloId } as any)
      .eq('id', clienteId)
      .select('id')
    if (error) throw error
    if (!data?.length) throw new Error('Sem permissão para editar este cliente')
  }

  /** Adiciona a fábrica; a primeira do cliente já nasce principal. Devolve a lista atualizada. */
  async function adicionarFabrica(
    clienteId: string,
    fabricaId: string,
    referenciaId: string | null,
    atuais: ClienteFabrica[]
  ): Promise<ClienteFabrica[]> {
    const { data, error } = await supabase
      .from('clientes_fabricas')
      .insert({ cliente_id: clienteId, fabrica_id: fabricaId, referencia_id: referenciaId, principal: !atuais.length } as any)
      .select(COLUNAS)
      .single()
    if (error) throw error
    return ordenar([...atuais, data as unknown as ClienteFabrica])
  }

  async function definirTabela(id: string, referenciaId: string | null, atuais: ClienteFabrica[]): Promise<ClienteFabrica[]> {
    const { data, error } = await supabase
      .from('clientes_fabricas')
      .update({ referencia_id: referenciaId } as any)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    return ordenar(atuais.map((f) => (f.id === id ? (data as unknown as ClienteFabrica) : f)))
  }

  /** Troca a principal: desmarca a atual antes (o índice único só aceita uma por cliente). */
  async function definirPrincipal(id: string, atuais: ClienteFabrica[]): Promise<ClienteFabrica[]> {
    const atual = atuais.find((f) => f.principal)
    if (atual?.id === id) return atuais
    if (atual) {
      const { error } = await supabase.from('clientes_fabricas').update({ principal: false } as any).eq('id', atual.id)
      if (error) throw error
    }
    const { error } = await supabase.from('clientes_fabricas').update({ principal: true } as any).eq('id', id)
    if (error) throw error
    return ordenar(atuais.map((f) => ({ ...f, principal: f.id === id })))
  }

  /** Remove; se era a principal, a próxima (por nome) vira principal. */
  async function remover(id: string, atuais: ClienteFabrica[]): Promise<ClienteFabrica[]> {
    const { error } = await supabase.from('clientes_fabricas').delete().eq('id', id)
    if (error) throw error
    const removida = atuais.find((f) => f.id === id)
    const restantes = atuais.filter((f) => f.id !== id)
    if (removida?.principal && restantes.length) return definirPrincipal(ordenar(restantes)[0]!.id, restantes)
    return ordenar(restantes)
  }

  return { carregar, definirModelo, adicionarFabrica, definirTabela, definirPrincipal, remover }
}
