<template>
  <div>
    <ProdutosFormulario
      modo="novo"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/produtos')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ProdutoInput } from '~/types/produto'

definePageMeta({ layout: 'dashboard', title: 'Novo produto', backTo: '/produtos' })

const { criar } = useProdutos()
const toast = useToast()
const salvando = ref(false)

async function salvar(payload: ProdutoInput) {
  salvando.value = true
  try {
    await criar(payload)
    toast.success('Produto cadastrado')
    await navigateTo('/produtos')
  } catch (e) {
    console.error('Erro ao salvar produto:', e)
    const erro = e as any
    const mensagem = erro?.message || 'Não foi possível salvar o produto'
    toast.error(mensagem)
  } finally {
    salvando.value = false
  }
}
</script>
