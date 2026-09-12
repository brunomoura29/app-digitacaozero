<template>
  <div class="flex gap-3 items-end">
    <div class="w-full max-w-xs">
      <label class="block text-xs font-medium text-shift3-text-muted mb-1">Buscar por número…</label>
      <BaseInput
        :model-value="filtros.q"
        type="text"
        placeholder="OC-000123"
        @update:model-value="(v) => (filtros.q = v)"
        @keyup.enter="$emit('filtrar')"
      />
    </div>

    <BaseButton size="sm" @click="$emit('filtrar')">
      Filtrar
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import type { PedidoFiltros } from '~/types/pedido'

defineProps<{
  filtros: PedidoFiltros
}>()

defineEmits<{
  filtrar: []
}>()
</script>
