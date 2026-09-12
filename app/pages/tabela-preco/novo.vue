<template>
  <div>
    <TabelaPrecoFormulario
      modo="novo"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/tabela-preco')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PrecoInput } from '~/types/preco'

definePageMeta({ layout: 'dashboard', title: 'Novo preço', backTo: '/tabela-preco' })

const { criar } = usePrecos()
const toast = useToast()
const salvando = ref(false)

async function salvar(payload: PrecoInput) {
  salvando.value = true
  try {
    await criar(payload)
    toast.success('Preço registrado')
    await navigateTo('/tabela-preco')
  } catch (e) {
    console.error('Erro ao salvar preço:', e)
    const erro = e as any
    toast.error(erro?.message || 'Não foi possível registrar o preço')
  } finally {
    salvando.value = false
  }
}
</script>
