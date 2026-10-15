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
      class="space-y-5 rounded-medium border border-shift3-teal/40 bg-shift3-bg-light p-5"
      @submit.prevent="salvar"
    >
      <p class="font-semibold text-shift3-text">{{ editando.id ? 'Editar política' : 'Nova política' }}</p>

      <BaseBuscaOuCria
        v-model="editando.fabrica_id"
        label="Fábrica *"
        placeholder="Buscar fábrica ou digitar pra criar…"
        :itens="fabricas.itens.value"
        :carregando="fabricas.carregando.value"
        :ao-criar="(nome) => fabricas.criar(nome)"
      />

      <div class="space-y-2">
        <label class="block">Vale para</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="o in OPCOES_ALCANCE"
            :key="o.valor"
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-medium transition"
            :class="editando.alcance === o.valor ? 'bg-shift3-teal text-white' : 'bg-shift3-border/40 text-shift3-text hover:bg-shift3-border/60'"
            @click="editando.alcance = o.valor"
          >
            {{ o.label }}
          </button>
        </div>
        <BaseBuscaOuCria
          v-if="editando.alcance === 'grupo'"
          v-model="editando.grupo_id"
          placeholder="Buscar grupo…"
          :itens="grupos.itens.value"
          :carregando="grupos.carregando.value"
          :ao-criar="(nome) => grupos.criar(nome)"
        />
        <ProdutosProdutoPicker v-else-if="editando.alcance === 'produto'" v-model="editando.produto_id" hide-label />
      </div>

      <div class="space-y-2">
        <label class="block">Regra</label>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="o in OPCOES_TIPO"
            :key="o.valor"
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-medium transition"
            :class="editando.tipo === o.valor ? 'bg-shift3-teal text-white' : 'bg-shift3-border/40 text-shift3-text hover:bg-shift3-border/60'"
            @click="editando.tipo = o.valor"
          >
            {{ o.label }}
          </button>
          <select v-model="editando.direcao" :class="SELECT" class="ml-auto w-36">
            <option value="desconto">Desconto</option>
            <option value="acrescimo">Acréscimo</option>
          </select>
        </div>

        <div v-if="editando.tipo === 'percentual'" class="w-40">
          <BaseInput v-model="editando.percentual" label="%" inputmode="decimal" placeholder="10" :error="erros.percentual" />
        </div>

        <div v-else class="space-y-2">
          <div v-for="(f, i) in editando.faixas" :key="i" class="flex items-end gap-2">
            <div class="w-40">
              <BaseInput v-model="f.a_partir_de" :label="i === 0 ? 'A partir de (un.)' : undefined" inputmode="decimal" placeholder="1" />
            </div>
            <div class="w-32">
              <BaseInput v-model="f.percentual" :label="i === 0 ? '%' : undefined" inputmode="decimal" placeholder="5" />
            </div>
            <BaseButton
              v-if="editando.faixas.length > 1"
              type="button"
              variant="ghost"
              size="sm"
              icon-left="heroicons:trash"
              class="mb-1 text-danger"
              aria-label="Remover faixa"
              @click="editando.faixas.splice(i, 1)"
            />
          </div>
          <p v-if="erros.faixas" class="text-xs text-danger">{{ erros.faixas }}</p>
          <BaseButton type="button" variant="ghost" size="sm" icon-left="heroicons:plus" @click="editando.faixas.push({ a_partir_de: '', percentual: '' })">
            Adicionar faixa
          </BaseButton>
          <p class="text-xs text-shift3-text-muted">Vale a maior faixa que a quantidade do item alcança. Abaixo da primeira, sem ajuste.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput v-model="editando.valida_ate" type="date" label="Válida até" hint="Vazio = sem prazo" />
        <div class="flex items-end pb-2">
          <BaseSwitch v-model="editando.ativo" :label="editando.ativo ? 'Ativa' : 'Inativa'" />
        </div>
      </div>

      <BaseInput v-model="editando.observacao" label="Observação" placeholder="Ex.: acordo comercial de 2026" />

      <p v-if="erros.geral" class="text-sm text-danger">{{ erros.geral }}</p>

      <div class="flex items-center gap-2">
        <BaseButton type="submit" variant="primary" icon-left="heroicons:check" :loading="salvando">
          {{ editando.id ? 'Salvar política' : 'Adicionar política' }}
        </BaseButton>
        <BaseButton type="button" variant="ghost" @click="editando = null">Cancelar</BaseButton>
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

const SELECT =
  'rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'

const OPCOES_ALCANCE: { valor: AlcancePolitica; label: string }[] = [
  { valor: 'todos', label: 'Todos os produtos' },
  { valor: 'grupo', label: 'Um grupo' },
  { valor: 'produto', label: 'Um produto' }
]
const OPCOES_TIPO: { valor: TipoPolitica; label: string }[] = [
  { valor: 'percentual', label: 'Percentual fixo' },
  { valor: 'quantidade', label: 'Por quantidade' }
]

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
