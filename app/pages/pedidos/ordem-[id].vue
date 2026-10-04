<template>
  <!-- Prévia interna da Ordem de Compra (mesma folha do link do cliente) — pra conferir e baixar o PDF. -->
  <div class="flex min-h-screen flex-col bg-shift3-bg-light print:block print:min-h-0 print:bg-transparent">
    <div class="mx-auto w-full max-w-[210mm] flex-1 px-4 py-6 sm:py-10 print:max-w-none print:p-0">
      <div v-if="pending" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
        <BaseSpinner size="md" /> Carregando…
      </div>

      <BaseEmptyState v-else-if="!pedido" icon="heroicons:exclamation-triangle" title="Pedido não encontrado">
        <BaseButton to="/pedidos" variant="secondary" size="sm">Voltar para a lista</BaseButton>
      </BaseEmptyState>

      <PedidosOrdemCompra
        v-else
        :pedido="pedido"
        :itens="itens"
        :empresa="empresa"
        :cliente="cliente"
        :fabrica="pedido.fabricas?.nome"
      />
    </div>

    <div
      v-if="pedido"
      class="sticky bottom-0 border-t border-shift3-border bg-shift3-bg-card/95 px-4 py-3 backdrop-blur print:hidden"
    >
      <div class="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2">
        <BaseButton variant="primary" icon-left="heroicons:arrow-down-tray" @click="baixarPdf">Baixar PDF</BaseButton>
        <BaseButton :to="`/pedidos/${id}`" variant="secondary">Voltar ao pedido</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ParteOC } from '~/types/empresa'
import type { Pedido, PedidoItem } from '~/types/pedido'

definePageMeta({ layout: false, title: 'Ordem de Compra' })

const route = useRoute()
const supabase = useSupabaseClient()
const { buscarUm, buscarItens } = usePedidos()
const { buscar: buscarEmpresa } = useEmpresa()
const toast = useToast()

const id = route.params.id as string
const pedido = ref<Pedido | null>(null)
const itens = ref<PedidoItem[]>([])
const empresa = ref<ParteOC | null>(null)
const cliente = ref<ParteOC | null>(null)
const pending = ref(true)

// o título da aba vira o nome sugerido do arquivo em "Salvar como PDF"
useHead({ title: computed(() => (pedido.value ? `Ordem de Compra ${pedido.value.numero}` : 'Ordem de Compra')) })

onMounted(async () => {
  try {
    pedido.value = await buscarUm(id)
    if (!pedido.value) return

    const [itensPedido, dadosEmpresa, dadosCliente] = await Promise.all([
      buscarItens(id),
      buscarEmpresa(),
      supabase
        .from('clientes')
        .select('nome, documento, inscricao_estadual, email, telefone, endereco')
        .eq('id', pedido.value.cliente_id)
        .maybeSingle()
    ])
    itens.value = itensPedido
    empresa.value = dadosEmpresa
    cliente.value = (dadosCliente.data as unknown as ParteOC) ?? null
  } catch {
    toast.error('Não foi possível carregar o pedido')
  } finally {
    pending.value = false
  }
})

function baixarPdf() {
  window.print()
}
</script>
