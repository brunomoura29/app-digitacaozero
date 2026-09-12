<template>
  <div>
    <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState
      v-else-if="!modelo"
      icon="heroicons:exclamation-triangle"
      title="Template não encontrado"
    >
      <BaseButton to="/templates" variant="secondary" size="sm">Voltar para a lista</BaseButton>
    </BaseEmptyState>

    <TemplatesModelosFormulario
      v-if="!pending && modelo"
      modo="editar"
      :modelo="modelo"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/templates')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ModeloInput } from '~/types/modelo'

definePageMeta({ layout: 'dashboard', title: 'Editar template', backTo: '/templates' })

const route = useRoute()
const { porId, buscarUm, atualizar } = useModelos()
const toast = useToast()

const id = route.params.id as string
const modelo = ref<Awaited<ReturnType<typeof buscarUm>>>()
const pending = ref(true)
const salvando = ref(false)

onMounted(async () => {
  try {
    modelo.value = porId(id) ?? (await buscarUm(id))
  } catch (e) {
    toast.error('Não foi possível carregar o template')
  } finally {
    pending.value = false
  }
})

async function salvar(payload: ModeloInput) {
  salvando.value = true
  try {
    modelo.value = await atualizar(id, payload)
    toast.success('Template atualizado')
    await navigateTo('/templates')
  } catch (e) {
    toast.error('Não foi possível salvar o template')
  } finally {
    salvando.value = false
  }
}
</script>
