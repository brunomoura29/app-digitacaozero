<template>
  <aside
    :class="[
      'flex h-screen shrink-0 flex-col bg-shift3-sidebar transition-[width] duration-200 ease-out relative',
      collapsed ? 'w-[76px]' : 'w-[248px]'
    ]"
  >
    <!-- ── Cabeçalho ── -->
    <div :class="['flex h-16 items-center px-4', collapsed ? 'justify-center' : 'gap-2']">
      <slot name="brand" :collapsed="collapsed">
        <div class="flex min-w-0 items-center gap-2.5">
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-medium bg-shift3-dark text-shift3-green"
          >
            <Icon name="heroicons:square-3-stack-3d" class="h-5 w-5" />
          </span>
          <span
            v-if="!collapsed"
            class="truncate text-[15px] font-bold tracking-tight text-shift3-text"
          >
            {{ brand }}
          </span>
        </div>
      </slot>

      <button
        v-if="!collapsed"
        type="button"
        aria-label="Recolher menu"
        class="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-default text-shift3-text-secondary transition hover:bg-shift3-green/15 hover:text-shift3-text outline-none focus-visible:ring-2 focus-visible:ring-shift3-green/40"
        @click="toggle"
      >
        <Icon name="heroicons:chevron-double-left" class="h-4 w-4" />
      </button>
    </div>

    <!-- botão expandir (quando recolhido) -->
    <button
      v-if="collapsed"
      type="button"
      aria-label="Expandir menu"
      class="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-default text-shift3-text-secondary transition hover:bg-shift3-green/15 hover:text-shift3-text outline-none focus-visible:ring-2 focus-visible:ring-shift3-green/40"
      @click="toggle"
    >
      <Icon name="heroicons:chevron-double-right" class="h-4 w-4" />
    </button>

    <!-- ── Corpo (navegação) ── -->
    <nav
      :class="[
        'flex-1 space-y-1 overflow-y-auto py-3 relative',
        collapsed ? 'px-2' : 'px-3'
      ]"
    >
      <template v-for="item in items" :key="item.to || item.label">
        <!-- Item simples (sem submenu) -->
        <NuxtLink
          v-if="!item.children"
          :to="item.to!"
          :title="collapsed ? item.label : undefined"
          :class="[
            'group flex items-center rounded-medium text-sm transition',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
            !activeSubmenu && isActive(item)
              ? 'bg-shift3-sidebar-active font-semibold text-shift3-text'
              : 'font-medium text-shift3-text-secondary hover:bg-shift3-sidebar-active/45 hover:text-shift3-text'
          ]"
        >
          <Icon :name="item.icon" class="h-5 w-5 shrink-0 text-current" />
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          <span
            v-if="!collapsed && item.badge"
            class="ml-auto rounded-pill bg-shift3-green/25 px-1.5 py-0.5 text-[11px] font-semibold text-shift3-teal"
          >
            {{ item.badge }}
          </span>
        </NuxtLink>

        <!-- Item com submenu (popup ao lado) -->
        <button
          v-else
          :title="collapsed ? item.label : undefined"
          :class="[
            'group w-full flex items-center rounded-medium text-sm transition',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
            isActive(item) || activeSubmenu === item.label
              ? 'bg-shift3-sidebar-active font-semibold text-shift3-text'
              : 'font-medium text-shift3-text-secondary hover:bg-shift3-sidebar-active/45 hover:text-shift3-text'
          ]"
          @click="toggleSubmenu(item.label)"
        >
          <Icon :name="item.icon" class="h-5 w-5 shrink-0 text-current" />
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        </button>
      </template>
    </nav>

    <!-- ── Rodapé (usuário) ── -->
    <div class="border-t border-shift3-border/60 p-3">
      <div
        :class="[
          'flex items-center rounded-medium p-2',
          collapsed ? 'justify-center' : 'gap-3'
        ]"
      >
        <span
          class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-shift3-green/25 text-shift3-teal"
        >
          <img v-if="user?.avatar" :src="user.avatar" :alt="user?.name || 'Usuário'" class="h-full w-full object-cover" />
          <Icon v-else name="heroicons:user" class="h-5 w-5" />
        </span>
        <div v-if="!collapsed" class="min-w-0 flex-1">
          <p v-if="user?.name" class="truncate text-sm font-medium text-shift3-text">
            {{ user.name }}
          </p>
          <p class="truncate text-xs text-shift3-text-muted">
            {{ user?.email || 'sem e-mail' }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── Submenu Popup (ao lado) — fora do aside ── -->
    <Teleport to="body">
      <Transition
        enterActiveClass="transition-all duration-300"
        leaveActiveClass="transition-all duration-300"
        enterFromClass="opacity-0 -translate-x-4"
        enterToClass="opacity-100 translate-x-0"
        leaveFromClass="opacity-100 translate-x-0"
        leaveToClass="opacity-0 -translate-x-4"
      >
        <div
          v-if="activeSubmenu && !collapsed"
          :style="{ left: collapsed ? '76px' : '248px' }"
          class="fixed top-0 h-screen w-48 bg-shift3-sidebar border-l border-shift3-border rounded-tr-2xl overflow-y-auto z-50"
        >
          <div class="p-4 border-b border-shift3-border/60">
            <h3 class="text-sm font-semibold text-shift3-text">
              {{ activeSubmenu }}
            </h3>
          </div>
          <div class="p-4 space-y-1">
            <NuxtLink
              v-for="child in getActiveMenuChildren()"
              :key="child.to"
              :to="child.to"
              class="flex items-center gap-3 px-4 py-3 text-sm transition font-medium text-shift3-text-secondary hover:bg-shift3-sidebar-active/45 hover:text-shift3-text rounded-medium"
              @click="route.path === child.to && (activeSubmenu = null)"
            >
              <Icon :name="child.icon" class="h-4 w-4 shrink-0 text-current" />
              <span class="truncate">{{ child.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'

export interface SidebarChild {
  label: string
  icon: string
  to: string
}

export interface SidebarItem {
  label: string
  icon: string
  to?: string
  badge?: string | number
  children?: SidebarChild[]
}

const props = withDefaults(
  defineProps<{
    items: SidebarItem[]
    collapsed?: boolean
    brand?: string
    user?: { name?: string; email?: string; avatar?: string }
  }>(),
  { collapsed: false, brand: 'DigitacaoZero' }
)

const emit = defineEmits<{ 'update:collapsed': [value: boolean] }>()

const route = useRoute()
const activeSubmenu = ref<string | null>(null)

const toggle = () => emit('update:collapsed', !props.collapsed)

const toggleSubmenu = (label: string) => {
  activeSubmenu.value = activeSubmenu.value === label ? null : label
}

watch(() => route.path, () => {
  activeSubmenu.value = null
})

const isActive = (item: SidebarItem) => {
  if (item.to) {
    return route.path === item.to || route.path.startsWith(item.to + '/')
  }
  // Se não tem `to` mas tem `children`, verifica se algum filho está ativo
  if (item.children) {
    return item.children.some((child) => route.path === child.to || route.path.startsWith(child.to + '/'))
  }
  return false
}

const getActiveMenuChildren = () => {
  const item = props.items.find((i) => i.label === activeSubmenu.value)
  return item?.children ?? []
}
</script>
