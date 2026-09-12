import type { ExtracaoResposta } from '~/types/extracao'

/** Envia o documento (foto/PDF) + template pro servidor extrair via Claude Vision. */
export function useExtracao() {
  async function extrair(arquivo: File, modeloId: string): Promise<ExtracaoResposta> {
    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('modeloId', modeloId)
    return await $fetch<ExtracaoResposta>('/api/extrair', { method: 'POST', body: formData })
  }

  return { extrair }
}
