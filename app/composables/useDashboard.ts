import type { FalhaLeitura, LinkResumo, PedidoResumo } from '~/utils/dashboard'

/**
 * Dados do Dashboard: pedidos (só o necessário pros números), links enviados dos que estão
 * em aprovação e falhas recentes de leitura de arquivo. O que cada usuário vê já vem
 * filtrado pela RLS — vendedor enxerga os pedidos que a tela de Pedidos mostra pra ele.
 * As contas ficam em `~/utils/dashboard`.
 */
export function useDashboard() {
  const supabase = useSupabaseClient()

  const pedidos = useState<PedidoResumo[]>('dashboard:pedidos', () => [])
  const links = useState<LinkResumo[]>('dashboard:links', () => [])
  const falhas = useState<FalhaLeitura[]>('dashboard:falhas', () => [])
  const carregado = useState<boolean>('dashboard:carregado', () => false)
  const carregando = ref(false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, status, total, criado_em, atualizado_em, clientes(nome)')
        .order('criado_em', { ascending: false })
      if (error) throw error
      pedidos.value = (data as unknown as PedidoResumo[]) ?? []

      const emAprovacao = pedidos.value.filter((p) => p.status === 'em_aprovacao').map((p) => p.id)
      const desde = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()

      // links e falhas são complemento: se a RLS negar (ex.: vendedor sem acesso a
      // `extracoes`), o painel segue só com os pedidos
      const [resLinks, resFalhas] = await Promise.all([
        emAprovacao.length
          ? supabase.from('compartilhamentos').select('pedido_id, criado_em, expirado_em').in('pedido_id', emAprovacao)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('extracoes')
          .select('id, arquivo_nome, erro, criado_em')
          .eq('status', 'erro')
          .gte('criado_em', desde)
          .order('criado_em', { ascending: false })
          .limit(10)
      ])
      links.value = resLinks.error ? [] : ((resLinks.data as LinkResumo[]) ?? [])
      falhas.value = resFalhas.error ? [] : ((resFalhas.data as FalhaLeitura[]) ?? [])
      carregado.value = true
    } finally {
      carregando.value = false
    }
  }

  return { pedidos, links, falhas, carregado, carregando, carregar }
}
