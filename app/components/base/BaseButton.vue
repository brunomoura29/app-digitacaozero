<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="isDisabled"
    :class="[
      'inline-flex items-center justify-center gap-2 font-semibold rounded-default transition',
      'outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-shift3-green/40',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClasses,
      variantClasses,
      block && 'w-full'
    ]"
    @click="onClick"
  >
    <Icon
      v-if="loading"
      name="heroicons:arrow-path"
      :class="['animate-spin', iconSizeClass]"
    />
    <Icon
      v-else-if="iconLeft"
      :name="iconLeft"
      :class="iconSizeClass"
    />
    <span v-if="$slots.default"><slot /></span>
    <Icon
      v-if="iconRight && !loading"
      :name="iconRight"
      :class="iconSizeClass"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NuxtLink } from '#components'

type Variant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
    block?: boolean
    iconLeft?: string
    iconRight?: string
    to?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    loading: false,
    disabled: false,
    block: false
  }
)

const emit = defineEmits<{ click: [ev: MouseEvent] }>()

const isDisabled = computed(() => props.disabled || props.loading)

const onClick = (ev: MouseEvent) => {
  if (isDisabled.value) {
    ev.preventDefault()
    ev.stopPropagation()
    return
  }
  emit('click', ev)
}

const sizeClasses = computed(
  () =>
    ({
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    })[props.size]
)

const iconSizeClass = computed(
  () => (props.size === 'lg' ? 'w-5 h-5' : props.size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')
)

const variantClasses = computed(
  () =>
    ({
      primary: 'bg-shift3-dark text-white hover:bg-shift3-teal',
      secondary:
        'bg-shift3-bg-card text-shift3-text border border-shift3-input-border hover:bg-shift3-bg-light',
      accent: 'bg-shift3-green text-shift3-dark hover:bg-shift3-teal hover:text-white',
      danger: 'bg-danger text-white hover:brightness-95',
      ghost: 'bg-transparent text-shift3-text hover:bg-shift3-border/60'
    })[props.variant]
)
</script>
