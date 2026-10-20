<template>
  <div class="mx-auto max-w-4xl pb-8">
    <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState v-else-if="!pedido" icon="heroicons:exclamation-triangle" title="Pedido não encontrado">
      <BaseButton to="/pedidos" variant="secondary" size="sm">Voltar para a lista</BaseButton>
    </BaseEmptyState>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-lg font-semibold text-shift3-text">{{ pedido.numero || 'Novo pedido' }}</p>
          <p class="text-sm text-shift3-text-secondary">{{ pedido.clientes?.nome }}</p>
        </div>
        <div class="text-right">
          <span class="inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium" :class="CORES[pedido.status]">
            <span class="h-1.5 w-1.5 rounded-full" :class="BOLINHAS[pedido.status]" />
            {{ LABELS[pedido.status] }}
          </span>
          <p v-if="pedido.decidido_por" class="mt-1 text-xs text-shift3-text-muted">
            por {{ pedido.decidido_por }} em {{ formatDataHora(pedido.decidido_em) }}
          </p>
        </div>
      </div>

      <!-- Informações básicas -->
      <section class="grid grid-cols-1 gap-4 rounded-medium border border-shift3-border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Emissão</label>
          <p class="mt-1 text-sm text-shift3-text">{{ formatData(pedido.data_emissao) }}</p>
        </div>
        <div>
          <label for="condicao-pagamento" class="mb-1 block text-sm font-medium text-shift3-text">Condição de Pagamento</label>
          <select
            id="condicao-pagamento"
            v-model="form.condicao_pagamento_id"
            :disabled="!podeEditar || !form.fabrica_id"
            class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{{ textoSemCondicao }}</option>
            <option v-for="c in condicoesDaFabrica" :key="c.id" :value="c.id">
              {{ c.nome }}{{ c.percentual ? ` (${rotuloPercentual(c.percentual)})` : '' }}
            </option>
          </select>
          <p v-if="!form.fabrica_id" class="mt-1 text-xs text-shift3-text-muted">Escolha a fábrica abaixo pra ver as condições.</p>
          <p v-else-if="!condicoesDaFabrica.length" class="mt-1 text-xs text-shift3-text-muted">
            Essa fábrica não tem condições —
            <NuxtLink to="/condicoes-pagamento" class="text-shift3-teal hover:underline">cadastre aqui</NuxtLink>.
          </p>
        </div>
        <BaseInput v-model="form.prazo_entrega" label="Prazo de Entrega" placeholder="data ou dias" :disabled="!podeEditar" />
        <div />
      </section>

      <!-- Campos do cabeçalho do template (Transportadora, Prazo…) — os preenchidos saem na OC -->
      <section v-if="form.informacoes.length" class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Informações do pedido</p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-for="info in form.informacoes"
            :key="info.id"
            v-model="info.valor"
            :label="info.nome"
            :type="info.tipo === 'data' ? 'date' : 'text'"
            :disabled="!podeEditar"
          />
        </div>
      </section>

      <!-- Fábrica/lista de preço — usada pra buscar o preço unitário ao selecionar o produto -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:currency-dollar" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Fábrica e lista de preço</p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseBuscaOuCria
            v-model="form.fabrica_id"
            label="Fábrica"
            placeholder="Buscar fábrica ou digitar pra criar…"
            :itens="fabricas.itens.value"
            :carregando="fabricas.carregando.value"
            :ao-criar="(nome) => fabricas.criar(nome)"
            :disabled="!podeEditar"
          />
          <BaseBuscaOuCria
            v-model="form.referencia_id"
            label="Referência da tabela"
            placeholder="Ex: Preço fábrica, Distribuidor…"
            :itens="referencias.itens.value"
            :carregando="referencias.carregando.value"
            :ao-criar="(nome) => referencias.criar(nome)"
            :disabled="!podeEditar"
          />
        </div>
      </section>

      <!-- Itens (editável) -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:table-cells" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Itens</p>
        </div>
        <PedidosItensEditor
          v-model="form.itens"
          :disabled="!podeEditar"
          :fabrica-id="form.fabrica_id"
          :referencia-id="form.referencia_id"
          :cliente-id="pedido.cliente_id"
          :data-pedido="pedido.data_emissao"
        />
      </section>

      <!-- Totais -->
      <section class="rounded-medium border border-shift3-border bg-shift3-bg-light p-4">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Desconto</label>
            <BaseInput v-model.number="form.desconto_valor" type="number" step="0.01" :disabled="!podeEditar" class="mt-1" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Frete</label>
            <BaseInput v-model.number="form.frete_valor" type="number" step="0.01" :disabled="!podeEditar" class="mt-1" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Observações</label>
            <BaseTextarea v-model="form.observacoes" :disabled="!podeEditar" class="mt-1" />
          </div>
        </div>

        <!-- Resumo de totais -->
        <div class="mt-4 space-y-2 border-t border-shift3-border pt-4">
          <div class="flex justify-between text-sm">
            <span class="text-shift3-text-secondary">Subtotal:</span>
            <span class="text-shift3-text">{{ formatValor(subtotal) }}</span>
          </div>
          <div v-if="valorCondicao" class="flex justify-between text-sm">
            <span class="text-shift3-text-secondary">{{ nomeCondicao }} ({{ rotuloPercentual(percentualCondicao) }}):</span>
            <span :class="valorCondicao < 0 ? 'font-medium text-shift3-teal' : 'text-shift3-text'">
              {{ valorCondicao < 0 ? '−' : '+' }} {{ formatValor(Math.abs(valorCondicao)) }}
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-shift3-text-secondary">Frete:</span>
            <span class="text-shift3-text">+ {{ formatValor(form.frete_valor) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-shift3-text-secondary">Desconto:</span>
            <span class="text-shift3-text">- {{ formatValor(form.desconto_valor) }}</span>
          </div>
          <div class="flex justify-between border-t border-shift3-border pt-2 text-base font-semibold">
            <span class="text-shift3-text">Total:</span>
            <span class="text-shift3-text">{{ formatValor(total) }}</span>
          </div>
        </div>
      </section>

      <!-- ───── Ações — teleportadas pra barra fixa do layout (dashboard.vue) ───── -->
      <ClientOnly>
        <Teleport to="#dashboard-footer">
          <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
            <div class="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
              <BaseButton v-if="podeEditar" @click="salvar" variant="primary" :loading="salvando">
                Salvar
              </BaseButton>
              <BaseButton
                v-if="pedido.status === 'rascunho' && podeValidar"
                @click="validar"
                variant="primary"
                :loading="salvando"
              >
                Validar
              </BaseButton>
              <BaseButton
                v-if="pedido.status === 'em_validacao'"
                @click="voltarParaEditar"
                variant="secondary"
                :loading="salvando"
              >
                Voltar para Editar
              </BaseButton>
              <BaseButton
                v-if="pedido.status === 'em_validacao'"
                @click="gerarLink"
                variant="primary"
                :loading="gerando"
              >
                Gerar link para cliente
              </BaseButton>
              <!-- link expirou ou se perdeu: sem isso o pedido ficava preso em "Em Aprovação" -->
              <BaseButton
                v-if="pedido.status === 'em_aprovacao' && auth.podeEditarModulo('pedidos')"
                @click="gerarLink"
                variant="primary"
                icon-left="heroicons:link"
                :loading="gerando"
              >
                Gerar novo link
              </BaseButton>
              <BaseButton
                v-if="pedido.status === 'em_aprovacao' && auth.podeEditarModulo('pedidos')"
                @click="confirmandoVoltar = true"
                variant="secondary"
                icon-left="heroicons:pencil-square"
              >
                Voltar para edição
              </BaseButton>
              <BaseButton v-if="podeEditar || pedido.status === 'em_validacao'" to="/pedidos" variant="secondary">
                Voltar
              </BaseButton>
              <!-- nova aba: mostra o que está salvo, sem perder o que estiver sendo editado aqui -->
              <BaseButton
                @click="abrirOrdemCompra"
                variant="ghost"
                icon-left="heroicons:document-text"
                class="ml-auto"
              >
                Ordem de Compra
              </BaseButton>
              <BaseButton
                v-if="auth.podeExcluirModulo('pedidos')"
                @click="confirmandoExcluir = true"
                variant="ghost"
                icon-left="heroicons:trash"
                class="text-danger"
              >
                Excluir
              </BaseButton>
            </div>
          </div>
        </Teleport>
      </ClientOnly>

      <BaseConfirmDialog
        v-model="confirmandoExcluir"
        title="Excluir pedido?"
        :message="`${pedido.numero} será apagado com todos os itens e o link do cliente.${pedido.status === 'aprovado' ? ' Este pedido já foi aprovado pelo cliente.' : ''} Não dá pra desfazer.`"
        confirm-label="Excluir"
        danger
        :loading="excluindo"
        @confirm="excluir"
      />

      <BaseConfirmDialog
        v-model="confirmandoVoltar"
        title="Voltar para edição?"
        message="O pedido volta para Rascunho e o link enviado ao cliente deixa de funcionar. Depois de alterar, valide e gere um novo link."
        confirm-label="Voltar para edição"
        :loading="salvando"
        @confirm="voltarParaEditar"
      />

      <!-- Modal de link gerado -->
      <BaseModal v-if="linkGerado" @close="linkGerado = ''">
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-shift3-text">Link para o cliente</h3>
          <p class="text-sm text-shift3-text-secondary">Envie este link para o cliente aprovar ou rejeitar o pedido:</p>
          <div class="flex gap-2 rounded-medium border border-shift3-border bg-shift3-bg-light p-3">
            <input v-model="linkGerado" type="text" readonly class="flex-1 bg-transparent text-sm text-shift3-text outline-none" />
            <BaseButton size="sm" variant="secondary" @click="copiarLink">
              Copiar
            </BaseButton>
          </div>
          <BaseButton @click="linkGerado = ''" variant="secondary" class="w-full">Fechar</BaseButton>
        </div>
      </BaseModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { valorDaCondicao } from '~/types/condicaoPagamento'
import type { CondicaoPagamento } from '~/types/condicaoPagamento'
import { informacoesDoPedido } from '~/types/pedido'
import type { InformacaoPedido, Pedido, PedidoItem, StatusPedido } from '~/types/pedido'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Pedido', backTo: '/pedidos' })

const route = useRoute()
const { porId, buscarUm, buscarItens, atualizarComItens, validar: validarPedido, voltarParaRascunho, remover } = usePedidos()
const auth = useAuthStore()
const toast = useToast()
const fabricas = useFabricas()
const referencias = useReferenciasTabela()
const servicoCondicoes = useCondicoesPagamento()

onMounted(async () => {
  fabricas.carregar()
  referencias.carregar()
  try {
    condicoes.value = await servicoCondicoes.listar()
  } catch {
    // sem a lista o seletor fica só com "Sem condição" — o resto do pedido funciona
    toast.error('Não foi possível carregar as condições de pagamento')
  }
})

const id = route.params.id as string
const pedido = ref<Pedido | null>()
const pending = ref(true)
const salvando = ref(false)
const gerando = ref(false)
const linkGerado = ref('')
const confirmandoVoltar = ref(false)
const confirmandoExcluir = ref(false)
const excluindo = ref(false)

const form = reactive({
  /** '' = sem condição cadastrada. */
  condicao_pagamento_id: '',
  prazo_entrega: '',
  desconto_valor: 0,
  frete_valor: 0,
  observacoes: '',
  fabrica_id: null as string | null,
  referencia_id: null as string | null,
  informacoes: [] as InformacaoPedido[],
  itens: [] as PedidoItem[]
})

const podeEditar = computed(() => ['rascunho', 'rejeitado'].includes(pedido.value?.status ?? ''))
const podeValidar = computed(() => pedido.value?.status === 'rascunho' && auth.isAdmin)

// ───── condição de pagamento ─────
const condicoes = ref<CondicaoPagamento[]>([])
/** Condição digitada à mão em pedido antigo (sem cadastro) — fica enquanto não escolherem uma do cadastro. */
const textoAntigo = ref('')
const textoSemCondicao = computed(() => (textoAntigo.value ? `Sem condição cadastrada (atual: ${textoAntigo.value})` : 'Sem condição'))

/** As ativas da fábrica do pedido — e a já escolhida, mesmo que tenha sido desativada depois. */
const condicoesDaFabrica = computed(() =>
  condicoes.value.filter(
    (c) => c.fabrica_id === form.fabrica_id && (c.ativo || c.id === pedido.value?.condicao_pagamento_id)
  )
)

// trocou a fábrica: a condição de outra fábrica não vale mais
watch(
  () => form.fabrica_id,
  (fabrica) => {
    const escolhida = condicoes.value.find((c) => c.id === form.condicao_pagamento_id)
    if (escolhida && escolhida.fabrica_id !== fabrica) {
      form.condicao_pagamento_id = ''
      toast.info('A condição de pagamento era de outra fábrica — escolha de novo.')
    }
  }
)

/** A mesma condição já guardada no pedido usa o nome e o % dele (o cadastro pode ter mudado depois). */
const mesmaDoPedido = computed(
  () => !!form.condicao_pagamento_id && form.condicao_pagamento_id === pedido.value?.condicao_pagamento_id
)
const condicaoEscolhida = computed(() => condicoes.value.find((c) => c.id === form.condicao_pagamento_id) ?? null)
const percentualCondicao = computed(() => {
  if (!form.condicao_pagamento_id) return 0
  return mesmaDoPedido.value ? Number(pedido.value?.condicao_percentual) || 0 : (condicaoEscolhida.value?.percentual ?? 0)
})
const nomeCondicao = computed(() =>
  mesmaDoPedido.value ? pedido.value?.condicao_pagamento || 'Condição' : condicaoEscolhida.value?.nome || 'Condição'
)

const subtotal = computed(() => form.itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0))
const valorCondicao = computed(() => valorDaCondicao(subtotal.value, percentualCondicao.value))
const total = computed(() => subtotal.value + valorCondicao.value + form.frete_valor - form.desconto_valor)

onMounted(async () => {
  try {
    pedido.value = porId(id) ?? (await buscarUm(id))
    if (pedido.value) {
      form.itens = await buscarItens(id)
      form.condicao_pagamento_id = pedido.value.condicao_pagamento_id ?? ''
      textoAntigo.value = pedido.value.condicao_pagamento_id ? '' : pedido.value.condicao_pagamento || ''
      form.prazo_entrega = pedido.value.prazo_entrega || ''
      form.desconto_valor = pedido.value.desconto_valor || 0
      form.frete_valor = pedido.value.frete_valor || 0
      form.observacoes = pedido.value.observacoes || ''
      form.fabrica_id = pedido.value.fabrica_id
      form.referencia_id = pedido.value.referencia_id
      // cópia: editar aqui não pode mexer no pedido em memória antes de salvar
      form.informacoes = informacoesDoPedido(pedido.value.dados_extras).map((i) => ({ ...i }))
    }
  } catch {
    toast.error('Não foi possível carregar o pedido')
  } finally {
    pending.value = false
  }
})

/** Cabeçalho + itens numa transação só (RPC `atualizar_pedido`) — os totais são recalculados no servidor. */
async function salvarTudo(pedidoId: string) {
  const atualizado = await atualizarComItens(
    pedidoId,
    {
      // com condição do cadastro o banco põe o nome; sem, fica o texto antigo (se houver)
      condicao_pagamento_id: form.condicao_pagamento_id,
      condicao_pagamento: form.condicao_pagamento_id ? null : textoAntigo.value || null,
      prazo_entrega: form.prazo_entrega,
      observacoes: form.observacoes,
      // v-model.number devolve '' com o campo vazio — o cast pra numeric no banco quebraria
      desconto_valor: Number(form.desconto_valor) || 0,
      frete_valor: Number(form.frete_valor) || 0,
      fabrica_id: form.fabrica_id,
      referencia_id: form.referencia_id,
      // pedido sem informações (antigo, ou de template sem cabeçalho): não manda, fica como está
      ...(form.informacoes.length ? { informacoes: form.informacoes.map((i) => ({ ...i, valor: i.valor.trim() })) } : {})
    },
    form.itens
  )
  if (atualizado) pedido.value = atualizado
}

async function salvar() {
  if (!pedido.value) return
  salvando.value = true
  try {
    await salvarTudo(pedido.value.id)
    toast.success('Pedido salvo com sucesso')
  } catch (err: any) {
    console.error('Erro ao salvar:', err)
    toast.error(err?.message || 'Não foi possível salvar o pedido')
  } finally {
    salvando.value = false
  }
}

async function validar() {
  if (!pedido.value || form.itens.length === 0) {
    toast.error('Pedido precisa ter pelo menos 1 item')
    return
  }
  salvando.value = true
  try {
    await salvarTudo(pedido.value.id)
    await validarPedido(pedido.value.id)

    pedido.value.status = 'em_validacao'
    toast.success('Pedido validado e enviado para aprovação')
    navigateTo('/pedidos')
  } catch (err: any) {
    console.error('Erro ao validar:', err)
    toast.error(err?.message || 'Não foi possível validar o pedido')
  } finally {
    salvando.value = false
  }
}

async function voltarParaEditar() {
  if (!pedido.value) return
  salvando.value = true
  try {
    // também cancela o link de aprovação, se houver (pedido vindo de "Em Aprovação")
    await voltarParaRascunho(pedido.value.id)
    pedido.value.status = 'rascunho'
    confirmandoVoltar.value = false
    toast.success('Pedido retornou para edição')
  } catch (err: any) {
    console.error('Erro ao voltar:', err)
    toast.error(err?.message || 'Não foi possível voltar para editar')
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  if (!pedido.value) return
  excluindo.value = true
  try {
    await remover(pedido.value.id)
    toast.success('Pedido excluído')
    await navigateTo('/pedidos')
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível excluir o pedido')
  } finally {
    excluindo.value = false
  }
}

async function gerarLink() {
  if (!pedido.value) return
  gerando.value = true
  try {
    const { criarLink } = useCompartilhamentos()
    const link = await criarLink(pedido.value.id)

    // "Gerar novo link" (pedido já em aprovação) só troca o link — o status não muda
    if (pedido.value.status !== 'em_aprovacao') {
      const supabase = useSupabaseClient()
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'em_aprovacao' as StatusPedido })
        .eq('id', pedido.value.id)

      if (error) {
        console.error('Erro ao atualizar status:', error)
        toast.error('Erro ao gerar link')
        return
      }

      pedido.value.status = 'em_aprovacao'
    }
    linkGerado.value = link
    toast.success('Link gerado com sucesso!')
  } catch (err: any) {
    console.error('Erro inesperado:', err)
    toast.error(err.message || 'Não foi possível gerar link')
  } finally {
    gerando.value = false
  }
}

function abrirOrdemCompra() {
  window.open(`/pedidos/ordem-${id}`, '_blank')
}

function copiarLink() {
  navigator.clipboard.writeText(linkGerado.value)
  toast.success('Link copiado para clipboard!')
}

const LABELS: Record<StatusPedido, string> = {
  rascunho: 'Rascunho',
  em_validacao: 'Em Validação',
  em_aprovacao: 'Em Aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  enviado: 'Enviado',
  cancelado: 'Cancelado'
}
const CORES: Record<StatusPedido, string> = {
  rascunho: 'bg-shift3-border/60 text-shift3-text-muted',
  em_validacao: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
  em_aprovacao: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200',
  aprovado: 'bg-success/15 text-success',
  rejeitado: 'bg-danger/15 text-danger',
  enviado: 'bg-shift3-green/20 text-shift3-teal',
  cancelado: 'bg-danger/15 text-danger'
}
const BOLINHAS: Record<StatusPedido, string> = {
  rascunho: 'bg-shift3-text-muted',
  em_validacao: 'bg-blue-500',
  em_aprovacao: 'bg-yellow-500',
  aprovado: 'bg-success',
  rejeitado: 'bg-danger',
  enviado: 'bg-shift3-teal',
  cancelado: 'bg-danger'
}

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatData(v: string) {
  const [ano, mes, dia] = v.split('-')
  return `${dia}/${mes}/${ano}`
}
function formatDataHora(v: string | null) {
  if (!v) return ''
  return new Date(v).toLocaleString('pt-BR')
}
</script>
