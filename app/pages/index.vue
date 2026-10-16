<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- ───── Boas-vindas + ação principal ───── -->
    <section
      class="animate-sobe relative overflow-hidden rounded-large bg-gradient-to-br from-shift3-dark via-[#1f3530] to-shift3-teal px-6 py-7 text-white shadow-lg sm:px-8"
    >
      <!-- formas decorativas -->
      <div class="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-shift3-green/15 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-shift3-green/10 blur-2xl" />
      <svg class="pointer-events-none absolute right-6 top-6 hidden h-28 w-28 text-white/[0.07] md:block" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" stroke="currentColor" stroke-width="2" />
        <circle cx="50" cy="50" r="32" stroke="currentColor" stroke-width="2" />
        <circle cx="50" cy="50" r="16" stroke="currentColor" stroke-width="2" />
      </svg>

      <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-sm font-medium text-shift3-green">{{ dataHoje }}</p>
          <h1 class="mt-1 text-[26px] font-bold leading-tight text-white sm:text-3xl">
            {{ saudacaoTexto }}{{ primeiroNome ? `, ${primeiroNome}` : '' }}
          </h1>
          <p class="mt-2 text-[15px] text-white/75">
            <template v-if="!podeVerPedidos">Bem-vindo ao painel da {{ auth.empresa?.nome || 'sua empresa' }}.</template>
            <template v-else-if="!dash.carregado.value">Juntando os números dos seus pedidos…</template>
            <template v-else-if="atencao.length">
              Você tem
              <span class="font-semibold text-white">{{ atencao.length }} {{ atencao.length === 1 ? 'pedido' : 'pedidos' }}</span>
              pedindo atenção{{ resumoAtencao ? ` — ${resumoAtencao}` : '' }}.
            </template>
            <template v-else-if="dash.pedidos.value.length">Tudo em dia por aqui. Nenhum pedido parado ou esperando você.</template>
            <template v-else>Comece importando o primeiro pedido — foto, PDF ou planilha.</template>
          </p>
        </div>

        <div v-if="podeImportar" class="flex flex-wrap items-center gap-3">
          <NuxtLink
            to="/pedidos/novo"
            class="group inline-flex items-center gap-2.5 rounded-medium bg-shift3-green px-5 py-3.5 text-[15px] font-bold text-shift3-dark shadow-lg shadow-black/20 outline-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span class="grid h-8 w-8 place-items-center rounded-default bg-shift3-dark/10 transition group-hover:rotate-[-8deg] group-hover:scale-110">
              <Icon name="heroicons:arrow-up-tray" class="h-5 w-5" />
            </span>
            Importar novo pedido
          </NuxtLink>
          <NuxtLink
            v-if="podeVerPedidos"
            to="/pedidos"
            class="inline-flex items-center gap-1.5 rounded-medium px-4 py-3.5 text-sm font-semibold text-white/85 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Ver pedidos
            <Icon name="heroicons:arrow-right" class="h-4 w-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <template v-if="podeVerPedidos">
      <!-- ───── Funil ───── -->
      <section class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-[17px] font-semibold text-shift3-text">Onde estão seus pedidos</h2>
            <p class="text-xs text-shift3-text-muted">Pedidos importados no período, pela etapa em que estão agora. Clique pra abrir.</p>
          </div>

          <!-- seletor de período com indicador que desliza -->
          <div class="relative inline-flex rounded-medium border border-shift3-border bg-shift3-bg-light p-1" role="tablist" aria-label="Período">
            <span
              class="absolute bottom-1 top-1 rounded-default bg-shift3-bg-card shadow-md transition-all duration-300 ease-out"
              :style="estiloIndicador"
            />
            <button
              v-for="(p, i) in PERIODOS_DASHBOARD"
              :key="p.valor"
              :ref="(el) => (botoesPeriodo[i] = el as HTMLElement)"
              type="button"
              role="tab"
              :aria-selected="periodo === p.valor"
              class="relative z-10 rounded-default px-3.5 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-shift3-green/40"
              :class="periodo === p.valor ? 'text-shift3-text' : 'text-shift3-text-muted hover:text-shift3-text-secondary'"
              @click="periodo = p.valor"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <div v-if="!dash.carregado.value" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div v-for="n in 5" :key="n" class="space-y-3 rounded-medium border border-shift3-border p-4">
            <div class="esqueleto h-9 w-9" />
            <div class="esqueleto h-3 w-24" />
            <div class="esqueleto h-7 w-12" />
            <div class="esqueleto h-3 w-20" />
          </div>
        </div>
        <DashboardFunil v-else :numeros="numeros" />
      </section>

      <!-- ───── Atenção + gráfico + clientes ───── -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div class="lg:col-span-3">
          <div v-if="!dash.carregado.value" class="space-y-4 rounded-medium border border-shift3-border p-5">
            <div class="esqueleto h-5 w-48" />
            <div v-for="n in 4" :key="n" class="flex items-center gap-3">
              <div class="esqueleto h-9 w-9 shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="esqueleto h-3 w-2/3" />
                <div class="esqueleto h-3 w-1/2" />
              </div>
            </div>
          </div>
          <DashboardAtencao v-else :itens="atencao" />
        </div>

        <div class="space-y-6 lg:col-span-2">
          <template v-if="!dash.carregado.value">
            <div class="esqueleto h-64 w-full" />
            <div class="esqueleto h-56 w-full" />
          </template>
          <template v-else>
            <DashboardGrafico :serie="serie" :periodo="periodo" />
            <DashboardTopClientes :key="periodo" :clientes="clientes" />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import {
  PERIODOS_DASHBOARD,
  itensAtencao,
  numerosPorEtapa,
  saudacao,
  seriePorTempo,
  topClientes,
  type PeriodoDashboard
} from '~/utils/dashboard'

definePageMeta({ layout: 'dashboard', title: 'Dashboard' })

const auth = useAuthStore()
const toast = useToast()
const dash = useDashboard()

const periodo = useCookie<PeriodoDashboard>('dz-dashboard-periodo', { default: () => 'mes' })

const podeVerPedidos = computed(() => auth.podeAcessarModulo('pedidos'))
const podeImportar = computed(() => auth.podeIncluirModulo('pedidos'))

const agora = ref(new Date())
const saudacaoTexto = computed(() => saudacao(agora.value))
const primeiroNome = computed(() => (auth.perfil?.nome_completo || '').trim().split(/\s+/)[0] || '')
const dataHoje = computed(() => {
  const t = agora.value.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
})

const numeros = computed(() => numerosPorEtapa(dash.pedidos.value, periodo.value, agora.value))
const serie = computed(() => seriePorTempo(dash.pedidos.value, periodo.value, agora.value))
const clientes = computed(() => topClientes(dash.pedidos.value, periodo.value, 5, agora.value))
const atencao = computed(() => itensAtencao(dash.pedidos.value, dash.links.value, dash.falhas.value, agora.value))

/** "2 rejeitados, 1 sem resposta" — os dois tipos mais urgentes. */
const resumoAtencao = computed(() => {
  const conta = new Map<string, number>()
  for (const i of atencao.value) conta.set(i.tipo, (conta.get(i.tipo) ?? 0) + 1)
  const nomes: Record<string, [string, string]> = {
    rejeitado: ['rejeitado', 'rejeitados'],
    link_expirado: ['link expirado', 'links expirados'],
    sem_resposta: ['sem resposta do cliente', 'sem resposta do cliente'],
    parado: ['parado', 'parados'],
    falha_leitura: ['arquivo com falha', 'arquivos com falha']
  }
  return [...conta.entries()]
    .slice(0, 2)
    .map(([tipo, n]) => `${n} ${n === 1 ? nomes[tipo]![0] : nomes[tipo]![1]}`)
    .join(', ')
})

// indicador do seletor de período acompanha o botão ativo
const botoesPeriodo = ref<HTMLElement[]>([])
const estiloIndicador = ref<Record<string, string>>({ opacity: '0' })
function posicionarIndicador() {
  const i = PERIODOS_DASHBOARD.findIndex((p) => p.valor === periodo.value)
  const el = botoesPeriodo.value[i]
  if (!el) return
  estiloIndicador.value = { left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px`, opacity: '1' }
}
watch(periodo, () => nextTick(posicionarIndicador))

async function carregar() {
  if (!podeVerPedidos.value) return
  agora.value = new Date()
  try {
    await dash.carregar()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Não foi possível carregar o painel.')
  }
}

onMounted(async () => {
  await auth.carregarPerfil()
  await nextTick()
  posicionarIndicador()
  await carregar()
  await nextTick()
  posicionarIndicador()
})
// perfil pode chegar depois (refresh da página)
watch(podeVerPedidos, (pode) => pode && carregar().then(() => nextTick(posicionarIndicador)))
</script>
