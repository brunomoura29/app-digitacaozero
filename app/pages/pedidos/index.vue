<template>
  <div>
    <BasePageHeader title="Pedidos" subtitle="Ordens de compra importadas e criadas">
      <template v-if="auth.podeIncluirModulo('pedidos')" #actions>
        <BaseButton to="/pedidos/novo" variant="primary" icon-left="heroicons:plus">
          Novo pedido
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <PedidosFiltros :filtros="filtros" @filtrar="carregar" />
    </div>

    <div v-if="carregando" class="flex justify-center py-12">
      <div class="animate-spin">
        <BaseIcon icon="heroicons:arrow-path" class="w-6 h-6" />
      </div>
    </div>

    <PedidosKanban
      v-else
      :pedidos="itens"
    />

  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Pedidos' })

const { itens, carregando, filtros, carregar } = usePedidos()
const auth = useAuthStore()

onMounted(() => carregar())
</script>
