<template>
  <div class="space-y-4">
    <!-- ───── Filtros: período + o que está marcado no filtro cruzado ───── -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-2 rounded-default border border-shift3-input-border bg-shift3-input px-2.5 py-1.5">
        <Icon name="heroicons:calendar-days" class="h-4 w-4 text-shift3-text-muted" />
        <select
          v-model="preset"
          class="cursor-pointer bg-transparent text-sm text-shift3-text outline-none"
          aria-label="Período"
        >
          <option v-for="p in PRESETS_PERIODO" :key="p.id" :value="p.id" class="bg-shift3-bg-card">{{ p.nome }}</option>
        </select>
      </div>
      <template v-if="preset === 'personalizado'">
        <input v-model="de" type="date" :class="CAMPO_DATA" aria-label="De" />
        <span class="text-xs text-shift3-text-muted">até</span>
        <input v-model="ate" type="date" :class="CAMPO_DATA" aria-label="Até" />
      </template>

      <button
        v-for="chip in chips"
        :key="chip.chave + chip.valor"
        type="button"
        class="inline-flex items-center gap-1 rounded-pill border border-shift3-teal/30 bg-shift3-green/15 px-2.5 py-1 text-xs font-medium text-shift3-text transition hover:bg-shift3-green/30"
        :title="'Tirar o filtro ' + chip.texto"
        @click="alternar(chip.chave, chip.valor)"
      >
        {{ chip.texto }}
        <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />
      </button>
      <button
        v-if="chips.length"
        type="button"
        class="text-xs font-medium text-shift3-text-secondary underline-offset-2 hover:text-shift3-text hover:underline"
        @click="selecoes = {}"
      >
        Limpar filtros
      </button>

      <p v-else-if="definicao.blocos.length" class="ml-auto hidden text-xs text-shift3-text-muted md:block">
        Clique numa barra, fatia ou linha de tabela para filtrar o painel inteiro.
      </p>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <div
        v-for="bloco in definicao.blocos"
        :key="bloco.id"
        :class="[LARGURA[bloco.largura] ?? LARGURA[6], sobre === bloco.id ? 'rounded-medium ring-2 ring-shift3-green' : '']"
        :draggable="editavel"
        @dragstart="aoArrastar(bloco.id, $event)"
        @dragover="aoPassar(bloco.id, $event)"
        @dragleave="sobre === bloco.id && (sobre = null)"
        @drop="aoSoltar(bloco.id, $event)"
        @dragend="limparArraste"
      >
        <RelatoriosBloco
          :bloco="bloco"
          :dados="calculos[bloco.id]!.dados"
          :dados-anteriores="calculos[bloco.id]!.anteriores"
          :selecionados="calculos[bloco.id]!.selecionados"
          :editavel="editavel"
          :cor-padrao="definicao.cor"
          @selecionar="(v) => bloco.grupos[0] && alternar(chaveGrupo(bloco.grupos[0]), v)"
          @editar="emit('editar', bloco)"
          @duplicar="duplicar(bloco)"
          @remover="remover(bloco)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  campoRelatorio,
  novoIdBloco,
  type BlocoRelatorio,
  type DadosRelatorio,
  type DefinicaoRelatorio,
  type GrupoBloco
} from '#shared/utils/relatorios'
import {
  chaveGrupo,
  filtrarDados,
  intervaloAnterior,
  intervaloDoPreset,
  PRESETS_PERIODO,
  rotuloGrupo,
  type IntervaloDatas,
  type PresetPeriodo,
  type Selecoes
} from '~/utils/relatorioCalculo'

const props = defineProps<{
  definicao: DefinicaoRelatorio
  dados: DadosRelatorio
  /** Modo edição: arrastar pra reordenar e menu de opções em cada bloco. */
  editavel?: boolean
}>()

const emit = defineEmits<{
  'update:definicao': [definicao: DefinicaoRelatorio]
  editar: [bloco: BlocoRelatorio]
}>()

const CAMPO_DATA =
  'rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'

// classes escritas por extenso: o Tailwind só gera o que encontra no código
const LARGURA: Record<number, string> = {
  3: 'col-span-12 sm:col-span-6 xl:col-span-3',
  4: 'col-span-12 md:col-span-6 xl:col-span-4',
  6: 'col-span-12 lg:col-span-6',
  8: 'col-span-12 lg:col-span-8',
  12: 'col-span-12'
}

// ── período ──
const preset = ref<PresetPeriodo>('tudo')
const de = ref('')
const ate = ref('')

const intervalo = computed<IntervaloDatas>(() =>
  preset.value === 'personalizado' ? { de: de.value || null, ate: ate.value || null } : intervaloDoPreset(preset.value)
)

// ── filtro cruzado ──
const selecoes = ref<Selecoes>({})

function alternar(chave: string, valor: string) {
  const atuais = selecoes.value[chave] ?? []
  const novos = atuais.includes(valor) ? atuais.filter((v) => v !== valor) : [...atuais, valor]
  const copia = { ...selecoes.value }
  if (novos.length) copia[chave] = novos
  else delete copia[chave]
  selecoes.value = copia
}

function grupoDaChave(chave: string): GrupoBloco {
  const [campo, periodo] = chave.split('@')
  return { campo: campo!, periodo: (periodo ?? '') as GrupoBloco['periodo'] }
}

const chips = computed(() =>
  Object.entries(selecoes.value).flatMap(([chave, valores]) => {
    const grupo = grupoDaChave(chave)
    const nome = campoRelatorio(grupo.campo)?.nome ?? grupo.campo
    return valores.map((valor) => ({ chave, valor, texto: `${nome}: ${rotuloGrupo(valor, grupo)}` }))
  })
)

// seleção num agrupamento que saiu do painel deixaria um filtro invisível preso
watch(
  () => props.definicao.blocos.map((b) => (b.grupos[0] ? chaveGrupo(b.grupos[0]) : '')).join('|'),
  (chaves) => {
    const existentes = new Set(chaves.split('|'))
    const sobras = Object.keys(selecoes.value).filter((c) => !existentes.has(c))
    if (!sobras.length) return
    const copia = { ...selecoes.value }
    for (const c of sobras) delete copia[c]
    selecoes.value = copia
  }
)

/**
 * As linhas de cada bloco. O bloco NÃO é filtrado pela seleção feita no próprio agrupamento:
 * assim ele continua mostrando todas as categorias, com as não marcadas esmaecidas.
 */
const calculos = computed(() => {
  const anterior = intervaloAnterior(intervalo.value)
  const saida: Record<string, { dados: DadosRelatorio; anteriores: DadosRelatorio | null; selecionados: string[] }> = {}
  for (const bloco of props.definicao.blocos) {
    const propria = bloco.grupos[0] ? chaveGrupo(bloco.grupos[0]) : ''
    const outras: Selecoes = {}
    for (const [chave, valores] of Object.entries(selecoes.value)) if (chave !== propria) outras[chave] = valores
    const filtros = [...props.definicao.filtros, ...bloco.filtros]
    saida[bloco.id] = {
      dados: filtrarDados(props.dados, filtros, outras, intervalo.value),
      anteriores: bloco.tipo === 'numero' && anterior ? filtrarDados(props.dados, filtros, outras, anterior) : null,
      selecionados: selecoes.value[propria] ?? []
    }
  }
  return saida
})

// ── edição: duplicar, remover, reordenar arrastando ──
function atualizarBlocos(blocos: BlocoRelatorio[]) {
  emit('update:definicao', { ...props.definicao, blocos })
}

function duplicar(bloco: BlocoRelatorio) {
  const blocos = [...props.definicao.blocos]
  const copia: BlocoRelatorio = { ...JSON.parse(JSON.stringify(bloco)), id: novoIdBloco() }
  blocos.splice(blocos.indexOf(bloco) + 1, 0, copia)
  atualizarBlocos(blocos)
}

function remover(bloco: BlocoRelatorio) {
  atualizarBlocos(props.definicao.blocos.filter((b) => b.id !== bloco.id))
}

const arrastando = ref<string | null>(null)
const sobre = ref<string | null>(null)

function aoArrastar(id: string, ev: DragEvent) {
  if (!props.editavel) return
  arrastando.value = id
  ev.dataTransfer?.setData('text/plain', id)
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'
}

function aoPassar(id: string, ev: DragEvent) {
  if (!arrastando.value || arrastando.value === id) return
  ev.preventDefault()
  sobre.value = id
}

function aoSoltar(id: string, ev: DragEvent) {
  const origem = arrastando.value
  limparArraste()
  if (!origem || origem === id) return
  ev.preventDefault()
  const blocos = [...props.definicao.blocos]
  const posOrigem = blocos.findIndex((b) => b.id === origem)
  const posDestino = blocos.findIndex((b) => b.id === id)
  if (posOrigem < 0 || posDestino < 0) return
  const [movido] = blocos.splice(posOrigem, 1)
  blocos.splice(posDestino, 0, movido!)
  atualizarBlocos(blocos)
}

function limparArraste() {
  arrastando.value = null
  sobre.value = null
}
</script>
