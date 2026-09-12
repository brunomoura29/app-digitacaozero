<template>
  <div>
    <!-- Carregando -->
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando funções…
    </div>

    <!-- Vazio -->
    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:key"
      title="Nenhuma função cadastrada"
      description="Crie funções para controlar o que cada acesso pode ver ou editar no sistema."
    />

    <!-- Tabela — só linhas, sem card -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold" style="width: 35%">Nome</th>
            <th class="px-4 py-3 font-semibold" style="width: 45%">Descrição</th>
            <th class="px-4 py-3 font-semibold" style="width: 17%">Acessos</th>
            <th class="px-4 py-3" style="width: 3%" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="f in itens"
            :key="f.id"
            class="border-b border-shift3-border/60 transition hover:bg-shift3-bg-light"
          >
            <td class="px-4 py-3" style="width: 35%">
              <button class="text-base font-semibold text-shift3-text hover:text-shift3-teal" @click="emit('editar', f.id)">
                {{ f.nome }}
              </button>
            </td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 45%">{{ f.descricao || '—' }}</td>
            <td class="px-4 py-3" style="width: 17%">
              <span class="inline-flex items-center gap-1 rounded-pill bg-shift3-green/15 px-2 py-0.5 text-xs font-medium text-shift3-teal">
                {{ contarAcessos(f) }} {{ contarAcessos(f) === 1 ? 'módulo' : 'módulos' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right" style="width: 3%">
              <BaseDropdown
                align="right"
                :items="[
                  { label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => emit('editar', f.id) },
                  { divider: true },
                  { label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', f) }
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
          {{ itens.length }} {{ itens.length === 1 ? 'função' : 'funções' }}
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { Funcao } from '~/types/funcao'

defineProps<{ itens: Funcao[]; carregando: boolean }>()
const emit = defineEmits<{ editar: [id: string]; excluir: [funcao: Funcao] }>()

function contarAcessos(f: Funcao) {
  return Object.values(f.permissoes ?? {}).filter((v) => v !== 'nenhum').length
}
</script>
