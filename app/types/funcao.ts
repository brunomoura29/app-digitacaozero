export type NivelPermissao = 'nenhum' | 'ver' | 'editar'

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

export interface Funcao {
  id: string
  empresa_id: string
  nome: string
  descricao: string | null
  permissoes: Record<string, NivelPermissao>
  criado_em: string
  atualizado_em: string
}

/** Payload de criação/edição (o que o formulário manda). */
export interface FuncaoInput {
  nome: string
  descricao: string | null
  permissoes: Record<string, NivelPermissao>
}

export interface FuncaoFiltros {
  q: string
}
