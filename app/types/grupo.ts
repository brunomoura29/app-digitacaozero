export interface Grupo {
  id: string
  empresa_id: string
  nome: string
  criado_em: string
}

/** Subgrupo pertence a um grupo — o formulário só lista os do grupo escolhido. */
export interface Subgrupo {
  id: string
  empresa_id: string
  grupo_id: string
  nome: string
  criado_em: string
}
