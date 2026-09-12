<template>
  <div>
    <VendedoresFormulario
      modo="novo"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/vendedores')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { VendedorInput } from '~/types/vendedor'

definePageMeta({ layout: 'dashboard', title: 'Novo vendedor', backTo: '/vendedores' })

const { criar } = useVendedores()
const toast = useToast()
const salvando = ref(false)

async function salvar(payload: VendedorInput) {
  salvando.value = true
  try {
    await criar(payload)
    toast.success('Vendedor cadastrado')
    await navigateTo('/vendedores')
  } catch (e) {
    console.error('Erro ao salvar vendedor:', e)
    const erro = e as any
    const mensagem = erro?.message || 'Não foi possível salvar o vendedor'
    toast.error(mensagem)
  } finally {
    salvando.value = false
  }
}
</script>
