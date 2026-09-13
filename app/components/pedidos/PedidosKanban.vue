<template>
  <div class="grid grid-cols-5 gap-4 overflow-x-auto pb-4">
    <div v-for="col in colunas" :key="col.status" class="flex-shrink-0 w-80">
      <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 min-h-96">
        <!-- Header da coluna -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ col.label }}
          </h3>
          <span class="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {{ pedidosPorStatus[col.status]?.length || 0 }}
          </span>
        </div>

        <!-- Cards da coluna -->
        <div class="space-y-3">
          <div
            v-for="pedido in pedidosPorStatus[col.status]"
            :key="pedido.id"
            @click="selecionarPedido(pedido)"
            class="bg-white dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4"
            :class="corPorStatus(pedido.status)"
          >
            <!-- Cliente -->
            <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {{ pedido.clientes?.nome || 'Cliente desconhecido' }}
            </div>

            <!-- Número do pedido (se houver) -->
            <div v-if="pedido.numero" class="text-xs text-gray-500 dark:text-gray-400">
              OC {{ pedido.numero }}
            </div>

            <!-- Total -->
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
              {{ formatarMoeda(pedido.total) }}
            </div>

            <!-- Data -->
            <div class="text-xs text-gray-400 mt-1">
              {{ formatarData(pedido.criado_em) }}
            </div>

            <!-- Status badge -->
            <div class="mt-2 flex gap-1">
              <span class="inline-block text-xs px-2 py-1 rounded-full" :class="badgePorStatus(pedido.status)">
                {{ labelStatus(pedido.status) }}
              </span>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="!pedidosPorStatus[col.status]?.length" class="text-center py-8 text-gray-400 dark:text-gray-500">
            <p class="text-sm">Nenhum pedido</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Pedido, StatusPedido } from '~/types/pedido'

interface Props {
  pedidos: Pedido[]
}

interface Coluna {
  status: StatusPedido
  label: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ selecionarPedido: [pedido: Pedido] }>()

const colunas: Coluna[] = [
  { status: 'rascunho', label: 'Rascunho' },
  { status: 'em_validacao', label: 'Em Validação' },
  { status: 'em_aprovacao', label: 'Em Aprovação' },
  { status: 'aprovado', label: 'Aprovado' },
  { status: 'rejeitado', label: 'Rejeitado' }
]

const pedidosPorStatus = computed(() => {
  const agrupados: Record<StatusPedido, Pedido[]> = {
    rascunho: [],
    em_validacao: [],
    em_aprovacao: [],
    aprovado: [],
    rejeitado: [],
    enviado: [],
    cancelado: []
  }

  for (const pedido of props.pedidos) {
    if (agrupados[pedido.status]) {
      agrupados[pedido.status].push(pedido)
    }
  }

  return agrupados
})

function selecionarPedido(pedido: Pedido) {
  emit('selecionarPedido', pedido)
  navigateTo(`/pedidos/${pedido.id}`)
}

function corPorStatus(status: StatusPedido): string {
  const cores: Record<StatusPedido, string> = {
    rascunho: 'border-gray-400',
    em_validacao: 'border-blue-400',
    em_aprovacao: 'border-yellow-400',
    aprovado: 'border-green-400',
    rejeitado: 'border-red-400',
    enviado: 'border-purple-400',
    cancelado: 'border-gray-400'
  }
  return cores[status]
}

function badgePorStatus(status: StatusPedido): string {
  const badges: Record<StatusPedido, string> = {
    rascunho: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200',
    em_validacao: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    em_aprovacao: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    aprovado: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    rejeitado: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    enviado: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    cancelado: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
  }
  return badges[status]
}

function labelStatus(status: StatusPedido): string {
  const labels: Record<StatusPedido, string> = {
    rascunho: 'Rascunho',
    em_validacao: 'Em Validação',
    em_aprovacao: 'Em Aprovação',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    enviado: 'Enviado',
    cancelado: 'Cancelado'
  }
  return labels[status]
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0)
}

function formatarData(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(new Date(data))
}
</script>
