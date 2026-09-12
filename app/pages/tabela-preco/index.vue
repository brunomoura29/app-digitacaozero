<template>
  <div>
    <BasePageHeader title="Tabela de Preço" subtitle="Histórico de preços cotados por produto e fábrica">
      <template v-if="auth.podeIncluirModulo('tabela_preco')" #actions>
        <BaseButton to="/tabela-preco/novo" variant="primary" icon-left="heroicons:plus">
          Novo preço
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <TabelaPrecoFiltros :filtros="filtros" @filtrar="carregar" />
    </div>

    <TabelaPrecoList
      :itens="itens"
      :carregando="carregando"
      :pode-editar="auth.podeEditarModulo('tabela_preco')"
      :pode-excluir="auth.podeExcluirModulo('tabela_preco')"
      @editar="(id) => navigateTo(`/tabela-preco/${id}`)"
      @excluir="pedirExclusao"
    />

    <BaseConfirmDialog
      v-model="dialog.aberto"
      danger
      title="Excluir preço"
      :message="`Excluir esse registro de preço? Esta ação não pode ser desfeita.`"
      confirm-label="Excluir"
      :loading="dialog.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Preco } from '~/types/preco'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Tabela de Preço' })

const { itens, carregando, filtros, carregar, remover } = usePrecos()
const auth = useAuthStore()
const toast = useToast()

onMounted(() => carregar())

const dialog = reactive<{ aberto: boolean; preco: Preco | null; excluindo: boolean }>({
  aberto: false,
  preco: null,
  excluindo: false
})

function pedirExclusao(preco: Preco) {
  dialog.preco = preco
  dialog.aberto = true
}

async function confirmarExclusao() {
  if (!dialog.preco) return
  dialog.excluindo = true
  try {
    await remover(dialog.preco.id)
    toast.success('Preço excluído')
    dialog.aberto = false
    dialog.preco = null
  } catch {
    toast.error('Não foi possível excluir o preço')
  } finally {
    dialog.excluindo = false
  }
}
</script>
