<template>
  <form id="modelos-formulario" @submit.prevent="enviar">
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <p v-if="props.modelo?.nome" class="text-lg font-semibold text-shift3-text">{{ props.modelo.nome }}</p>
      <p v-else class="text-sm text-shift3-text-secondary">Defina os campos que a extração vai preencher a partir do arquivo</p>

      <!-- ───── Dados principais ───── -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:identification" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Dados principais</p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <BaseInput
              v-model="form.nome"
              label="Nome *"
              type="text"
              placeholder="Ex: Pedidos Fábrica"
              icon="heroicons:document-duplicate"
              required
              :error="erros.nome"
            />
          </div>
          <div class="sm:col-span-2 flex items-end pb-2">
            <BaseSwitch v-model="form.ativo" :label="form.ativo ? 'Ativo' : 'Inativo'" />
          </div>

          <div class="sm:col-span-3">
            <label class="mb-1 block text-sm font-medium text-shift3-text">Tipo de arquivo</label>
            <select
              v-model="form.tipo"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            >
              <option v-for="t in TIPOS_MODELO" :key="t.valor" :value="t.valor">{{ t.label }}</option>
            </select>
          </div>
          <div class="sm:col-span-3">
            <BaseInput v-model="form.descricao" label="Descrição" type="text" placeholder="Opcional" icon="heroicons:pencil" />
          </div>
        </div>
      </section>

      <!-- ───── Campos do cabeçalho ───── -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Campos do cabeçalho</p>
        </div>
        <p class="text-xs text-shift3-text-muted">Dados que aparecem uma vez no documento — ex: cliente, data do pedido.</p>
        <TemplatesCamposEditor v-model="form.schema.campos" />
      </section>

      <!-- ───── Campos do item ───── -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:list-bullet" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Campos do item</p>
        </div>
        <p class="text-xs text-shift3-text-muted">Dados que se repetem por linha — ex: SKU, quantidade, preço.</p>
        <TemplatesCamposEditor v-model="form.schema.campos_item" />
      </section>

      <!-- ───── Dicas pra extração ───── -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:light-bulb" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Dicas para a extração</p>
        </div>
        <BaseTextarea
          v-model="form.dicas"
          placeholder="Instruções livres pra guiar a leitura do arquivo (ex: 'o código do produto vem entre parênteses ao lado da descrição')…"
          :rows="3"
        />
      </section>
    </div>

    <!-- ───── Ações — teleportadas pra barra fixa do layout ───── -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
          <div class="mx-auto flex max-w-3xl items-center gap-3">
            <BaseButton
              type="submit"
              form="modelos-formulario"
              variant="primary"
              :loading="salvando"
              icon-left="heroicons:check"
            >
              {{ modo === 'novo' ? 'Criar template' : 'Salvar alterações' }}
            </BaseButton>
            <BaseButton type="button" variant="ghost" @click="$emit('cancelar')">Cancelar</BaseButton>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { TIPOS_MODELO, schemaVazio } from '~/types/modelo'
import type { CampoSchema, Modelo, ModeloInput, TipoModelo } from '~/types/modelo'

interface Props {
  modo: 'novo' | 'editar'
  modelo?: Modelo
  salvando?: boolean
}

const props = withDefaults(defineProps<Props>(), { salvando: false })

const emit = defineEmits<{
  submit: [dados: ModeloInput]
  cancelar: []
}>()

const form = reactive<{
  nome: string
  descricao: string
  tipo: TipoModelo
  ativo: boolean
  schema: { campos: CampoSchema[]; campos_item: CampoSchema[] }
  dicas: string
}>({
  nome: props.modelo?.nome ?? '',
  descricao: props.modelo?.descricao ?? '',
  tipo: props.modelo?.tipo ?? 'misto',
  ativo: props.modelo?.ativo ?? true,
  schema: {
    campos: props.modelo?.schema?.campos ? [...props.modelo.schema.campos] : [],
    campos_item: props.modelo?.schema?.campos_item ? [...props.modelo.schema.campos_item] : []
  },
  dicas: props.modelo?.schema?.dicas?.geral ?? ''
})

const erros = reactive<{ nome?: string }>({})

function validar() {
  if (!form.nome.trim()) {
    erros.nome = 'Nome é obrigatório'
  } else {
    delete erros.nome
  }
}

function enviar() {
  validar()
  if (Object.keys(erros).length > 0) return

  const schema = schemaVazio()
  schema.campos = form.schema.campos
  schema.campos_item = form.schema.campos_item
  if (form.dicas.trim()) schema.dicas = { geral: form.dicas.trim() }

  emit('submit', {
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    tipo: form.tipo,
    schema,
    ativo: form.ativo
  })
}
</script>
