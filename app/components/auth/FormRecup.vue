<template>
  <div>
    <!-- Estado: enviado -->
    <div v-if="enviado" class="space-y-4 text-center">
      <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-shift3-green/20 text-shift3-teal">
        <Icon name="heroicons:envelope-open" class="h-6 w-6" />
      </span>
      <div>
        <h1 class="text-2xl">Verifique seu e-mail</h1>
        <p class="mt-2 text-sm text-shift3-text-secondary">
          Se existe uma conta para <span class="font-medium text-shift3-text">{{ form.email }}</span>,
          enviamos um link para redefinir a senha.
        </p>
      </div>
      <BaseButton to="/login" variant="secondary" block icon-left="heroicons:arrow-left">
        Voltar para o login
      </BaseButton>
    </div>

    <!-- Estado: formulário -->
    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <header class="mb-6">
        <h1 class="text-2xl">Recuperar senha</h1>
        <p class="mt-1 text-sm text-shift3-text-secondary">
          Enviaremos um link para você redefinir a senha.
        </p>
      </header>

      <BaseInput
        v-model="form.email"
        type="email"
        label="E-mail"
        placeholder="voce@email.com"
        icon="heroicons:envelope"
        autocomplete="email"
        required
        :error="error"
      />

      <BaseButton type="submit" variant="primary" block :loading="loading" icon-right="heroicons:paper-airplane">
        Enviar link
      </BaseButton>

      <p class="text-center text-sm text-shift3-text-secondary">
        Lembrou a senha?
        <NuxtLink to="/login" class="font-semibold text-shift3-teal hover:underline">Entrar</NuxtLink>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

const supabase = useSupabaseClient()
const toast = useToast()

const form = reactive({ email: '' })
const error = ref('')
const loading = ref(false)
const enviado = ref(false)

async function onSubmit() {
  error.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Informe um e-mail válido'
  if (error.value) return

  loading.value = true
  try {
    const redirectTo = import.meta.client ? `${window.location.origin}/redefinir-senha` : undefined
    const { error: err } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo })
    if (err) throw err
    enviado.value = true
  } catch {
    toast.error('Não foi possível enviar o e-mail. Tente novamente.', { title: 'Erro' })
  } finally {
    loading.value = false
  }
}
</script>
