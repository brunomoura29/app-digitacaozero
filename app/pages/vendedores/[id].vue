<template>
  <div>
    <BasePageHeader title="Editar vendedor" :subtitle="vendedor?.nome" />

    <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState
      v-else-if="!vendedor"
      icon="heroicons:exclamation-triangle"
      title="Vendedor não encontrado"
    >
      <BaseButton to="/vendedores" variant="secondary" size="sm">Voltar para a lista</BaseButton>
    </BaseEmptyState>

    <VendedoresFormulario
      v-if="!pending && vendedor"
      modo="editar"
      :vendedor="vendedor"
      :acesso="acesso"
      :salvando="salvando"
      @submit="salvar"
      @cancelar="navigateTo('/vendedores')"
      @remover-acesso="removerAcessoAtual"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { AcessoVendedor, VendedorInput } from '~/types/vendedor'
import type { AcessoAcaoSubmit } from '~/components/vendedores/VendedoresFormulario.vue'

definePageMeta({ layout: 'dashboard', title: 'Editar vendedor', backTo: '/vendedores' })

const route = useRoute()
const { buscarUm, atualizar } = useVendedores()
const { buscarAcesso, criarAcesso, removerAcesso, atualizarFuncao } = useAcessoVendedor()
const toast = useToast()

const id = route.params.id as string
const vendedor = ref<Awaited<ReturnType<typeof buscarUm>>>()
const acesso = ref<AcessoVendedor | null>(null)
const pending = ref(true)
const salvando = ref(false)

onMounted(async () => {
  try {
    const [v, a] = await Promise.all([buscarUm(id), buscarAcesso(id)])
    vendedor.value = v
    acesso.value = a
  } catch (e) {
    toast.error('Não foi possível carregar o vendedor')
  } finally {
    pending.value = false
  }
})

async function salvar(payload: VendedorInput, acao: AcessoAcaoSubmit) {
  salvando.value = true
  try {
    await atualizar(id, payload)

    if (acao.tipo === 'criar') {
      await criarAcesso({ vendedorId: id, email: acao.email, senha: acao.senha, funcaoId: acao.funcaoId })
    } else if (acao.tipo === 'atualizar-funcao' && acesso.value) {
      await atualizarFuncao(acesso.value.id, acao.funcaoId)
    }

    toast.success('Vendedor atualizado')
    await navigateTo('/vendedores')
  } catch (e) {
    const erro = e as any
    toast.error(erro?.data?.statusMessage || erro?.message || 'Não foi possível salvar o vendedor')
  } finally {
    salvando.value = false
  }
}

async function removerAcessoAtual() {
  if (!acesso.value) return
  try {
    await removerAcesso(acesso.value.id)
    acesso.value = null
    toast.success('Acesso removido')
  } catch (e) {
    const erro = e as any
    toast.error(erro?.data?.statusMessage || erro?.message || 'Não foi possível remover o acesso')
  }
}
</script>
