<template>
  <div>
    <BasePageHeader title="Editar função" :subtitle="funcao?.nome" />

    <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState
      v-else-if="!funcao"
      icon="heroicons:exclamation-triangle"
      title="Função não encontrada"
    >
      <BaseButton to="/configuracoes/funcoes" variant="secondary" size="sm">Voltar para a lista</BaseButton>
    </BaseEmptyState>

    <FuncoesFormulario
      v-if="!pending && funcao"
      modo="editar"
      :funcao="funcao"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/configuracoes/funcoes')"
    />
  </div>
</template>

<script setup lang="ts">
import type { FuncaoInput } from '~/types/funcao'

definePageMeta({ layout: 'dashboard', title: 'Editar função', backTo: '/configuracoes/funcoes' })

const route = useRoute()
const { buscarUm, atualizar } = useFuncoes()
const toast = useToast()

const id = route.params.id as string
const funcao = ref<Awaited<ReturnType<typeof buscarUm>>>()
const pending = ref(true)
const salvando = ref(false)

onMounted(async () => {
  try {
    funcao.value = await buscarUm(id)
  } catch (e) {
    toast.error('Não foi possível carregar a função')
  } finally {
    pending.value = false
  }
})

async function salvar(payload: FuncaoInput) {
  salvando.value = true
  try {
    await atualizar(id, payload)
    toast.success('Função atualizada')
    await navigateTo('/configuracoes/funcoes')
  } catch (e) {
    toast.error('Não foi possível salvar a função')
  } finally {
    salvando.value = false
  }
}
</script>
