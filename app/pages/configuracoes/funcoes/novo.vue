<template>
  <div>
    <FuncoesFormulario
      modo="novo"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/configuracoes/funcoes')"
    />
  </div>
</template>

<script setup lang="ts">
import type { FuncaoInput } from '~/types/funcao'

definePageMeta({ layout: 'dashboard', title: 'Nova função', backTo: '/configuracoes/funcoes' })

const { criar } = useFuncoes()
const toast = useToast()
const salvando = ref(false)

async function salvar(payload: FuncaoInput) {
  salvando.value = true
  try {
    await criar(payload)
    toast.success('Função criada')
    await navigateTo('/configuracoes/funcoes')
  } catch (e) {
    console.error('Erro ao salvar função:', e)
    const erro = e as any
    toast.error(erro?.message || 'Não foi possível salvar a função')
  } finally {
    salvando.value = false
  }
}
</script>
