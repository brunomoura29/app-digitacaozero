<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <NuxtLink
        v-for="(etapa, i) in ETAPAS_FUNIL"
        :key="etapa.status"
        :to="`/pedidos?etapa=${etapa.status}`"
        class="animate-sobe group relative overflow-hidden rounded-medium border border-shift3-border bg-shift3-bg-card p-4 shadow-sm outline-none transition duration-200 hover:-translate-y-0.5 hover:border-shift3-green/60 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-shift3-green/40"
        :style="{ animationDelay: `${i * 60}ms` }"
      >
        <!-- faixa da cor da etapa que cresce no hover -->
        <span class="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-[0.25] transition-transform duration-300 group-hover:scale-x-100" :class="etapa.barra" />

        <div class="flex items-center justify-between gap-2">
          <span class="grid h-9 w-9 place-items-center rounded-default" :class="etapa.cor">
            <Icon :name="etapa.icone" class="h-5 w-5" />
          </span>
          <span
            v-if="numeros[etapa.status].variacao !== null"
            class="inline-flex items-center gap-0.5 rounded-pill px-2 py-0.5 text-[11px] font-semibold"
            :class="classeVariacao(etapa.status)"
            :title="`Comparado ao período anterior`"
          >
            <Icon :name="numeros[etapa.status].variacao! >= 0 ? 'heroicons:arrow-trending-up' : 'heroicons:arrow-trending-down'" class="h-3.5 w-3.5" />
            {{ Math.abs(numeros[etapa.status].variacao!) }}%
          </span>
        </div>

        <p class="mt-3 text-[13px] font-medium text-shift3-text-secondary">{{ etapa.label }}</p>
        <p class="mt-0.5 text-[28px] font-bold leading-tight text-shift3-text">
          <BaseContador :valor="numeros[etapa.status].quantidade" />
        </p>
        <div class="mt-1 flex items-center justify-between gap-2 text-xs">
          <span class="truncate font-medium text-shift3-text-secondary">
            <BaseContador :valor="numeros[etapa.status].valor" :formatar="formatarMoedaCurta" />
          </span>
          <Icon
            name="heroicons:arrow-right"
            class="h-3.5 w-3.5 shrink-0 -translate-x-1 text-shift3-text-muted opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
          />
        </div>
        <p class="mt-2 truncate text-[11px] text-shift3-text-muted">{{ etapa.dica }}</p>
      </NuxtLink>
    </div>

    <!-- distribuição entre as etapas (mesmas cores), 2px de respiro entre os pedaços -->
    <div v-if="totalQuantidade" class="space-y-2">
      <div class="flex h-2 gap-[2px] overflow-hidden rounded-pill">
        <div
          v-for="etapa in etapasComPedido"
          :key="etapa.status"
          class="h-full transition-[width] duration-700 ease-out first:rounded-l-pill last:rounded-r-pill"
          :class="etapa.barra"
          :style="{ width: `${(numeros[etapa.status].quantidade / totalQuantidade) * 100}%` }"
          :title="`${etapa.label}: ${numeros[etapa.status].quantidade}`"
        />
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-shift3-text-muted">
        <span v-for="etapa in etapasComPedido" :key="etapa.status" class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full" :class="etapa.barra" />
          {{ etapa.label }} · {{ Math.round((numeros[etapa.status].quantidade / totalQuantidade) * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatusPedido } from '~/types/pedido'
import { ETAPAS_FUNIL, formatarMoedaCurta, type NumerosEtapa } from '~/utils/dashboard'

const props = defineProps<{
  numeros: Record<StatusPedido, NumerosEtapa>
}>()

const totalQuantidade = computed(() => ETAPAS_FUNIL.reduce((s, e) => s + props.numeros[e.status].quantidade, 0))
const etapasComPedido = computed(() => ETAPAS_FUNIL.filter((e) => props.numeros[e.status].quantidade > 0))

/** Subir é bom em quase tudo — menos em Rejeitados, onde a cor inverte. */
function classeVariacao(status: StatusPedido): string {
  const v = props.numeros[status].variacao ?? 0
  if (v === 0) return 'bg-shift3-border/60 text-shift3-text-secondary'
  const bom = status === 'rejeitado' ? v < 0 : v > 0
  return bom ? 'bg-success/20 text-shift3-teal dark:text-success' : 'bg-danger/15 text-danger'
}
</script>
