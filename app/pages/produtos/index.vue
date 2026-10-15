<template>
  <div>
    <BasePageHeader title="Produtos" subtitle="Catálogo de produtos da empresa">
      <template v-if="auth.podeIncluirModulo('produtos') || auth.podeEditarModulo('produtos')" #actions>
        <BaseButton variant="secondary" icon-left="heroicons:arrow-up-tray" @click="importando = true">
          Importar
        </BaseButton>
        <BaseButton v-if="auth.podeIncluirModulo('produtos')" to="/produtos/novo" variant="primary" icon-left="heroicons:plus">
          Novo produto
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <ProdutosFiltros :filtros="filtros" @filtrar="carregarPagina(1)" />
    </div>

    <!-- seleção pra edição em massa -->
    <div
      v-if="selecionados.length"
      class="mb-3 flex flex-wrap items-center gap-3 rounded-default border border-shift3-teal/40 bg-shift3-teal/5 px-4 py-2.5 text-sm"
    >
      <span class="font-semibold text-shift3-text">
        {{ selecionados.length }} {{ selecionados.length === 1 ? 'produto selecionado' : 'produtos selecionados' }}
      </span>
      <BaseButton variant="primary" size="sm" icon-left="heroicons:pencil-square" @click="editandoEmMassa = true">
        Editar em massa
      </BaseButton>
      <BaseButton variant="ghost" size="sm" @click="selecionados = []">Limpar seleção</BaseButton>
    </div>

    <ProdutosList
      v-model:selecionados="selecionados"
      :itens="paginaItens"
      :carregando="carregandoPagina"
      :total="total"
      :pagina="paginaAtual"
      :por-pagina="porPagina"
      :pode-editar="auth.podeEditarModulo('produtos')"
      :pode-excluir="auth.podeExcluirModulo('produtos')"
      @editar="(id) => navigateTo(`/produtos/${id}`)"
      @excluir="pedirExclusao"
      @pagina="irParaPagina"
      @por-pagina="trocarTamanhoPagina"
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

    <ProdutosImportarModal v-if="importando" @fechar="importando = false" @importado="carregarPagina()" />

    <ProdutosEdicaoMassa
      v-if="editandoEmMassa"
      :ids="selecionados"
      @fechar="editandoEmMassa = false"
      @aplicado="aoAplicarEmMassa"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Produto } from '~/types/produto'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Produtos' })

const { paginaItens, paginaAtual, porPagina, total, carregandoPagina, filtros, carregarPagina, remover } = useProdutos()
const auth = useAuthStore()
const toast = useToast()

// volta pra página em que estava (ex.: depois de editar um produto)
onMounted(() => carregarPagina())

function irParaPagina(pagina: number) {
  carregarPagina(pagina)
  // quem rola é o <main> do layout dashboard, não a janela
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
}

function trocarTamanhoPagina(tamanho: number) {
  porPagina.value = tamanho
  carregarPagina(1)
}

const importando = ref(false)

const selecionados = ref<string[]>([])
const editandoEmMassa = ref(false)

// outra página ou filtro: tira da seleção o que não está mais na tela (a edição só vale pro que se vê)
watch(paginaItens, (lista) => {
  const visiveis = new Set(lista.map((p) => p.id))
  selecionados.value = selecionados.value.filter((id) => visiveis.has(id))
})

async function aoAplicarEmMassa() {
  editandoEmMassa.value = false
  selecionados.value = []
  await carregarPagina()
}

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
    // puxa o próximo produto pra completar a página (e corrige o total)
    carregarPagina()
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
