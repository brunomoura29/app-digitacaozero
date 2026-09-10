<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <header class="mb-6">
      <h1 class="text-2xl">Bem-vindo de volta</h1>
      <p class="mt-1 text-sm text-shift3-text-secondary">Faça login para acessar o painel.</p>
    </header>

    <BaseInput
      v-model="form.email"
      type="email"
      label="E-mail"
      placeholder="voce@email.com"
      icon="heroicons:envelope"
      autocomplete="username"
      required
      :error="errors.email"
    />

    <div>
      <BaseInput
        v-model="form.senha"
        label="Senha"
        placeholder="••••••••"
        icon="heroicons:lock-closed"
        autocomplete="current-password"
        revealable
        required
        :error="errors.senha"
      />
      <div class="mt-1.5 text-right">
        <NuxtLink to="/recuperar-senha" class="text-xs font-medium text-shift3-teal hover:underline">
          Esqueceu a senha?
        </NuxtLink>
      </div>
    </div>

    <BaseButton type="submit" variant="primary" block :loading="loading" icon-right="heroicons:arrow-right">
      Entrar
    </BaseButton>

    <div class="my-5 flex items-center gap-3 text-xs text-shift3-text-muted">
      <span class="h-px flex-1 bg-shift3-border" />
      ou
      <span class="h-px flex-1 bg-shift3-border" />
    </div>

    <p class="text-center text-sm text-shift3-text-secondary">
      Ainda não tem conta?
      <NuxtLink to="/cadastro" class="font-semibold text-shift3-teal hover:underline">Criar conta</NuxtLink>
    </p>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const toast = useToast()

const form = reactive({ email: '', senha: '' })
const errors = reactive<{ email?: string; senha?: string }>({})
const loading = ref(false)

function validate() {
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Informe um e-mail válido'
  errors.senha = form.senha ? '' : 'Informe a senha'
  return !errors.email && !errors.senha
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    await auth.entrar(form.email, form.senha)
    toast.success('Bem-vindo de volta!')
    const destino = (route.query.redirect as string) || '/'
    await navigateTo(destino)
  } catch (e) {
    toast.error(
      e instanceof Error && /invalid login/i.test(e.message)
        ? 'E-mail ou senha inválidos'
        : 'Não foi possível entrar. Tente novamente.',
      { title: 'Erro no login' }
    )
  } finally {
    loading.value = false
  }
}
</script>
