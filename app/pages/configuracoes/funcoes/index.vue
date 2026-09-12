<template>
  <div>
    <BasePageHeader title="Funções de acesso" subtitle="Controle o que cada função pode ver ou editar no sistema">
      <template #actions>
        <BaseButton icon-left="heroicons:plus" @click="navigateTo('/configuracoes/funcoes/novo')">
          Nova função
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <FuncoesFiltros :filtros="funcoes.filtros.value" @filtrar="funcoes.carregar()" />
    </div>

    <FuncoesList
      :itens="funcoes.itens.value"
      :carregando="funcoes.carregando.value"
      @editar="(id) => navigateTo(`/configuracoes/funcoes/${id}`)"
      @excluir="confirmarExclusao"
    />

    <BaseConfirmDialog
      v-model="dialogo.aberto"
      title="Excluir função?"
      :message="`Tem certeza que deseja excluir '${dialogo.funcao?.nome}'? Esta ação não pode ser desfeita.`"
      confirm-label="Excluir"
      danger
      :loading="excluindo"
      @confirm="apagarFuncao"
    />
  </div>
</template>

<script setup lang="ts">
import type { Funcao } from '~/types/funcao'

definePageMeta({ layout: 'dashboard', title: 'Funções de acesso' })

const funcoes = useFuncoes()
const toast = useToast()
const excluindo = ref(false)

const dialogo = reactive({
  aberto: false,
  funcao: null as Funcao | null
})

onMounted(async () => {
  await funcoes.carregar()
})

function confirmarExclusao(funcao: Funcao) {
  dialogo.funcao = funcao
  dialogo.aberto = true
}

async function apagarFuncao() {
  if (!dialogo.funcao) return
  excluindo.value = true
  try {
    await funcoes.remover(dialogo.funcao.id)
    toast.success('Função excluída')
    dialogo.aberto = false
    dialogo.funcao = null
  } catch (e) {
    const erro = e as any
    toast.error(erro?.message || 'Não foi possível excluir a função')
  } finally {
    excluindo.value = false
  }
}
</script>
