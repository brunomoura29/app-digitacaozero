<template>
  <ol class="flex items-start">
    <li v-for="(passo, idx) in steps" :key="passo" class="flex flex-1 items-center last:flex-none">
      <div class="flex flex-col items-center gap-1.5" :style="{ minWidth: '6rem' }">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-sm font-semibold transition-colors"
          :class="estadoPasso(idx) === 'concluido'
            ? 'bg-shift3-green text-shift3-dark'
            : estadoPasso(idx) === 'atual'
              ? 'border-2 border-shift3-green bg-shift3-bg-card text-shift3-green'
              : 'bg-shift3-border/60 text-shift3-text-muted'"
        >
          <Icon v-if="estadoPasso(idx) === 'concluido'" name="heroicons:check" class="h-4 w-4" />
          <template v-else>{{ idx + 1 }}</template>
        </span>
        <span
          class="text-center text-xs font-medium"
          :class="estadoPasso(idx) === 'futuro' ? 'text-shift3-text-muted' : 'text-shift3-text'"
        >
          {{ passo }}
        </span>
      </div>
      <div
        v-if="idx < steps.length - 1"
        class="mx-2 mt-4 h-0.5 flex-1 rounded-pill transition-colors"
        :class="idx < atual ? 'bg-shift3-green' : 'bg-shift3-border'"
      />
    </li>
  </ol>
</template>

<script setup lang="ts">
const props = defineProps<{
  steps: string[]
  /** Índice (0-based) do passo atual. */
  atual: number
}>()

function estadoPasso(idx: number): 'concluido' | 'atual' | 'futuro' {
  if (idx < props.atual) return 'concluido'
  if (idx === props.atual) return 'atual'
  return 'futuro'
}
</script>
