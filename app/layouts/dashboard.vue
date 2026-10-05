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

// Rotas restritas por módulo/papel — checadas aqui (não no middleware global) porque
// dependem do perfil já carregado; fazer o middleware esperar isso causou instabilidade.
const ROTAS_SOMENTE_ADMIN = ['/configuracoes', '/templates', '/importacoes', '/power-bi']
const MODULO_POR_PREFIXO: [string, string][] = [
  ['/clientes', 'clientes'],
  ['/vendedores', 'vendedores'],
  ['/produtos', 'produtos'],
  ['/tabela-preco', 'tabela_preco'],
  ['/pedidos', 'pedidos'],
  ['/relatorios', 'relatorios']
]
function comecaCom(path: string, prefixo: string) {
  return path === prefixo || path.startsWith(prefixo + '/')
}
function verificarAcessoRota() {
  if (!auth.perfil) return
  const path = route.path
  if (ROTAS_SOMENTE_ADMIN.some((p) => comecaCom(path, p)) && !auth.isAdmin) {
    navigateTo('/')
    return
  }
  const rotaComModulo = MODULO_POR_PREFIXO.find(([p]) => comecaCom(path, p))
  if (!rotaComModulo) return
  const [prefixo, modulo] = rotaComModulo

  if (!auth.podeAcessarModulo(modulo)) {
    navigateTo('/')
    return
  }
  // Sub-rota de escrita: /modulo/novo exige 'incluir', /modulo/:id (edição) exige 'editar' —
  // com só 'ver' fica restrito à lista (a própria rota do prefixo).
  if (path !== prefixo) {
    const ehNovo = path === `${prefixo}/novo`
    const permitido = ehNovo ? auth.podeIncluirModulo(modulo) : auth.podeEditarModulo(modulo)
    if (!permitido) navigateTo(prefixo)
  }
}

onMounted(async () => {
  await auth.carregarPerfil()
  verificarAcessoRota()
})
watch(
  () => auth.user?.sub,
  async (id) => {
    if (id) {
      await auth.carregarPerfil(true)
      verificarAcessoRota()
    } else {
      auth.perfil = null
    }
  }
)
watch(() => route.path, () => verificarAcessoRota())

// Menu filtrado pela permissão do usuário logado (admin sempre vê tudo).
const nav = computed<SidebarItem[]>(() => {
  const itens: SidebarItem[] = [{ label: 'Dashboard', icon: 'heroicons:squares-2x2', to: '/' }]

  if (auth.podeAcessarModulo('pedidos')) {
    itens.push({ label: 'Pedidos', icon: 'heroicons:clipboard-document-list', to: '/pedidos' })
  }

  const cadastros = [
    auth.podeAcessarModulo('clientes') && { label: 'Clientes', icon: 'heroicons:users', to: '/clientes' },
    auth.podeAcessarModulo('vendedores') && { label: 'Vendedores', icon: 'heroicons:user-group', to: '/vendedores' },
    auth.podeAcessarModulo('produtos') && { label: 'Produtos', icon: 'heroicons:cube', to: '/produtos' }
  ].filter(Boolean) as SidebarItem['children']
  if (cadastros && cadastros.length) {
    itens.push({ label: 'Cadastros', icon: 'heroicons:inbox-stack', children: cadastros })
  }

  if (auth.podeAcessarModulo('tabela_preco')) {
    itens.push({ label: 'Tabela de preço', icon: 'heroicons:currency-dollar', to: '/tabela-preco' })
  }
  if (auth.isAdmin) {
    itens.push({ label: 'Importações', icon: 'heroicons:arrow-down-on-square-stack', to: '/importacoes' })
    itens.push({ label: 'Templates', icon: 'heroicons:document-duplicate', to: '/templates' })
  }
  if (auth.podeAcessarModulo('relatorios')) {
    itens.push({ label: 'Relatórios', icon: 'heroicons:chart-bar', to: '/relatorios' })
  }
  if (auth.isAdmin) {
    itens.push({ label: 'Power BI', icon: 'heroicons:chart-bar-square', to: '/power-bi' })
    itens.push({
      label: 'Configurações',
      icon: 'heroicons:cog-6-tooth',
      children: [
        { label: 'Geral', icon: 'heroicons:cog-6-tooth', to: '/configuracoes' },
        { label: 'Funções de acesso', icon: 'heroicons:key', to: '/configuracoes/funcoes' }
      ]
    })
  }

  return itens
})
</script>
