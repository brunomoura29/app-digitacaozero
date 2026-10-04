import type { Endereco } from '~/types/cliente'

/** Dados do representante (empresa) — editados em Configurações e exibidos no cabeçalho da OC. */
export interface EmpresaDados {
  id: string
  nome: string
  documento_legal: string | null
  logo_url: string | null
  endereco: Endereco | null
  telefone: string | null
  email: string | null
}

export type EmpresaInput = Partial<Omit<EmpresaDados, 'id'>>

/** Parte identificada da Ordem de Compra (representante ou cliente). */
export interface ParteOC {
  nome: string | null
  documento?: string | null
  documento_legal?: string | null
  inscricao_estadual?: string | null
  logo_url?: string | null
  email: string | null
  telefone: string | null
  endereco: Endereco | null
}

/** Cabeçalho da OC — vem da RPC `buscar_cabecalho_oc_por_token` no link público. */
export interface CabecalhoOC {
  empresa: ParteOC | null
  cliente: ParteOC | null
  fabrica: string | null
}
