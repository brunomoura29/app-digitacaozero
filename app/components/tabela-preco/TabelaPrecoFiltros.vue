<template>
  <div class="flex flex-wrap items-end gap-3">
    <!-- Busca por produto -->
    <div class="w-full max-w-xs">
      <label class="block text-xs font-medium text-shift3-text-muted mb-1">Buscar por produto…</label>
      <BaseInput
        :model-value="filtros.q"
        type="text"
        placeholder="Descrição do produto"
        @update:model-value="(v) => (filtros.q = v)"
        @keyup.enter="$emit('filtrar')"
      />
    </div>

    <!-- Mês de competência -->
    <div>
      <label class="block text-xs font-medium text-shift3-text-muted mb-1">Competência</label>
      <input
        v-model="filtros.competencia"
        type="month"
        class="rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
      />
    </div>

    <!-- Botão para filtrar/aplicar -->
    <BaseButton size="sm" @click="$emit('filtrar')">
      Filtrar
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import type { PrecoFiltros } from '~/types/preco'

defineProps<{
  filtros: PrecoFiltros
}>()

defineEmits<{
  filtrar: []
}>()
</script>
