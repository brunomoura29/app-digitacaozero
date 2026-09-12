<template>
  <div>
    <BasePageHeader title="Templates" subtitle="Defina o que a extração deve ler de cada tipo de arquivo">
      <template #actions>
        <BaseButton to="/templates/novo" variant="primary" icon-left="heroicons:plus">
          Novo template
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <TemplatesModelosFiltros :filtros="filtros" @filtrar="carregar" />
    </div>

    <TemplatesModelosList
      :itens="itens"
      :carregando="carregando"
      @editar="(id) => navigateTo(`/templates/${id}`)"
      @excluir="pedirExclusao"
    />

    <BaseConfirmDialog
      v-model="dialog.aberto"
      danger
      title="Excluir template"
      :message="`Excluir '${dialog.modelo?.nome}'? Esta ação não pode ser desfeita.`"
      confirm-label="Excluir"
      :loading="dialog.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Modelo } from '~/types/modelo'

definePageMeta({ layout: 'dashboard', title: 'Templates' })

const { itens, carregando, filtros, carregar, remover } = useModelos()
const toast = useToast()

onMounted(() => carregar())

const dialog = reactive<{ aberto: boolean; modelo: Modelo | null; excluindo: boolean }>({
  aberto: false,
  modelo: null,
  excluindo: false
})

function pedirExclusao(modelo: Modelo) {
  dialog.modelo = modelo
  dialog.aberto = true
}

async function confirmarExclusao() {
  if (!dialog.modelo) return
  dialog.excluindo = true
  try {
    await remover(dialog.modelo.id)
    toast.success('Template excluído')
    dialog.aberto = false
    dialog.modelo = null
  } catch {
    toast.error('Não foi possível excluir o template')
  } finally {
    dialog.excluindo = false
  }
}
</script>
