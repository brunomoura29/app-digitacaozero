<template>
  <div>
    <BasePageHeader title="Produtos" subtitle="Catálogo de produtos da empresa">
      <template v-if="auth.podeIncluirModulo('produtos')" #actions>
        <BaseButton to="/produtos/novo" variant="primary" icon-left="heroicons:plus">
          Novo produto
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <ProdutosFiltros :filtros="filtros" @filtrar="carregar" />
    </div>

    <ProdutosList
      :itens="itens"
      :carregando="carregando"
      :pode-editar="auth.podeEditarModulo('produtos')"
      :pode-excluir="auth.podeExcluirModulo('produtos')"
      @editar="(id) => navigateTo(`/produtos/${id}`)"
      @excluir="pedirExclusao"
    />

    <BaseConfirmDialog
      v-model="dialog.aberto"
      danger
      title="Excluir produto"
      :message="`Excluir '${dialog.produto?.descricao}'? Esta ação não pode ser desfeita.`"
      confirm-label="Excluir"
      :loading="dialog.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Produto } from '~/types/produto'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Produtos' })

const { itens, carregando, filtros, carregar, remover } = useProdutos()
const auth = useAuthStore()
const toast = useToast()

onMounted(() => carregar())

const dialog = reactive<{ aberto: boolean; produto: Produto | null; excluindo: boolean }>({
  aberto: false,
  produto: null,
  excluindo: false
})

function pedirExclusao(produto: Produto) {
  dialog.produto = produto
  dialog.aberto = true
}

async function confirmarExclusao() {
  if (!dialog.produto) return
  dialog.excluindo = true
  try {
    await remover(dialog.produto.id)
    toast.success('Produto excluído')
    dialog.aberto = false
    dialog.produto = null
  } catch {
    toast.error('Não foi possível excluir o produto')
  } finally {
    dialog.excluindo = false
  }
}
</script>
