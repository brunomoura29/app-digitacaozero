export interface ResultadoExtracao {
  campos: Record<string, unknown>
  itens: Record<string, unknown>[]
}

export interface ExtracaoResposta {
  extracaoId: string
  dadosExtraidos: ResultadoExtracao
  reaproveitado: boolean
}
