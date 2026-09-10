<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <header class="mb-6">
      <h1 class="text-2xl">Criar conta</h1>
      <p class="mt-1 text-sm text-shift3-text-secondary">Leva menos de um minuto.</p>
    </header>

    <BaseInput
      v-model="form.nome"
      label="Nome da empresa ou pessoa"
      placeholder="Ex.: Representações Silva"
      icon="heroicons:building-office-2"
      autocomplete="organization"
      required
      :error="errors.nome"
    />

    <BaseInput
      :model-value="form.telefone"
      type="tel"
      label="Telefone (WhatsApp)"
      placeholder="(11) 98765-4321"
      icon="heroicons:device-phone-mobile"
      autocomplete="tel"
      inputmode="tel"
      :maxlength="15"
      required
      :error="errors.telefone"
      @update:model-value="onTelefone"
    />

    <BaseInput
      v-model="form.email"
      type="email"
      label="E-mail"
      placeholder="voce@email.com"
      icon="heroicons:envelope"
      autocomplete="email"
      required
      :error="errors.email"
    />

    <BaseInput
      v-model="form.senha"
      label="Senha"
      placeholder="••••••••"
      icon="heroicons:lock-closed"
      autocomplete="new-password"
      revealable
      required
      hint="Mínimo 8 caracteres"
      :error="errors.senha"
    />

    <BaseInput
      v-model="form.confirmar"
      label="Confirmar senha"
      placeholder="••••••••"
      icon="heroicons:lock-closed"
      autocomplete="new-password"
      revealable
      required
      :error="errors.confirmar"
    />

    <BaseButton type="submit" variant="primary" block :loading="loading" icon-right="heroicons:arrow-right">
      Criar conta
    </BaseButton>

    <p class="text-center text-sm text-shift3-text-secondary">
      Já tem conta?
      <NuxtLink to="/login" class="font-semibold text-shift3-teal hover:underline">Entrar</NuxtLink>
    </p>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const toast = useToast()

const form = reactive({ nome: '', telefone: '', email: '', senha: '', confirmar: '' })
const errors = reactive<Record<keyof typeof form, string>>({
  nome: '',
  telefone: '',
  email: '',
  senha: '',
  confirmar: ''
})
const loading = ref(false)

const onlyDigits = (v: string) => v.replace(/\D/g, '')

/** Máscara de telefone BR — trava em 11 dígitos (máx. "(11) 98765-4321"). */
function onTelefone(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 2) form.telefone = d
  else if (d.length <= 6) form.telefone = `(${d.slice(0, 2)}) ${d.slice(2)}`
  else if (d.length <= 10) form.telefone = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  else form.telefone = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function validate() {
  errors.nome = form.nome.trim().length >= 2 ? '' : 'Informe o nome'
  const tel = onlyDigits(form.telefone).length
  errors.telefone = tel === 10 || tel === 11 ? '' : 'Informe DDD + número (10 ou 11 dígitos)'
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Informe um e-mail válido'
  errors.senha = form.senha.length >= 8 ? '' : 'Mínimo 8 caracteres'
  errors.confirmar = form.confirmar === form.senha ? '' : 'As senhas não conferem'
  return !Object.values(errors).some(Boolean)
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    const { precisaConfirmarEmail } = await auth.cadastrar({
      nome: form.nome,
      telefone: form.telefone,
      email: form.email,
      senha: form.senha
    })
    if (precisaConfirmarEmail) {
      toast.success('Conta criada! Confirme o e-mail para acessar.', { duration: 6000 })
      await navigateTo('/login')
    } else {
      toast.success('Conta criada!')
      await navigateTo('/')
    }
  } catch (e) {
    toast.error(
      e instanceof Error && /already registered|already exists/i.test(e.message)
        ? 'Este e-mail já está cadastrado'
        : 'Não foi possível criar a conta. Tente novamente.',
      { title: 'Erro no cadastro' }
    )
  } finally {
    loading.value = false
  }
}
</script>
