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
import type { AcessoAcaoSubmit } from '~/components/vendedores/VendedoresFormulario.vue'

definePageMeta({ layout: 'dashboard', title: 'Novo vendedor', backTo: '/vendedores' })

const { criar } = useVendedores()
const { criarAcesso } = useAcessoVendedor()
const toast = useToast()
const salvando = ref(false)

async function salvar(payload: VendedorInput, acao: AcessoAcaoSubmit) {
  salvando.value = true
  try {
    const vendedor = await criar(payload)

    if (acao.tipo === 'criar') {
      try {
        await criarAcesso({ vendedorId: vendedor.id, email: acao.email, senha: acao.senha, funcaoId: acao.funcaoId })
      } catch (e) {
        const erro = e as any
        toast.error(erro?.data?.statusMessage || erro?.message || 'Vendedor criado, mas não foi possível criar o acesso')
        await navigateTo('/vendedores')
        return
      }
    }

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
