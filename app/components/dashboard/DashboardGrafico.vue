<template>
  <section class="rounded-medium border border-shift3-border bg-shift3-bg-card p-5 shadow-sm">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-[15px] font-semibold text-shift3-text">Pedidos importados</h2>
        <p class="text-xs text-shift3-text-muted">{{ legendaPeriodo }}</p>
      </div>
      <div class="text-right">
        <p class="text-xl font-bold leading-tight text-shift3-text"><BaseContador :valor="totalQuantidade" /></p>
        <p class="text-xs text-shift3-text-secondary"><BaseContador :valor="totalValor" :formatar="formatarMoedaCurta" /></p>
      </div>
    </header>

    <div ref="caixa" class="relative mt-4 h-44 select-none" @mouseleave="indice = null">
      <svg v-if="largura" :width="largura" :height="ALTURA" class="block overflow-visible text-shift3-teal dark:text-success" role="img" :aria-label="descricaoAcessivel">
        <defs>
          <linearGradient :id="idGradiente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.28" />
            <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- grade recessiva + rótulos do eixo y -->
        <g v-for="g in grade" :key="g.valor">
          <line :x1="MARGEM_ESQ" :x2="largura" :y1="g.y" :y2="g.y" class="stroke-shift3-border" stroke-dasharray="3 4" />
          <text :x="MARGEM_ESQ - 8" :y="g.y + 3" text-anchor="end" class="fill-shift3-text-muted text-[10px]">{{ g.valor }}</text>
        </g>

        <g :key="chaveAnimacao">
          <path :d="caminhoArea" :fill="`url(#${idGradiente})`" class="animate-sobe" />
          <path
            :d="caminhoLinha"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
            pathLength="1"
            class="animate-desenha"
          />
        </g>

        <!-- rótulos do eixo x, só alguns pra não encavalar -->
        <text
          v-for="r in rotulosX"
          :key="r.i"
          :x="r.x"
          :y="ALTURA - 4"
          text-anchor="middle"
          class="fill-shift3-text-muted text-[10px]"
        >
          {{ r.texto }}
        </text>

        <!-- crosshair -->
        <g v-if="indice !== null && pontos[indice]">
          <line :x1="pontos[indice]!.x" :x2="pontos[indice]!.x" :y1="TOPO" :y2="BASE" class="stroke-shift3-text-muted" stroke-width="1" />
          <circle :cx="pontos[indice]!.x" :cy="pontos[indice]!.y" r="5" fill="currentColor" class="stroke-shift3-bg-card" stroke-width="2" />
        </g>

        <!-- alvos de hover, mais largos que a marca -->
        <rect
          v-for="(p, i) in pontos"
          :key="`alvo-${i}`"
          :x="p.x - passo / 2"
          :y="0"
          :width="Math.max(passo, 1)"
          :height="ALTURA"
          fill="transparent"
          @mouseenter="indice = i"
        />
      </svg>

      <!-- tooltip -->
      <Transition name="fade">
        <div
          v-if="indice !== null && pontos[indice]"
          class="pointer-events-none absolute z-10 min-w-[9rem] -translate-x-1/2 -translate-y-full rounded-default border border-shift3-border bg-shift3-bg-card px-3 py-2 text-xs shadow-lg"
          :style="{ left: `${posicaoTooltipX}px`, top: `${pontos[indice]!.y - 10}px` }"
        >
          <p class="font-semibold capitalize text-shift3-text">{{ serie[indice]!.rotuloLongo }}</p>
          <p class="mt-1 flex justify-between gap-4 text-shift3-text-secondary">
            Pedidos <span class="font-semibold tabular-nums text-shift3-text">{{ serie[indice]!.quantidade }}</span>
          </p>
          <p class="flex justify-between gap-4 text-shift3-text-secondary">
            Valor <span class="font-semibold tabular-nums text-shift3-text">{{ formatarMoedaBR(serie[indice]!.valor) }}</span>
          </p>
        </div>
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { formatarMoedaBR, formatarMoedaCurta, type PeriodoDashboard, type PontoSerie } from '~/utils/dashboard'

const props = defineProps<{
  serie: PontoSerie[]
  periodo: PeriodoDashboard
}>()

const ALTURA = 176
const TOPO = 8
const BASE = ALTURA - 22
const MARGEM_ESQ = 28

const caixa = ref<HTMLElement | null>(null)
const largura = ref(0)
const indice = ref<number | null>(null)
const idGradiente = `dz-area-${useId()}`

let observador: ResizeObserver | null = null
onMounted(() => {
  if (!caixa.value) return
  largura.value = caixa.value.clientWidth
  observador = new ResizeObserver(([e]) => (largura.value = Math.floor(e!.contentRect.width)))
  observador.observe(caixa.value)
})
onBeforeUnmount(() => observador?.disconnect())

const totalQuantidade = computed(() => props.serie.reduce((s, p) => s + p.quantidade, 0))
const totalValor = computed(() => props.serie.reduce((s, p) => s + p.valor, 0))

const legendaPeriodo = computed(
  () => ({ hoje: 'Hoje, por hora', '7d': 'Últimos 7 dias', mes: 'Este mês, por dia', tudo: 'Todo o histórico, por mês' })[props.periodo]
)

/** Teto "redondo" do eixo y (mín. 4) pra grade ter números inteiros. */
const teto = computed(() => {
  const max = Math.max(0, ...props.serie.map((p) => p.quantidade))
  if (max <= 4) return 4
  const ordem = Math.pow(10, Math.floor(Math.log10(max)))
  return Math.ceil(max / ordem) * ordem
})

const passo = computed(() => (props.serie.length > 1 ? (largura.value - MARGEM_ESQ - 8) / (props.serie.length - 1) : 0))

const pontos = computed(() =>
  props.serie.map((p, i) => ({
    x: props.serie.length > 1 ? MARGEM_ESQ + 4 + i * passo.value : (MARGEM_ESQ + largura.value) / 2,
    y: BASE - (p.quantidade / teto.value) * (BASE - TOPO)
  }))
)

/** Curva suave (monotônica simples) entre os pontos. */
const caminhoLinha = computed(() => {
  const pts = pontos.value
  if (!pts.length) return ''
  let d = `M${pts[0]!.x},${pts[0]!.y}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const cx = (a.x + b.x) / 2
    d += ` C${cx},${a.y} ${cx},${b.y} ${b.x},${b.y}`
  }
  return d
})

const caminhoArea = computed(() => {
  const pts = pontos.value
  if (!pts.length) return ''
  return `${caminhoLinha.value} L${pts[pts.length - 1]!.x},${BASE} L${pts[0]!.x},${BASE} Z`
})

const grade = computed(() =>
  [0, 0.5, 1].map((f) => ({ valor: Math.round(teto.value * f), y: BASE - f * (BASE - TOPO) }))
)

const rotulosX = computed(() => {
  const n = props.serie.length
  if (!n || !largura.value) return []
  const cabem = Math.max(2, Math.floor((largura.value - MARGEM_ESQ) / 44))
  const salto = Math.ceil(n / cabem)
  return props.serie
    .map((p, i) => ({ i, x: pontos.value[i]!.x, texto: p.rotulo }))
    .filter((r) => r.i % salto === 0 || r.i === n - 1)
    .filter((r, idx, arr) => idx === arr.length - 1 || arr[idx + 1]!.i - r.i >= salto * 0.6)
})

/** Tooltip não sai pelas bordas da caixa. */
const posicaoTooltipX = computed(() => {
  if (indice.value === null) return 0
  const x = pontos.value[indice.value]!.x
  return Math.min(Math.max(x, 76), largura.value - 76)
})

/** Troca de período redesenha a linha. */
const chaveAnimacao = computed(() => `${props.periodo}-${props.serie.length}`)

const descricaoAcessivel = computed(
  () => `Pedidos importados: ${totalQuantidade.value} no período. ${props.serie.map((p) => `${p.rotulo}: ${p.quantidade}`).join('; ')}`
)
</script>
