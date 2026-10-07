<template>
  <div class="mx-auto max-w-6xl pb-8">
    <BasePageHeader subtitle="Monte painéis de análise com a ajuda da IA e compartilhe com cada cliente por link e senha">
      <template #actions>
        <BaseButton variant="primary" icon-left="heroicons:sparkles" to="/relatorios/novo">Novo relatório</BaseButton>
      </template>
    </BasePageHeader>

    <div v-if="carregando && !itens.length" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:chart-bar"
      title="Nenhum relatório ainda"
      description="Descreva o que você quer analisar e a IA monta o painel com os seus pedidos."
    >
      <BaseButton variant="accent" icon-left="heroicons:sparkles" to="/relatorios/novo" class="mt-4">Criar o primeiro</BaseButton>
    </BaseEmptyState>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="r in itens"
        :key="r.id"
        :to="`/relatorios/${r.id}`"
        class="group flex flex-col rounded-medium border border-shift3-border bg-shift3-bg-card p-4 shadow-sm transition hover:border-shift3-green hover:shadow-md"
      >
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-default bg-shift3-green/20 text-shift3-teal dark:text-shift3-green">
            <Icon name="heroicons:chart-bar" class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-semibold text-shift3-text">{{ r.nome }}</p>
            <p class="mt-0.5 line-clamp-2 text-xs text-shift3-text-secondary">
              {{ r.descricao || nomesDasFontes(r.definicao.fontes) }}
            </p>
          </div>
          <BaseDropdown
            align="right"
            :items="[{ label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => (excluindo = r) }]"
            @click.prevent
          >
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-default text-shift3-text-muted transition hover:bg-shift3-border/50 hover:text-shift3-text"
              aria-label="Opções"
              @click.prevent
            >
              <Icon name="heroicons:ellipsis-vertical" class="h-4 w-4" />
            </button>
          </BaseDropdown>
        </div>
        <p class="mt-4 flex items-center gap-3 border-t border-shift3-border pt-3 text-xs text-shift3-text-muted">
          <span>{{ r.definicao.blocos.length }} bloco(s)</span>
          <span class="ml-auto">Atualizado em {{ new Date(r.atualizado_em).toLocaleDateString('pt-BR') }}</span>
        </p>
      </NuxtLink>
    </div>

    <BaseConfirmDialog
      :model-value="!!excluindo"
      title="Excluir relatório?"
      :message="`“${excluindo?.nome}” será apagado e os links enviados aos clientes deixam de abrir.`"
      confirm-label="Excluir"
      danger
      :loading="processando"
      @update:model-value="(v: boolean) => !v && (excluindo = null)"
      @confirm="excluir"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FONTES_RELATORIO, type FonteId } from '#shared/utils/relatorios'
import type { Relatorio } from '~/composables/useRelatorios'

definePageMeta({ layout: 'dashboard', title: 'Relatórios' })

const { itens, carregando, carregar, remover } = useRelatorios()
const toast = useToast()

const excluindo = ref<Relatorio | null>(null)
const processando = ref(false)

onMounted(async () => {
  try {
    await carregar()
  } catch {
    toast.error('Não foi possível carregar os relatórios')
  }
})

function nomesDasFontes(fontes: FonteId[]): string {
  return FONTES_RELATORIO.filter((f) => fontes.includes(f.id))
    .map((f) => f.nome)
    .join(' · ')
}

async function excluir() {
  if (!excluindo.value) return
  processando.value = true
  try {
    await remover(excluindo.value.id)
    excluindo.value = null
    toast.success('Relatório excluído')
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível excluir')
  } finally {
    processando.value = false
  }
}
</script>
