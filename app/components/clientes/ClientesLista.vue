<template>
  <div>
    <!-- Carregando -->
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando clientes…
    </div>

    <!-- Vazio -->
    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:users"
      title="Nenhum cliente encontrado"
      description="Ajuste a busca ou cadastre o primeiro cliente."
    />

    <!-- Tabela — só linhas, sem card -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold" style="width: 45%">Nome</th>
            <th class="px-4 py-3 font-semibold" style="width: 18%">CNPJ / CPF</th>
            <th class="px-4 py-3 font-semibold" style="width: 20%">Contato</th>
            <th class="px-4 py-3 font-semibold" style="width: 12%">Cidade / UF</th>
            <th class="px-4 py-3 font-semibold" style="width: 8%">Situação</th>
            <th class="px-4 py-3" style="width: 3%" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in itens"
            :key="c.id"
            class="border-b border-shift3-border/60 transition hover:bg-shift3-bg-light"
          >
            <td class="px-4 py-3" style="width: 45%">
              <button
                v-if="podeEditar"
                class="text-base font-semibold text-shift3-text hover:text-shift3-teal"
                @click="emit('editar', c.id)"
              >
                {{ c.nome }}
              </button>
              <span v-else class="text-base font-semibold text-shift3-text">{{ c.nome }}</span>
            </td>
            <td class="px-4 py-3 text-sm text-shift3-text-secondary" style="width: 18%">{{ formatDoc(c.documento) || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 20%">
              <div v-if="c.email || c.telefone" class="leading-tight">
                <div v-if="c.email">{{ c.email }}</div>
                <div v-if="c.telefone" class="text-xs text-shift3-text-muted">{{ formatTel(c.telefone) }}</div>
              </div>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 12%">
              {{ [c.endereco?.cidade, c.endereco?.uf].filter(Boolean).join(' / ') || '—' }}
            </td>
            <td class="px-4 py-3" style="width: 8%">
              <span
                class="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium"
                :class="c.ativo ? 'bg-success/15 text-success' : 'bg-shift3-border/60 text-shift3-text-muted'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="c.ativo ? 'bg-success' : 'bg-shift3-text-muted'" />
                {{ c.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right" style="width: 3%">
              <BaseDropdown v-if="podeEditar || podeExcluir" align="right" :items="acoes(c)">
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
          {{ itens.length }} {{ itens.length === 1 ? 'cliente' : 'clientes' }}
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { Cliente } from '~/types/cliente'

const props = withDefaults(
  defineProps<{ itens: Cliente[]; carregando: boolean; podeEditar?: boolean; podeExcluir?: boolean }>(),
  { podeEditar: true, podeExcluir: true }
)
const emit = defineEmits<{ editar: [id: string]; excluir: [cliente: Cliente] }>()

function acoes(c: Cliente) {
  const itens: any[] = []
  if (props.podeEditar) itens.push({ label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => emit('editar', c.id) })
  if (props.podeEditar && props.podeExcluir) itens.push({ divider: true })
  if (props.podeExcluir) itens.push({ label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', c) })
  return itens
}

function formatDoc(v: string | null) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return v
}
function formatTel(v: string | null) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return v
}
</script>
