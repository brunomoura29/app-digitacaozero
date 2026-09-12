<template>
  <div>
    <BasePageHeader title="Clientes" subtitle="Cadastro de clientes da empresa">
      <template #actions>
        <BaseButton to="/clientes/novo" variant="primary" icon-left="heroicons:plus">
          Novo cliente
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <ClientesFiltros />
    </div>

    <ClientesLista
      :itens="itens"
      :carregando="carregando"
      @editar="(id) => navigateTo(`/clientes/${id}`)"
      @excluir="pedirExclusao"
    />

    <BaseConfirmDialog
      v-model="dialog.aberto"
      danger
      title="Excluir cliente"
      :message="`Excluir “${dialog.cliente?.nome}”? Esta ação não pode ser desfeita.`"
      confirm-label="Excluir"
      :loading="dialog.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Cliente } from '~/types/cliente'

definePageMeta({ layout: 'dashboard', title: 'Clientes' })

const { itens, carregando, carregar, remover } = useClientes()
const toast = useToast()

onMounted(() => carregar())

const dialog = reactive<{ aberto: boolean; cliente: Cliente | null; excluindo: boolean }>({
  aberto: false,
  cliente: null,
  excluindo: false
})

function pedirExclusao(cliente: Cliente) {
  dialog.cliente = cliente
  dialog.aberto = true
}

async function confirmarExclusao() {
  if (!dialog.cliente) return
  dialog.excluindo = true
  try {
    await remover(dialog.cliente.id)
    toast.success('Cliente excluído')
    dialog.aberto = false
  } catch {
    toast.error('Não foi possível excluir o cliente')
  } finally {
    dialog.excluindo = false
  }
}
</script>
