<template>
  <div class="flex flex-col items-center justify-center gap-2 rounded-medium border border-dashed border-shift3-border px-6 py-12 text-center">
    <Icon :name="icon" class="h-10 w-10 text-shift3-text-muted" />
    <p class="text-sm font-medium text-shift3-text">{{ title }}</p>
    <p v-if="description" class="max-w-sm text-xs text-shift3-text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ title: string; description?: string; icon?: string }>(),
  { icon: 'heroicons:inbox' }
)
</script>
