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

/**
 * Papel que um campo do ITEM cumpre nas colunas fixas de `pedidos_itens`. Só faz sentido
 * pra `campos_item` (o cabeçalho vai inteiro pra `dados_extras`, sem coluna fixa). Quando
 * definido explicitamente aqui, tem prioridade sobre a heurística por sinônimo de nome —
 * resolve o caso de dois campos parecidos no mesmo template (ex: "SKU Fábrica" x "SKU
 * Cliente") que a heurística sozinha não consegue distinguir.
 */
export type PapelCampoItem = 'sku' | 'descricao' | 'quantidade' | 'preco_unitario'

export const PAPEIS_CAMPO_ITEM: { valor: PapelCampoItem; label: string }[] = [
  { valor: 'sku', label: 'Código do produto (identifica no catálogo)' },
  { valor: 'descricao', label: 'Descrição' },
  { valor: 'quantidade', label: 'Quantidade' },
  { valor: 'preco_unitario', label: 'Preço unitário' }
]

/**
 * Campo do cadastro de produtos com que o código vindo do documento (o campo de item com
 * papel `sku`) é comparado pra pré-selecionar o produto na revisão do pedido. Cada
 * documento identifica o produto de um jeito — por isso é definido por template.
 */
export type IdentificadorProduto = 'sku' | 'codigo_barras' | 'numero_serie'

export const IDENTIFICADORES_PRODUTO: { valor: IdentificadorProduto; label: string }[] = [
  { valor: 'sku', label: 'SKU' },
  { valor: 'codigo_barras', label: 'Código de barras' },
  { valor: 'numero_serie', label: 'Número de série' }
]

/**
 * Pra onde vão os dados importados com o template: `pedido` (Ordem de Compra — o fluxo
 * original) ou `dados` (conjunto de dados pra análise/Power BI, em /importacoes — aí
 * `campos_item` são as colunas do conjunto e `papel`/`identificador_produto` não se aplicam).
 */
export type DestinoModelo = 'pedido' | 'dados'

export const DESTINOS_MODELO: { valor: DestinoModelo; label: string }[] = [
  { valor: 'pedido', label: 'Pedido (Ordem de Compra)' },
  { valor: 'dados', label: 'Dados para análise (Power BI)' }
]

/** Templates criados antes dessa opção não têm `destino` — valem como `pedido`. */
export function destinoDoModelo(modelo: { schema?: SchemaModelo | null } | null | undefined): DestinoModelo {
  return modelo?.schema?.destino ?? 'pedido'
}

export interface CampoSchema {
  id: string
  nome: string
  tipo: TipoCampo
  obrigatorio: boolean
  regex?: string | null
  /** Só usado em `campos_item` — ver `PapelCampoItem`. */
  papel?: PapelCampoItem | null
}

export interface SchemaModelo {
  /** Campos do cabeçalho do documento (ex: cliente, data do pedido). */
  campos: CampoSchema[]
  /** Campos repetidos por linha/item (ex: sku, quantidade, preço). */
  campos_item: CampoSchema[]
  /** Dicas livres pra guiar a extração (prompt da IA). */
  dicas: Record<string, string>
  /** Ver `IdentificadorProduto`. Templates antigos não têm — vale `sku`. */
  identificador_produto?: IdentificadorProduto
  /** Ver `DestinoModelo`. Ausente = `pedido`. */
  destino?: DestinoModelo
  /**
   * Como ler a planilha de cada cliente (chave = id do cliente) — aprendido na primeira
   * importação e reaproveitado nas seguintes. Só no destino `dados`. Ver utils/layoutPlanilha.ts.
   */
  layouts?: Record<string, LayoutSalvo>
}

/** De onde sai o valor de um campo do template numa planilha. */
export type OrigemCampoLayout = 'coluna' | 'nivel' | 'tipo_linha' | 'ancestral' | 'grupo' | 'calculada'

/**
 * Um passo do tratamento que o usuário pediu em texto livre, já traduzido pela IA: criar uma
 * coluna por fórmula ou manter/remover linhas por condição. Quem executa é o código
 * (utils/tratamentoPlanilha.ts, onde está a linguagem das fórmulas).
 */
export interface EtapaTratamento {
  tipo: 'coluna' | 'manter' | 'remover'
  /** Nome da coluna criada (só em `coluna`). */
  nome: string
  formula: string
  /** Só em `coluna`: onde a fórmula der vazio, repete o último valor de cima. */
  repetir_abaixo: boolean
  /** O que a etapa faz, em português simples — aparece na tela. */
  explicacao: string
}

/**
 * "Receita" de leitura de uma planilha: onde estão os títulos, que coluna do Excel alimenta
 * cada campo do template e o que deixar de fora. Quem escreve é a IA (ou o que ficou salvo da
 * última importação do cliente); quem aplica é o código, no arquivo inteiro.
 */
export interface ReceitaLayout {
  /** Linha dos títulos das colunas (1 = primeira linha da planilha). */
  linha_titulos: number
  titulos_em_duas_linhas: boolean
  /**
   * `nivel` só vale na origem `ancestral` (de que nível é a linha-mãe repetida); nas outras é 0.
   * `coluna_calculada` só vale na origem `calculada` (o nome da coluna criada por uma etapa).
   */
  campos: {
    campo_id: string
    origem: OrigemCampoLayout
    colunas: string[]
    nivel?: number
    coluna_calculada?: string
  }[]
  /** Tratamento pedido pelo usuário, aplicado depois da leitura e antes do mapeamento. */
  etapas?: EtapaTratamento[]
  /** Linhas a ignorar: as que têm o texto `contem` na coluna (letra) `coluna`. */
  ignorar: { coluna: string; contem: string }[]
  /** Letra da coluna dos títulos de grupo, ou '' quando não há. */
  coluna_grupo: string
}

export interface LayoutSalvo {
  receita: ReceitaLayout
  /** Títulos do arquivo de onde a receita saiu — se o próximo arquivo não bater, o layout mudou. */
  assinatura: string
  /** O que o usuário pediu pra IA neste cliente — se ele mudar o texto, a receita é refeita. */
  instrucoes?: string
  salvo_em: string
}

/** O que a IA devolve: a receita + o que ela entendeu, em português, pra mostrar na tela. */
export interface AnaliseLayout extends ReceitaLayout {
  resumo: string
  confianca: 'alta' | 'media' | 'baixa'
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
