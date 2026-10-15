<template>
  <div>
    <div class="mx-auto max-w-3xl">
      <BasePageHeader subtitle="Preencha os dados do cliente" />
    </div>

    <ClientesAbas v-model="aba" />

    <ClientesFormulario
      v-show="aba === 'dados'"
      modo="novo"
      :salvando="salvando"
      :mostrar-acoes="aba === 'dados'"
      @submit="salvar"
      @cancelar="navigateTo('/clientes')"
    />

    <!-- política precisa do cliente gravado -->
    <div v-if="aba === 'politicas'" class="mx-auto max-w-3xl">
      <BaseEmptyState
        icon="heroicons:receipt-percent"
        title="Cadastre o cliente primeiro"
        description="As políticas comerciais ficam disponíveis assim que o cliente for salvo."
      >
        <BaseButton variant="primary" size="sm" icon-left="heroicons:arrow-left" @click="aba = 'dados'">
          Voltar para os dados
        </BaseButton>
      </BaseEmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { AbaCliente, ClienteInput } from '~/types/cliente'

definePageMeta({ layout: 'dashboard', title: 'Novo cliente', backTo: '/clientes' })

const { criar } = useClientes()
const toast = useToast()
const salvando = ref(false)
const aba = ref<AbaCliente>('dados')

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
