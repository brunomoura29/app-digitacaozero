import type { SituacaoAssinatura } from '~/stores/auth'

export type CicloPlano = 'mensal' | 'anual'
/** O que o master grava. A situação (com vencida/bloqueada) é calculada no banco a partir disso + vencimento. */
export type StatusAssinatura = 'teste' | 'ativa' | 'suspensa' | 'cancelada'

export interface Plano {
  id: string
  nome: string
  valor: number
  ciclo: CicloPlano
  ativo: boolean
  criado_em: string
}

export type PlanoInput = Pick<Plano, 'nome' | 'valor' | 'ciclo' | 'ativo'>

/** Linha de `master_empresas()`. */
export interface EmpresaMaster {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  criado_em: string
  plano_id: string | null
  plano_nome: string | null
  assinatura_status: StatusAssinatura
  assinatura_vence_em: string | null
  assinatura_obs: string | null
  situacao: SituacaoAssinatura
  admin_email: string | null
  usuarios: number
  pedidos: number
  ultimo_pedido_em: string | null
  ultimo_login_em: string | null
}

export interface AssinaturaInput {
  plano_id: string | null
  status: StatusAssinatura
  vence_em: string | null
  obs: string | null
}

export interface PagamentoAssinatura {
  id: string
  valor: number
  pago_em: string
  referencia: string | null
  vencimento_novo: string | null
  criado_em: string
}

export interface PagamentoInput {
  valor: number
  pago_em: string
  referencia: string | null
  vencimento_novo: string | null
}

export interface AcessoSuporte {
  id: string
  entrou_em: string
  saiu_em: string | null
}

export const STATUS_ASSINATURA: { valor: StatusAssinatura; label: string }[] = [
  { valor: 'teste', label: 'Em teste' },
  { valor: 'ativa', label: 'Ativa' },
  { valor: 'suspensa', label: 'Suspensa' },
  { valor: 'cancelada', label: 'Cancelada' }
]

export const SITUACOES: Record<SituacaoAssinatura, { label: string; classe: string }> = {
  teste: { label: 'Em teste', classe: 'bg-shift3-teal/10 text-shift3-teal' },
  ativa: { label: 'Ativa', classe: 'bg-success/15 text-shift3-teal' },
  vencida: { label: 'Vencida', classe: 'bg-warning/20 text-shift3-text' },
  bloqueada: { label: 'Bloqueada', classe: 'bg-danger/15 text-danger' }
}
