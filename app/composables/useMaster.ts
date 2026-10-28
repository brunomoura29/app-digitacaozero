import type {
  AcessoSuporte,
  AssinaturaInput,
  EmpresaMaster,
  PagamentoAssinatura,
  PagamentoInput,
  Plano,
  PlanoInput
} from '~/types/master'

const COLUNAS_PLANO = 'id, nome, valor, ciclo, ativo, criado_em'

/**
 * Acesso master (/master): empresas cadastradas, assinatura (controle manual) e planos.
 * Tudo passa pelo banco com a checagem `eh_master()` — as funções recusam quem não é master.
 * Entrar/sair de uma empresa fica no auth store (recarrega a página inteira).
 */
export function useMaster() {
  const supabase = useSupabaseClient()

  async function listarEmpresas(): Promise<EmpresaMaster[]> {
    const { data, error } = await supabase.rpc('master_empresas')
    if (error) throw error
    return ((data as any[]) ?? []).map((e) => ({ ...e, usuarios: Number(e.usuarios) || 0, pedidos: Number(e.pedidos) || 0 }))
  }

  async function salvarAssinatura(empresaId: string, dados: AssinaturaInput): Promise<void> {
    const { error } = await supabase.rpc('master_salvar_assinatura', {
      p_empresa: empresaId,
      p_plano: dados.plano_id,
      p_status: dados.status,
      p_vence_em: dados.vence_em,
      p_obs: dados.obs
    })
    if (error) throw error
  }

  /** Grava o pagamento, ativa a assinatura e empurra o vencimento — tudo numa transação no banco. */
  async function registrarPagamento(empresaId: string, dados: PagamentoInput): Promise<void> {
    const { error } = await supabase.rpc('master_registrar_pagamento', {
      p_empresa: empresaId,
      p_valor: dados.valor,
      p_pago_em: dados.pago_em,
      p_referencia: dados.referencia,
      p_vencimento_novo: dados.vencimento_novo
    })
    if (error) throw error
  }

  async function listarPagamentos(empresaId: string): Promise<PagamentoAssinatura[]> {
    const { data, error } = await supabase
      .from('assinatura_pagamentos')
      .select('id, valor, pago_em, referencia, vencimento_novo, criado_em')
      .eq('empresa_id', empresaId)
      .order('pago_em', { ascending: false })
      .limit(24)
    if (error) throw error
    return ((data as any[]) ?? []).map((p) => ({ ...p, valor: Number(p.valor) || 0 }))
  }

  async function removerPagamento(id: string): Promise<void> {
    const { error } = await supabase.from('assinatura_pagamentos').delete().eq('id', id)
    if (error) throw error
  }

  async function listarAcessos(empresaId: string): Promise<AcessoSuporte[]> {
    const { data, error } = await supabase
      .from('acessos_suporte')
      .select('id, entrou_em, saiu_em')
      .eq('empresa_id', empresaId)
      .order('entrou_em', { ascending: false })
      .limit(10)
    if (error) throw error
    return (data as AcessoSuporte[]) ?? []
  }

  // ───── planos ─────

  async function listarPlanos(): Promise<Plano[]> {
    const { data, error } = await supabase.from('planos').select(COLUNAS_PLANO).order('valor', { ascending: true })
    if (error) throw error
    return ((data as any[]) ?? []).map((p) => ({ ...p, valor: Number(p.valor) || 0 }))
  }

  async function salvarPlano(id: string | null, dados: PlanoInput): Promise<void> {
    const consulta = id
      ? supabase.from('planos').update(dados as any).eq('id', id)
      : supabase.from('planos').insert(dados as any)
    const { error } = await consulta
    if (error) throw error
  }

  async function removerPlano(id: string): Promise<void> {
    const { error } = await supabase.from('planos').delete().eq('id', id)
    if (error) throw error
  }

  return {
    listarEmpresas,
    salvarAssinatura,
    registrarPagamento,
    listarPagamentos,
    removerPagamento,
    listarAcessos,
    listarPlanos,
    salvarPlano,
    removerPlano
  }
}

/** Data `AAAA-MM-DD` de hoje no fuso local (não em UTC — depois das 21h o UTC já é amanhã). */
export function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Soma um ciclo (1 mês ou 1 ano) a uma data `AAAA-MM-DD`; dia 31 em mês curto vai pro último dia. */
export function somarCiclo(dataISO: string, ciclo: 'mensal' | 'anual'): string {
  const [a, m, d] = dataISO.split('-').map(Number) as [number, number, number]
  const alvoAno = ciclo === 'anual' ? a + 1 : a + Math.floor(m / 12)
  const alvoMes = ciclo === 'anual' ? m : (m % 12) + 1
  const ultimoDia = new Date(alvoAno, alvoMes, 0).getDate()
  return `${alvoAno}-${String(alvoMes).padStart(2, '0')}-${String(Math.min(d, ultimoDia)).padStart(2, '0')}`
}

/** `AAAA-MM-DD` → `DD/MM/AAAA` (sem passar por Date, que mudaria o dia pelo fuso). */
export function dataBR(dataISO: string | null | undefined): string {
  if (!dataISO) return '—'
  const [a, m, d] = dataISO.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
