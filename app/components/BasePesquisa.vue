<template>
  <div class="relative w-full">
    <Icon
      name="heroicons:magnifying-glass"
      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-shift3-text-muted"
    />
    <input
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full pl-9 pr-9 py-2 rounded-default border border-shift3-input-border bg-shift3-input text-sm text-shift3-text outline-none transition placeholder:text-shift3-text-muted focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:bg-shift3-border/30 disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden"
      @input="onInput"
      @keydown.enter="flush"
      @keydown.esc="clear"
    />
    <button
      v-if="modelValue"
      type="button"
      aria-label="Limpar busca"
      class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-shift3-text-muted hover:text-shift3-text hover:bg-shift3-border/60 transition"
      @click="clear"
    >
      <Icon name="heroicons:x-mark" class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    debounce?: number
    disabled?: boolean
  }>(),
  { modelValue: '', placeholder: 'Buscar...', debounce: 300, disabled: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  clear: []
}>()

let timer: ReturnType<typeof setTimeout> | undefined

const scheduleSearch = (value: string) => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => emit('search', value), props.debounce)
}

const onInput = (ev: Event) => {
  const value = (ev.target as HTMLInputElement).value
  emit('update:modelValue', value)
  scheduleSearch(value)
}

const flush = () => {
  if (timer) clearTimeout(timer)
  emit('search', props.modelValue)
}

const clear = () => {
  if (timer) clearTimeout(timer)
  emit('update:modelValue', '')
  emit('search', '')
  emit('clear')
}

onBeforeUnmount(() => timer && clearTimeout(timer))
</script>
