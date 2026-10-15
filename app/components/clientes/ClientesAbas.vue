<template>
  <div class="mx-auto mb-6 max-w-3xl border-b border-shift3-border">
    <nav class="-mb-px flex gap-6" aria-label="Seções do cliente">
      <button
        v-for="a in ABAS"
        :key="a.valor"
        type="button"
        class="flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition"
        :class="
          modelValue === a.valor
            ? 'border-shift3-teal text-shift3-teal'
            : 'border-transparent text-shift3-text-muted hover:border-shift3-border hover:text-shift3-text'
        "
        :aria-current="modelValue === a.valor ? 'page' : undefined"
        @click="emit('update:modelValue', a.valor)"
      >
        <Icon :name="a.icone" class="h-4 w-4" />
        {{ a.label }}
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { AbaCliente } from '~/types/cliente'

defineProps<{ modelValue: AbaCliente }>()
const emit = defineEmits<{ 'update:modelValue': [aba: AbaCliente] }>()

const ABAS: { valor: AbaCliente; label: string; icone: string }[] = [
  { valor: 'dados', label: 'Dados do cliente', icone: 'heroicons:user' },
  { valor: 'politicas', label: 'Políticas comerciais', icone: 'heroicons:receipt-percent' }
]
</script>
