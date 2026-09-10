export type UploadStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error'

export interface UploadFile {
  id: string
  file: File
  name: string
  size: number
  /** 0..100 */
  progress: number
  status: UploadStatus
  error?: string
}

/** Envelopa um `File` do input/drop num item rastreável pela UI. */
export function createUploadFile(file: File): UploadFile {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `f_${Date.now()}_${Math.random().toString(36).slice(2)}`
  return { id, file, name: file.name, size: file.size, progress: 0, status: 'queued' }
}

/** "1.4 MB", "820 KB"… */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${units[i]}`
}

/**
 * Roda um handler assíncrono (ler / processar / extrair) sobre uma lista de
 * uploads, atualizando `status`/`progress`/`error` de cada item in-place — a UI
 * (BaseUpload) reage sozinha.
 *
 *   await processUploads(novos, async (item, setProgress) => {
 *     const data = await extrairArquivo(item.file, setProgress) // setProgress(0..100)
 *     resultados.value.push(data)
 *   }, { concurrency: 2 })
 */
export async function processUploads(
  items: UploadFile[],
  handler: (item: UploadFile, setProgress: (progress: number) => void) => Promise<void>,
  opts: { concurrency?: number } = {}
): Promise<void> {
  const concurrency = Math.max(1, opts.concurrency ?? 2)
  const queue = [...items]

  const worker = async () => {
    while (queue.length) {
      const item = queue.shift()!
      item.error = undefined
      item.progress = 0
      item.status = 'uploading'
      try {
        await handler(item, (p) => {
          item.progress = Math.max(0, Math.min(100, Math.round(p)))
          if (item.progress >= 100 && item.status === 'uploading') item.status = 'processing'
        })
        item.progress = 100
        item.status = 'done'
      } catch (e) {
        item.status = 'error'
        item.error = e instanceof Error ? e.message : 'Falha ao processar'
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
}
