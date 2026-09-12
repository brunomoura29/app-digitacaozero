<template>
  <div>
    <BasePageHeader title="Vendedores" subtitle="Representantes e vendedores da empresa">
      <template v-if="auth.podeIncluirModulo('vendedores')" #actions>
        <BaseButton to="/vendedores/novo" variant="primary" icon-left="heroicons:plus">
          Novo vendedor
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <VendedoresFiltros :filtros="filtros" @filtrar="carregar" />
    </div>

    <VendedoresList
      :itens="itens"
      :carregando="carregando"
      :pode-editar="auth.podeEditarModulo('vendedores')"
      :pode-excluir="auth.podeExcluirModulo('vendedores')"
      @editar="(id) => navigateTo(`/vendedores/${id}`)"
      @excluir="pedirExclusao"
    />

    <BaseConfirmDialog
      v-model="dialog.aberto"
      danger
      title="Excluir vendedor"
      :message="`Excluir '${dialog.vendedor?.nome}'? Esta ação não pode ser desfeita.`"
      confirmLabel="Excluir"
      :loading="dialog.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Vendedor } from '~/types/vendedor'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Vendedores' })

const { itens, carregando, filtros, carregar, remover } = useVendedores()
const auth = useAuthStore()
const toast = useToast()

onMounted(() => carregar())

const dialog = reactive<{ aberto: boolean; vendedor: Vendedor | null; excluindo: boolean }>({
  aberto: false,
  vendedor: null,
  excluindo: false
})

function pedirExclusao(vendedor: Vendedor) {
  dialog.vendedor = vendedor
  dialog.aberto = true
}

async function confirmarExclusao() {
  if (!dialog.vendedor) return
  dialog.excluindo = true
  try {
    await remover(dialog.vendedor.id)
    toast.success('Vendedor removido')
    dialog.aberto = false
    dialog.vendedor = null
  } catch (e) {
    toast.error('Não foi possível remover o vendedor')
  } finally {
    dialog.excluindo = false
  }
}
</script>
