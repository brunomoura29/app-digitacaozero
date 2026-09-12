<template>
  <div class="flex h-screen overflow-hidden bg-shift3-sidebar">
    <AppSidebar
      v-model:collapsed="collapsed"
      :items="nav"
      :user="{ name: auth.nome, email: auth.email ?? undefined, avatar: auth.perfil?.avatar_url ?? undefined }"
    />

    <!-- Conteúdo (à direita) — canto côncavo na junção com o sidebar -->
    <div class="corner-concave flex min-w-0 flex-1 flex-col rounded-tl-[1.5rem] bg-shift3-bg-card">
      <header
        class="flex h-16 shrink-0 items-center gap-4 rounded-tl-[1.5rem] border-b border-shift3-border/70 bg-shift3-bg-card/90 px-6 backdrop-blur"
      >
        <BaseButton
          v-if="backTo"
          :to="backTo"
          variant="ghost"
          size="sm"
          icon-left="heroicons:arrow-left"
          class="-ml-2"
        >
          Voltar
        </BaseButton>
        <h1 class="text-[15px] font-semibold">{{ pageTitle }}</h1>

        <div class="ml-auto hidden w-full max-w-xs sm:block">
          <BasePesquisa v-model="busca" placeholder="Buscar..." />
        </div>
        <BaseThemeToggle />
        <AppTopbarUser />
      </header>

      <!-- única área que rola — o rodapé abaixo fica sempre visível, fora do scroll -->
      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>

      <!--
        Alvo do Teleport das barras fixas de rodapé (ações de formulário, totalizadores…).
        Fica FORA da área que rola (main), então é sempre visível — não depende de
        `sticky`/scroll pra aparecer. Vazio = altura 0 (sem classes extras necessárias).
      -->
      <div id="dashboard-footer" class="shrink-0" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { SidebarItem } from '~/components/app/AppSidebar.vue'
import { useAuthStore } from '~/stores/auth'

// persiste entre navegação/reload e é estável no SSR
const collapsed = useCookie<boolean>('dz-sidebar-collapsed', { default: () => false })

const route = useRoute()
const pageTitle = computed(() => (route.meta.title as string) || 'Painel')
const backTo = computed(() => route.meta.backTo as string | undefined)

const busca = ref('')

const auth = useAuthStore()
onMounted(() => auth.carregarPerfil())
watch(
  () => auth.user?.id,
  (id) => {
    if (id) auth.carregarPerfil(true)
    else auth.perfil = null
  }
)

const nav: SidebarItem[] = [
  { label: 'Dashboard', icon: 'heroicons:squares-2x2', to: '/' },
  { label: 'Pedidos', icon: 'heroicons:clipboard-document-list', to: '/pedidos' },
  {
    label: 'Cadastros',
    icon: 'heroicons:inbox-stack',
    children: [
      { label: 'Clientes', icon: 'heroicons:users', to: '/clientes' },
      { label: 'Vendedores', icon: 'heroicons:user-group', to: '/vendedores' },
      { label: 'Produtos', icon: 'heroicons:cube', to: '/produtos' }
    ]
  },
  { label: 'Tabela de preço', icon: 'heroicons:currency-dollar', to: '/tabela-preco' },
  { label: 'Templates', icon: 'heroicons:document-duplicate', to: '/templates' },
  { label: 'Relatórios', icon: 'heroicons:chart-bar', to: '/relatorios' },
  { label: 'Configurações', icon: 'heroicons:cog-6-tooth', to: '/configuracoes' }
]
</script>
