export type TipoModelo = 'imagem' | 'pdf' | 'xlsx' | 'misto'

export const TIPOS_MODELO: { valor: TipoModelo; label: string }[] = [
  { valor: 'imagem', label: 'Imagem' },
  { valor: 'pdf', label: 'PDF' },
  { valor: 'xlsx', label: 'Planilha (XLSX)' },
  { valor: 'misto', label: 'Misto' }
]

export type TipoCampo = 'texto' | 'numero' | 'data' | 'moeda' | 'booleano'

export const TIPOS_CAMPO: { valor: TipoCampo; label: string }[] = [
  { valor: 'texto', label: 'Texto' },
  { valor: 'numero', label: 'Número' },
  { valor: 'data', label: 'Data' },
  { valor: 'moeda', label: 'Moeda' },
  { valor: 'booleano', label: 'Sim/Não' }
]

export interface CampoSchema {
  id: string
  nome: string
  tipo: TipoCampo
  obrigatorio: boolean
  regex?: string | null
}

export interface SchemaModelo {
  /** Campos do cabeçalho do documento (ex: cliente, data do pedido). */
  campos: CampoSchema[]
  /** Campos repetidos por linha/item (ex: sku, quantidade, preço). */
  campos_item: CampoSchema[]
  /** Dicas livres pra guiar a extração (prompt da IA). */
  dicas: Record<string, string>
}

export function schemaVazio(): SchemaModelo {
  return { campos: [], campos_item: [], dicas: {} }
}

export interface Modelo {
  id: string
  empresa_id: string
  nome: string
  descricao: string | null
  versao: number
  tipo: TipoModelo
  schema: SchemaModelo
  arquivo_exemplo_url: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

/** Payload de criação/edição (o que o formulário manda). */
export interface ModeloInput {
  nome: string
  descricao: string | null
  tipo: TipoModelo
  schema: SchemaModelo
  ativo: boolean
}

export interface ModeloFiltros {
  q: string
}
