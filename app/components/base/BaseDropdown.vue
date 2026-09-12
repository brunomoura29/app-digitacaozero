<template>
  <div ref="root" class="inline-block text-left">
    <div class="cursor-pointer select-none" @click="toggle">
      <slot :open="isOpen" />
    </div>

    <ClientOnly>
      <Teleport to="body">
        <Transition name="slide">
          <div
            v-if="isOpen"
            ref="panel"
            :style="{ top: coords.top + 'px', left: coords.left + 'px' }"
            class="fixed z-[100] min-w-[12rem] rounded-medium border border-shift3-border bg-shift3-bg-card py-1 shadow-lg"
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
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
const panel = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const coords = ref({ top: 0, left: 0 })

/**
 * O menu é teleportado pro <body> (position: fixed) — assim não fica preso/cortado
 * por containers com overflow (ex.: a tabela de clientes tem overflow-x-auto, que
 * também corta o eixo Y). Recalcula a posição toda vez que abre, ao rolar ou redimensionar.
 */
function updatePosition() {
  if (!root.value) return
  const r = root.value.getBoundingClientRect()
  const largura = panel.value?.offsetWidth ?? 192
  const margem = 8

  let left = props.align === 'right' ? r.right - largura : r.left
  left = Math.min(Math.max(left, margem), window.innerWidth - largura - margem)

  let top = r.bottom + 6
  const alturaEstimada = panel.value?.offsetHeight ?? 0
  if (alturaEstimada && top + alturaEstimada > window.innerHeight - margem) {
    // sem espaço embaixo: abre pra cima do gatilho
    top = Math.max(margem, r.top - alturaEstimada - 6)
  }

  coords.value = { top, left }
}

const toggle = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    updatePosition()
    await nextTick()
    updatePosition() // 2ª passada: agora com a largura/altura reais do painel
  }
}
const close = () => (isOpen.value = false)

const onSelect = (item: DropdownItem) => {
  if (item.disabled || item.divider) return
  item.onClick?.()
  emit('select', item)
  close()
}

watch(isOpen, (v) => {
  emit(v ? 'open' : 'close')
  if (v) {
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
  } else {
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
})

// @vueuse/nuxt — auto-importados. `ignore: [panel]` pois o painel foi teleportado
// pra fora de `root` no DOM (senão clicar num item fecharia o menu antes do @click rodar).
onClickOutside(root, close, { ignore: [panel] })
onKeyStroke('Escape', close)
</script>
