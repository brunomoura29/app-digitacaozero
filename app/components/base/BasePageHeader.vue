<template>
  <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div class="flex items-center gap-3">
      <BaseButton
        v-if="backTo"
        :to="backTo"
        variant="ghost"
        size="sm"
        icon-left="heroicons:arrow-left"
      >
        Voltar
      </BaseButton>
      <div>
        <h1 v-if="title" class="text-[22px]">{{ title }}</h1>
        <p v-if="subtitle" class="mt-0.5 text-sm text-shift3-text-secondary">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** omitido = mostra só o subtítulo (útil quando o título já está no topbar) */
  title?: string
  subtitle?: string
  /** rota do botão "Voltar", exibido no topo esquerdo antes do título */
  backTo?: string
}>()
</script>
