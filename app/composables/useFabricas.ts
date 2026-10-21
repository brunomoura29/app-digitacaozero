import type { Fabrica } from '~/types/fabrica'

const COLUNAS = 'id, empresa_id, nome, criado_em'

/**
 * Fábricas/fornecedores da cotação — tela própria em /fabricas (criar, renomear, excluir) e
 * busca-ou-cria nos formulários (tabela de preço, condições, pedido).
 */
export function useFabricas() {
  const supabase = useSupabaseClient()

  const itens = useState<Fabrica[]>('fabricas:itens', () => [])
  const carregando = useState<boolean>('fabricas:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase.from('fabricas').select(COLUNAS).order('nome', { ascending: true })
      if (error) throw error
      itens.value = (data as unknown as Fabrica[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  function porId(id: string): Fabrica | null {
    return itens.value.find((f) => f.id === id) ?? null
  }

  async function criar(nome: string): Promise<Fabrica> {
    const { data, error } = await supabase.from('fabricas').insert({ nome }).select(COLUNAS).single()
    if (error) throw error
    const nova = data as unknown as Fabrica
    itens.value = [...itens.value, nova].sort((a, b) => a.nome.localeCompare(b.nome))
    return nova
  }

  async function renomear(id: string, nome: string): Promise<Fabrica> {
    const { data, error } = await supabase.from('fabricas').update({ nome }).eq('id', id).select(COLUNAS).single()
    if (error) throw error
    const atualizada = data as unknown as Fabrica
    itens.value = itens.value.map((f) => (f.id === id ? atualizada : f)).sort((a, b) => a.nome.localeCompare(b.nome))
    return atualizada
  }

  /**
   * Onde a fábrica é usada. Preços e pedidos impedem a exclusão (FK sem cascade); políticas e
   * condições de pagamento são apagadas junto (FK on delete cascade) — a tela avisa antes.
   */
  async function contarUso(id: string): Promise<UsoFabrica> {
    const contar = async (tabela: string) => {
      const { count, error } = await supabase.from(tabela).select('id', { count: 'exact', head: true }).eq('fabrica_id', id)
      if (error) throw error
      return count ?? 0
    }
    const [precos, pedidos, politicas, condicoes] = await Promise.all([
      contar('precos'),
      contar('pedidos'),
      contar('politicas_cliente'),
      contar('condicoes_pagamento')
    ])
    return { precos, pedidos, politicas, condicoes }
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('fabricas').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((f) => f.id !== id)
  }

  return { itens, carregando, carregar, porId, criar, renomear, contarUso, remover }
}

export interface UsoFabrica {
  precos: number
  pedidos: number
  politicas: number
  condicoes: number
}
