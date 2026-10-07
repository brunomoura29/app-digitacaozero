<template>
  <ClientOnly>
    <Teleport to="body">
      <div class="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-4" @click.self="emit('fechar')">
        <div class="my-6 w-full max-w-2xl rounded-medium border border-shift3-border bg-shift3-bg-card shadow-xl">
          <div class="flex items-center justify-between border-b border-shift3-border px-5 py-4">
            <h3>{{ novo ? 'Novo bloco' : 'Editar bloco' }}</h3>
            <button type="button" class="text-shift3-text-muted hover:text-shift3-text" aria-label="Fechar" @click="emit('fechar')">
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
          </div>

          <div class="space-y-5 px-5 py-4">
            <!-- tipo -->
            <div>
              <label>Tipo</label>
              <div class="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  v-for="t in TIPOS"
                  :key="t.id"
                  type="button"
                  class="flex items-center gap-2 rounded-default border px-2.5 py-2 text-left text-sm transition"
                  :class="
                    form.tipo === t.id
                      ? 'border-shift3-green bg-shift3-green/15 font-semibold text-shift3-text'
                      : 'border-shift3-border text-shift3-text-secondary hover:border-shift3-input-border hover:text-shift3-text'
                  "
                  @click="form.tipo = t.id"
                >
                  <Icon :name="t.icone" class="h-4 w-4 shrink-0" />
                  {{ t.nome }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="sm:col-span-2">
                <BaseInput v-model="form.titulo" label="Título" placeholder="Ex: Total vendido por mês" />
              </div>
              <div>
                <label>Largura</label>
                <select v-model.number="form.largura" :class="[SELECT, 'mt-1.5 w-full']">
                  <option v-for="l in LARGURAS_NOME" :key="l.valor" :value="l.valor">{{ l.nome }}</option>
                </select>
              </div>
            </div>

            <!-- medidas -->
            <div>
              <label>{{ form.tipo === 'tabela' ? 'Colunas de valor' : 'O que calcular' }}</label>
              <div class="mt-1.5 space-y-2">
                <div v-for="(m, i) in form.medidas" :key="i" class="flex items-center gap-2">
                  <select v-model="m.op" :class="[SELECT, 'w-32 shrink-0']" @change="ajustarMedida(m)">
                    <option v-for="op in OPERACOES" :key="op" :value="op">{{ NOME_OPERACAO[op] }}</option>
                  </select>
                  <span class="text-xs text-shift3-text-muted">de</span>
                  <select v-model="m.campo" :class="[SELECT, 'min-w-0 flex-1']" @change="ajustarMedida(m)">
                    <option v-for="c in camposPara(m.op)" :key="c.id" :value="c.id">{{ c.nome }}</option>
                  </select>
                  <button v-if="form.medidas.length > minMedidas" type="button" :class="BOTAO_TIRAR" aria-label="Tirar" @click="form.medidas.splice(i, 1)">
                    <Icon name="heroicons:x-mark" class="h-4 w-4" />
                  </button>
                </div>
                <button v-if="form.medidas.length < maxMedidas" type="button" :class="BOTAO_MAIS" @click="adicionarMedida">
                  <Icon name="heroicons:plus" class="h-3.5 w-3.5" /> Adicionar valor
                </button>
              </div>
            </div>

            <!-- grupos -->
            <div v-if="form.tipo !== 'numero'">
              <label>{{ form.tipo === 'tabela' ? 'Colunas de texto (agrupar por)' : 'Separar por' }}</label>
              <div class="mt-1.5 space-y-2">
                <div v-for="(g, i) in form.grupos" :key="i" class="flex items-center gap-2">
                  <span v-if="form.tipo !== 'tabela'" class="w-20 shrink-0 text-xs text-shift3-text-muted">
                    {{ i === 0 ? 'Categorias' : 'Séries' }}
                  </span>
                  <select v-model="g.campo" :class="[SELECT, 'min-w-0 flex-1']" @change="ajustarGrupo(g)">
                    <option v-for="c in campos" :key="c.id" :value="c.id">{{ c.nome }}</option>
                  </select>
                  <select v-if="ehData(g.campo)" v-model="g.periodo" :class="[SELECT, 'w-36 shrink-0']">
                    <option value="dia">por dia</option>
                    <option value="mes">por mês</option>
                    <option value="trimestre">por trimestre</option>
                    <option value="ano">por ano</option>
                  </select>
                  <button v-if="form.grupos.length > minGrupos" type="button" :class="BOTAO_TIRAR" aria-label="Tirar" @click="form.grupos.splice(i, 1)">
                    <Icon name="heroicons:x-mark" class="h-4 w-4" />
                  </button>
                </div>
                <button v-if="form.grupos.length < maxGrupos" type="button" :class="BOTAO_MAIS" @click="adicionarGrupo">
                  <Icon name="heroicons:plus" class="h-3.5 w-3.5" />
                  {{ form.tipo === 'tabela' ? 'Adicionar coluna' : form.grupos.length ? 'Adicionar séries (legenda)' : 'Adicionar categorias' }}
                </button>
              </div>
            </div>

            <div v-if="form.tipo !== 'numero'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label>Ordem</label>
                <select v-model="form.ordem" :class="[SELECT, 'mt-1.5 w-full']">
                  <option value="valor_desc">Maiores primeiro</option>
                  <option value="valor_asc">Menores primeiro</option>
                  <option value="rotulo">Alfabética</option>
                </select>
                <p class="mt-1 text-xs text-shift3-text-muted">Datas sempre aparecem na ordem do tempo.</p>
              </div>
              <BaseInput
                v-model="form.limite"
                type="number"
                label="Quantos mostrar"
                placeholder="Padrão"
                hint="Ex: 10 para um “top 10”. Vazio usa o padrão do tipo."
              />
            </div>

            <div v-if="ehGrafico" class="flex flex-wrap items-center gap-x-6 gap-y-2">
              <BaseSwitch v-if="form.tipo === 'linha' || form.tipo === 'area'" v-model="curvaSuave" label="Curva suave" />
              <BaseSwitch v-model="form.rotulos" label="Mostrar os valores no gráfico" />
            </div>

            <!-- filtros do bloco -->
            <div>
              <label>Filtros deste bloco</label>
              <div class="mt-1.5 space-y-3">
                <div v-for="(f, i) in form.filtros" :key="i" class="rounded-default border border-shift3-border p-2.5">
                  <div class="flex items-center gap-2">
                    <select v-model="f.campo" :class="[SELECT, 'min-w-0 flex-1']" @change="f.valores = []">
                      <option v-for="c in camposTexto" :key="c.id" :value="c.id">{{ c.nome }}</option>
                    </select>
                    <select v-model="f.op" :class="[SELECT, 'w-36 shrink-0']">
                      <option value="igual">é</option>
                      <option value="diferente">não é</option>
                    </select>
                    <button type="button" :class="BOTAO_TIRAR" aria-label="Tirar filtro" @click="form.filtros.splice(i, 1)">
                      <Icon name="heroicons:x-mark" class="h-4 w-4" />
                    </button>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <button
                      v-for="v in valoresDe(f.campo)"
                      :key="v"
                      type="button"
                      class="rounded-pill border px-2 py-0.5 text-xs transition"
                      :class="
                        f.valores.includes(v)
                          ? 'border-shift3-green bg-shift3-green/20 font-semibold text-shift3-text'
                          : 'border-shift3-border text-shift3-text-secondary hover:text-shift3-text'
                      "
                      @click="alternarValor(f, v)"
                    >
                      {{ v }}
                    </button>
                    <span v-if="!valoresDe(f.campo).length" class="text-xs text-shift3-text-muted">Esse campo ainda não tem dados.</span>
                  </div>
                </div>
                <button type="button" :class="BOTAO_MAIS" @click="adicionarFiltro">
                  <Icon name="heroicons:plus" class="h-3.5 w-3.5" /> Adicionar filtro
                </button>
              </div>
            </div>

            <!-- aparência -->
            <div class="rounded-default border border-shift3-border p-3">
              <label>Aparência</label>

              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="w-14 shrink-0 text-xs text-shift3-text-muted">Cor</span>
                <button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-pill border-2 border-dashed text-shift3-text-muted transition"
                  :class="form.cor === '' ? 'border-shift3-text' : 'border-shift3-input-border hover:border-shift3-text-secondary'"
                  title="Cor do painel (ou neutro)"
                  aria-label="Cor do painel"
                  :aria-pressed="form.cor === ''"
                  @click="form.cor = ''"
                >
                  <Icon name="heroicons:no-symbol" class="h-3.5 w-3.5" />
                </button>
                <button
                  v-for="c in CORES_BLOCO"
                  :key="c.id"
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-pill ring-offset-2 ring-offset-shift3-bg-card transition hover:scale-110"
                  :class="form.cor === c.id ? 'ring-2 ring-shift3-text' : ''"
                  :style="{ background: escuro ? c.escuro : c.claro }"
                  :title="c.nome"
                  :aria-label="c.nome"
                  :aria-pressed="form.cor === c.id"
                  @click="form.cor = c.id"
                >
                  <Icon v-if="form.cor === c.id" name="heroicons:check" class="h-4 w-4" :style="{ color: c.textoEscuro ? '#14181d' : '#fff' }" />
                </button>
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span class="w-14 shrink-0 text-xs text-shift3-text-muted">Estilo</span>
                <button
                  v-for="e in estilosDisponiveis"
                  :key="e.id"
                  type="button"
                  class="rounded-default border px-2.5 py-1 text-xs transition"
                  :class="
                    form.estilo === e.id
                      ? 'border-shift3-green bg-shift3-green/15 font-semibold text-shift3-text'
                      : 'border-shift3-border text-shift3-text-secondary hover:text-shift3-text'
                  "
                  :title="e.dica"
                  @click="form.estilo = e.id"
                >
                  {{ e.nome }}
                </button>
                <span v-if="form.estilo !== 'simples' && !form.cor" class="text-xs text-shift3-text-muted">
                  Sem cor escolhida aqui, vale a cor do painel.
                </span>
              </div>

              <div class="mt-3 flex items-start gap-2">
                <span class="w-14 shrink-0 pt-1.5 text-xs text-shift3-text-muted">Ícone</span>
                <div class="flex flex-wrap gap-1">
                  <button
                    type="button"
                    :class="[BOTAO_ICONE, form.icone === '' ? ICONE_MARCADO : ICONE_LIVRE]"
                    title="Sem ícone"
                    aria-label="Sem ícone"
                    @click="form.icone = ''"
                  >
                    <Icon name="heroicons:no-symbol" class="h-4 w-4" />
                  </button>
                  <button
                    v-for="i in ICONES_BLOCO"
                    :key="i"
                    type="button"
                    :class="[BOTAO_ICONE, form.icone === i ? ICONE_MARCADO : ICONE_LIVRE]"
                    :aria-label="i"
                    :aria-pressed="form.icone === i"
                    @click="form.icone = i"
                  >
                    <Icon :name="'heroicons:' + i" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
          </div>

          <div class="flex justify-end gap-2 border-t border-shift3-border px-5 py-4">
            <BaseButton variant="secondary" @click="emit('fechar')">Cancelar</BaseButton>
            <BaseButton variant="primary" icon-left="heroicons:check" @click="salvar">
              {{ novo ? 'Adicionar bloco' : 'Aplicar' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  camposDasFontes,
  campoRelatorio,
  CORES_BLOCO,
  ICONES_BLOCO,
  NOME_OPERACAO,
  normalizarDefinicao,
  novoIdBloco,
  OPERACOES,
  type BlocoRelatorio,
  type CorBloco,
  type CurvaBloco,
  type DadosRelatorio,
  type EstiloBloco,
  type FiltroRelatorio,
  type FonteId,
  type GrupoBloco,
  type MedidaBloco,
  type Operacao,
  type OrdemBloco,
  type TipoBloco
} from '#shared/utils/relatorios'

const props = defineProps<{
  /** `null` = bloco novo. */
  bloco: BlocoRelatorio | null
  fontes: FonteId[]
  /** Linhas carregadas — só pra sugerir os valores dos filtros. */
  dados: DadosRelatorio
}>()

const emit = defineEmits<{ fechar: []; salvar: [bloco: BlocoRelatorio] }>()

const SELECT =
  'rounded-default border border-shift3-input-border bg-shift3-input px-2.5 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'
const BOTAO_MAIS = 'inline-flex items-center gap-1 text-xs font-semibold text-shift3-teal hover:underline dark:text-shift3-green'
const BOTAO_TIRAR =
  'grid h-8 w-8 shrink-0 place-items-center rounded-default text-shift3-text-muted transition hover:bg-danger/10 hover:text-danger'

const BOTAO_ICONE = 'grid h-8 w-8 place-items-center rounded-default border transition'
const ICONE_MARCADO = 'border-shift3-green bg-shift3-green/20 text-shift3-text'
const ICONE_LIVRE = 'border-transparent text-shift3-text-secondary hover:border-shift3-border hover:text-shift3-text'

const ESTILOS: { id: EstiloBloco; nome: string; dica: string }[] = [
  { id: 'simples', nome: 'Simples', dica: 'Cartão neutro; a cor aparece só no ícone e no gráfico' },
  { id: 'suave', nome: 'Suave', dica: 'Fundo levemente tingido, borda e sombra na cor' },
  { id: 'cheio', nome: 'Cheio', dica: 'Fundo inteiro na cor — só para cartão de número' }
]

const TIPOS: { id: TipoBloco; nome: string; icone: string }[] = [
  { id: 'numero', nome: 'Número', icone: 'heroicons:hashtag' },
  { id: 'colunas', nome: 'Colunas', icone: 'heroicons:chart-bar' },
  { id: 'barras', nome: 'Barras', icone: 'heroicons:bars-3-bottom-left' },
  { id: 'linha', nome: 'Linha', icone: 'heroicons:arrow-trending-up' },
  { id: 'area', nome: 'Área', icone: 'heroicons:presentation-chart-line' },
  { id: 'rosca', nome: 'Rosca', icone: 'heroicons:chart-pie' },
  { id: 'tabela', nome: 'Tabela', icone: 'heroicons:table-cells' }
]
const LARGURAS_NOME = [
  { valor: 3, nome: '1/4 da tela' },
  { valor: 4, nome: '1/3 da tela' },
  { valor: 6, nome: 'Metade' },
  { valor: 8, nome: '2/3 da tela' },
  { valor: 12, nome: 'Tela inteira' }
]

const novo = computed(() => !props.bloco)
const campos = computed(() => camposDasFontes(props.fontes))
const camposNumericos = computed(() => campos.value.filter((c) => c.tipo === 'numero' || c.tipo === 'moeda'))
const camposTexto = computed(() => campos.value.filter((c) => c.tipo === 'texto'))

const inicial = props.bloco
const form = reactive({
  tipo: (inicial?.tipo ?? 'colunas') as TipoBloco,
  titulo: inicial?.titulo ?? '',
  largura: inicial?.largura ?? 6,
  medidas: (inicial?.medidas.map((m) => ({ ...m })) ?? [{ campo: 'pedido.total', op: 'soma' }]) as MedidaBloco[],
  grupos: (inicial?.grupos.map((g) => ({ ...g })) ?? [{ campo: 'pedido.emissao', periodo: 'mes' }]) as GrupoBloco[],
  ordem: (inicial?.ordem ?? 'valor_desc') as OrdemBloco,
  limite: (inicial?.limite ? String(inicial.limite) : '') as string | number,
  filtros: (inicial?.filtros.map((f) => ({ ...f, valores: [...f.valores] })) ?? []) as FiltroRelatorio[],
  cor: (inicial?.cor ?? '') as CorBloco,
  icone: inicial?.icone ?? '',
  estilo: (inicial?.estilo ?? 'simples') as EstiloBloco,
  curva: (inicial?.curva ?? 'reta') as CurvaBloco,
  rotulos: inicial?.rotulos ?? false
})

const ehGrafico = computed(() => form.tipo !== 'numero' && form.tipo !== 'tabela')
const curvaSuave = computed({
  get: () => form.curva === 'suave',
  set: (v: boolean) => (form.curva = v ? 'suave' : 'reta')
})

const colorMode = useColorMode()
const escuro = computed(() => colorMode.value === 'dark')
// "cheio" só existe no cartão de número: gráfico sobre fundo colorido perde a leitura
const estilosDisponiveis = computed(() => ESTILOS.filter((e) => e.id !== 'cheio' || form.tipo === 'numero'))
const erro = ref('')

const minMedidas = computed(() => (form.tipo === 'tabela' ? 0 : 1))
const maxMedidas = computed(() => (form.tipo === 'tabela' ? 6 : form.tipo === 'numero' || form.tipo === 'rosca' ? 1 : 4))
const minGrupos = computed(() => (form.tipo === 'tabela' ? 0 : 1))
const maxGrupos = computed(() => (form.tipo === 'tabela' ? 5 : form.tipo === 'rosca' ? 1 : 2))

function camposPara(op: Operacao) {
  return op === 'contagem' ? campos.value : camposNumericos.value
}

function ehData(campoId: string) {
  return campoRelatorio(campoId)?.tipo === 'data'
}

/** Soma/média só valem em campo numérico: trocar a conta pode exigir trocar o campo. */
function ajustarMedida(m: MedidaBloco) {
  if (!camposPara(m.op).some((c) => c.id === m.campo)) m.campo = camposPara(m.op)[0]?.id ?? m.campo
}

function ajustarGrupo(g: GrupoBloco) {
  g.periodo = ehData(g.campo) ? g.periodo || 'mes' : ''
}

function adicionarMedida() {
  form.medidas.push({ campo: camposNumericos.value[0]?.id ?? 'pedido.total', op: 'soma' })
}

function adicionarGrupo() {
  const usados = new Set(form.grupos.map((g) => g.campo))
  const livre = camposTexto.value.find((c) => !usados.has(c.id)) ?? campos.value[0]!
  form.grupos.push({ campo: livre.id, periodo: ehData(livre.id) ? 'mes' : '' })
}

function adicionarFiltro() {
  form.filtros.push({ campo: camposTexto.value[0]?.id ?? 'pedido.situacao', op: 'igual', valores: [] })
}

function alternarValor(f: FiltroRelatorio, v: string) {
  f.valores = f.valores.includes(v) ? f.valores.filter((x) => x !== v) : [...f.valores, v]
}

/** Valores que existem no campo (até 40) + os já marcados, mesmo que não existam mais nos dados. */
function valoresDe(campoId: string): string[] {
  const campo = campoRelatorio(campoId)
  if (!campo) return []
  const linhas = campo.base === 'item' ? props.dados.itens : props.dados.pedidos
  const vistos = new Set<string>()
  for (const l of linhas) {
    const v = l[campoId]
    if (v != null && v !== '') vistos.add(String(v))
    if (vistos.size >= 40) break
  }
  for (const f of form.filtros) if (f.campo === campoId) f.valores.forEach((v) => vistos.add(v))
  return [...vistos].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
}

function salvar() {
  erro.value = ''
  // a mesma checagem que vale pra planta da IA diz se o bloco tem o mínimo pra existir
  const [valido] = normalizarDefinicao(
    {
      blocos: [
        {
          id: props.bloco?.id ?? novoIdBloco(),
          tipo: form.tipo,
          titulo: form.titulo,
          largura: form.largura,
          medidas: form.medidas,
          grupos: form.grupos,
          ordem: form.ordem,
          limite: Number(form.limite) || 0,
          filtros: form.filtros,
          cor: form.cor,
          icone: form.icone,
          estilo: form.estilo,
          curva: form.curva,
          rotulos: form.rotulos
        }
      ]
    },
    props.fontes
  ).blocos
  if (!valido) {
    erro.value =
      form.tipo === 'numero'
        ? 'Escolha o que calcular.'
        : form.tipo === 'tabela'
          ? 'A tabela precisa de pelo menos uma coluna.'
          : 'O gráfico precisa de um valor para calcular e de um campo para separar.'
    return
  }
  emit('salvar', valido)
}
</script>
