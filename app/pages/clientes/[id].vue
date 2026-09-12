<template>
  <div>
    <div class="mx-auto max-w-3xl">
      <BasePageHeader title="Editar dados do cliente" :subtitle="cliente?.nome" />

      <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
        <BaseSpinner size="md" /> Carregando…
      </div>

      <BaseEmptyState
        v-else-if="!cliente"
        icon="heroicons:exclamation-triangle"
        title="Cliente não encontrado"
      >
        <BaseButton to="/clientes" variant="secondary" size="sm">Voltar para a lista</BaseButton>
      </BaseEmptyState>
    </div>

    <ClientesFormulario
      v-if="!pending && cliente"
      modo="editar"
      :cliente="cliente"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/clientes')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Cliente, ClienteInput } from '~/types/cliente'

definePageMeta({ layout: 'dashboard', title: 'Editar cliente', backTo: '/clientes' })

const route = useRoute()
const { porId, buscarUm, atualizar } = useClientes()
const toast = useToast()

const id = route.params.id as string
const cliente = ref<Cliente | null>(null)
const pending = ref(true)
const salvando = ref(false)

onMounted(async () => {
  try {
    cliente.value = porId(id) ?? (await buscarUm(id))
  } finally {
    pending.value = false
  }
})

async function salvar(payload: ClienteInput) {
  salvando.value = true
  try {
    cliente.value = await atualizar(id, payload)
    toast.success('Cliente atualizado')
    await navigateTo('/clientes')
  } catch (e) {
    toast.error(
      e instanceof Error && /duplicate key|unique/i.test(e.message)
        ? 'Já existe um cliente com esse documento'
        : 'Não foi possível salvar as alterações'
    )
  } finally {
    salvando.value = false
  }
}
</script>
