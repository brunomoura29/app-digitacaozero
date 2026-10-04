<template>
  <div>
    <BasePageHeader title="Importações" subtitle="Dados importados para análise no Power BI">
      <template #actions>
        <BaseButton variant="secondary" icon-left="heroicons:chart-bar-square" @click="abrirPowerBi">
          Conectar ao Power BI
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

    <!-- Link de dados pro Power BI -->
    <BaseModal v-if="powerBiAberto" @close="powerBiAberto = false">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-shift3-text">Conectar ao Power BI</h3>

        <BaseEmptyState
          v-if="!conjuntos.length"
          icon="heroicons:document-duplicate"
          title="Nenhum conjunto de dados"
          description="Crie um template com destino “Dados para análise”."
        />

        <template v-else>
          <div>
            <label class="mb-1 block text-sm font-medium text-shift3-text">Conjunto de dados</label>
            <select
              v-model="conjuntoId"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            >
              <option v-for="m in conjuntos" :key="m.id" :value="m.id">{{ m.nome }}</option>
            </select>
          </div>

          <div v-if="carregandoChave" class="flex items-center gap-2 text-sm text-shift3-text-muted">
            <BaseSpinner size="sm" /> Carregando…
          </div>

          <template v-else-if="chave">
            <div>
              <label class="mb-1 block text-sm font-medium text-shift3-text">Link de dados</label>
              <div class="flex gap-2 rounded-medium border border-shift3-border bg-shift3-bg-light p-3">
                <input :value="linkDados" type="text" readonly class="min-w-0 flex-1 bg-transparent text-sm text-shift3-text outline-none" />
                <BaseButton size="sm" variant="secondary" @click="copiarLink">Copiar</BaseButton>
              </div>
            </div>
            <p class="text-sm text-shift3-text-secondary">
              No Power BI: <span class="font-medium text-shift3-text">Obter dados → Web</span>, cole o link e confirme. Traz
              todos os clientes e períodos desse conjunto; a cada atualização vêm os dados mais recentes.
            </p>
            <p class="text-xs text-shift3-text-muted">
              Quem tiver o link lê os dados — trate como senha. Gerar uma nova chave cancela todos os links anteriores.
            </p>
            <div class="flex flex-wrap gap-2">
              <BaseButton variant="secondary" size="sm" icon-left="heroicons:arrow-down-tray" @click="baixarCsv">
                Baixar CSV
              </BaseButton>
              <BaseButton variant="ghost" size="sm" icon-left="heroicons:arrow-path" :loading="gerandoChave" @click="gerarNovaChave">
                Gerar nova chave
              </BaseButton>
            </div>
          </template>

          <template v-else>
            <p class="text-sm text-shift3-text-secondary">
              O Power BI lê os dados por um link protegido por uma chave da sua empresa. Gere a chave pra liberar o link.
            </p>
            <BaseButton variant="primary" icon-left="heroicons:key" :loading="gerandoChave" @click="gerarNovaChave">
              Gerar chave
            </BaseButton>
          </template>
        </template>

        <BaseButton variant="secondary" class="w-full" @click="powerBiAberto = false">Fechar</BaseButton>
      </div>
    </BaseModal>

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
import { useAuthStore } from '~/stores/auth'
import { formatarPeriodo } from '~/types/importacao'
import type { Importacao } from '~/types/importacao'
import { destinoDoModelo } from '~/types/modelo'

definePageMeta({ layout: 'dashboard', title: 'Importações' })

const { itens, carregando, carregar, remover, buscarChave, gerarChave } = useImportacoes()
const modelos = useModelos()
const auth = useAuthStore()
const toast = useToast()

onMounted(async () => {
  try {
    await Promise.all([carregar(), modelos.carregar()])
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

// --- link de dados (Power BI) ---
const powerBiAberto = ref(false)
const conjuntoId = ref<string | null>(null)
const chave = ref<string | null>(null)
const carregandoChave = ref(false)
const gerandoChave = ref(false)

/** Conjunto de dados = template com destino "dados". */
const conjuntos = computed(() => modelos.itens.value.filter((m) => destinoDoModelo(m) === 'dados'))
const linkDados = computed(() =>
  chave.value && conjuntoId.value ? `${window.location.origin}/api/dados/${conjuntoId.value}.csv?chave=${chave.value}` : ''
)

async function abrirPowerBi() {
  powerBiAberto.value = true
  if (!conjuntoId.value) conjuntoId.value = conjuntos.value[0]?.id ?? null
  carregandoChave.value = true
  try {
    chave.value = await buscarChave()
  } catch {
    toast.error('Não foi possível carregar a chave do link')
  } finally {
    carregandoChave.value = false
  }
}

async function gerarNovaChave() {
  const empresaId = auth.perfil?.empresa_id
  if (!empresaId) return
  gerandoChave.value = true
  try {
    chave.value = await gerarChave(empresaId)
    toast.success('Chave gerada — os links anteriores deixaram de funcionar')
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível gerar a chave')
  } finally {
    gerandoChave.value = false
  }
}

function copiarLink() {
  navigator.clipboard.writeText(linkDados.value)
  toast.success('Link copiado')
}

function baixarCsv() {
  window.open(`${linkDados.value}&baixar=1`, '_blank')
}
</script>
