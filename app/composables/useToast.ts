export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  title?: string
  message: string
  duration: number
}

export interface ToastOptions {
  title?: string
  duration?: number
}

let seq = 0

export function useToast() {
  const toasts = useState<ToastItem[]>('shift3-toasts', () => [])

  const dismiss = (id: number) => {
    const i = toasts.value.findIndex((t) => t.id === id)
    if (i !== -1) toasts.value.splice(i, 1)
  }

  const show = (input: { type?: ToastType; message: string } & ToastOptions) => {
    const id = ++seq
    const toast: ToastItem = {
      id,
      type: input.type ?? 'info',
      title: input.title,
      message: input.message,
      duration: input.duration ?? 4000
    }
    toasts.value.push(toast)
    if (import.meta.client && toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration)
    }
    return id
  }

  const make =
    (type: ToastType) =>
    (message: string, options: ToastOptions = {}) =>
      show({ type, message, ...options })

  return {
    toasts,
    show,
    dismiss,
    clear: () => (toasts.value = []),
    success: make('success'),
    error: make('error'),
    warning: make('warning'),
    info: make('info')
  }
}
