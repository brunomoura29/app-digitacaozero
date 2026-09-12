<template>
  <div class="space-y-3">
    <BaseEmptyState
      v-if="!modelValue.length"
      icon="heroicons:list-bullet"
      title="Nenhum campo ainda"
      :description="`Adicione os campos que a extração deve preencher.`"
    />

    <div
      v-for="(campo, idx) in modelValue"
      :key="campo.id"
      class="flex flex-wrap items-end gap-3 rounded-medium border border-shift3-border bg-shift3-bg-light p-3"
    >
      <div class="min-w-[160px] flex-1">
        <BaseInput
          :model-value="campo.nome"
          label="Nome do campo"
          placeholder="Ex: Nome do cliente"
          @update:model-value="(v) => atualizar(idx, { nome: v })"
        />
      </div>

      <div class="w-36">
        <label class="mb-1 block text-sm font-medium text-shift3-text">Tipo</label>
        <select
          :value="campo.tipo"
          class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
          @change="(e) => atualizar(idx, { tipo: (e.target as HTMLSelectElement).value as TipoCampo })"
        >
          <option v-for="t in TIPOS_CAMPO" :key="t.valor" :value="t.valor">{{ t.label }}</option>
        </select>
      </div>

      <div class="min-w-[140px] flex-1">
        <BaseInput
          :model-value="campo.regex ?? ''"
          label="Regex (opcional)"
          placeholder="Validação opcional"
          @update:model-value="(v) => atualizar(idx, { regex: v || null })"
        />
      </div>

      <div class="flex items-center gap-2 pb-2.5">
        <BaseSwitch :model-value="campo.obrigatorio" @update:model-value="(v) => atualizar(idx, { obrigatorio: v })" />
        <span class="text-xs text-shift3-text-muted">Obrigatório</span>
      </div>

      <BaseButton
        type="button"
        variant="ghost"
        size="sm"
        icon-left="heroicons:trash"
        class="text-danger"
        @click="remover(idx)"
      />
    </div>

    <BaseButton type="button" variant="secondary" size="sm" icon-left="heroicons:plus" @click="adicionar">
      Adicionar campo
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { TIPOS_CAMPO } from '~/types/modelo'
import type { CampoSchema, TipoCampo } from '~/types/modelo'

const props = defineProps<{ modelValue: CampoSchema[] }>()
const emit = defineEmits<{ 'update:modelValue': [campos: CampoSchema[]] }>()

function adicionar() {
  const novoCampo: CampoSchema = {
    // id fixo desde a criação — nunca muda depois, senão o :key do v-for muda a
    // cada letra digitada e o Vue recria o <input>, tirando o foco a cada tecla.
    id: crypto.randomUUID(),
    nome: '',
    tipo: 'texto',
    obrigatorio: false,
    regex: null
  }
  emit('update:modelValue', [...props.modelValue, novoCampo])
}

function atualizar(idx: number, parcial: Partial<CampoSchema>) {
  const copia = props.modelValue.map((c, i) => (i === idx ? { ...c, ...parcial } : c))
  emit('update:modelValue', copia)
}

function remover(idx: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== idx))
}
</script>
