<template>
  <div>
    <!-- Carregando -->
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando vendedores…
    </div>

    <!-- Vazio -->
    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:user-group"
      title="Nenhum vendedor encontrado"
      description="Ajuste a busca ou cadastre o primeiro vendedor."
    />

    <!-- Tabela — só linhas, sem card -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold" style="width: 40%">Nome</th>
            <th class="px-4 py-3 font-semibold" style="width: 22%">E-mail</th>
            <th class="px-4 py-3 font-semibold" style="width: 18%">Telefone</th>
            <th class="px-4 py-3 font-semibold" style="width: 10%">Situação</th>
            <th class="px-4 py-3" style="width: 3%" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="v in itens"
            :key="v.id"
            class="border-b border-shift3-border/60 transition hover:bg-shift3-bg-light"
          >
            <td class="px-4 py-3" style="width: 40%">
              <button
                v-if="podeEditar"
                class="text-base font-semibold text-shift3-text hover:text-shift3-teal"
                @click="emit('editar', v.id)"
              >
                {{ v.nome }}
              </button>
              <span v-else class="text-base font-semibold text-shift3-text">{{ v.nome }}</span>
            </td>
            <td class="px-4 py-3 text-sm text-shift3-text-secondary" style="width: 22%">{{ v.email || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 18%">{{ formatTel(v.telefone) || '—' }}</td>
            <td class="px-4 py-3" style="width: 10%">
              <span
                class="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium"
                :class="v.ativo ? 'bg-success/15 text-success' : 'bg-shift3-border/60 text-shift3-text-muted'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="v.ativo ? 'bg-success' : 'bg-shift3-text-muted'" />
                {{ v.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right" style="width: 3%">
              <BaseDropdown v-if="podeEditar || podeExcluir" align="right" :items="acoes(v)">
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
          {{ itens.length }} {{ itens.length === 1 ? 'vendedor' : 'vendedores' }}
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { Vendedor } from '~/types/vendedor'

const props = withDefaults(
  defineProps<{ itens: Vendedor[]; carregando: boolean; podeEditar?: boolean; podeExcluir?: boolean }>(),
  { podeEditar: true, podeExcluir: true }
)
const emit = defineEmits<{ editar: [id: string]; excluir: [vendedor: Vendedor] }>()

function acoes(v: Vendedor) {
  const itens: any[] = []
  if (props.podeEditar) itens.push({ label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => emit('editar', v.id) })
  if (props.podeEditar && props.podeExcluir) itens.push({ divider: true })
  if (props.podeExcluir) itens.push({ label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', v) })
  return itens
}

function formatTel(v: string | null) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return v
}
</script>
