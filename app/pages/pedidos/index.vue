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

    <PedidosList
      :itens="itens"
      :carregando="carregando"
      :pode-excluir="auth.podeExcluirModulo('pedidos')"
      @ver="(id) => navigateTo(`/pedidos/${id}`)"
      @excluir="pedirExclusao"
    />

    <BaseConfirmDialog
      v-model="dialog.aberto"
      danger
      title="Excluir pedido"
      :message="`Excluir o pedido '${dialog.pedido?.numero}'? Esta ação não pode ser desfeita.`"
      confirm-label="Excluir"
      :loading="dialog.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Pedido } from '~/types/pedido'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Pedidos' })

const { itens, carregando, filtros, carregar, remover } = usePedidos()
const auth = useAuthStore()
const toast = useToast()

onMounted(() => carregar())

const dialog = reactive<{ aberto: boolean; pedido: Pedido | null; excluindo: boolean }>({
  aberto: false,
  pedido: null,
  excluindo: false
})

function pedirExclusao(pedido: Pedido) {
  dialog.pedido = pedido
  dialog.aberto = true
}

async function confirmarExclusao() {
  if (!dialog.pedido) return
  dialog.excluindo = true
  try {
    await remover(dialog.pedido.id)
    toast.success('Pedido excluído')
    dialog.aberto = false
    dialog.pedido = null
  } catch {
    toast.error('Não foi possível excluir o pedido')
  } finally {
    dialog.excluindo = false
  }
}
</script>
