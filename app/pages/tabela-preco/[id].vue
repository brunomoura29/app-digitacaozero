<template>
  <div>
    <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState
      v-else-if="!preco"
      icon="heroicons:exclamation-triangle"
      title="Preço não encontrado"
    >
      <BaseButton to="/tabela-preco" variant="secondary" size="sm">Voltar para a lista</BaseButton>
    </BaseEmptyState>

    <TabelaPrecoFormulario
      v-if="!pending && preco"
      modo="editar"
      :preco="preco"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/tabela-preco')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PrecoInput } from '~/types/preco'

definePageMeta({ layout: 'dashboard', title: 'Editar preço', backTo: '/tabela-preco' })

const route = useRoute()
const { porId, buscarUm, atualizar } = usePrecos()
const toast = useToast()

const id = route.params.id as string
const preco = ref<Awaited<ReturnType<typeof buscarUm>>>()
const pending = ref(true)
const salvando = ref(false)

onMounted(async () => {
  try {
    preco.value = porId(id) ?? (await buscarUm(id))
  } catch (e) {
    toast.error('Não foi possível carregar o preço')
  } finally {
    pending.value = false
  }
})

async function salvar(payload: PrecoInput) {
  salvando.value = true
  try {
    preco.value = await atualizar(id, payload)
    toast.success('Preço atualizado')
    await navigateTo('/tabela-preco')
  } catch (e) {
    toast.error('Não foi possível salvar o preço')
  } finally {
    salvando.value = false
  }
}
</script>
