<template>
  <div>
    <!-- Header -->
    <BasePageHeader
      title="Vendedores"
      subtitle="Gerencie os representantes e vendedores da sua empresa"
      :actions="[
        { label: 'Novo vendedor', icon: 'heroicons:plus', onClick: abrirNovoVendedor }
      ]"
    />

    <div class="space-y-6">
      <!-- Filtros -->
      <VendedoresFiltros :filtros="vendedores.filtros.value" @filtrar="vendedores.carregar()" />

      <!-- Modo edição: mostrar formulário -->
      <div v-if="modoEdicao" class="bg-shift3-bg-card border border-shift3-border rounded-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-shift3-text">
            {{ vendedorEmEdicaoId ? 'Editar vendedor' : 'Novo vendedor' }}
          </h3>
          <button class="text-shift3-text-muted hover:text-shift3-text" @click="fecharEdicao">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <VendedoresForm
          :inicial="vendedorEmEdicaoId ? obterDadosEditar() : undefined"
          :modo="vendedorEmEdicaoId ? 'editar' : 'criar'"
          :carregando="carregandoForm"
          @enviar="salvarVendedor"
          @cancelar="fecharEdicao"
        />
      </div>

      <!-- Modo lista: mostrar tabela -->
      <div v-else class="bg-shift3-bg-card border border-shift3-border rounded-lg p-6">
        <VendedoresList
          :itens="vendedores.itens.value"
          :carregando="vendedores.carregando.value"
          @editar="editarVendedor"
          @excluir="confirmarExclusao"
        />
      </div>
    </div>

    <!-- Diálogo de confirmação de exclusão -->
    <BaseConfirmDialog
      v-model="dialogo.aberto"
      title="Excluir vendedor?"
      :description="`Tem certeza que deseja excluir '${dialogo.vendedor?.nome}'? Esta ação não pode ser desfeita.`"
      button-text="Excluir"
      :loading="carregandoForm"
      @confirm="apagarVendedor"
    />
  </div>
</template>

<script setup lang="ts">
import type { Vendedor, VendedorInput } from '~/types/vendedor'

const vendedores = useVendedores()

const modoEdicao = ref(false)
const carregandoForm = ref(false)
const vendedorEmEdicaoId = ref<string | null>(null)

const dialogo = reactive({
  aberto: false,
  vendedor: null as Vendedor | null
})

onMounted(async () => {
  await vendedores.carregar()
})

function abrirNovoVendedor() {
  vendedorEmEdicaoId.value = null
  modoEdicao.value = true
}

function obterDadosEditar(): Partial<VendedorInput> | undefined {
  if (!vendedorEmEdicaoId.value) return undefined
  const v = vendedores.porId(vendedorEmEdicaoId.value)
  if (!v) return undefined
  return {
    nome: v.nome,
    email: v.email,
    telefone: v.telefone,
    ativo: v.ativo
  }
}

function editarVendedor(id: string) {
  vendedorEmEdicaoId.value = id
  modoEdicao.value = true
}

function fecharEdicao() {
  modoEdicao.value = false
  vendedorEmEdicaoId.value = null
}

async function salvarVendedor(dados: VendedorInput) {
  carregandoForm.value = true
  try {
    if (vendedorEmEdicaoId.value) {
      // Editar
      await vendedores.atualizar(vendedorEmEdicaoId.value, dados)
    } else {
      // Criar
      await vendedores.criar(dados)
    }
    fecharEdicao()
  } catch (erro) {
    console.error('Erro ao salvar:', erro)
  } finally {
    carregandoForm.value = false
  }
}

function confirmarExclusao(vendedor: Vendedor) {
  dialogo.vendedor = vendedor
  dialogo.aberto = true
}

async function apagarVendedor() {
  if (!dialogo.vendedor) return

  carregandoForm.value = true
  try {
    await vendedores.remover(dialogo.vendedor.id)
    dialogo.aberto = false
    dialogo.vendedor = null
  } catch (erro) {
    console.error('Erro ao remover:', erro)
  } finally {
    carregandoForm.value = false
  }
}
</script>
