<template>
  <div class="mx-auto max-w-4xl pb-8">
    <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState v-else-if="!pedido" icon="heroicons:exclamation-triangle" title="Pedido não encontrado">
      <BaseButton to="/pedidos" variant="secondary" size="sm">Voltar para a lista</BaseButton>
    </BaseEmptyState>

    <div v-else class="space-y-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-lg font-semibold text-shift3-text">{{ pedido.numero }}</p>
          <p class="text-sm text-shift3-text-secondary">{{ pedido.clientes?.nome }}</p>
        </div>
        <span
          class="inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium"
          :class="CORES[pedido.status]"
        >
          <span class="h-1.5 w-1.5 rounded-full" :class="BOLINHAS[pedido.status]" />
          {{ LABELS[pedido.status] }}
        </span>
      </div>

      <section class="grid grid-cols-1 gap-4 rounded-medium border border-shift3-border p-4 sm:grid-cols-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Emissão</p>
          <p class="text-sm text-shift3-text">{{ formatData(pedido.data_emissao) }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Condição de pagamento</p>
          <p class="text-sm text-shift3-text">{{ pedido.condicao_pagamento || '—' }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Prazo de entrega</p>
          <p class="text-sm text-shift3-text">{{ pedido.prazo_entrega || '—' }}</p>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:table-cells" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Itens</p>
        </div>

        <div class="overflow-x-auto rounded-medium border border-shift3-border">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-shift3-border bg-shift3-bg-light text-left text-xs uppercase tracking-wide text-shift3-text-muted">
                <th class="px-3 py-2 font-semibold">Descrição</th>
                <th class="px-3 py-2 font-semibold">SKU</th>
                <th class="px-3 py-2 font-semibold text-right">Qtd.</th>
                <th class="px-3 py-2 font-semibold text-right">Preço Unit.</th>
                <th class="px-3 py-2 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-shift3-border/60">
              <tr v-for="item in itens" :key="item.id">
                <td class="px-3 py-2 text-shift3-text">{{ item.descricao || '—' }}</td>
                <td class="px-3 py-2 text-shift3-text-secondary">{{ item.sku || '—' }}</td>
                <td class="px-3 py-2 text-right text-shift3-text-secondary">{{ item.quantidade }}</td>
                <td class="px-3 py-2 text-right text-shift3-text-secondary">{{ formatValor(item.preco_unitario) }}</td>
                <td class="px-3 py-2 text-right font-medium text-shift3-text">{{ formatValor(item.total_linha) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end">
          <p class="text-sm text-shift3-text-secondary">
            Total: <span class="text-base font-semibold text-shift3-text">{{ formatValor(pedido.total) }}</span>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Pedido, PedidoItem, StatusPedido } from '~/types/pedido'

definePageMeta({ layout: 'dashboard', title: 'Pedido', backTo: '/pedidos' })

const route = useRoute()
const { porId, buscarUm, buscarItens } = usePedidos()
const toast = useToast()

const id = route.params.id as string
const pedido = ref<Pedido | null>()
const itens = ref<PedidoItem[]>([])
const pending = ref(true)

onMounted(async () => {
  try {
    pedido.value = porId(id) ?? (await buscarUm(id))
    if (pedido.value) itens.value = await buscarItens(id)
  } catch {
    toast.error('Não foi possível carregar o pedido')
  } finally {
    pending.value = false
  }
})

const LABELS: Record<StatusPedido, string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
  enviado: 'Enviado',
  cancelado: 'Cancelado'
}
const CORES: Record<StatusPedido, string> = {
  rascunho: 'bg-shift3-border/60 text-shift3-text-muted',
  aprovado: 'bg-success/15 text-success',
  enviado: 'bg-shift3-green/20 text-shift3-teal',
  cancelado: 'bg-danger/15 text-danger'
}
const BOLINHAS: Record<StatusPedido, string> = {
  rascunho: 'bg-shift3-text-muted',
  aprovado: 'bg-success',
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
