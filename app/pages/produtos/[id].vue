<template>
  <div>
    <BasePageHeader title="Editar produto" :subtitle="produto?.descricao" />

    <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState
      v-else-if="!produto"
      icon="heroicons:exclamation-triangle"
      title="Produto não encontrado"
    >
      <BaseButton to="/produtos" variant="secondary" size="sm">Voltar para a lista</BaseButton>
    </BaseEmptyState>

    <ProdutosFormulario
      v-if="!pending && produto"
      modo="editar"
      :produto="produto"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/produtos')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ProdutoInput } from '~/types/produto'

definePageMeta({ layout: 'dashboard', title: 'Editar produto', backTo: '/produtos' })

const route = useRoute()
const { porId, buscarUm, atualizar } = useProdutos()
const toast = useToast()

const id = route.params.id as string
const produto = ref<Awaited<ReturnType<typeof buscarUm>>>()
const pending = ref(true)
const salvando = ref(false)

onMounted(async () => {
  try {
    produto.value = porId(id) ?? (await buscarUm(id))
  } catch (e) {
    toast.error('Não foi possível carregar o produto')
  } finally {
    pending.value = false
  }
})

async function salvar(payload: ProdutoInput) {
  salvando.value = true
  try {
    produto.value = await atualizar(id, payload)
    toast.success('Produto atualizado')
    await navigateTo('/produtos')
  } catch (e) {
    toast.error('Não foi possível salvar o produto')
  } finally {
    salvando.value = false
  }
}
</script>
