<template>
  <div>
    <TemplatesModelosFormulario
      modo="novo"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/templates')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ModeloInput } from '~/types/modelo'

definePageMeta({ layout: 'dashboard', title: 'Novo template', backTo: '/templates' })

const { criar } = useModelos()
const toast = useToast()
const salvando = ref(false)

async function salvar(payload: ModeloInput) {
  salvando.value = true
  try {
    await criar(payload)
    toast.success('Template criado')
    await navigateTo('/templates')
  } catch (e) {
    console.error('Erro ao salvar template:', e)
    const erro = e as any
    toast.error(erro?.message || 'Não foi possível salvar o template')
  } finally {
    salvando.value = false
  }
}
</script>
