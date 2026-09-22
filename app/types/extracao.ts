export interface ResultadoExtracao {
  campos: Record<string, unknown>
  /** Nomes das colunas da tabela de itens, como impressas no documento (não os campos do template). */
  colunasItem: string[]
  /** Uma linha por item, já zipada coluna→valor (chaves = `colunasItem`). */
  linhas: Record<string, unknown>[]
}

export interface ExtracaoResposta {
  extracaoId: string
  dadosExtraidos: ResultadoExtracao
  reaproveitado: boolean
}
