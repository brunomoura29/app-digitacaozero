<template>
  <section class="rounded-medium border border-shift3-border bg-shift3-bg-card p-5 shadow-sm">
    <header>
      <h2 class="text-[15px] font-semibold text-shift3-text">Clientes que mais compraram</h2>
      <p class="text-xs text-shift3-text-muted">Valor importado no período, sem rejeitados</p>
    </header>

    <p v-if="!clientes.length" class="py-8 text-center text-sm text-shift3-text-muted">Nenhum pedido no período.</p>

    <ol v-else class="mt-4 space-y-3.5">
      <li
        v-for="(c, i) in clientes"
        :key="c.nome"
        class="animate-sobe"
        :style="{ animationDelay: `${i * 60}ms` }"
        :title="`${c.nome}: ${formatarMoedaBR(c.valor)} em ${c.quantidade} ${c.quantidade === 1 ? 'pedido' : 'pedidos'}`"
      >
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span class="flex min-w-0 items-baseline gap-2">
            <span class="w-4 shrink-0 text-xs font-semibold tabular-nums text-shift3-text-muted">{{ i + 1 }}</span>
            <span class="truncate font-medium text-shift3-text">{{ c.nome }}</span>
          </span>
          <span class="shrink-0 font-semibold tabular-nums text-shift3-text">{{ formatarMoedaCurta(c.valor) }}</span>
        </div>
        <div class="ml-6 mt-1.5 flex items-center gap-2">
          <div class="h-1.5 flex-1 overflow-hidden rounded-pill bg-shift3-border/60">
            <div
              class="h-full rounded-pill bg-shift3-teal transition-[width] duration-700 ease-out dark:bg-success"
              :style="{ width: montado ? `${maior ? (c.valor / maior) * 100 : 0}%` : '0%' }"
            />
          </div>
          <span class="w-16 shrink-0 text-right text-[11px] text-shift3-text-muted">
            {{ c.quantidade }} {{ c.quantidade === 1 ? 'pedido' : 'pedidos' }}
          </span>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatarMoedaBR, formatarMoedaCurta, type ClienteRanking } from '~/utils/dashboard'

const props = defineProps<{ clientes: ClienteRanking[] }>()

const maior = computed(() => Math.max(0, ...props.clientes.map((c) => c.valor)))

// barras começam vazias e crescem depois de montar
const montado = ref(false)
onMounted(() => requestAnimationFrame(() => (montado.value = true)))
</script>
