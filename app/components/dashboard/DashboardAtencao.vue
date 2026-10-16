<template>
  <section class="flex h-full flex-col rounded-medium border border-shift3-border bg-shift3-bg-card shadow-sm">
    <header class="flex items-center justify-between gap-3 border-b border-shift3-border px-5 py-4">
      <div class="flex items-center gap-2.5">
        <span class="relative grid h-8 w-8 place-items-center rounded-default bg-warning/20 text-yellow-600">
          <Icon name="heroicons:bell-alert" class="h-[18px] w-[18px]" />
          <span v-if="itens.length" class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-shift3-bg-card">
            <span class="absolute inset-0 animate-ping rounded-full bg-danger/70" />
          </span>
        </span>
        <div>
          <h2 class="text-[15px] font-semibold text-shift3-text">Precisa da sua atenção</h2>
          <p class="text-xs text-shift3-text-muted">Pedidos em aberto, do mais urgente pro menos</p>
        </div>
      </div>
      <span
        v-if="itens.length"
        class="grid h-6 min-w-[1.5rem] place-items-center rounded-pill bg-danger/15 px-2 text-xs font-bold text-danger"
      >
        {{ itens.length }}
      </span>
    </header>

    <!-- Tudo em dia -->
    <div v-if="!itens.length" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div class="relative grid h-16 w-16 place-items-center">
        <span class="absolute inset-0 animate-ping rounded-full bg-success/25 [animation-iteration-count:2]" />
        <span class="relative grid h-16 w-16 place-items-center rounded-full bg-success/20 text-shift3-teal dark:text-success">
          <Icon name="heroicons:check-badge" class="h-8 w-8" />
        </span>
      </div>
      <div>
        <p class="font-semibold text-shift3-text">Tudo em dia</p>
        <p class="mt-0.5 text-sm text-shift3-text-secondary">Nenhum pedido parado, rejeitado ou esperando resposta.</p>
      </div>
    </div>

    <TransitionGroup v-else tag="ul" name="lista-atencao" class="flex-1 divide-y divide-shift3-border/70">
      <li
        v-for="(item, i) in visiveis"
        :key="item.chave"
        class="animate-sobe group flex items-center gap-3 px-5 py-3 transition hover:bg-shift3-bg-light"
        :style="{ animationDelay: `${i * 40}ms` }"
      >
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-default" :class="VISUAL_ATENCAO[item.tipo].cor">
          <Icon :name="VISUAL_ATENCAO[item.tipo].icone" class="h-[18px] w-[18px]" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate text-sm font-semibold text-shift3-text">{{ item.titulo }}</p>
            <span class="hidden shrink-0 rounded-pill border border-shift3-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-shift3-text-muted sm:inline">
              {{ VISUAL_ATENCAO[item.tipo].rotulo }}
            </span>
          </div>
          <p class="truncate text-xs text-shift3-text-secondary" :title="item.detalhe">{{ item.detalhe }}</p>
        </div>
        <BaseButton :to="item.to" variant="secondary" size="sm" icon-right="heroicons:arrow-right" class="shrink-0">
          {{ item.acao }}
        </BaseButton>
      </li>
    </TransitionGroup>

    <footer v-if="itens.length > LIMITE" class="border-t border-shift3-border px-5 py-2.5">
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-semibold text-shift3-teal transition hover:underline dark:text-success"
        @click="expandido = !expandido"
      >
        {{ expandido ? 'Mostrar menos' : `Ver mais ${itens.length - LIMITE}` }}
        <Icon :name="expandido ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="h-3.5 w-3.5" />
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VISUAL_ATENCAO, type ItemAtencao } from '~/utils/dashboard'

const props = defineProps<{ itens: ItemAtencao[] }>()

const LIMITE = 6
const expandido = ref(false)
const visiveis = computed(() => (expandido.value ? props.itens : props.itens.slice(0, LIMITE)))
</script>

<style scoped>
.lista-atencao-enter-active,
.lista-atencao-leave-active {
  transition: all 0.25s ease;
}
.lista-atencao-enter-from,
.lista-atencao-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
