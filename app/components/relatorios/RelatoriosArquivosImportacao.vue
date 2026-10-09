<template>
  <!-- Fonte "Importações" de um relatório: qual conjunto de dados e quais arquivos dele entram. -->
  <div>
    <div v-if="carregando" class="flex items-center gap-2 py-4 text-sm text-shift3-text-muted">
      <BaseSpinner size="sm" /> Buscando os arquivos importados…
    </div>

    <div v-else-if="!conjuntos.length" class="rounded-default border border-dashed border-shift3-border px-4 py-5 text-sm text-shift3-text-secondary">
      Você ainda não importou nenhum arquivo.
      <NuxtLink to="/importacoes/novo" class="font-semibold text-shift3-teal hover:underline dark:text-shift3-green">Importar um arquivo</NuxtLink>
    </div>

    <div v-else class="space-y-4">
      <!-- conjunto de dados -->
      <div>
        <label>Conjunto de dados</label>
        <p v-if="travarConjunto" class="mt-1.5 text-sm text-shift3-text">
          {{ conjunto?.nome }}
          <span class="text-xs text-shift3-text-muted">— os blocos do relatório usam as colunas dele, por isso não dá pra trocar aqui.</span>
        </p>
        <div v-else class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            v-for="c in conjuntos"
            :key="c.id"
            type="button"
            class="rounded-default border p-3 text-left transition"
            :class="modeloId === c.id ? 'border-shift3-green bg-shift3-green/10' : 'border-shift3-border hover:border-shift3-input-border'"
            :aria-pressed="modeloId === c.id"
            @click="escolherConjunto(c.id)"
          >
            <span class="flex items-center gap-1.5 text-sm font-semibold text-shift3-text">
              <Icon name="heroicons:table-cells" class="h-4 w-4 text-shift3-text-secondary" />
              <span class="min-w-0 break-words">{{ c.nome }}</span>
            </span>
            <span class="mt-0.5 block text-xs text-shift3-text-secondary">
              {{ c.arquivos.length }} arquivo(s) · {{ formatarNumero(c.linhas) }} linha(s)
            </span>
          </button>
        </div>
      </div>

      <!-- arquivos -->
      <div v-if="conjunto">
        <label>Arquivos</label>
        <div class="mt-1.5 space-y-2">
          <label class="flex cursor-pointer items-start gap-2.5 rounded-default border p-3 transition" :class="classeModo('todos')">
            <input v-model="modo" type="radio" value="todos" class="mt-0.5 accent-shift3-teal" @change="emitir" />
            <span>
              <span class="block text-sm font-semibold text-shift3-text">Todos os arquivos deste conjunto</span>
              <span class="block text-xs font-normal text-shift3-text-secondary">
                Os que você importar depois entram no relatório sozinhos.
              </span>
            </span>
          </label>
          <label class="flex cursor-pointer items-start gap-2.5 rounded-default border p-3 transition" :class="classeModo('marcados')">
            <input v-model="modo" type="radio" value="marcados" class="mt-0.5 accent-shift3-teal" @change="emitir" />
            <span>
              <span class="block text-sm font-semibold text-shift3-text">Só os arquivos que eu marcar</span>
              <span class="block text-xs font-normal text-shift3-text-secondary">O relatório fica preso a estes arquivos.</span>
            </span>
          </label>
        </div>

        <div v-if="modo === 'marcados'" class="mt-3 rounded-default border border-shift3-border">
          <div class="flex flex-wrap items-center gap-2 border-b border-shift3-border px-3 py-2">
            <select v-if="clientesDoConjunto.length > 1" v-model="filtroCliente" :class="SELECT" aria-label="Filtrar por cliente">
              <option value="">Todos os clientes</option>
              <option v-for="c in clientesDoConjunto" :key="c.id" :value="c.id">{{ c.nome }}</option>
            </select>
            <span class="text-xs text-shift3-text-secondary">{{ marcados.length }} de {{ conjunto.arquivos.length }} marcado(s)</span>
            <button type="button" :class="[LINK, 'ml-auto']" @click="marcarVisiveis(true)">Marcar todos</button>
            <button type="button" :class="LINK" @click="marcarVisiveis(false)">Desmarcar</button>
          </div>
          <ul class="max-h-72 divide-y divide-shift3-border overflow-y-auto">
            <li v-for="a in arquivosVisiveis" :key="a.id">
              <label class="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm font-normal transition hover:bg-shift3-bg-light">
                <input v-model="marcados" type="checkbox" :value="a.id" class="accent-shift3-teal" @change="emitir" />
                <span class="min-w-0 flex-1">
                  <span class="block break-words text-shift3-text">
                    {{ a.clientes?.nome ?? 'Sem cliente' }} · {{ formatarPeriodo(a.periodo) }}
                  </span>
                  <span class="block break-words text-xs text-shift3-text-muted">{{ a.arquivo_nome || 'Arquivo sem nome' }}</span>
                </span>
                <span class="shrink-0 text-xs tabular-nums text-shift3-text-secondary">{{ formatarNumero(a.total_linhas) }} linhas</span>
              </label>
            </li>
          </ul>
        </div>
        <p v-if="modo === 'marcados' && !marcados.length" class="mt-2 text-xs text-danger">Marque pelo menos um arquivo.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { catalogoImportacao, type FonteImportacao } from '#shared/utils/relatorios'
import { formatarPeriodo, type Importacao } from '~/types/importacao'
import type { SchemaModelo } from '~/types/modelo'

const props = defineProps<{
  /** `null` enquanto nada foi escolhido (ou a escolha está incompleta). */
  modelValue: FonteImportacao | null
  /** No relatório já montado o conjunto não troca — só os arquivos. */
  travarConjunto?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [fonte: FonteImportacao | null] }>()

const SELECT =
  'rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none focus:border-shift3-green'
const LINK = 'text-xs font-semibold text-shift3-teal hover:underline dark:text-shift3-green'

interface Conjunto {
  id: string
  nome: string
  schema: SchemaModelo | null
  arquivos: Importacao[]
  linhas: number
}

const supabase = useSupabaseClient()
const { itens: importacoes, carregar } = useImportacoes()
const toast = useToast()

const carregando = ref(true)
const schemas = ref<Record<string, { nome: string; schema: SchemaModelo | null }>>({})

// a escolha inicial vem de fora uma vez só; daqui pra frente quem manda é esta tela
const modeloId = ref(props.modelValue?.modelo_id ?? '')
const modo = ref<'todos' | 'marcados'>(props.modelValue?.arquivos ? 'marcados' : 'todos')
const marcados = ref<string[]>(props.modelValue?.arquivos ?? [])
const filtroCliente = ref('')

const conjuntos = computed<Conjunto[]>(() => {
  const porModelo = new Map<string, Conjunto>()
  for (const imp of importacoes.value) {
    let c = porModelo.get(imp.modelo_id)
    if (!c) {
      const modelo = schemas.value[imp.modelo_id]
      c = { id: imp.modelo_id, nome: modelo?.nome ?? imp.modelos?.nome ?? 'Conjunto', schema: modelo?.schema ?? null, arquivos: [], linhas: 0 }
      porModelo.set(imp.modelo_id, c)
    }
    c.arquivos.push(imp)
    c.linhas += imp.total_linhas ?? 0
  }
  for (const c of porModelo.values()) c.arquivos.sort((a, b) => b.periodo.localeCompare(a.periodo) || (a.clientes?.nome ?? '').localeCompare(b.clientes?.nome ?? ''))
  return [...porModelo.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
})

const conjunto = computed(() => conjuntos.value.find((c) => c.id === modeloId.value) ?? null)

const clientesDoConjunto = computed(() => {
  const vistos = new Map<string, string>()
  for (const a of conjunto.value?.arquivos ?? []) vistos.set(a.cliente_id, a.clientes?.nome ?? 'Sem cliente')
  return [...vistos].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
})

const arquivosVisiveis = computed(() =>
  (conjunto.value?.arquivos ?? []).filter((a) => !filtroCliente.value || a.cliente_id === filtroCliente.value)
)

function formatarNumero(n: number) {
  return (n ?? 0).toLocaleString('pt-BR')
}

function classeModo(m: 'todos' | 'marcados') {
  return modo.value === m ? 'border-shift3-green bg-shift3-green/10' : 'border-shift3-border hover:border-shift3-input-border'
}

function emitir() {
  const c = conjunto.value
  if (!c || (modo.value === 'marcados' && !marcados.value.length)) return emit('update:modelValue', null)
  emit('update:modelValue', {
    modelo_id: c.id,
    modelo_nome: c.nome,
    arquivos: modo.value === 'marcados' ? [...marcados.value] : null,
    campos: catalogoImportacao(c.id, c.schema)
  })
}

function escolherConjunto(id: string) {
  if (modeloId.value === id) return
  modeloId.value = id
  // os arquivos marcados eram do outro conjunto
  marcados.value = []
  filtroCliente.value = ''
  emitir()
}

function marcarVisiveis(marcar: boolean) {
  const visiveis = new Set(arquivosVisiveis.value.map((a) => a.id))
  const fora = marcados.value.filter((id) => !visiveis.has(id))
  marcados.value = marcar ? [...fora, ...visiveis] : fora
  emitir()
}

onMounted(async () => {
  try {
    await carregar()
    const ids = [...new Set(importacoes.value.map((i) => i.modelo_id))]
    if (ids.length) {
      const { data, error } = await supabase.from('modelos').select('id, nome, schema').in('id', ids)
      if (error) throw error
      const mapa: typeof schemas.value = {}
      for (const m of (data as unknown as { id: string; nome: string; schema: SchemaModelo | null }[]) ?? []) mapa[m.id] = m
      schemas.value = mapa
    }
    // arquivo marcado que foi excluído depois sai da escolha
    if (conjunto.value) {
      const existentes = new Set(conjunto.value.arquivos.map((a) => a.id))
      marcados.value = marcados.value.filter((id) => existentes.has(id))
    } else if (!props.travarConjunto && conjuntos.value.length === 1) {
      modeloId.value = conjuntos.value[0]!.id
    }
    emitir()
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível buscar os arquivos importados')
  } finally {
    carregando.value = false
  }
})
</script>
