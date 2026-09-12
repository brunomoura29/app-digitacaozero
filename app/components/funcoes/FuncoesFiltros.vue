<template>
  <div class="flex gap-3 items-end">
    <!-- Busca por nome -->
    <div class="w-full max-w-xs">
      <label class="block text-xs font-medium text-shift3-text-muted mb-1">Buscar por nome…</label>
      <BaseInput
        :model-value="filtros.q"
        type="text"
        placeholder="Nome da função"
        @update:model-value="(v) => (filtros.q = v)"
        @keyup.enter="$emit('filtrar')"
      />
    </div>

    <!-- Botão para filtrar/aplicar -->
    <BaseButton size="sm" @click="$emit('filtrar')">
      Filtrar
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import type { FuncaoFiltros } from '~/types/funcao'

defineProps<{
  filtros: FuncaoFiltros
}>()

defineEmits<{
  filtrar: []
}>()
</script>
