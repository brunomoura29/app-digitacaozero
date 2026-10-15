<template>
  <ClientOnly>
    <Teleport to="body">
      <div class="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-4" @click.self="fechar">
        <div class="my-6 w-full max-w-2xl rounded-medium border border-shift3-border bg-shift3-bg-card shadow-xl">
          <div class="flex items-start justify-between gap-4 border-b border-shift3-border px-5 py-4">
            <div>
              <h3>Importar produtos</h3>
              <p class="mt-1 text-sm text-shift3-text-secondary">
                Baixe o modelo, preencha só as colunas que quiser e importe. SKU que já existe é atualizado; os outros viram produtos novos.
              </p>
            </div>
            <button
              type="button"
              class="text-shift3-text-muted hover:text-shift3-text disabled:opacity-40"
              aria-label="Fechar"
              :disabled="etapa === 'gravando'"
              @click="fechar"
            >
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
          </div>

          <!-- ───── 1. Modelo + 2. Arquivo ───── -->
          <div v-if="etapa === 'inicio'" class="space-y-4 px-5 py-5">
            <div class="flex items-start gap-3 rounded-default border border-shift3-border p-4">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-shift3-bg-light text-sm font-semibold">1</span>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-shift3-text">Baixar o modelo</p>
                <p class="mt-0.5 text-sm text-shift3-text-secondary">
                  Planilha com os títulos das colunas e uma aba de instruções. Pode apagar as colunas que não for usar.
                </p>
              </div>
              <BaseButton variant="secondary" icon-left="heroicons:arrow-down-tray" @click="importador.baixarModelo()">
                Baixar modelo
              </BaseButton>
            </div>

            <div class="flex items-start gap-3 rounded-default border border-shift3-border p-4">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-shift3-bg-light text-sm font-semibold">2</span>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-shift3-text">Importar a planilha preenchida</p>
                <p class="mt-0.5 text-sm text-shift3-text-secondary">
                  Excel (.xlsx, .xls) ou CSV. Antes de gravar, você confere o que vai ser criado e atualizado.
                </p>
              </div>
              <BaseButton variant="primary" icon-left="heroicons:arrow-up-tray" :loading="lendo" @click="inputArquivo?.click()">
                Importar
              </BaseButton>
              <input ref="inputArquivo" type="file" class="hidden" accept=".xlsx,.xls,.csv" @change="escolherArquivo" />
            </div>
          </div>

          <!-- ───── Prévia ───── -->
          <div v-else-if="etapa === 'previa' && plano" class="space-y-4 px-5 py-5">
            <p class="flex items-center gap-2 text-sm text-shift3-text-secondary">
              <Icon name="heroicons:table-cells" class="h-4 w-4" /> {{ nomeArquivo }}
            </p>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div v-for="t in cartoes" :key="t.label" class="rounded-default border border-shift3-border p-3">
                <p class="text-2xl font-semibold tabular-nums" :class="t.cor">{{ t.valor }}</p>
                <p class="text-xs text-shift3-text-muted">{{ t.label }}</p>
              </div>
            </div>

            <div class="space-y-1 text-sm">
              <p>
                <span class="text-shift3-text-muted">Colunas usadas:</span>
                {{ plano.colunasReconhecidas.join(', ') || 'nenhuma' }}
              </p>
              <p v-if="plano.colunasIgnoradas.length" class="text-warning">
                <span class="text-shift3-text-muted">Colunas ignoradas (título não reconhecido):</span>
                {{ plano.colunasIgnoradas.join(', ') }}
              </p>
            </div>

            <div v-if="novosApoio.length" class="rounded-default border border-shift3-border bg-shift3-bg-light p-3 text-sm">
              <p class="mb-1 font-semibold text-shift3-text">Também serão cadastrados</p>
              <p v-for="n in novosApoio" :key="n.label">
                <span class="text-shift3-text-muted">{{ n.label }}:</span> {{ n.nomes }}
              </p>
            </div>

            <div v-if="linhasComErro.length" class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-danger">Linhas com erro (não serão importadas)</p>
                <BaseButton variant="ghost" size="sm" icon-left="heroicons:arrow-down-tray" @click="importador.baixarFalhas(falhasDaPrevia)">
                  Baixar lista
                </BaseButton>
              </div>
              <div class="max-h-56 overflow-y-auto rounded-default border border-shift3-border">
                <table class="min-w-full text-xs">
                  <thead class="sticky top-0 bg-shift3-bg-card">
                    <tr class="border-b border-shift3-border text-left uppercase tracking-wide text-shift3-text-muted">
                      <th class="px-3 py-2 font-semibold">Linha</th>
                      <th class="px-3 py-2 font-semibold">SKU</th>
                      <th class="px-3 py-2 font-semibold">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="l in linhasComErro.slice(0, 200)" :key="l.numero" class="border-b border-shift3-border/60 align-top">
                      <td class="px-3 py-2 tabular-nums">{{ l.numero }}</td>
                      <td class="px-3 py-2">{{ l.sku || '—' }}</td>
                      <td class="px-3 py-2 text-shift3-text-secondary">{{ l.erros.join('; ') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="linhasComErro.length > 200" class="text-xs text-shift3-text-muted">
                Mostrando 200 de {{ linhasComErro.length }} — baixe a lista para ver todas.
              </p>
            </div>

            <p v-if="!aGravar" class="rounded-default border border-dashed border-shift3-border px-4 py-4 text-center text-sm text-shift3-text-muted">
              Nenhuma linha para gravar.
            </p>
          </div>

          <!-- ───── Gravando ───── -->
          <div v-else-if="etapa === 'gravando'" class="space-y-3 px-5 py-8">
            <p class="text-sm text-shift3-text">Gravando produtos… {{ progresso.feitas }} de {{ progresso.total }}</p>
            <BaseProgress :value="progresso.total ? Math.round((progresso.feitas / progresso.total) * 100) : 0" />
            <p class="text-xs text-shift3-text-muted">Não feche esta janela até terminar.</p>
          </div>

          <!-- ───── Resultado ───── -->
          <div v-else-if="etapa === 'fim' && resultado" class="space-y-4 px-5 py-5">
            <div class="flex items-center gap-3">
              <Icon
                :name="resultado.falhas.length ? 'heroicons:exclamation-triangle' : 'heroicons:check-circle'"
                class="h-8 w-8"
                :class="resultado.falhas.length ? 'text-warning' : 'text-success'"
              />
              <p class="text-sm text-shift3-text">
                {{ resultado.criados }} {{ resultado.criados === 1 ? 'produto criado' : 'produtos criados' }} e
                {{ resultado.atualizados }} {{ resultado.atualizados === 1 ? 'atualizado' : 'atualizados' }}.
                <template v-if="resultado.falhas.length">{{ resultado.falhas.length }} não {{ resultado.falhas.length === 1 ? 'pôde' : 'puderam' }} ser gravados.</template>
              </p>
            </div>
            <BaseButton
              v-if="resultado.falhas.length"
              variant="secondary"
              size="sm"
              icon-left="heroicons:arrow-down-tray"
              @click="importador.baixarFalhas(resultado.falhas)"
            >
              Baixar as linhas que falharam
            </BaseButton>
          </div>

          <!-- ───── Rodapé ───── -->
          <div v-if="etapa === 'previa' || etapa === 'fim'" class="flex flex-wrap items-center justify-end gap-2 border-t border-shift3-border px-5 py-4">
            <template v-if="etapa === 'previa'">
              <BaseButton variant="ghost" @click="recomecar">Escolher outro arquivo</BaseButton>
              <BaseButton variant="primary" icon-left="heroicons:check" :disabled="!aGravar" @click="importar">
                Importar {{ aGravar }} {{ aGravar === 1 ? 'produto' : 'produtos' }}
              </BaseButton>
            </template>
            <BaseButton v-else variant="primary" @click="fechar">Concluir</BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { CadastrosApoio, PlanoImportacao } from '~/utils/importacaoProdutos'
import type { FalhaImportacao, ResultadoImportacao } from '~/composables/useImportarProdutos'
import { useAuthStore } from '~/stores/auth'

const emit = defineEmits<{ fechar: []; importado: [] }>()

const importador = useImportarProdutos()
const auth = useAuthStore()
const toast = useToast()

const etapa = ref<'inicio' | 'previa' | 'gravando' | 'fim'>('inicio')
const inputArquivo = ref<HTMLInputElement | null>(null)
const lendo = ref(false)
const nomeArquivo = ref('')
const plano = ref<PlanoImportacao | null>(null)
const apoio = ref<CadastrosApoio | null>(null)
const resultado = ref<ResultadoImportacao | null>(null)
const progresso = reactive({ feitas: 0, total: 0 })

async function escolherArquivo(e: Event) {
  const el = e.target as HTMLInputElement
  const arquivo = el.files?.[0]
  el.value = '' // permite escolher o mesmo arquivo de novo
  if (!arquivo) return

  lendo.value = true
  try {
    const [planilha, contexto] = await Promise.all([lerPlanilha(arquivo), importador.carregarContexto()])
    if (!planilha.linhas.length) {
      toast.error('A planilha está vazia — preencha as linhas abaixo dos títulos')
      return
    }
    plano.value = planejarImportacaoProdutos(planilha.colunas, planilha.linhas, contexto.existentes, contexto.apoio, {
      incluir: auth.podeIncluirModulo('produtos'),
      editar: auth.podeEditarModulo('produtos')
    })
    if (!plano.value.colunasReconhecidas.length) {
      toast.error('Nenhuma coluna do modelo foi reconhecida — confira se a primeira linha tem os títulos')
      plano.value = null
      return
    }
    apoio.value = contexto.apoio
    nomeArquivo.value = arquivo.name
    etapa.value = 'previa'
  } catch (erro) {
    console.error('Erro ao ler planilha de produtos:', erro)
    toast.error('Não foi possível ler o arquivo')
  } finally {
    lendo.value = false
  }
}

const cartoes = computed(() => {
  const t = plano.value?.totais
  if (!t) return []
  return [
    { label: 'Novos', valor: t.criar, cor: 'text-success' },
    { label: 'Atualizados', valor: t.atualizar, cor: 'text-shift3-teal' },
    { label: 'Sem alteração', valor: t.nada, cor: 'text-shift3-text-muted' },
    { label: 'Com erro', valor: t.erro, cor: t.erro ? 'text-danger' : 'text-shift3-text-muted' }
  ]
})

const aGravar = computed(() => (plano.value ? plano.value.totais.criar + plano.value.totais.atualizar : 0))

const novosApoio = computed(() => {
  const n = plano.value?.novos
  if (!n) return []
  const resumo = (nomes: string[]) => (nomes.length > 8 ? `${nomes.slice(0, 8).join(', ')} e mais ${nomes.length - 8}` : nomes.join(', '))
  return [
    { label: 'Marcas', nomes: n.marca },
    { label: 'Fabricantes', nomes: n.fabricante },
    { label: 'Montadoras', nomes: n.montadora },
    { label: 'Grupos', nomes: n.grupo },
    { label: 'Subgrupos', nomes: n.subgrupo.map((s) => `${s.nome} (${s.grupo})`) }
  ]
    .filter((x) => x.nomes.length)
    .map((x) => ({ label: x.label, nomes: resumo(x.nomes) }))
})

const linhasComErro = computed(() => plano.value?.linhas.filter((l) => l.acao === 'erro') ?? [])

const falhasDaPrevia = computed<FalhaImportacao[]>(() =>
  linhasComErro.value.map((l) => ({ numero: l.numero, sku: l.sku, descricao: l.descricao, motivo: l.erros.join('; ') }))
)

async function importar() {
  if (!plano.value || !apoio.value || !aGravar.value) return
  etapa.value = 'gravando'
  try {
    resultado.value = await importador.gravar(plano.value, apoio.value, (feitas, total) => {
      progresso.feitas = feitas
      progresso.total = total
    })
    etapa.value = 'fim'
    emit('importado')
  } catch (erro: any) {
    console.error('Erro ao importar produtos:', erro)
    toast.error(erro?.message || 'Não foi possível importar os produtos')
    // algo pode já ter sido gravado: a prévia ficou velha (importar de novo duplicaria os novos),
    // então volta pro começo e a lista recarrega
    recomecar()
    emit('importado')
  }
}

function recomecar() {
  plano.value = null
  resultado.value = null
  etapa.value = 'inicio'
}

function fechar() {
  if (etapa.value === 'gravando') return
  emit('fechar')
}
</script>
