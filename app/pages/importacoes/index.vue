<template>
  <div>
    <BasePageHeader title="Importações" subtitle="Dados importados para análise no Power BI">
      <template #actions>
        <BaseButton to="/power-bi" variant="secondary" icon-left="heroicons:chart-bar-square">
          Links para o Power BI
        </BaseButton>
        <BaseButton to="/importacoes/novo" variant="primary" icon-left="heroicons:plus">Nova importação</BaseButton>
      </template>
    </BasePageHeader>

    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando importações…
    </div>

    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:arrow-down-on-square-stack"
      title="Nenhuma importação ainda"
      description="Crie um template com destino “Dados para análise” e importe a primeira planilha."
    />

    <!-- Tabela — só linhas, sem card -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold">Conjunto de dados</th>
            <th class="px-4 py-3 font-semibold">Cliente</th>
            <th class="px-4 py-3 font-semibold">Período</th>
            <th class="px-4 py-3 text-right font-semibold">Linhas</th>
            <th class="px-4 py-3 font-semibold">Arquivo</th>
            <th class="px-4 py-3 font-semibold">Importado em</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in itens" :key="i.id" class="border-b border-shift3-border/60 transition hover:bg-shift3-bg-light">
            <td class="px-4 py-3 font-semibold text-shift3-text">{{ i.modelos?.nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary">{{ i.clientes?.nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary">{{ formatarPeriodo(i.periodo) }}</td>
            <td class="px-4 py-3 text-right tabular-nums text-shift3-text">{{ i.total_linhas.toLocaleString('pt-BR') }}</td>
            <td class="max-w-[16rem] truncate px-4 py-3 text-shift3-text-secondary">{{ i.arquivo_nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary">{{ new Date(i.criado_em).toLocaleDateString('pt-BR') }}</td>
            <td class="px-4 py-3 text-right">
              <BaseDropdown
                align="right"
                :items="[{ label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => (excluindoItem = i) }]"
              >
                <BaseButton variant="ghost" size="sm" icon-left="heroicons:ellipsis-vertical" />
              </BaseDropdown>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseConfirmDialog
      :model-value="!!excluindoItem"
      title="Excluir importação?"
      :message="mensagemExcluir"
      confirm-label="Excluir"
      danger
      :loading="excluindo"
      @update:model-value="(v) => !v && (excluindoItem = null)"
      @confirm="confirmarExcluir"
    />

    <!-- Totalizador — teleportado pra barra fixa do layout (dashboard.vue), sempre visível -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div
          v-if="!carregando && itens.length"
          class="border-t border-shift3-border bg-shift3-bg-card px-6 py-3 text-xs text-shift3-text-muted"
        >
          {{ itens.length }} {{ itens.length === 1 ? 'importação' : 'importações' }} ·
          {{ totalLinhas.toLocaleString('pt-BR') }} linhas
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatarPeriodo } from '~/types/importacao'
import type { Importacao } from '~/types/importacao'

definePageMeta({ layout: 'dashboard', title: 'Importações' })

const { itens, carregando, carregar, remover } = useImportacoes()
const toast = useToast()

onMounted(async () => {
  try {
    await carregar()
  } catch {
    toast.error('Não foi possível carregar as importações')
  }
})

const totalLinhas = computed(() => itens.value.reduce((soma, i) => soma + i.total_linhas, 0))

// --- excluir ---
const excluindoItem = ref<Importacao | null>(null)
const excluindo = ref(false)
const mensagemExcluir = computed(() => {
  const i = excluindoItem.value
  if (!i) return ''
  return `${i.modelos?.nome ?? 'Conjunto'} de ${i.clientes?.nome ?? 'cliente desconhecido'} (${formatarPeriodo(i.periodo)}): ${i.total_linhas} linha(s) saem do Power BI na próxima atualização. Não dá pra desfazer.`
})

async function confirmarExcluir() {
  if (!excluindoItem.value) return
  excluindo.value = true
  try {
    await remover(excluindoItem.value.id)
    toast.success('Importação excluída')
    excluindoItem.value = null
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível excluir a importação')
  } finally {
    excluindo.value = false
  }
}
</script>
