<template>
  <div>
    <!-- Carregando -->
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando templates…
    </div>

    <!-- Vazio -->
    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:document-duplicate"
      title="Nenhum template cadastrado"
      description="Crie o primeiro template pra guiar a extração dos arquivos."
    />

    <!-- Tabela — só linhas, sem card -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold" style="width: 35%">Nome</th>
            <th class="px-4 py-3 font-semibold" style="width: 30%">Descrição</th>
            <th class="px-4 py-3 font-semibold" style="width: 12%">Tipo</th>
            <th class="px-4 py-3 font-semibold" style="width: 10%">Campos</th>
            <th class="px-4 py-3 font-semibold" style="width: 10%">Situação</th>
            <th class="px-4 py-3" style="width: 3%" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in itens"
            :key="m.id"
            class="border-b border-shift3-border/60 transition hover:bg-shift3-bg-light"
          >
            <td class="px-4 py-3" style="width: 35%">
              <button class="text-base font-semibold text-shift3-text hover:text-shift3-teal" @click="emit('editar', m.id)">
                {{ m.nome }}
              </button>
            </td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 30%">{{ m.descricao || '—' }}</td>
            <td class="px-4 py-3" style="width: 12%">
              <span class="inline-flex items-center rounded-pill bg-shift3-border/50 px-2 py-0.5 text-xs font-medium text-shift3-text-secondary">
                {{ labelTipo(m.tipo) }}
              </span>
            </td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 10%">
              {{ (m.schema?.campos?.length ?? 0) + (m.schema?.campos_item?.length ?? 0) }}
            </td>
            <td class="px-4 py-3" style="width: 10%">
              <span
                class="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium"
                :class="m.ativo ? 'bg-success/15 text-success' : 'bg-shift3-border/60 text-shift3-text-muted'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="m.ativo ? 'bg-success' : 'bg-shift3-text-muted'" />
                {{ m.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right" style="width: 3%">
              <BaseDropdown
                align="right"
                :items="[
                  { label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => emit('editar', m.id) },
                  { divider: true },
                  { label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', m) }
                ]"
              >
                <BaseButton variant="ghost" size="sm" icon-left="heroicons:ellipsis-vertical" />
              </BaseDropdown>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totalizador — teleportado pra barra fixa do layout (dashboard.vue), sempre visível -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div
          v-if="!carregando && itens.length"
          class="border-t border-shift3-border bg-shift3-bg-card px-6 py-3 text-xs text-shift3-text-muted"
        >
          {{ itens.length }} {{ itens.length === 1 ? 'template' : 'templates' }}
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { TIPOS_MODELO } from '~/types/modelo'
import type { Modelo, TipoModelo } from '~/types/modelo'

defineProps<{ itens: Modelo[]; carregando: boolean }>()
const emit = defineEmits<{ editar: [id: string]; excluir: [modelo: Modelo] }>()

function labelTipo(tipo: TipoModelo) {
  return TIPOS_MODELO.find((t) => t.valor === tipo)?.label ?? tipo
}
</script>
