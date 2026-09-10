<template>
  <ClientOnly>
    <button
      type="button"
      :aria-label="isDark ? 'Ativar modo claro' : 'Ativar modo escuro'"
      :title="isDark ? 'Modo claro' : 'Modo escuro'"
      class="inline-flex h-9 w-9 items-center justify-center rounded-default border border-shift3-border bg-shift3-bg-card text-shift3-text transition hover:bg-shift3-bg-light outline-none focus-visible:ring-2 focus-visible:ring-shift3-green/40"
      @click="toggle"
    >
      <Icon :name="isDark ? 'heroicons:sun' : 'heroicons:moon'" class="h-5 w-5" />
    </button>

    <template #fallback>
      <div class="h-9 w-9 rounded-default border border-shift3-border bg-shift3-bg-card" />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
const { isDark, toggle } = useTheme()
</script>
