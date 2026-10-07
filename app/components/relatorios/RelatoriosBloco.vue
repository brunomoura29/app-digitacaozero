<template>
  <section
    class="group flex h-full flex-col rounded-medium border border-shift3-border bg-shift3-bg-card shadow-sm transition hover:shadow-md"
    :class="visual.classe"
    :style="visual.estilo"
  >
    <header class="flex items-center gap-2 px-4 pt-3">
      <Icon
        v-if="editavel"
        name="heroicons:bars-2"
        class="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-shift3-text-muted"
        title="Arraste para mudar de lugar"
      />
      <span
        v-if="bloco.icone"
        class="bloco-icone grid h-8 w-8 shrink-0 place-items-center rounded-default"
        :class="hex ? '' : 'bg-shift3-border/50 text-shift3-text-secondary'"
      >
        <Icon :name="'heroicons:' + bloco.icone" class="h-[18px] w-[18px]" />
      </span>
      <p class="min-w-0 flex-1 truncate text-sm font-semibold text-shift3-text" :title="bloco.titulo">
        {{ bloco.titulo }}
      </p>
      <BaseDropdown v-if="editavel" :items="acoes" align="right">
        <button
          type="button"
          class="grid h-6 w-6 place-items-center rounded-default text-shift3-text-muted transition hover:bg-shift3-border/50 hover:text-shift3-text"
          aria-label="Opções do bloco"
        >
          <Icon name="heroicons:ellipsis-horizontal" class="h-4 w-4" />
        </button>
      </BaseDropdown>
    </header>

    <!-- ───── Cartão de número ───── -->
    <div v-if="bloco.tipo === 'numero'" class="flex flex-1 flex-col justify-center px-4 pb-4 pt-1">
      <p class="truncate text-[28px] font-semibold leading-tight text-shift3-text" :title="numeroCompleto">
        {{ numeroCurto }}
      </p>
      <p v-if="variacao" class="mt-1 flex items-center gap-1 text-xs">
        <span
          class="inline-flex items-center gap-0.5 font-semibold"
          :class="variacao.sobe ? 'text-shift3-teal dark:text-success' : 'text-danger'"
        >
          <Icon :name="variacao.sobe ? 'heroicons:arrow-trending-up' : 'heroicons:arrow-trending-down'" class="h-3.5 w-3.5" />
          {{ variacao.texto }}
        </span>
        <span class="text-shift3-text-muted">vs. período anterior</span>
      </p>
      <p v-else class="mt-1 truncate text-xs text-shift3-text-muted">{{ legendaNumero }}</p>
    </div>

    <!-- ───── Tabela ───── -->
    <div v-else-if="bloco.tipo === 'tabela'" class="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-2">
      <p v-if="!tabela.linhas.length" class="px-2 py-8 text-center text-sm text-shift3-text-muted">
        Sem dados para os filtros atuais.
      </p>
      <div v-else class="max-h-[360px] overflow-auto">
        <table class="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                v-for="(col, i) in tabela.colunas"
                :key="i"
                class="sticky top-0 cursor-pointer select-none whitespace-nowrap border-b border-shift3-border bg-shift3-bg-card px-2 py-2 text-xs font-semibold text-shift3-text-secondary hover:text-shift3-text"
                :class="col.numerica ? 'text-right' : 'text-left'"
                @click="ordenarPor(i)"
              >
                {{ col.rotulo }}
                <Icon
                  v-if="ordenacao?.coluna === i"
                  :name="ordenacao.desc ? 'heroicons:chevron-down' : 'heroicons:chevron-up'"
                  class="inline h-3 w-3"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(linha, i) in linhasOrdenadas"
              :key="i"
              class="transition hover:bg-shift3-border/30"
              :class="[
                bloco.grupos.length ? 'cursor-pointer' : '',
                selecionados.length && !selecionados.includes(linha.valor) ? 'opacity-40' : ''
              ]"
              @click="bloco.grupos.length && emit('selecionar', linha.valor)"
            >
              <td
                v-for="(celula, j) in linha.celulas"
                :key="j"
                class="border-b border-shift3-border/60 px-2 py-1.5"
                :class="tabela.colunas[j]!.numerica ? 'whitespace-nowrap text-right tabular-nums text-shift3-text' : 'text-shift3-text'"
              >
                {{ formatarCelula(celula, j) }}
              </td>
            </tr>
          </tbody>
          <tfoot v-if="bloco.medidas.length && bloco.grupos.length">
            <tr>
              <td
                v-for="(celula, j) in tabela.totais"
                :key="j"
                class="sticky bottom-0 border-t border-shift3-border bg-shift3-bg-card px-2 py-2 font-semibold text-shift3-text"
                :class="tabela.colunas[j]!.numerica ? 'whitespace-nowrap text-right tabular-nums' : ''"
              >
                {{ formatarCelula(celula, j) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p v-if="tabela.ocultas" class="px-2 pt-2 text-xs text-shift3-text-muted">
        Mostrando {{ tabela.linhas.length }} linhas — há mais {{ tabela.ocultas }}. O total considera todas.
      </p>
    </div>

    <!-- ───── Gráficos ───── -->
    <div v-else class="flex-1 px-2 pb-2 pt-1">
      <p v-if="!grafico.categorias.length" class="px-2 py-12 text-center text-sm text-shift3-text-muted">
        Sem dados para os filtros atuais.
      </p>
      <ClientOnly v-else>
        <RelatoriosGrafico
          :tipo="bloco.tipo"
          :resultado="grafico"
          :empilhado="bloco.grupos.length > 1"
          :selecionados="selecionados"
          :descricao="bloco.titulo"
          :cor="hex"
          :suave="bloco.curva === 'suave'"
          :rotulos="bloco.rotulos"
          @selecionar="(v) => emit('selecionar', v)"
        />
      </ClientOnly>
      <p v-if="grafico.ocultas" class="px-2 text-xs text-shift3-text-muted">
        Mostrando {{ grafico.categorias.length }} de {{ grafico.categorias.length + grafico.ocultas }}.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CORES_BLOCO, hexDaCor, type BlocoRelatorio, type CorBloco, type DadosRelatorio } from '#shared/utils/relatorios'
import type { DropdownItem } from '~/components/base/BaseDropdown.vue'
import {
  calcularGrafico,
  calcularNumero,
  calcularTabela,
  formatarMedida,
  rotuloMedida,
  type ResultadoGrafico,
  type ResultadoTabela
} from '~/utils/relatorioCalculo'

const props = defineProps<{
  bloco: BlocoRelatorio
  /** Linhas já filtradas pra este bloco. */
  dados: DadosRelatorio
  /** As mesmas linhas no período anterior — só existe com filtro de período ativo. */
  dadosAnteriores?: DadosRelatorio | null
  /** Valores do 1º agrupamento marcados no filtro cruzado. */
  selecionados: string[]
  editavel?: boolean
  /** Cor do painel — vale pro bloco que não escolheu a própria. */
  corPadrao?: CorBloco
}>()

const emit = defineEmits<{
  selecionar: [valor: string]
  editar: []
  duplicar: []
  remover: []
}>()

// ── aparência: cor, ícone e estilo vêm da planta. O Tailwind não gera classe pra cor escolhida
// em tempo de execução, então ela entra por variável CSS (--bc) ──
const colorMode = useColorMode()
const cor = computed(() => props.bloco.cor || props.corPadrao || '')
const hex = computed(() => hexDaCor(cor.value, colorMode.value === 'dark'))

const visual = computed(() => {
  if (!hex.value) return { classe: '', estilo: undefined }
  const estilo = props.bloco.estilo
  const textoEscuro = CORES_BLOCO.find((c) => c.id === cor.value)?.textoEscuro
  return {
    classe: estilo === 'cheio' ? 'bloco-cor bloco-cheio' : estilo === 'suave' ? 'bloco-cor bloco-suave' : 'bloco-cor',
    estilo: { '--bc': hex.value, '--bt': textoEscuro ? '#14181d' : '#ffffff' }
  }
})

const acoes = computed<DropdownItem[]>(() => [
  { label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => emit('editar') },
  { label: 'Duplicar', icon: 'heroicons:document-duplicate', onClick: () => emit('duplicar') },
  { divider: true },
  { label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('remover') }
])

const VAZIO_GRAFICO: ResultadoGrafico = { categorias: [], series: [], ocultas: 0 }
const VAZIO_TABELA: ResultadoTabela = { colunas: [], linhas: [], chaves: [], totais: [], ocultas: 0 }

const ehGrafico = computed(() => props.bloco.tipo !== 'numero' && props.bloco.tipo !== 'tabela')
const grafico = computed(() => (ehGrafico.value ? calcularGrafico(props.bloco, props.dados) : VAZIO_GRAFICO))
const tabela = computed(() => (props.bloco.tipo === 'tabela' ? calcularTabela(props.bloco, props.dados) : VAZIO_TABELA))

// ── cartão de número ──
const medida = computed(() => props.bloco.medidas[0])
const numero = computed(() => (props.bloco.tipo === 'numero' ? calcularNumero(props.bloco, props.dados) : null))
const numeroCurto = computed(() => (medida.value ? formatarMedida(numero.value, medida.value, true) : '–'))
const numeroCompleto = computed(() => (medida.value ? formatarMedida(numero.value, medida.value) : ''))
const legendaNumero = computed(() => (medida.value ? rotuloMedida(medida.value) : ''))

const variacao = computed(() => {
  if (props.bloco.tipo !== 'numero' || !props.dadosAnteriores || numero.value == null) return null
  const antes = calcularNumero(props.bloco, props.dadosAnteriores)
  // sem base de comparação (zero ou vazio antes) não existe percentual honesto
  if (!antes) return null
  const pct = ((numero.value - antes) / Math.abs(antes)) * 100
  return { sobe: pct >= 0, texto: `${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%` }
})

// ── tabela ──
const ordenacao = ref<{ coluna: number; desc: boolean } | null>(null)

function ordenarPor(coluna: number) {
  const atual = ordenacao.value
  ordenacao.value = atual?.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: !!tabela.value.colunas[coluna]?.numerica }
}

const linhasOrdenadas = computed(() => {
  // `valor` = 1º agrupamento da linha, que é o que o clique marca no filtro cruzado
  const linhas = tabela.value.linhas.map((celulas, i) => ({ celulas, valor: tabela.value.chaves[i] ?? '' }))
  const o = ordenacao.value
  if (!o) return linhas
  const sinal = o.desc ? -1 : 1
  return [...linhas].sort((a, b) => {
    const x = a.celulas[o.coluna]
    const y = b.celulas[o.coluna]
    if (typeof x === 'number' || typeof y === 'number') return ((Number(x) || 0) - (Number(y) || 0)) * sinal
    return String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR', { numeric: true }) * sinal
  })
})

function formatarCelula(celula: string | number | null, coluna: number): string {
  if (!tabela.value.colunas[coluna]?.numerica) return celula == null ? '' : String(celula)
  const m = props.bloco.medidas[coluna - props.bloco.grupos.length]
  return m ? formatarMedida(celula as number | null, m) : String(celula ?? '')
}
</script>

<style scoped>
/* com cor: o ícone ganha a cor do bloco sobre um fundo bem leve dela */
.bloco-cor .bloco-icone {
  color: var(--bc);
  background: color-mix(in srgb, var(--bc) 16%, transparent);
}

/* suave: cartão levemente tingido, borda e sombra na cor */
.bloco-suave {
  background: color-mix(in srgb, var(--bc) 8%, rgb(var(--s3-card)));
  border-color: color-mix(in srgb, var(--bc) 38%, rgb(var(--s3-border)));
  box-shadow: 0 10px 28px -12px color-mix(in srgb, var(--bc) 55%, transparent);
}
.bloco-suave:hover {
  box-shadow: 0 14px 34px -12px color-mix(in srgb, var(--bc) 70%, transparent);
}

/* cheio (só cartão de número): fundo na cor, e todo o texto no tom que dá contraste com ela */
.bloco-cheio {
  background: linear-gradient(135deg, var(--bc), color-mix(in srgb, var(--bc) 76%, #000));
  border-color: transparent;
  box-shadow: 0 12px 30px -12px color-mix(in srgb, var(--bc) 75%, transparent);
}
.bloco-cheio :deep(*) {
  color: var(--bt) !important;
}
.bloco-cheio .bloco-icone {
  background: color-mix(in srgb, var(--bt) 18%, transparent);
}
</style>
