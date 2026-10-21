<template>
  <div>
    <BasePageHeader title="Tabela de Preço" subtitle="Histórico de preços cotados por produto e fábrica">
      <template v-if="podeImportar" #actions>
        <BaseButton variant="secondary" icon-left="heroicons:arrow-up-tray" @click="importando = true">
          Importar planilha
        </BaseButton>
        <BaseButton v-if="auth.podeIncluirModulo('tabela_preco')" to="/tabela-preco/novo" variant="primary" icon-left="heroicons:plus">
          Novo preço
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <TabelaPrecoFiltros :filtros="filtros" @filtrar="carregar(1)" />
    </div>

    <TabelaPrecoList
      :itens="itens"
      :carregando="carregando"
      :total="total"
      :pagina="paginaAtual"
      :por-pagina="porPagina"
      @pagina="irParaPagina"
      @por-pagina="trocarTamanhoPagina"
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

    <TabelaPrecoImportarModal v-if="importando" @fechar="importando = false" @importado="carregar" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Preco } from '~/types/preco'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Tabela de Preço' })

const { itens, carregando, filtros, paginaAtual, porPagina, total, carregar, remover } = usePrecos()
const auth = useAuthStore()
const toast = useToast()

// volta pra página em que estava (ex.: depois de editar um preço)
onMounted(() => carregar())

function irParaPagina(pagina: number) {
  carregar(pagina)
  // quem rola é o <main> do layout dashboard, não a janela
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
}

function trocarTamanhoPagina(tamanho: number) {
  porPagina.value = tamanho
  carregar(1)
}

const podeImportar = computed(() => auth.podeIncluirModulo('tabela_preco') || auth.podeEditarModulo('tabela_preco'))
const importando = ref(false)

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
    // repõe a página (o próximo preço sobe) e atualiza o total
    carregar()
    dialog.aberto = false
    dialog.preco = null
  } catch {
    toast.error('Não foi possível excluir o preço')
  } finally {
    dialog.excluindo = false
  }
}
</script>
