<template>
  <!-- assinatura bloqueada: o banco já não devolve nada da empresa — só a explicação e o Sair -->
  <div v-if="auth.bloqueada" class="flex min-h-screen items-center justify-center bg-shift3-bg-light p-6">
    <div class="w-full max-w-md rounded-large border border-shift3-border bg-shift3-bg-card p-8 text-center shadow-md">
      <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
        <Icon name="heroicons:lock-closed" class="h-6 w-6" />
      </span>
      <h2 class="mt-4">Acesso suspenso</h2>
      <p class="mt-2 text-sm text-shift3-text-secondary">
        A assinatura de <strong>{{ auth.contexto?.empresa_nome || 'sua empresa' }}</strong> está suspensa ou vencida.
        Seus dados continuam guardados — fale com o suporte pra liberar o acesso.
      </p>
      <BaseButton class="mt-6" variant="secondary" icon-left="heroicons:arrow-left-on-rectangle" @click="auth.sair()">
        Sair
      </BaseButton>
    </div>
  </div>

  <div v-else class="flex h-screen overflow-hidden bg-shift3-sidebar">
    <AppSidebar
      v-model:collapsed="collapsed"
      :items="nav"
      :user="{ name: auth.nome, email: auth.email ?? undefined, avatar: auth.perfil?.avatar_url ?? undefined }"
    />

    <!-- Conteúdo (à direita) — canto côncavo na junção com o sidebar -->
    <div class="corner-concave flex min-w-0 flex-1 flex-col rounded-tl-[1.5rem] bg-shift3-bg-card">
      <!-- master dentro de uma empresa: sempre visível, pra não esquecer onde está mexendo -->
      <div
        v-if="auth.emSuporte"
        class="flex shrink-0 items-center gap-3 rounded-tl-[1.5rem] bg-shift3-dark px-6 py-2 text-sm text-white"
      >
        <Icon name="heroicons:lifebuoy" class="h-4 w-4 shrink-0 text-shift3-green" />
        <span class="min-w-0 flex-1 truncate">
          Você está no acesso de <strong>{{ auth.contexto?.empresa_nome }}</strong> como suporte
        </span>
        <button
          type="button"
          class="shrink-0 rounded-pill bg-shift3-green px-3 py-1 text-xs font-semibold text-shift3-dark transition hover:bg-white disabled:opacity-60"
          :disabled="saindoDaEmpresa"
          @click="sairDaEmpresa"
        >
          {{ saindoDaEmpresa ? 'Saindo…' : 'Sair da empresa' }}
        </button>
      </div>
      <!-- assinatura vencida (nos dias de tolerância) ou em teste — o aviso de teste é só pro admin -->
      <div
        v-if="avisoAssinatura"
        class="flex shrink-0 items-center gap-2 border-b px-6 py-2 text-sm"
        :class="[
          avisoAssinatura.tipo === 'vencida' ? 'border-warning/40 bg-warning/15 text-shift3-text' : 'border-shift3-border bg-shift3-bg-light text-shift3-text-secondary',
          { 'rounded-tl-[1.5rem]': !auth.emSuporte }
        ]"
      >
        <Icon
          :name="avisoAssinatura.tipo === 'vencida' ? 'heroicons:exclamation-triangle' : 'heroicons:clock'"
          class="h-4 w-4 shrink-0"
          :class="avisoAssinatura.tipo === 'vencida' ? 'text-warning' : 'text-shift3-teal'"
        />
        {{ avisoAssinatura.texto }}
      </div>
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
        <!-- ação principal do produto, sempre à mão (no Dashboard o botão grande já está na tela) -->
        <BaseButton
          v-if="mostrarAtalhoImportar"
          to="/pedidos/novo"
          variant="accent"
          size="sm"
          icon-left="heroicons:arrow-up-tray"
          class="shrink-0 max-sm:ml-auto"
          title="Importar novo pedido"
          aria-label="Importar novo pedido"
        >
          <span class="hidden md:inline">Importar pedido</span>
        </BaseButton>
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

const mostrarAtalhoImportar = computed(
  () => auth.podeIncluirModulo('pedidos') && route.path !== '/' && route.path !== '/pedidos/novo'
)

const auth = useAuthStore()
const toast = useToast()

const saindoDaEmpresa = ref(false)
async function sairDaEmpresa() {
  saindoDaEmpresa.value = true
  try {
    await auth.sairDaEmpresa()
  } catch (e) {
    console.error('Erro ao sair da empresa:', e)
    toast.error('Não foi possível sair da empresa')
    saindoDaEmpresa.value = false
  }
}

/** Mesma tolerância do banco (situacao_assinatura): bloqueia 5 dias depois do vencimento. */
const DIAS_TOLERANCIA = 5
const avisoAssinatura = computed<{ tipo: 'vencida' | 'teste'; texto: string } | null>(() => {
  const ctx = auth.contexto
  if (!ctx?.vence_em) return null
  const [a, m, d] = ctx.vence_em.split('-').map(Number) as [number, number, number]
  const vence = new Date(a, m - 1, d)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.round((vence.getTime() - hoje.getTime()) / 86_400_000)
  const data = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
  if (ctx.situacao === 'vencida') {
    const restam = DIAS_TOLERANCIA + dias
    return {
      tipo: 'vencida',
      texto: `A assinatura venceu em ${data}. O acesso será bloqueado ${restam <= 0 ? 'amanhã' : `em ${restam + 1} dias`} — fale com o suporte.`
    }
  }
  if (ctx.situacao === 'teste' && auth.isAdmin) {
    return { tipo: 'teste', texto: dias === 0 ? 'Seu período de teste termina hoje.' : `Período de teste até ${data} (${dias} ${dias === 1 ? 'dia' : 'dias'}).` }
  }
  return null
})

// Rotas restritas por módulo/papel — checadas aqui (não no middleware global) porque
// dependem do perfil já carregado; fazer o middleware esperar isso causou instabilidade.
const ROTAS_SOMENTE_ADMIN = ['/configuracoes', '/templates', '/importacoes', '/power-bi', '/relatorios']
const MODULO_POR_PREFIXO: [string, string][] = [
  ['/clientes', 'clientes'],
  ['/vendedores', 'vendedores'],
  ['/produtos', 'produtos'],
  ['/tabela-preco', 'tabela_preco'],
  ['/condicoes-pagamento', 'condicoes_pagamento'],
  ['/fabricas', 'tabela_preco'],
  ['/pedidos', 'pedidos'],
  ['/relatorios', 'relatorios']
]
function comecaCom(path: string, prefixo: string) {
  return path === prefixo || path.startsWith(prefixo + '/')
}
function verificarAcessoRota() {
  if (!auth.perfil) return
  const path = route.path
  if (comecaCom(path, '/master') && !auth.ehMaster) {
    navigateTo('/')
    return
  }
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

  // na ordem de começo no sistema: produtos (e fábricas, pra tabela de preço) → clientes
  const cadastros = [
    auth.podeAcessarModulo('produtos') && { label: 'Produtos', icon: 'heroicons:cube', to: '/produtos' },
    // fábricas não têm módulo próprio: a RLS libera pra quem acessa a tabela de preço
    auth.podeAcessarModulo('tabela_preco') && { label: 'Fábricas', icon: 'heroicons:building-office-2', to: '/fabricas' },
    auth.podeAcessarModulo('clientes') && { label: 'Clientes', icon: 'heroicons:users', to: '/clientes' },
    auth.podeAcessarModulo('vendedores') && { label: 'Vendedores', icon: 'heroicons:user-group', to: '/vendedores' },
    auth.podeAcessarModulo('condicoes_pagamento') && {
      label: 'Condições de pagamento',
      icon: 'heroicons:banknotes',
      to: '/condicoes-pagamento'
    }
  ].filter(Boolean) as SidebarItem['children']
  if (cadastros && cadastros.length) {
    itens.push({ label: 'Cadastros', icon: 'heroicons:inbox-stack', children: cadastros })
  }

  if (auth.podeAcessarModulo('tabela_preco')) {
    itens.push({ label: 'Tabela de preço', icon: 'heroicons:currency-dollar', to: '/tabela-preco' })
  }
  if (auth.isAdmin) {
    // ordem de começo no sistema: produtos → tabela de preço → clientes → templates
    itens.push({ label: 'Templates', icon: 'heroicons:document-duplicate', to: '/templates' })
    itens.push({ label: 'Importações', icon: 'heroicons:arrow-down-on-square-stack', to: '/importacoes' })
  }
  // montar relatório e liberar acesso de cliente é só do admin (as tabelas só aceitam ele)
  if (auth.isAdmin) {
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
  if (auth.ehMaster) {
    itens.push({ label: 'Master', icon: 'heroicons:shield-check', to: '/master' })
  }

  return itens
})
</script>
