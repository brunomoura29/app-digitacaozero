<template>
  <form id="cliente-formulario" @submit.prevent="onSubmit">
    <!-- Conteúdo centralizado -->
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
    <!-- ───── Dados principais ───── -->
    <section class="space-y-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Dados principais</p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <div class="sm:col-span-4">
          <BaseInput
            v-model="form.nome"
            label="Nome / Razão social"
            placeholder="Nome do cliente"
            icon="heroicons:user"
            required
            :error="errors.nome"
          />
        </div>
        <div class="sm:col-span-2 flex items-end pb-2">
          <BaseSwitch v-model="form.ativo" :label="form.ativo ? 'Ativo' : 'Inativo'" />
        </div>

        <div class="sm:col-span-3">
          <BaseInput
            :model-value="form.documento"
            label="CNPJ / CPF"
            placeholder="00.000.000/0000-00"
            icon="heroicons:identification"
            inputmode="numeric"
            :maxlength="18"
            hint="Só números — a máscara é automática"
            @update:model-value="(v) => (form.documento = maskDoc(v))"
          />
        </div>
        <div class="sm:col-span-3">
          <BaseInput
            v-model="form.inscricao_estadual"
            label="Inscrição estadual"
            placeholder="Isento / número"
          />
        </div>
      </div>
    </section>

    <!-- ───── Contato ───── -->
    <section class="space-y-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Contato</p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="form.email"
          type="email"
          label="E-mail"
          placeholder="cliente@email.com"
          icon="heroicons:envelope"
          :error="errors.email"
        />
        <BaseInput
          :model-value="form.telefone"
          type="tel"
          label="Telefone (WhatsApp)"
          placeholder="(11) 98765-4321"
          icon="heroicons:device-phone-mobile"
          inputmode="tel"
          :maxlength="15"
          @update:model-value="(v) => (form.telefone = maskTel(v))"
        />
      </div>
    </section>

    <!-- ───── Endereço ───── -->
    <section class="space-y-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Endereço</p>
      <ClientesEnderecoCampos v-model="form.endereco" />
    </section>

    <!-- ───── Observações ───── -->
    <section class="space-y-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Observações</p>
      <VendedoresVendedorPicker v-model="form.vendedor_id" />
      <BaseTextarea
        v-model="form.observacoes"
        placeholder="Anotações internas sobre o cliente…"
        :rows="4"
      />
    </section>
    </div>

    <!-- ───── Ações — teleportadas pra barra fixa do layout (dashboard.vue) ─────
         O botão de submit usa form="cliente-formulario" pra continuar disparando
         o @submit mesmo estando fora da árvore do <form> no DOM. -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
          <div class="mx-auto flex max-w-3xl items-center gap-3">
            <BaseButton
              type="submit"
              form="cliente-formulario"
              variant="primary"
              :loading="salvando"
              icon-left="heroicons:check"
            >
              {{ modo === 'editar' ? 'Salvar alterações' : 'Cadastrar cliente' }}
            </BaseButton>
            <BaseButton type="button" variant="ghost" @click="emit('cancelar')">Cancelar</BaseButton>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Cliente, ClienteInput } from '~/types/cliente'

const props = withDefaults(
  defineProps<{
    cliente?: Cliente | null
    salvando?: boolean
    modo?: 'novo' | 'editar'
  }>(),
  { cliente: null, salvando: false, modo: 'novo' }
)

const emit = defineEmits<{
  submit: [payload: ClienteInput]
  cancelar: []
}>()

function branco() {
  return {
    nome: '',
    documento: '',
    inscricao_estadual: '',
    email: '',
    telefone: '',
    vendedor_id: null as string | null,
    endereco: {} as ClienteInput['endereco'],
    observacoes: '',
    ativo: true
  }
}

const form = reactive(branco())
const errors = reactive<{ nome?: string; email?: string }>({})

const soDigitos = (v: string) => v.replace(/\D/g, '')

function maskDoc(v: string) {
  const d = soDigitos(v).slice(0, 14)
  if (d.length <= 11) {
    // CPF 000.000.000-00
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  // CNPJ 00.000.000/0000-00
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskTel(v: string) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Preenche o formulário quando o cliente chega (edição) — precisa vir DEPOIS
// de maskDoc/maskTel/soDigitos estarem definidos (o watch immediate roda
// de forma síncrona já durante o setup).
watch(
  () => props.cliente,
  (c) => {
    if (!c) return
    Object.assign(form, {
      nome: c.nome ?? '',
      documento: maskDoc(c.documento ?? ''),
      inscricao_estadual: c.inscricao_estadual ?? '',
      email: c.email ?? '',
      telefone: maskTel(c.telefone ?? ''),
      vendedor_id: c.vendedor_id ?? null,
      endereco: { ...(c.endereco ?? {}) },
      observacoes: c.observacoes ?? '',
      ativo: c.ativo
    })
  },
  { immediate: true }
)

const limpo = (v: string) => {
  const t = v.trim()
  return t === '' ? null : t
}

function onSubmit() {
  errors.nome = form.nome.trim().length >= 2 ? '' : 'Informe o nome do cliente'
  errors.email =
    !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'E-mail inválido'
  if (errors.nome || errors.email) return

  const endereco = Object.fromEntries(
    Object.entries(form.endereco).filter(([, val]) => (val ?? '').toString().trim() !== '')
  )

  emit('submit', {
    nome: form.nome.trim(),
    documento: form.documento ? soDigitos(form.documento) : null,
    inscricao_estadual: limpo(form.inscricao_estadual),
    email: limpo(form.email),
    telefone: form.telefone ? soDigitos(form.telefone) : null,
    vendedor_id: form.vendedor_id,
    endereco,
    observacoes: limpo(form.observacoes),
    ativo: form.ativo
  })
}
</script>
