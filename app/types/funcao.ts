export type AcaoPermissao = 'ver' | 'incluir' | 'editar' | 'deletar'

export interface PermissaoModulo {
  ver: boolean
  incluir: boolean
  editar: boolean
  deletar: boolean
}

export function permissaoModuloVazia(): PermissaoModulo {
  return { ver: false, incluir: false, editar: false, deletar: false }
}

export interface ModuloSistema {
  chave: string
  label: string
}

/** Catálogo fixo dos módulos que podem ter acesso controlado por função. */
export const MODULOS_SISTEMA: ModuloSistema[] = [
  { chave: 'clientes', label: 'Clientes' },
  { chave: 'vendedores', label: 'Vendedores' },
  { chave: 'produtos', label: 'Produtos' },
  { chave: 'tabela_preco', label: 'Tabela de preço' },
  { chave: 'pedidos', label: 'Pedidos' },
  { chave: 'relatorios', label: 'Relatórios' }
]

export const ACOES_PERMISSAO: { chave: AcaoPermissao; label: string }[] = [
  { chave: 'ver', label: 'Ver' },
  { chave: 'incluir', label: 'Incluir' },
  { chave: 'editar', label: 'Editar' },
  { chave: 'deletar', label: 'Deletar' }
]

export interface Funcao {
  id: string
  empresa_id: string
  nome: string
  descricao: string | null
  permissoes: Record<string, PermissaoModulo>
  criado_em: string
  atualizado_em: string
}

/** Payload de criação/edição (o que o formulário manda). */
export interface FuncaoInput {
  nome: string
  descricao: string | null
  permissoes: Record<string, PermissaoModulo>
}

export interface FuncaoFiltros {
  q: string
}
