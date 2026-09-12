<template>
  <div class="w-full">
    <!-- Dropzone -->
    <div
      :class="[
        'relative flex flex-col items-center justify-center gap-2 rounded-medium border-2 border-dashed px-lg py-xl text-center transition',
        disabled
          ? 'cursor-not-allowed border-shift3-border opacity-60'
          : 'cursor-pointer hover:border-shift3-green/70',
        dragging ? 'border-shift3-green bg-shift3-green/5' : 'border-shift3-input-border'
      ]"
      @click="openPicker"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <Icon name="heroicons:cloud-arrow-up" class="h-8 w-8 text-shift3-text-muted" />
      <p class="text-sm text-shift3-text">
        <span class="font-semibold">Clique para enviar</span>
        ou arraste {{ multiple ? 'os arquivos' : 'o arquivo' }} aqui
      </p>
      <p v-if="hint" class="text-xs text-shift3-text-muted">{{ hint }}</p>

      <input
        ref="inputRef"
        type="file"
        class="hidden"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="onInputChange"
      />
    </div>

    <!-- Rejeições -->
    <ul v-if="rejeicoes.length" class="mt-2 space-y-1">
      <li
        v-for="(r, i) in rejeicoes"
        :key="i"
        class="flex items-center gap-1.5 text-xs text-danger"
      >
        <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" />
        <span class="truncate">{{ r.file.name }} — {{ r.reason }}</span>
      </li>
    </ul>

    <!-- Lista de arquivos -->
    <ul v-if="modelValue.length" class="mt-3 space-y-2">
      <li
        v-for="item in modelValue"
        :key="item.id"
        class="flex items-center gap-3 rounded-default border border-shift3-border bg-shift3-bg-card p-2.5"
      >
        <BaseSpinner
          v-if="item.status === 'uploading' || item.status === 'processing'"
          size="md"
          color-class="text-shift3-green"
        />
        <Icon
          v-else
          :name="statusIcon(item)"
          :class="['h-5 w-5 shrink-0', statusColor(item)]"
        />

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-sm text-shift3-text">{{ item.name }}</p>
            <span class="shrink-0 text-xs text-shift3-text-muted">{{ formatBytes(item.size) }}</span>
          </div>

          <div
            v-if="item.status === 'uploading' || item.status === 'processing'"
            class="mt-1.5 flex items-center gap-2"
          >
            <BaseProgress
              :value="item.progress"
              :indeterminate="item.status === 'processing'"
              class="flex-1"
            />
            <span class="shrink-0 text-[11px] tabular-nums text-shift3-text-muted">
              {{ item.status === 'processing' ? 'processando…' : item.progress + '%' }}
            </span>
          </div>

          <p v-else-if="item.status === 'error'" class="mt-0.5 text-xs text-danger">
            {{ item.error || 'Falha ao processar' }}
          </p>
          <p v-else-if="item.status === 'done'" class="mt-0.5 text-xs text-success">
            concluído
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 rounded p-1 text-shift3-text-muted transition hover:bg-shift3-border/50 hover:text-shift3-text"
          :aria-label="`Remover ${item.name}`"
          @click.stop="remove(item)"
        >
          <Icon name="heroicons:x-mark" class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <button
      v-if="multiple && modelValue.length > 1"
      type="button"
      class="mt-2 text-xs text-shift3-text-muted underline-offset-2 hover:text-shift3-text hover:underline"
      @click="clearAll"
    >
      Limpar tudo
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { UploadFile } from '~/composables/useUpload'

const props = withDefaults(
  defineProps<{
    modelValue?: UploadFile[]
    /** ex: ".xlsx,.xls,.csv,.pdf,image/*" */
    accept?: string
    multiple?: boolean
    maxSizeMb?: number
    disabled?: boolean
    hint?: string
  }>(),
  { modelValue: () => [], multiple: true, maxSizeMb: 50, disabled: false }
)

const emit = defineEmits<{
  'update:modelValue': [files: UploadFile[]]
  add: [files: UploadFile[]]
  reject: [items: { file: File; reason: string }[]]
  remove: [file: UploadFile]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const rejeicoes = ref<{ file: File; reason: string }[]>([])
let dragDepth = 0

const openPicker = () => {
  if (!props.disabled) inputRef.value?.click()
}

const onDragEnter = () => {
  if (props.disabled) return
  dragDepth++
  dragging.value = true
}
const onDragLeave = () => {
  dragDepth--
  if (dragDepth <= 0) {
    dragDepth = 0
    dragging.value = false
  }
}
const onDrop = (e: DragEvent) => {
  dragDepth = 0
  dragging.value = false
  if (props.disabled) return
  handleFiles(e.dataTransfer?.files)
}
const onInputChange = (e: Event) => {
  const el = e.target as HTMLInputElement
  handleFiles(el.files)
  el.value = '' // permite reselecionar o mesmo arquivo
}

const accepts = (file: File): boolean => {
  if (!props.accept) return true
  const rules = props.accept
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule)
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
    return type === rule
  })
}

const handleFiles = (list?: FileList | null) => {
  if (!list || !list.length) return
  const accepted: UploadFile[] = []
  const rejected: { file: File; reason: string }[] = []
  const maxBytes = props.maxSizeMb * 1024 * 1024

  for (const file of Array.from(list)) {
    if (!accepts(file)) rejected.push({ file, reason: 'tipo não permitido' })
    else if (file.size > maxBytes) rejected.push({ file, reason: `excede ${props.maxSizeMb} MB` })
    else accepted.push(createUploadFile(file))
  }

  rejeicoes.value = rejected
  if (rejected.length) emit('reject', rejected)
  if (!accepted.length) return

  const next = props.multiple ? [...props.modelValue, ...accepted] : accepted.slice(-1)
  emit('update:modelValue', next)
  emit('add', props.multiple ? accepted : next)
}

const remove = (item: UploadFile) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((f) => f.id !== item.id)
  )
  emit('remove', item)
}

const clearAll = () => emit('update:modelValue', [])

const statusIcon = (item: UploadFile): string => {
  if (item.status === 'done') return 'heroicons:check-circle'
  if (item.status === 'error') return 'heroicons:x-circle'
  const ext = item.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'heroicons:document-text'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'heroicons:table-cells'
  if (item.file.type.startsWith('image/')) return 'heroicons:photo'
  return 'heroicons:document'
}

const statusColor = (item: UploadFile): string => {
  if (item.status === 'done') return 'text-success'
  if (item.status === 'error') return 'text-danger'
  return 'text-shift3-text-muted'
}
</script>
