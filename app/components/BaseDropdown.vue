<template>
  <div ref="root" class="relative inline-block text-left">
    <div class="cursor-pointer select-none" @click="toggle">
      <slot :open="isOpen" />
    </div>

    <Transition name="slide">
      <div
        v-if="isOpen"
        :class="[
          'absolute z-50 mt-2 min-w-[12rem] rounded-medium border border-shift3-border bg-shift3-bg-card py-1 shadow-lg',
          align === 'right' ? 'right-0' : 'left-0'
        ]"
        role="menu"
      >
        <template v-for="(item, idx) in items" :key="idx">
          <div v-if="item.divider" class="my-1 h-px bg-shift3-border" role="separator" />
          <component
            :is="item.to ? NuxtLink : 'button'"
            v-else
            :to="item.to"
            :disabled="item.disabled"
            role="menuitem"
            :class="[
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              item.danger
                ? 'text-danger hover:bg-danger/10'
                : 'text-shift3-text hover:bg-shift3-border/40'
            ]"
            @click="onSelect(item)"
          >
            <Icon v-if="item.icon" :name="item.icon" class="w-4 h-4 shrink-0" />
            <span>{{ item.label }}</span>
          </component>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NuxtLink } from '#components'

export interface DropdownItem {
  label?: string
  icon?: string
  to?: string
  danger?: boolean
  disabled?: boolean
  divider?: boolean
  onClick?: () => void
}

const props = withDefaults(
  defineProps<{
    items: DropdownItem[]
    align?: 'left' | 'right'
  }>(),
  { align: 'left' }
)

const emit = defineEmits<{
  select: [item: DropdownItem]
  open: []
  close: []
}>()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const toggle = () => (isOpen.value = !isOpen.value)
const close = () => (isOpen.value = false)

const onSelect = (item: DropdownItem) => {
  if (item.disabled || item.divider) return
  item.onClick?.()
  emit('select', item)
  close()
}

watch(isOpen, (v) => emit(v ? 'open' : 'close'))

// @vueuse/nuxt — auto-importados
onClickOutside(root, close)
onKeyStroke('Escape', close)
</script>
