<template>
  <Icon name="heroicons:arrow-path" :class="['animate-spin', sizeClass, colorClass]" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'xs' | 'sm' | 'md' | 'lg'
    /** classe de cor tailwind; default herda um cinza */
    colorClass?: string
  }>(),
  { size: 'sm', colorClass: 'text-shift3-text-muted' }
)

const sizeClass = computed(
  () => ({ xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' })[props.size]
)
</script>
