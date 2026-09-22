<template>
  <div class="flex flex-col items-center justify-center gap-4 rounded-medium border border-shift3-border bg-shift3-bg-card px-xl py-2xl text-center">
    <div class="relative h-2.5 w-full max-w-sm overflow-hidden rounded-pill bg-shift3-border/50">
      <div class="glow-bar absolute inset-y-0 left-0 w-1/3 rounded-pill bg-shift3-green animate-progress-indet" />
    </div>

    <p class="text-sm font-medium text-shift3-text">
      {{ label }}<span class="inline-block w-5 text-left">{{ pontos }}</span>
    </p>
    <p v-if="hint" class="max-w-sm text-xs text-shift3-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

withDefaults(defineProps<{ label?: string; hint?: string }>(), { label: 'Processando' })

const pontos = ref('')
let intervalo: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  intervalo = setInterval(() => {
    pontos.value = pontos.value.length >= 3 ? '' : pontos.value + '.'
  }, 400)
})
onUnmounted(() => clearInterval(intervalo))
</script>

<style scoped>
.glow-bar {
  box-shadow:
    0 0 8px 1px rgba(127, 215, 171, 0.7),
    0 0 16px 4px rgba(127, 215, 171, 0.35);
}
</style>
