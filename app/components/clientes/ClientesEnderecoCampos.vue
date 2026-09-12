<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
    <div class="sm:col-span-2">
      <BaseInput
        :model-value="modelValue.cep ?? ''"
        label="CEP"
        placeholder="00000-000"
        icon="heroicons:map-pin"
        inputmode="numeric"
        :maxlength="9"
        @update:model-value="(v) => set('cep', maskCep(v))"
      />
    </div>

    <div class="sm:col-span-4">
      <BaseInput
        :model-value="modelValue.logradouro ?? ''"
        label="Logradouro"
        placeholder="Rua / Avenida"
        @update:model-value="(v) => set('logradouro', v)"
      />
    </div>

    <div class="sm:col-span-1">
      <BaseInput
        :model-value="modelValue.numero ?? ''"
        label="Número"
        placeholder="123"
        @update:model-value="(v) => set('numero', v)"
      />
    </div>

    <div class="sm:col-span-2">
      <BaseInput
        :model-value="modelValue.complemento ?? ''"
        label="Complemento"
        placeholder="Sala, bloco…"
        @update:model-value="(v) => set('complemento', v)"
      />
    </div>

    <div class="sm:col-span-3">
      <BaseInput
        :model-value="modelValue.bairro ?? ''"
        label="Bairro"
        @update:model-value="(v) => set('bairro', v)"
      />
    </div>

    <div class="sm:col-span-4">
      <BaseInput
        :model-value="modelValue.cidade ?? ''"
        label="Cidade"
        @update:model-value="(v) => set('cidade', v)"
      />
    </div>

    <div class="sm:col-span-2">
      <BaseInput
        :model-value="modelValue.uf ?? ''"
        label="UF"
        placeholder="SP"
        :maxlength="2"
        @update:model-value="(v) => set('uf', v.toUpperCase())"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Endereco } from '~/types/cliente'

const props = withDefaults(defineProps<{ modelValue?: Endereco }>(), {
  modelValue: () => ({})
})
const emit = defineEmits<{ 'update:modelValue': [value: Endereco] }>()

function set(campo: keyof Endereco, valor: string) {
  emit('update:modelValue', { ...props.modelValue, [campo]: valor })
}

function maskCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}
</script>
