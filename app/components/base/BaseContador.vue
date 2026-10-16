<template>
  <span class="tabular-nums">{{ texto }}</span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Número que "conta" até o valor (ease-out), partindo do valor anterior quando muda.
 * `formatar` define a exibição (moeda, inteiro…). Sem animação com prefers-reduced-motion.
 */
const props = withDefaults(
  defineProps<{
    valor: number
    formatar?: (v: number) => string
    duracao?: number
  }>(),
  {
    formatar: (v: number) => Math.round(v).toLocaleString('pt-BR'),
    duracao: 900
  }
)

const atual = ref(0)
let quadro = 0

const texto = computed(() => props.formatar(atual.value))

function animar(de: number, para: number) {
  cancelAnimationFrame(quadro)
  const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduzir || de === para) {
    atual.value = para
    return
  }
  const inicio = performance.now()
  const passo = (agora: number) => {
    const t = Math.min(1, (agora - inicio) / props.duracao)
    const suave = 1 - Math.pow(1 - t, 3)
    atual.value = de + (para - de) * suave
    if (t < 1) quadro = requestAnimationFrame(passo)
    else atual.value = para
  }
  quadro = requestAnimationFrame(passo)
}

onMounted(() => animar(0, props.valor))
watch(
  () => props.valor,
  (novo) => animar(atual.value, novo)
)
onBeforeUnmount(() => cancelAnimationFrame(quadro))
</script>
