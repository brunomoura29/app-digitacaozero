<template>
  <div class="flex gap-3 items-end">
    <!-- Busca por descrição -->
    <div class="w-full max-w-xs">
      <label class="block text-xs font-medium text-shift3-text-muted mb-1">Buscar por descrição…</label>
      <BaseInput
        :model-value="filtros.q"
        type="text"
        placeholder="Nome do produto"
        @update:model-value="(v) => (filtros.q = v)"
        @keyup.enter="$emit('filtrar')"
      />
    </div>

    <!-- Filtro de situação -->
    <div>
      <label class="block text-xs font-medium text-shift3-text-muted mb-1">Situação</label>
      <div class="flex gap-2">
        <button
          v-for="opt in opcoesSituacao"
          :key="opt.valor"
          class="px-3 py-2 rounded-lg text-xs font-medium transition"
          :class="
            filtros.ativo === opt.valor
              ? 'bg-shift3-teal text-white'
              : 'bg-shift3-border/40 text-shift3-text hover:bg-shift3-border/60'
          "
          @click="filtros.ativo = opt.valor; $emit('filtrar')"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Botão para filtrar/aplicar -->
    <BaseButton size="sm" @click="$emit('filtrar')">
      Filtrar
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import type { ProdutoFiltros } from '~/types/produto'

defineProps<{
  filtros: ProdutoFiltros
}>()

defineEmits<{
  filtrar: []
}>()

const opcoesSituacao = [
  { label: 'Todos', valor: 'todos' as const },
  { label: 'Ativos', valor: 'ativos' as const },
  { label: 'Inativos', valor: 'inativos' as const }
]
</script>
