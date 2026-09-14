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
        <span class="inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium" :class="CORES[pedido.status]">
          <span class="h-1.5 w-1.5 rounded-full" :class="BOLINHAS[pedido.status]" />
          {{ LABELS[pedido.status] }}
        </span>
      </div>

      <!-- Informações básicas -->
      <section class="grid grid-cols-1 gap-4 rounded-medium border border-shift3-border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Emissão</label>
          <p class="mt-1 text-sm text-shift3-text">{{ formatData(pedido.data_emissao) }}</p>
        </div>
        <BaseInput v-model="form.condicao_pagamento" label="Condição de Pagamento" placeholder="à vista, 30 dias..." :disabled="!podeEditar" />
        <BaseInput v-model="form.prazo_entrega" label="Prazo de Entrega" placeholder="data ou dias" :disabled="!podeEditar" />
        <div />
      </section>

      <!-- Itens (editável) -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:table-cells" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Itens</p>
        </div>
        <PedidosItensEditor v-model="form.itens" :disabled="!podeEditar" />
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

      <!-- Botões de ação -->
      <div class="flex flex-wrap gap-2 border-t border-shift3-border pt-4">
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
        <BaseButton v-if="podeEditar || pedido.status === 'em_validacao'" to="/pedidos" variant="secondary">
          Voltar
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { Pedido, PedidoItem, StatusPedido } from '~/types/pedido'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Pedido', backTo: '/pedidos' })

const route = useRoute()
const { porId, buscarUm, buscarItens, atualizar } = usePedidos()
const auth = useAuthStore()
const toast = useToast()

const id = route.params.id as string
const pedido = ref<Pedido | null>()
const pending = ref(true)
const salvando = ref(false)

const form = reactive({
  condicao_pagamento: '',
  prazo_entrega: '',
  desconto_valor: 0,
  frete_valor: 0,
  observacoes: '',
  itens: [] as PedidoItem[]
})

const podeEditar = computed(() => ['rascunho', 'rejeitado'].includes(pedido.value?.status ?? ''))
const podeValidar = computed(() => pedido.value?.status === 'rascunho' && auth.isAdmin)

const subtotal = computed(() => form.itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0))
const total = computed(() => subtotal.value + form.frete_valor - form.desconto_valor)

onMounted(async () => {
  try {
    pedido.value = porId(id) ?? (await buscarUm(id))
    if (pedido.value) {
      form.itens = await buscarItens(id)
      form.condicao_pagamento = pedido.value.condicao_pagamento || ''
      form.prazo_entrega = pedido.value.prazo_entrega || ''
      form.desconto_valor = pedido.value.desconto_valor || 0
      form.frete_valor = pedido.value.frete_valor || 0
      form.observacoes = pedido.value.observacoes || ''
    }
  } catch {
    toast.error('Não foi possível carregar o pedido')
  } finally {
    pending.value = false
  }
})

async function salvar() {
  if (!pedido.value) return
  salvando.value = true
  try {
    await atualizar(pedido.value.id, {
      condicao_pagamento: form.condicao_pagamento,
      prazo_entrega: form.prazo_entrega,
      desconto_valor: form.desconto_valor,
      frete_valor: form.frete_valor,
      observacoes: form.observacoes,
      subtotal: subtotal.value,
      total: total.value
    })
    toast.success('Pedido salvo com sucesso')
  } catch (err) {
    toast.error('Não foi possível salvar o pedido')
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
    const supabase = useSupabaseClient()
    const { data: numero, error: erroRpc } = await supabase.rpc('proximo_numero_pedido')

    if (erroRpc) {
      console.error('Erro ao gerar número:', erroRpc)
      toast.error('Erro ao gerar número do pedido')
      return
    }

    const dadosUpdate: Partial<Pedido> = {
      numero: (numero ?? '') as string,
      status: 'em_validacao' as StatusPedido,
      condicao_pagamento: form.condicao_pagamento,
      prazo_entrega: form.prazo_entrega,
      desconto_valor: form.desconto_valor,
      frete_valor: form.frete_valor,
      observacoes: form.observacoes,
      subtotal: subtotal.value,
      total: total.value
    }

    const { error: erroUpdate } = await supabase
      .from('pedidos')
      .update(dadosUpdate)
      .eq('id', pedido.value.id)

    if (erroUpdate) {
      console.error('Erro ao atualizar:', erroUpdate)
      toast.error(`Erro: ${erroUpdate.message}`)
      return
    }

    pedido.value.status = 'em_validacao'
    pedido.value.numero = (numero ?? '') as string
    toast.success('Pedido validado e enviado para aprovação')
    navigateTo('/pedidos')
  } catch (err) {
    console.error('Erro inesperado:', err)
    toast.error('Não foi possível validar o pedido')
  } finally {
    salvando.value = false
  }
}

async function voltarParaEditar() {
  if (!pedido.value) return
  salvando.value = true
  try {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('pedidos')
      .update({ status: 'rascunho' as StatusPedido })
      .eq('id', pedido.value.id)

    if (error) {
      console.error('Erro ao voltar:', error)
      toast.error(`Erro: ${error.message}`)
      return
    }

    pedido.value.status = 'rascunho'
    toast.success('Pedido retornou para edição')
  } catch (err) {
    console.error('Erro inesperado:', err)
    toast.error('Não foi possível voltar para editar')
  } finally {
    salvando.value = false
  }
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
</script>
