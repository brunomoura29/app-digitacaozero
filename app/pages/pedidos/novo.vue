<template>
  <div class="mx-auto max-w-4xl pb-8">
    <!-- ───── Etapa 1: importar ───── -->
    <div v-if="etapa === 'upload'" class="space-y-8">
      <p class="text-sm text-shift3-text-secondary">Escolha o template, o cliente e o documento pra extrair</p>

      <section class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-shift3-text">Template *</label>
            <select
              v-model="modeloId"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            >
              <option :value="null" disabled>Selecione um template</option>
              <option v-for="m in modelosAtivos" :key="m.id" :value="m.id">{{ m.nome }}</option>
            </select>
            <p v-if="!modelosAtivos.length && !modelos.carregando.value" class="mt-1 text-xs text-shift3-text-muted">
              Nenhum template ativo — crie um em
              <NuxtLink to="/templates" class="text-shift3-teal hover:underline">Templates</NuxtLink>.
            </p>
          </div>

          <ClientesClientePicker v-model="clienteId" />
        </div>

        <BaseUpload
          v-model="arquivos"
          :multiple="false"
          accept=".pdf,image/*"
          :max-size-mb="20"
          hint="PDF ou foto do pedido — até 20 MB"
        />
      </section>

      <div class="flex items-center gap-3">
        <BaseButton
          type="button"
          variant="primary"
          icon-left="heroicons:sparkles"
          :loading="extraindo"
          :disabled="!podeExtrair"
          @click="extrair"
        >
          Extrair
        </BaseButton>
        <BaseButton type="button" variant="ghost" @click="navigateTo('/pedidos')">Cancelar</BaseButton>
      </div>
    </div>

    <!-- ───── Etapa 2: revisão (tabela editável) ───── -->
    <div v-else class="space-y-8">
      <div>
        <p class="text-lg font-semibold text-shift3-text">Revisar pedido</p>
        <p class="text-sm text-shift3-text-secondary">
          Cliente: <span class="font-medium text-shift3-text">{{ clienteSelecionado?.nome }}</span>
        </p>
      </div>

      <!-- Campos do cabeçalho, do jeito que o template definiu -->
      <section v-if="modeloAtual?.schema.campos.length" class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Dados do pedido</p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div v-for="campo in modeloAtual.schema.campos" :key="campo.id">
            <label class="mb-1 block text-sm font-medium text-shift3-text">{{ campo.nome }}</label>
            <input
              v-if="campo.tipo === 'booleano'"
              type="checkbox"
              class="h-4 w-4 accent-shift3-green"
              :checked="!!camposCabecalho[campo.id]"
              @change="(e) => (camposCabecalho[campo.id] = (e.target as HTMLInputElement).checked)"
            />
            <input
              v-else
              :value="camposCabecalho[campo.id] ?? ''"
              :type="campo.tipo === 'data' ? 'date' : campo.tipo === 'numero' || campo.tipo === 'moeda' ? 'number' : 'text'"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
              @input="(e) => (camposCabecalho[campo.id] = (e.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </section>

      <!-- Itens — tabela editável -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:table-cells" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Itens</p>
        </div>
        <PedidosItensEditor v-model="itensPedido" />
      </section>

      <div class="flex items-center gap-3">
        <BaseButton
          type="button"
          variant="primary"
          icon-left="heroicons:check"
          :loading="salvando"
          :disabled="!itensPedido.length"
          @click="salvar"
        >
          Validar e salvar
        </BaseButton>
        <BaseButton type="button" variant="ghost" @click="etapa = 'upload'">Voltar</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { UploadFile } from '~/composables/useUpload'
import { mapearItensExtraidos } from '~/types/pedido'
import type { PedidoItemInput } from '~/types/pedido'

definePageMeta({ layout: 'dashboard', title: 'Novo pedido', backTo: '/pedidos' })

const modelos = useModelos()
const { extrair: extrairArquivo } = useExtracao()
const { criar } = usePedidos()
const clientes = useClientes()
const toast = useToast()

onMounted(() => {
  modelos.carregar()
  clientes.carregar()
})

const modelosAtivos = computed(() => modelos.itens.value.filter((m) => m.ativo))
const modeloAtual = computed(() => modelos.itens.value.find((m) => m.id === modeloId.value) ?? null)
const clienteSelecionado = computed(() => clientes.itens.value.find((c) => c.id === clienteId.value) ?? null)

const etapa = ref<'upload' | 'revisao'>('upload')
const modeloId = ref<string | null>(null)
const clienteId = ref<string | null>(null)
const arquivos = ref<UploadFile[]>([])
const extraindo = ref(false)
const salvando = ref(false)

const extracaoId = ref<string | null>(null)
const camposCabecalho = reactive<Record<string, unknown>>({})
const itensPedido = ref<PedidoItemInput[]>([])

const podeExtrair = computed(() => !!modeloId.value && !!clienteId.value && arquivos.value.length > 0)

async function extrair() {
  if (!podeExtrair.value || !modeloId.value) return
  const arquivo = arquivos.value[0]?.file
  if (!arquivo) return

  extraindo.value = true
  try {
    const resposta = await extrairArquivo(arquivo, modeloId.value)
    extracaoId.value = resposta.extracaoId

    for (const campo of modeloAtual.value?.schema.campos ?? []) {
      camposCabecalho[campo.id] = resposta.dadosExtraidos.campos?.[campo.id] ?? ''
    }
    itensPedido.value = mapearItensExtraidos(resposta.dadosExtraidos.itens ?? [])

    if (resposta.reaproveitado) toast.info('Esse arquivo já tinha sido extraído antes — reaproveitando o resultado.')
    etapa.value = 'revisao'
  } catch (e) {
    const erro = e as any
    toast.error(erro?.data?.statusMessage || erro?.message || 'Não foi possível extrair o documento')
  } finally {
    extraindo.value = false
  }
}

async function salvar() {
  if (!clienteId.value) return
  salvando.value = true
  try {
    const id = await criar({
      cliente_id: clienteId.value,
      extracao_id: extracaoId.value,
      campos: { ...camposCabecalho },
      itens: itensPedido.value
    })
    toast.success('Pedido salvo')
    await navigateTo(`/pedidos/${id}`)
  } catch (e) {
    const erro = e as any
    toast.error(erro?.message || 'Não foi possível salvar o pedido')
  } finally {
    salvando.value = false
  }
}
</script>
