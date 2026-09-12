<template>
  <div
    :class="['w-full overflow-hidden rounded-pill bg-shift3-border/60', sizeClass]"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="indeterminate ? undefined : clamped"
  >
    <div
      v-if="indeterminate"
      class="h-full w-1/3 rounded-pill animate-progress-indet"
      :class="barColor"
    />
    <div
      v-else
      class="h-full rounded-pill transition-[width] duration-300 ease-out"
      :class="barColor"
      :style="{ width: clamped + '%' }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 0..100 */
    value?: number
    indeterminate?: boolean
    size?: 'sm' | 'md'
    variant?: 'accent' | 'primary' | 'danger'
  }>(),
  { value: 0, indeterminate: false, size: 'sm', variant: 'accent' }
)

const clamped = computed(() => Math.max(0, Math.min(100, Math.round(props.value))))
const sizeClass = computed(() => (props.size === 'md' ? 'h-2' : 'h-1.5'))
const barColor = computed(
  () =>
    ({
      accent: 'bg-shift3-green',
      primary: 'bg-shift3-dark',
      danger: 'bg-danger'
    })[props.variant]
)
</script>
