<template>
  <div class="mx-auto max-w-4xl space-y-5 pb-8">
    <BasePageHeader
      title="Condições de pagamento"
      subtitle="Por fábrica — escolhidas no pedido, com desconto ou acréscimo sobre a ordem de compra inteira"
    >
      <template v-if="podeIncluir && !editando" #actions>
        <BaseButton variant="primary" icon-left="heroicons:plus" @click="abrirNova">Nova condição</BaseButton>
      </template>
    </BasePageHeader>

    <!-- ───── Formulário (nova / edição) ───── -->
    <form
      v-if="editando"
      class="overflow-hidden rounded-medium border border-shift3-border bg-shift3-bg-card shadow-sm"
      @submit.prevent="salvar"
    >
      <div class="flex items-center justify-between gap-4 border-b border-shift3-border bg-shift3-bg-light px-5 py-3">
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-shift3-teal/10 text-shift3-teal">
            <Icon name="heroicons:banknotes" class="h-4 w-4" />
          </span>
          <p class="font-semibold text-shift3-text">{{ editando.id ? 'Editar condição' : 'Nova condição' }}</p>
        </div>
        <BaseSwitch v-model="editando.ativo" :label="editando.ativo ? 'Ativa' : 'Inativa'" />
      </div>

      <div class="space-y-6 px-5 py-5">
        <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BaseBuscaOuCria
            v-model="editando.fabrica_id"
            label="Fábrica *"
            placeholder="Buscar ou criar fábrica…"
            :itens="fabricas.itens.value"
            :carregando="fabricas.carregando.value"
            :ao-criar="(nome) => fabricas.criar(nome)"
          />
          <BaseInput v-model="editando.nome" label="Nome *" placeholder="Ex.: À vista, 30/60/90, 28 DDL" :error="erros.nome" />
        </section>

        <section class="space-y-4 rounded-medium border border-shift3-border/70 p-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="mb-2 block">Ajuste na ordem de compra</label>
              <div :class="SEGMENTADO">
                <button
                  v-for="o in OPCOES_AJUSTE"
                  :key="o.valor"
                  type="button"
                  :class="[SEGMENTO, editando.ajuste === o.valor ? SEGMENTO_ATIVO : SEGMENTO_INATIVO]"
                  @click="editando.ajuste = o.valor"
                >
                  <Icon :name="o.icone" class="h-3.5 w-3.5 shrink-0" />
                  {{ o.label }}
                </button>
              </div>
            </div>

            <div v-if="editando.ajuste !== 'nenhum'">
              <label class="mb-2 block">{{ editando.ajuste === 'desconto' ? 'Desconto' : 'Acréscimo' }}</label>
              <div class="relative w-40">
                <input
                  v-model="editando.percentual"
                  inputmode="decimal"
                  placeholder="5"
                  :class="[CAMPO, 'pr-8 text-right', erros.percentual ? 'border-danger' : '']"
                />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-shift3-text-muted">%</span>
              </div>
              <p v-if="erros.percentual" class="mt-1 text-xs text-danger">{{ erros.percentual }}</p>
            </div>
          </div>

          <!-- o efeito num pedido de exemplo, pra conferir o sinal antes de salvar -->
          <p class="flex flex-wrap items-center gap-x-1 text-sm text-shift3-text-secondary">
            <template v-if="previa">
              Ex.: pedido de {{ moeda(EXEMPLO) }}
              <Icon name="heroicons:arrow-right" class="mx-1 h-3.5 w-3.5 text-shift3-text-muted" />
              <span class="font-semibold text-shift3-teal">{{ moeda(previa.total) }}</span>
              <span class="text-shift3-text-muted">({{ previa.ajuste < 0 ? '−' : '+' }} {{ moeda(Math.abs(previa.ajuste)) }})</span>
            </template>
            <template v-else-if="editando.ajuste === 'nenhum'">Sem desconto nem acréscimo: só identifica a condição no pedido.</template>
          </p>
        </section>

        <p v-if="erros.geral" class="flex items-start gap-2 rounded-default bg-danger/10 px-3 py-2 text-sm text-danger">
          <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
          {{ erros.geral }}
        </p>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-shift3-border bg-shift3-bg-light px-5 py-3">
        <BaseButton type="button" variant="ghost" @click="editando = null">Cancelar</BaseButton>
        <BaseButton type="submit" variant="primary" icon-left="heroicons:check" :loading="salvando">
          {{ editando.id ? 'Salvar condição' : 'Adicionar condição' }}
        </BaseButton>
      </div>
    </form>

    <!-- ───── Filtro + lista ───── -->
    <div v-if="condicoes.length" class="flex flex-wrap items-center gap-3">
      <select v-model="filtroFabrica" :class="[CAMPO, 'w-auto min-w-[14rem] pr-8']" aria-label="Filtrar por fábrica">
        <option value="">Todas as fábricas</option>
        <option v-for="f in fabricasComCondicao" :key="f.id" :value="f.id">{{ f.nome }}</option>
      </select>
      <span class="text-xs text-shift3-text-muted">{{ visiveis.length }} condição(ões)</span>
    </div>

    <div v-if="carregando" class="flex items-center justify-center gap-2 py-10 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando condições…
    </div>

    <BaseEmptyState
      v-else-if="!condicoes.length"
      icon="heroicons:banknotes"
      title="Nenhuma condição cadastrada"
      description="Cadastre as condições de cada fábrica (à vista, 30/60/90…) pra escolher no pedido."
    />

    <div v-else class="overflow-x-auto rounded-medium border border-shift3-border bg-shift3-bg-card">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold">Fábrica</th>
            <th class="px-4 py-3 font-semibold">Condição</th>
            <th class="px-4 py-3 font-semibold">Ajuste</th>
            <th class="px-4 py-3 font-semibold">Situação</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in visiveis" :key="c.id" class="border-b border-shift3-border/60 last:border-0">
            <td class="px-4 py-3 text-shift3-text-secondary">{{ c.fabricas?.nome ?? '—' }}</td>
            <td class="px-4 py-3 font-semibold text-shift3-text">{{ c.nome }}</td>
            <td class="px-4 py-3">
              <span v-if="!c.percentual" class="text-shift3-text-muted">—</span>
              <span v-else :class="c.percentual < 0 ? 'font-medium text-shift3-teal' : 'text-shift3-text-secondary'">
                {{ c.percentual < 0 ? 'Desconto' : 'Acréscimo' }} {{ rotuloPercentual(c.percentual) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium"
                :class="c.ativo ? 'bg-success/15 text-success' : 'bg-shift3-border/60 text-shift3-text-muted'"
              >
                {{ c.ativo ? 'Ativa' : 'Inativa' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <BaseDropdown v-if="acoes(c).length" align="right" :items="acoes(c)">
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
      title="Excluir condição"
      :message="excluir.condicao ? `Excluir '${excluir.condicao.nome}' (${excluir.condicao.fabricas?.nome ?? 'fábrica'})? Pedidos já feitos guardam o nome e o % e não mudam.` : ''"
      confirm-label="Excluir"
      :loading="excluir.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { CondicaoPagamento, CondicaoPagamentoInput } from '~/types/condicaoPagamento'
import { valorDaCondicao } from '~/types/condicaoPagamento'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Condições de pagamento' })

/** Mesmo visual do BaseInput, pros campos com sufixo (%) dentro e pro filtro. */
const CAMPO =
  'w-full rounded-default border border-shift3-input-border bg-shift3-input py-2 pl-3 text-sm text-shift3-text outline-none transition placeholder:text-shift3-text-muted focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'
const SEGMENTADO = 'flex w-full rounded-default border border-shift3-input-border bg-shift3-input p-1'
const SEGMENTO = 'flex flex-1 items-center justify-center gap-1.5 rounded-[6px] px-2 py-1.5 text-xs font-medium transition whitespace-nowrap'
const SEGMENTO_ATIVO = 'bg-shift3-teal text-white shadow-sm'
const SEGMENTO_INATIVO = 'text-shift3-text-secondary hover:bg-shift3-border/50 hover:text-shift3-text'

type Ajuste = 'desconto' | 'acrescimo' | 'nenhum'
const OPCOES_AJUSTE: { valor: Ajuste; label: string; icone: string }[] = [
  { valor: 'desconto', label: 'Desconto', icone: 'heroicons:arrow-trending-down' },
  { valor: 'acrescimo', label: 'Acréscimo', icone: 'heroicons:arrow-trending-up' },
  { valor: 'nenhum', label: 'Nenhum', icone: 'heroicons:minus' }
]
const EXEMPLO = 1000
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const auth = useAuthStore()
const toast = useToast()
const servico = useCondicoesPagamento()
const fabricas = useFabricas()

const podeIncluir = computed(() => auth.podeIncluirModulo('condicoes_pagamento'))
const podeEditar = computed(() => auth.podeEditarModulo('condicoes_pagamento'))
const podeExcluir = computed(() => auth.podeExcluirModulo('condicoes_pagamento'))

const condicoes = ref<CondicaoPagamento[]>([])
const carregando = ref(true)
const filtroFabrica = ref('')

onMounted(async () => {
  fabricas.carregar()
  try {
    condicoes.value = await servico.listar()
  } catch (e) {
    console.error('Erro ao carregar condições:', e)
    toast.error('Não foi possível carregar as condições de pagamento')
  } finally {
    carregando.value = false
  }
})

const ordenadas = computed(() =>
  [...condicoes.value].sort(
    (a, b) => (a.fabricas?.nome ?? '').localeCompare(b.fabricas?.nome ?? '') || a.nome.localeCompare(b.nome)
  )
)
const visiveis = computed(() => ordenadas.value.filter((c) => !filtroFabrica.value || c.fabrica_id === filtroFabrica.value))
const fabricasComCondicao = computed(() => {
  const vistas = new Map<string, string>()
  for (const c of ordenadas.value) vistas.set(c.fabrica_id, c.fabricas?.nome ?? '—')
  return [...vistas].map(([id, nome]) => ({ id, nome }))
})

// ───── formulário ─────

interface Rascunho {
  id?: string
  fabrica_id: string | null
  nome: string
  ajuste: Ajuste
  percentual: string
  ativo: boolean
}

const editando = ref<Rascunho | null>(null)
const salvando = ref(false)
const erros = reactive<{ nome?: string; percentual?: string; geral?: string }>({})

function limparErros() {
  delete erros.nome
  delete erros.percentual
  delete erros.geral
}

function abrirNova() {
  editando.value = {
    // filtrando por uma fábrica, a nova já nasce nela
    fabrica_id: filtroFabrica.value || null,
    nome: '',
    ajuste: 'desconto',
    percentual: '',
    ativo: true
  }
  limparErros()
}

function abrirEdicao(c: CondicaoPagamento) {
  editando.value = {
    id: c.id,
    fabrica_id: c.fabrica_id,
    nome: c.nome,
    ajuste: c.percentual < 0 ? 'desconto' : c.percentual > 0 ? 'acrescimo' : 'nenhum',
    percentual: c.percentual ? String(Math.abs(c.percentual)).replace('.', ',') : '',
    ativo: c.ativo
  }
  limparErros()
}

/** % com sinal do rascunho — null quando o campo ainda não é um número válido. */
function percentualDo(r: Rascunho): number | null {
  if (r.ajuste === 'nenhum') return 0
  const n = textoParaNumero(r.percentual)
  if (n === null || Number.isNaN(n) || n <= 0) return null
  return r.ajuste === 'desconto' ? -n : n
}

const previa = computed(() => {
  const r = editando.value
  const pct = r && r.ajuste !== 'nenhum' ? percentualDo(r) : null
  if (pct === null || pct < -100) return null
  const ajuste = valorDaCondicao(EXEMPLO, pct)
  return { ajuste, total: EXEMPLO + ajuste }
})

/** Valida o rascunho e monta o payload — null se tiver erro (mensagens em `erros`). */
function montar(r: Rascunho): CondicaoPagamentoInput | null {
  limparErros()
  if (!r.fabrica_id) erros.geral = 'Escolha a fábrica'
  if (!r.nome.trim()) erros.nome = 'Informe o nome'
  const pct = percentualDo(r)
  if (pct === null) erros.percentual = 'Informe o %'
  else if (pct < -100) erros.percentual = 'Desconto de no máximo 100%'
  if (erros.geral || erros.nome || erros.percentual) return null
  return { fabrica_id: r.fabrica_id!, nome: r.nome.trim(), percentual: pct!, ativo: r.ativo }
}

async function salvar() {
  const r = editando.value
  if (!r) return
  const dados = montar(r)
  if (!dados) return

  salvando.value = true
  try {
    if (r.id) {
      const atualizada = await servico.atualizar(r.id, dados)
      condicoes.value = condicoes.value.map((c) => (c.id === r.id ? atualizada : c))
      toast.success('Condição atualizada')
    } else {
      condicoes.value = [...condicoes.value, await servico.criar(dados)]
      toast.success('Condição adicionada')
    }
    editando.value = null
  } catch (e: any) {
    console.error('Erro ao salvar condição:', e)
    erros.geral = e?.message || 'Não foi possível salvar a condição'
  } finally {
    salvando.value = false
  }
}

// ───── ações da lista ─────

const excluir = reactive<{ aberto: boolean; condicao: CondicaoPagamento | null; excluindo: boolean }>({
  aberto: false,
  condicao: null,
  excluindo: false
})

function acoes(c: CondicaoPagamento) {
  return [
    podeEditar.value && { label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => abrirEdicao(c) },
    podeExcluir.value && {
      label: 'Excluir',
      icon: 'heroicons:trash',
      danger: true,
      onClick: () => {
        excluir.condicao = c
        excluir.aberto = true
      }
    }
  ].filter(Boolean) as { label: string; icon: string; danger?: boolean; onClick: () => void }[]
}

async function confirmarExclusao() {
  const c = excluir.condicao
  if (!c) return
  excluir.excluindo = true
  try {
    await servico.remover(c.id)
    condicoes.value = condicoes.value.filter((x) => x.id !== c.id)
    if (editando.value?.id === c.id) editando.value = null
    toast.success('Condição excluída')
    excluir.aberto = false
  } catch {
    toast.error('Não foi possível excluir a condição')
  } finally {
    excluir.excluindo = false
  }
}
</script>
