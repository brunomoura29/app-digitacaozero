<template>
  <BaseDropdown align="right" :items="items">
    <button
      type="button"
      :aria-label="`Conta de ${nome}`"
      class="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-shift3-green/25 text-shift3-teal outline-none transition hover:bg-shift3-green/35 focus-visible:ring-2 focus-visible:ring-shift3-green/40"
    >
      <img v-if="avatar" :src="avatar" class="h-full w-full object-cover" alt="" />
      <Icon v-else name="heroicons:user" class="h-4 w-4" />
    </button>
  </BaseDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { DropdownItem } from '~/components/base/BaseDropdown.vue'

const auth = useAuthStore()

const nome = computed(() => auth.nome)
const avatar = computed(() => auth.perfil?.avatar_url ?? undefined)

const items: DropdownItem[] = [
  { label: 'Configurações', icon: 'heroicons:cog-6-tooth', to: '/configuracoes' },
  { divider: true },
  {
    label: 'Sair',
    icon: 'heroicons:arrow-right-on-rectangle',
    danger: true,
    onClick: () => auth.sair()
  }
]
</script>
