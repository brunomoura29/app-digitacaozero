<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <!-- ───── novo / editar ───── -->
    <form
      class="space-y-3 rounded-medium border border-shift3-border bg-shift3-bg-card p-4"
      @submit.prevent="salvar"
    >
      <p class="text-sm font-semibold text-shift3-text">{{ editandoId ? 'Editar plano' : 'Novo plano' }}</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px]">
        <BaseInput v-model="form.nome" label="Nome" placeholder="Ex.: Profissional" :error="erros.nome" />
        <BaseInput v-model="form.valor" label="Valor (R$)" placeholder="0,00" :error="erros.valor" />
        <div>
          <label class="mb-1 block">Ciclo</label>
          <select v-model="form.ciclo" :class="[CAMPO, 'w-full']">
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
          </select>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <BaseSwitch v-model="form.ativo" label="Disponível pra escolher" />
        <div class="flex gap-2">
          <BaseButton v-if="editandoId" type="button" variant="ghost" size="sm" @click="limpar">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" size="sm" :icon-left="editandoId ? 'heroicons:check' : 'heroicons:plus'" :loading="salvando">
            {{ editandoId ? 'Salvar' : 'Adicionar' }}
          </BaseButton>
        </div>
      </div>
    </form>

    <div v-if="carregando" class="flex items-center justify-center gap-2 py-10 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando planos…
    </div>

    <BaseEmptyState
      v-else-if="!planos.length"
      icon="heroicons:rectangle-stack"
      title="Nenhum plano cadastrado"
      description="Cadastre os planos pra escolher na assinatura de cada empresa."
    />

    <ul v-else class="overflow-hidden rounded-medium border border-shift3-border bg-shift3-bg-card">
      <li
        v-for="p in planos"
        :key="p.id"
        class="flex items-center gap-3 border-b border-shift3-border/60 px-4 py-3 last:border-0"
        :class="{ 'opacity-60': !p.ativo }"
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-shift3-teal/10 text-shift3-teal">
          <Icon name="heroicons:rectangle-stack" class="h-4 w-4" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-shift3-text">
            {{ p.nome }}
            <span v-if="!p.ativo" class="text-xs font-normal text-shift3-text-muted">· indisponível</span>
          </p>
          <p class="text-xs text-shift3-text-muted">{{ formatarMoedaBR(p.valor) }} por {{ p.ciclo === 'anual' ? 'ano' : 'mês' }}</p>
        </div>
        <BaseDropdown
          align="right"
          :items="[
            { label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => editar(p) },
            { label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => (excluir = p) }
          ]"
        >
          <BaseButton variant="ghost" size="sm" icon-left="heroicons:ellipsis-vertical" />
        </BaseDropdown>
      </li>
    </ul>

    <BaseConfirmDialog
      :model-value="!!excluir"
      danger
      title="Excluir plano"
      :message="`Excluir o plano “${excluir?.nome ?? ''}”? As empresas nesse plano ficam sem plano (a assinatura continua). Se só não quer oferecer mais, desmarque “Disponível”.`"
      confirm-label="Excluir"
      :loading="excluindo"
      @update:model-value="(v: boolean) => !v && (excluir = null)"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { CicloPlano, Plano } from '~/types/master'
import { formatarMoedaBR } from '~/utils/dashboard'
import { textoParaNumero } from '~/utils/importacaoProdutos'

const emit = defineEmits<{ alterado: [] }>()

const CAMPO =
  'rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:opacity-60'

const master = useMaster()
const toast = useToast()

const planos = ref<Plano[]>([])
const carregando = ref(true)

async function carregar() {
  try {
    planos.value = await master.listarPlanos()
  } catch (e) {
    console.error('Erro ao carregar planos:', e)
    toast.error('Não foi possível carregar os planos')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

const editandoId = ref<string | null>(null)
const form = reactive<{ nome: string; valor: string; ciclo: CicloPlano; ativo: boolean }>({
  nome: '',
  valor: '',
  ciclo: 'mensal',
  ativo: true
})
const erros = reactive<{ nome: string; valor: string }>({ nome: '', valor: '' })

function limpar() {
  editandoId.value = null
  Object.assign(form, { nome: '', valor: '', ciclo: 'mensal', ativo: true })
  Object.assign(erros, { nome: '', valor: '' })
}

function editar(p: Plano) {
  editandoId.value = p.id
  Object.assign(form, { nome: p.nome, valor: p.valor.toFixed(2).replace('.', ','), ciclo: p.ciclo, ativo: p.ativo })
}

const salvando = ref(false)
async function salvar() {
  const nome = form.nome.trim().replace(/\s+/g, ' ')
  const valor = textoParaNumero(form.valor)
  erros.nome = nome ? '' : 'Informe o nome'
  erros.valor = valor === null || Number.isNaN(valor) ? 'Informe o valor' : ''
  if (erros.nome || erros.valor) return

  salvando.value = true
  try {
    await master.salvarPlano(editandoId.value, { nome, valor: valor!, ciclo: form.ciclo, ativo: form.ativo })
    toast.success(editandoId.value ? 'Plano salvo' : 'Plano adicionado')
    limpar()
    await carregar()
    emit('alterado')
  } catch (e: any) {
    console.error('Erro ao salvar plano:', e)
    toast.error(e?.message || 'Não foi possível salvar o plano')
  } finally {
    salvando.value = false
  }
}

const excluir = ref<Plano | null>(null)
const excluindo = ref(false)
async function confirmarExclusao() {
  const p = excluir.value
  if (!p) return
  excluindo.value = true
  try {
    await master.removerPlano(p.id)
    excluir.value = null
    if (editandoId.value === p.id) limpar()
    await carregar()
    emit('alterado')
  } catch (e) {
    console.error('Erro ao excluir plano:', e)
    toast.error('Não foi possível excluir o plano')
  } finally {
    excluindo.value = false
  }
}
</script>
