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

    <template v-if="!pending && cliente">
      <ClientesAbas v-model="aba" />

      <!-- v-show: trocar de aba não perde o que foi digitado nos dados -->
      <ClientesFormulario
        v-show="aba === 'dados'"
        modo="editar"
        :cliente="cliente"
        :salvando="salvando"
        :mostrar-acoes="aba === 'dados'"
        @submit="salvar"
        @cancelar="navigateTo('/clientes')"
      />
      <ClientesPadroes v-if="aba === 'padroes'" :cliente-id="cliente.id" />
      <ClientesPoliticas v-if="aba === 'politicas'" :cliente-id="cliente.id" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { AbaCliente, Cliente, ClienteInput } from '~/types/cliente'

definePageMeta({ layout: 'dashboard', title: 'Editar cliente', backTo: '/clientes' })

const route = useRoute()
const { porId, buscarUm, atualizar } = useClientes()
const toast = useToast()

const id = route.params.id as string
const cliente = ref<Cliente | null>(null)
const pending = ref(true)
const salvando = ref(false)
// ?aba=politicas / ?aba=padroes abre direto na aba
const aba = ref<AbaCliente>(route.query.aba === 'politicas' || route.query.aba === 'padroes' ? route.query.aba : 'dados')

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
