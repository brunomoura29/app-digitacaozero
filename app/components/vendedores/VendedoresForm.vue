<template>
  <form id="vendedores-formulario" @submit.prevent="enviar">
    <!-- Conteúdo centralizado -->
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <!-- Instrução -->
      <p class="text-sm text-shift3-text-secondary">Preencha os dados do vendedor</p>

      <!-- ───── Dados principais ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Dados principais</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <BaseInput
              v-model="form.nome"
              label="Nome *"
              type="text"
              placeholder="Nome completo"
              icon="heroicons:user"
              required
              :error="erros.nome"
            />
          </div>
          <div class="sm:col-span-2 flex items-end pb-2">
            <BaseSwitch v-model="form.ativo" :label="form.ativo ? 'Ativo' : 'Inativo'" />
          </div>
        </div>
      </section>

      <!-- ───── Contato ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Contato</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="form.email"
            label="E-mail"
            type="email"
            placeholder="email@empresa.com"
            icon="heroicons:envelope"
            :error="erros.email"
          />
          <BaseInput
            :model-value="form.telefone"
            label="Telefone"
            type="tel"
            placeholder="(11) 98765-4321"
            icon="heroicons:device-phone-mobile"
            inputmode="tel"
            :maxlength="15"
            :error="erros.telefone"
            @update:model-value="(v) => (form.telefone = maskTel(v))"
          />
        </div>
      </section>
    </div>

    <!-- ───── Ações — teleportadas pra barra fixa do layout ───── -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
          <div class="mx-auto flex max-w-3xl items-center gap-3">
            <BaseButton
              type="submit"
              form="vendedores-formulario"
              variant="primary"
              :loading="carregando"
              icon-left="heroicons:check"
            >
              {{ modo === 'criar' ? 'Criar vendedor' : 'Salvar alterações' }}
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
import type { VendedorInput } from '~/types/vendedor'

interface Props {
  inicial?: Partial<VendedorInput>
  modo?: 'criar' | 'editar'
  carregando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modo: 'criar',
  carregando: false
})

const emit = defineEmits<{
  enviar: [dados: VendedorInput]
  cancelar: []
}>()

const form = reactive<{
  nome: string
  email: string
  telefone: string
  ativo: boolean
}>({
  nome: props.inicial?.nome ?? '',
  email: props.inicial?.email ?? '',
  telefone: props.inicial?.telefone ?? '',
  ativo: props.inicial?.ativo ?? true
})

const erros = reactive<{ nome?: string; email?: string; telefone?: string }>({})

const soDigitos = (v: string) => v.replace(/\D/g, '')

function maskTel(v: string) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function validar(campo: string) {
  const val = form[campo as keyof typeof form]

  if (campo === 'nome') {
    if (!val || (val as string).trim().length === 0) {
      erros[campo] = 'Nome é obrigatório'
    } else if ((val as string).length > 100) {
      erros[campo] = 'Nome não pode ter mais de 100 caracteres'
    } else {
      delete erros[campo]
    }
  }

  if (campo === 'email') {
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val as string)) {
      erros[campo] = 'E-mail inválido'
    } else {
      delete erros[campo]
    }
  }

  if (campo === 'telefone') {
    if (val && (val as string).replace(/\D/g, '').length < 10) {
      erros[campo] = 'Telefone inválido (mínimo 10 dígitos)'
    } else {
      delete erros[campo]
    }
  }
}

function enviar() {
  validar('nome')
  validar('email')
  validar('telefone')

  if (Object.keys(erros).length === 0) {
    emit('enviar', {
      nome: form.nome.trim(),
      email: form.email.trim() || null,
      telefone: form.telefone ? soDigitos(form.telefone) : null,
      ativo: form.ativo
    })
  }
}
</script>
