<template>
  <div>
    <div class="mx-auto max-w-3xl">
      <BasePageHeader subtitle="Preencha os dados do cliente" />
    </div>

    <ClientesFormulario
      modo="novo"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/clientes')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ClienteInput } from '~/types/cliente'

definePageMeta({ layout: 'dashboard', title: 'Novo cliente', backTo: '/clientes' })

const { criar } = useClientes()
const toast = useToast()
const salvando = ref(false)

async function salvar(payload: ClienteInput) {
  salvando.value = true
  try {
    await criar(payload)
    toast.success('Cliente cadastrado')
    await navigateTo('/clientes')
  } catch (e) {
    toast.error(
      e instanceof Error && /duplicate key|unique/i.test(e.message)
        ? 'Já existe um cliente com esse documento'
        : 'Não foi possível salvar o cliente'
    )
  } finally {
    salvando.value = false
  }
}
</script>
