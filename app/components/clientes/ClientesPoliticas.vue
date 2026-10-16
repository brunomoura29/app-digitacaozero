<template>
  <div class="mx-auto max-w-3xl space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <p class="max-w-xl text-sm text-shift3-text-secondary">
        Ajustes de preço deste cliente por fábrica, aplicados sobre a tabela de preço no pedido. Se mais de uma
        política alcançar o produto, vale a mais específica: produto, depois grupo, depois todos os produtos.
      </p>
      <BaseButton v-if="podeEditar && !editando" variant="primary" icon-left="heroicons:plus" @click="abrirNova">
        Nova política
      </BaseButton>
    </div>

    <!-- ───── Formulário (nova / edição) ───── -->
    <form
      v-if="editando"
      class="overflow-hidden rounded-medium border border-shift3-border bg-shift3-bg-card shadow-sm"
      @submit.prevent="salvar"
    >
      <!-- cabeçalho do cartão: título à esquerda, situação à direita -->
      <div class="flex items-center justify-between gap-4 border-b border-shift3-border bg-shift3-bg-light px-5 py-3">
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-shift3-teal/10 text-shift3-teal">
            <Icon name="heroicons:receipt-percent" class="h-4 w-4" />
          </span>
          <p class="font-semibold text-shift3-text">{{ editando.id ? 'Editar política' : 'Nova política' }}</p>
        </div>
        <BaseSwitch v-model="editando.ativo" :label="editando.ativo ? 'Ativa' : 'Inativa'" />
      </div>

      <div class="space-y-6 px-5 py-5">
        <!-- ───── Onde vale ───── -->
        <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BaseBuscaOuCria
            v-model="editando.fabrica_id"
            label="Fábrica *"
            placeholder="Buscar ou criar fábrica…"
            :itens="fabricas.itens.value"
            :carregando="fabricas.carregando.value"
            :ao-criar="(nome) => fabricas.criar(nome)"
          />

          <div>
            <label class="mb-2 block">Vale para</label>
            <div :class="SEGMENTADO">
              <button
                v-for="o in OPCOES_ALCANCE"
                :key="o.valor"
                type="button"
                :class="[SEGMENTO, editando.alcance === o.valor ? SEGMENTO_ATIVO : SEGMENTO_INATIVO]"
                @click="editando.alcance = o.valor"
              >
                <Icon :name="o.icone" class="h-3.5 w-3.5 shrink-0" />
                {{ o.label }}
              </button>
            </div>
          </div>

          <div v-if="editando.alcance !== 'todos'" class="md:col-span-2">
            <BaseBuscaOuCria
              v-if="editando.alcance === 'grupo'"
              v-model="editando.grupo_id"
              label="Grupo *"
              placeholder="Buscar grupo…"
              :itens="grupos.itens.value"
              :carregando="grupos.carregando.value"
              :ao-criar="(nome) => grupos.criar(nome)"
            />
            <template v-else>
              <label class="mb-2 block">Produto *</label>
              <ProdutosProdutoPicker v-model="editando.produto_id" hide-label />
            </template>
          </div>
        </section>

        <!-- ───── Regra ───── -->
        <section class="space-y-4 rounded-medium border border-shift3-border/70 p-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="mb-2 block">Tipo de regra</label>
              <div :class="SEGMENTADO">
                <button
                  v-for="o in OPCOES_TIPO"
                  :key="o.valor"
                  type="button"
                  :class="[SEGMENTO, editando.tipo === o.valor ? SEGMENTO_ATIVO : SEGMENTO_INATIVO]"
                  @click="editando.tipo = o.valor"
                >
                  <Icon :name="o.icone" class="h-3.5 w-3.5 shrink-0" />
                  {{ o.label }}
                </button>
              </div>
            </div>
            <div>
              <label class="mb-2 block">Ajuste</label>
              <div :class="SEGMENTADO">
                <button
                  type="button"
                  :class="[SEGMENTO, editando.direcao === 'desconto' ? SEGMENTO_ATIVO : SEGMENTO_INATIVO]"
                  @click="editando.direcao = 'desconto'"
                >
                  <Icon name="heroicons:arrow-trending-down" class="h-3.5 w-3.5 shrink-0" />
                  Desconto
                </button>
                <button
                  type="button"
                  :class="[SEGMENTO, editando.direcao === 'acrescimo' ? SEGMENTO_ATIVO : SEGMENTO_INATIVO]"
                  @click="editando.direcao = 'acrescimo'"
                >
                  <Icon name="heroicons:arrow-trending-up" class="h-3.5 w-3.5 shrink-0" />
                  Acréscimo
                </button>
              </div>
            </div>
          </div>

          <!-- % fixo: campo com o "%" dentro + prévia do efeito num preço de exemplo -->
          <div v-if="editando.tipo === 'percentual'" class="flex flex-wrap items-end gap-4">
            <div class="w-40">
              <label class="mb-1 block">{{ editando.direcao === 'desconto' ? 'Desconto' : 'Acréscimo' }}</label>
              <div class="relative">
                <input
                  v-model="editando.percentual"
                  inputmode="decimal"
                  placeholder="10"
                  :class="[CAMPO, 'pr-8 text-right', erros.percentual ? 'border-danger' : '']"
                />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-shift3-text-muted">%</span>
              </div>
            </div>
            <p v-if="previa(editando.percentual)" class="pb-2 text-sm text-shift3-text-secondary">
              Ex.: tabela {{ previa(editando.percentual)!.de }}
              <Icon name="heroicons:arrow-right" class="mx-1 inline h-3.5 w-3.5 align-[-2px] text-shift3-text-muted" />
              <span class="font-semibold text-shift3-teal">{{ previa(editando.percentual)!.para }}</span>
            </p>
            <p v-if="erros.percentual" class="w-full text-xs text-danger">{{ erros.percentual }}</p>
          </div>

          <!-- faixas por quantidade: tabelinha compacta -->
          <div v-else class="space-y-2">
            <div class="overflow-hidden rounded-default border border-shift3-border">
              <div class="grid grid-cols-[1fr_1fr_1.4fr_auto] items-center gap-3 bg-shift3-bg-light px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">
                <span>A partir de</span>
                <span>{{ editando.direcao === 'desconto' ? 'Desconto' : 'Acréscimo' }}</span>
                <span>Exemplo (tabela R$ 100,00)</span>
                <span class="w-8" />
              </div>
              <div
                v-for="(f, i) in editando.faixas"
                :key="i"
                class="grid grid-cols-[1fr_1fr_1.4fr_auto] items-center gap-3 border-t border-shift3-border/60 px-3 py-2"
              >
                <div class="relative">
                  <input v-model="f.a_partir_de" inputmode="decimal" placeholder="1" :class="[CAMPO, 'pr-10 text-right']" />
                  <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-shift3-text-muted">un.</span>
                </div>
                <div class="relative">
                  <input v-model="f.percentual" inputmode="decimal" placeholder="5" :class="[CAMPO, 'pr-8 text-right']" />
                  <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-shift3-text-muted">%</span>
                </div>
                <span class="text-sm" :class="previa(f.percentual) ? 'font-semibold text-shift3-teal' : 'text-shift3-text-muted'">
                  {{ previa(f.percentual)?.para ?? '—' }}
                </span>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-default text-shift3-text-muted transition hover:bg-danger/10 hover:text-danger disabled:invisible"
                  :disabled="editando.faixas.length <= 1"
                  aria-label="Remover faixa"
                  @click="editando.faixas.splice(i, 1)"
                >
                  <Icon name="heroicons:trash" class="h-4 w-4" />
                </button>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <BaseButton type="button" variant="ghost" size="sm" icon-left="heroicons:plus" @click="editando.faixas.push({ a_partir_de: '', percentual: '' })">
                Adicionar faixa
              </BaseButton>
              <p class="text-xs text-shift3-text-muted">Vale a maior faixa que a quantidade alcança. Abaixo da primeira, sem ajuste.</p>
            </div>
            <p v-if="erros.faixas" class="text-xs text-danger">{{ erros.faixas }}</p>
          </div>
        </section>

        <!-- ───── Validade e observação ───── -->
        <section class="grid grid-cols-1 gap-4 md:grid-cols-[14rem_1fr]">
          <BaseInput v-model="editando.valida_ate" type="date" label="Válida até" hint="Vazio = sem prazo" />
          <BaseInput v-model="editando.observacao" label="Observação" placeholder="Ex.: acordo comercial de 2026" />
        </section>

        <p v-if="erros.geral" class="flex items-start gap-2 rounded-default bg-danger/10 px-3 py-2 text-sm text-danger">
          <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
          {{ erros.geral }}
        </p>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-shift3-border bg-shift3-bg-light px-5 py-3">
        <BaseButton type="button" variant="ghost" @click="editando = null">Cancelar</BaseButton>
        <BaseButton type="submit" variant="primary" icon-left="heroicons:check" :loading="salvando">
          {{ editando.id ? 'Salvar política' : 'Adicionar política' }}
        </BaseButton>
      </div>
    </form>

    <!-- ───── Lista ───── -->
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-10 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando políticas…
    </div>

    <BaseEmptyState
      v-else-if="!politicas.length"
      icon="heroicons:receipt-percent"
      title="Nenhuma política cadastrada"
      description="Sem política, o cliente paga o preço da tabela."
    />

    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-3 py-3 font-semibold">Fábrica</th>
            <th class="px-3 py-3 font-semibold">Vale para</th>
            <th class="px-3 py-3 font-semibold">Regra</th>
            <th class="px-3 py-3 font-semibold">Validade</th>
            <th class="px-3 py-3 font-semibold">Situação</th>
            <th class="px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in ordenadas" :key="p.id" class="border-b border-shift3-border/60 align-top">
            <td class="px-3 py-3 font-semibold text-shift3-text">{{ p.fabricas?.nome ?? '—' }}</td>
            <td class="px-3 py-3 text-shift3-text-secondary">{{ rotuloAlcance(p) }}</td>
            <td class="px-3 py-3 text-shift3-text-secondary">
              {{ rotuloRegra(p) }}
              <p v-if="p.observacao" class="mt-0.5 text-xs text-shift3-text-muted">{{ p.observacao }}</p>
            </td>
            <td class="px-3 py-3 text-shift3-text-secondary">{{ p.valida_ate ? `até ${formatarData(p.valida_ate)}` : 'Sem prazo' }}</td>
            <td class="px-3 py-3">
              <span class="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium" :class="situacao(p).classe">
                {{ situacao(p).texto }}
              </span>
            </td>
            <td class="px-3 py-3 text-right">
              <BaseDropdown v-if="podeEditar" align="right" :items="acoes(p)">
                <BaseButton variant="ghost" size="sm" icon-left="heroicons:ellipsis-vertical" />
              </BaseDropdown>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseConfirmDialog
      v-model="excluir.aberto"
      danger
      title="Excluir política"
      :message="excluir.politica ? `Excluir a política de ${excluir.politica.fabricas?.nome ?? 'fábrica'} (${rotuloAlcance(excluir.politica)})? Pedidos já feitos não mudam.` : ''"
      confirm-label="Excluir"
      :loading="excluir.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { AlcancePolitica, PoliticaCliente, PoliticaClienteInput, TipoPolitica } from '~/types/politica'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{ clienteId: string }>()

/** Mesmo visual do BaseInput, pros campos com sufixo (% / un.) dentro. */
const CAMPO =
  'w-full rounded-default border border-shift3-input-border bg-shift3-input py-2 pl-3 text-sm text-shift3-text outline-none transition placeholder:text-shift3-text-muted focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'

/** Botões colados num bloco só (controle segmentado), ocupando a largura da coluna. */
const SEGMENTADO = 'flex w-full rounded-default border border-shift3-input-border bg-shift3-input p-1'
const SEGMENTO = 'flex flex-1 items-center justify-center gap-1.5 rounded-[6px] px-2 py-1.5 text-xs font-medium transition whitespace-nowrap'
const SEGMENTO_ATIVO = 'bg-shift3-teal text-white shadow-sm'
const SEGMENTO_INATIVO = 'text-shift3-text-secondary hover:bg-shift3-border/50 hover:text-shift3-text'

const OPCOES_ALCANCE: { valor: AlcancePolitica; label: string; icone: string }[] = [
  { valor: 'todos', label: 'Todos', icone: 'heroicons:squares-2x2' },
  { valor: 'grupo', label: 'Grupo', icone: 'heroicons:folder' },
  { valor: 'produto', label: 'Produto', icone: 'heroicons:cube' }
]
const OPCOES_TIPO: { valor: TipoPolitica; label: string; icone: string }[] = [
  { valor: 'percentual', label: '% fixo', icone: 'heroicons:receipt-percent' },
  { valor: 'quantidade', label: 'Por quantidade', icone: 'heroicons:bars-arrow-up' }
]

/** Prévia do ajuste num preço de exemplo (R$ 100,00) — mostra o efeito antes de salvar. */
function previa(texto: string | number): { de: string; para: string } | null {
  const n = textoParaNumero(String(texto ?? ''))
  if (n === null || Number.isNaN(n) || n <= 0 || !editando.value) return null
  const sinal = editando.value.direcao === 'desconto' ? -1 : 1
  const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return { de: moeda(100), para: moeda(Math.max(0, aplicarPercentual(100, sinal * n))) }
}

const auth = useAuthStore()
const toast = useToast()
const servico = usePoliticasCliente()
const fabricas = useFabricas()
const grupos = useGrupos()

const podeEditar = computed(() => auth.podeEditarModulo('clientes'))
const politicas = ref<PoliticaCliente[]>([])
const carregando = ref(true)

async function carregar() {
  carregando.value = true
  try {
    politicas.value = await servico.listar(props.clienteId)
  } catch (e) {
    console.error('Erro ao carregar políticas:', e)
    toast.error('Não foi possível carregar as políticas')
  } finally {
    carregando.value = false
  }
}

onMounted(() => {
  carregar()
  fabricas.carregar()
  grupos.carregar()
})

const ordenadas = computed(() =>
  [...politicas.value].sort(
    (a, b) => (a.fabricas?.nome ?? '').localeCompare(b.fabricas?.nome ?? '') || a.criado_em.localeCompare(b.criado_em)
  )
)

function situacao(p: PoliticaCliente) {
  if (!p.ativo) return { texto: 'Inativa', classe: 'bg-shift3-border/60 text-shift3-text-muted' }
  if (!politicaVigente(p, hojeLocal())) return { texto: 'Vencida', classe: 'bg-warning/15 text-warning' }
  return { texto: 'Ativa', classe: 'bg-success/15 text-success' }
}

const formatarData = (iso: string) => iso.split('-').reverse().join('/')

// ───── formulário ─────

interface Rascunho {
  id?: string
  fabrica_id: string | null
  alcance: AlcancePolitica
  grupo_id: string | null
  produto_id: string | null
  tipo: TipoPolitica
  direcao: 'desconto' | 'acrescimo'
  percentual: string
  faixas: { a_partir_de: string; percentual: string }[]
  valida_ate: string
  ativo: boolean
  observacao: string
}

const editando = ref<Rascunho | null>(null)
const salvando = ref(false)
const erros = reactive<{ percentual?: string; faixas?: string; geral?: string }>({})

const numTexto = (n: number) => String(Math.abs(n)).replace('.', ',')

function abrirNova() {
  editando.value = {
    fabrica_id: null,
    alcance: 'todos',
    grupo_id: null,
    produto_id: null,
    tipo: 'percentual',
    direcao: 'desconto',
    percentual: '',
    faixas: [{ a_partir_de: '1', percentual: '' }],
    valida_ate: '',
    ativo: true,
    observacao: ''
  }
  limparErros()
}

function abrirEdicao(p: PoliticaCliente) {
  const sinal = p.tipo === 'percentual' ? (p.percentual ?? 0) : (p.faixas[0]?.percentual ?? 0)
  editando.value = {
    id: p.id,
    fabrica_id: p.fabrica_id,
    alcance: p.alcance,
    grupo_id: p.grupo_id,
    produto_id: p.produto_id,
    tipo: p.tipo,
    direcao: sinal > 0 ? 'acrescimo' : 'desconto',
    percentual: p.percentual === null ? '' : numTexto(p.percentual),
    faixas: p.faixas.length
      ? ordenarFaixas(p.faixas).map((f) => ({ a_partir_de: String(f.a_partir_de).replace('.', ','), percentual: numTexto(f.percentual) }))
      : [{ a_partir_de: '1', percentual: '' }],
    valida_ate: p.valida_ate ?? '',
    ativo: p.ativo,
    observacao: p.observacao ?? ''
  }
  limparErros()
}

function limparErros() {
  delete erros.percentual
  delete erros.faixas
  delete erros.geral
}

/** Valida o rascunho e monta o payload — null se tiver erro (mensagens em `erros`). */
function montar(r: Rascunho): PoliticaClienteInput | null {
  limparErros()
  if (!r.fabrica_id) erros.geral = 'Escolha a fábrica'
  else if (r.alcance === 'grupo' && !r.grupo_id) erros.geral = 'Escolha o grupo'
  else if (r.alcance === 'produto' && !r.produto_id) erros.geral = 'Escolha o produto'

  const sinal = r.direcao === 'desconto' ? -1 : 1
  let percentual: number | null = null
  let faixas: { a_partir_de: number; percentual: number }[] = []

  if (r.tipo === 'percentual') {
    const n = textoParaNumero(r.percentual)
    if (n === null || Number.isNaN(n) || n <= 0) erros.percentual = 'Informe o %'
    else if (sinal < 0 && n > 100) erros.percentual = 'Desconto de no máximo 100%'
    else percentual = sinal * n
  } else {
    const vistas = new Set<number>()
    for (const f of r.faixas) {
      const q = textoParaNumero(String(f.a_partir_de))
      const n = textoParaNumero(String(f.percentual))
      if (q === null && n === null) continue
      if (q === null || Number.isNaN(q) || q <= 0 || n === null || Number.isNaN(n) || n <= 0) {
        erros.faixas = 'Cada faixa precisa de quantidade e % maiores que zero'
        break
      }
      if (sinal < 0 && n > 100) {
        erros.faixas = 'Desconto de no máximo 100%'
        break
      }
      if (vistas.has(q)) {
        erros.faixas = 'Duas faixas com a mesma quantidade'
        break
      }
      vistas.add(q)
      faixas.push({ a_partir_de: q, percentual: sinal * n })
    }
    if (!erros.faixas && !faixas.length) erros.faixas = 'Informe ao menos uma faixa'
    faixas = ordenarFaixas(faixas)
  }

  if (erros.geral || erros.percentual || erros.faixas) return null

  return {
    cliente_id: props.clienteId,
    fabrica_id: r.fabrica_id!,
    alcance: r.alcance,
    grupo_id: r.alcance === 'grupo' ? r.grupo_id : null,
    produto_id: r.alcance === 'produto' ? r.produto_id : null,
    tipo: r.tipo,
    percentual: r.tipo === 'percentual' ? percentual : null,
    faixas: r.tipo === 'quantidade' ? faixas : [],
    valida_ate: r.valida_ate || null,
    ativo: r.ativo,
    observacao: r.observacao.trim() || null
  }
}

async function salvar() {
  const r = editando.value
  if (!r) return
  const dados = montar(r)
  if (!dados) return

  const conflito = politicaEmConflito({ ...dados, id: r.id }, politicas.value, hojeLocal())
  if (conflito) {
    erros.geral = `Já existe uma política ativa pra ${conflito.fabricas?.nome ?? 'essa fábrica'} · ${rotuloAlcance(conflito)}. Edite essa, ou desative-a antes.`
    return
  }

  salvando.value = true
  try {
    if (r.id) {
      const atualizada = await servico.atualizar(r.id, dados)
      politicas.value = politicas.value.map((p) => (p.id === r.id ? atualizada : p))
      toast.success('Política atualizada')
    } else {
      politicas.value = [...politicas.value, await servico.criar(dados)]
      toast.success('Política adicionada')
    }
    editando.value = null
  } catch (e: any) {
    console.error('Erro ao salvar política:', e)
    toast.error(e?.message || 'Não foi possível salvar a política')
  } finally {
    salvando.value = false
  }
}

// ───── ações da lista ─────

const excluir = reactive<{ aberto: boolean; politica: PoliticaCliente | null; excluindo: boolean }>({
  aberto: false,
  politica: null,
  excluindo: false
})

function acoes(p: PoliticaCliente) {
  return [
    { label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => abrirEdicao(p) },
    { divider: true },
    {
      label: 'Excluir',
      icon: 'heroicons:trash',
      danger: true,
      onClick: () => {
        excluir.politica = p
        excluir.aberto = true
      }
    }
  ]
}

async function confirmarExclusao() {
  const p = excluir.politica
  if (!p) return
  excluir.excluindo = true
  try {
    await servico.remover(p.id)
    politicas.value = politicas.value.filter((x) => x.id !== p.id)
    if (editando.value?.id === p.id) editando.value = null
    toast.success('Política excluída')
    excluir.aberto = false
  } catch {
    toast.error('Não foi possível excluir a política')
  } finally {
    excluir.excluindo = false
  }
}
</script>
