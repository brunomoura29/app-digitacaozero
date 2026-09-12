<template>
  <div>
    <BasePageHeader title="Editar vendedor" :subtitle="vendedor?.nome" />

    <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState
      v-else-if="!vendedor"
      icon="heroicons:exclamation-triangle"
      title="Vendedor não encontrado"
    >
      <BaseButton to="/vendedores" variant="secondary" size="sm">Voltar para a lista</BaseButton>
    </BaseEmptyState>

    <VendedoresFormulario
      v-if="!pending && vendedor"
      modo="editar"
      :vendedor="vendedor"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/vendedores')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { VendedorInput } from '~/types/vendedor'

definePageMeta({ layout: 'dashboard', title: 'Editar vendedor', backTo: '/vendedores' })

const route = useRoute()
const { buscarUm, atualizar } = useVendedores()
const toast = useToast()

const id = route.params.id as string
const vendedor = ref<ReturnType<typeof buscarUm>>()
const pending = ref(true)
const salvando = ref(false)

onMounted(async () => {
  try {
    vendedor.value = await buscarUm(id)
  } catch (e) {
    toast.error('Não foi possível carregar o vendedor')
  } finally {
    pending.value = false
  }
})

async function salvar(payload: VendedorInput) {
  salvando.value = true
  try {
    await atualizar(id, payload)
    toast.success('Vendedor atualizado')
    await navigateTo('/vendedores')
  } catch (e) {
    toast.error('Não foi possível salvar o vendedor')
  } finally {
    salvando.value = false
  }
}
</script>
