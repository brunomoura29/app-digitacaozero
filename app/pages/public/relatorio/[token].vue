<template>
  <div class="min-h-screen bg-shift3-bg-light">
    <!-- ───── Senha ───── -->
    <div v-if="!relatorio" class="flex min-h-screen items-center justify-center p-4">
      <form
        class="w-full max-w-sm rounded-medium border border-shift3-border bg-shift3-bg-card p-6 shadow-lg"
        @submit.prevent="entrar(senha)"
      >
        <span class="grid h-12 w-12 place-items-center rounded-default bg-shift3-green/20 text-shift3-teal dark:text-shift3-green">
          <Icon name="heroicons:lock-closed" class="h-6 w-6" />
        </span>
        <h2 class="mt-4">Relatório protegido</h2>
        <p class="mt-1 text-sm text-shift3-text-secondary">Digite a senha que você recebeu junto com este link.</p>

        <BaseInput
          v-model="senha"
          class="mt-5"
          label="Senha"
          placeholder="XXX-XXX-XXX"
          icon="heroicons:key"
          autocomplete="off"
          :error="erro"
          :disabled="entrando"
        />
        <BaseButton type="submit" variant="primary" block class="mt-4" :loading="entrando" :disabled="!senha.trim()">
          Abrir relatório
        </BaseButton>
      </form>
    </div>

    <!-- ───── Painel ───── -->
    <template v-else>
      <header class="border-b border-shift3-border bg-shift3-bg-card">
        <div class="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <img
            v-if="relatorio.empresa.logo_url"
            :src="relatorio.empresa.logo_url"
            alt=""
            class="h-9 max-w-[140px] shrink-0 object-contain"
          />
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-[18px]">{{ relatorio.nome }}</h1>
            <p class="truncate text-xs text-shift3-text-secondary">
              {{ [relatorio.empresa.nome, relatorio.cliente].filter(Boolean).join(' · ') }}
            </p>
          </div>
          <p class="hidden text-xs text-shift3-text-muted sm:block">Atualizado às {{ atualizadoEm }}</p>
          <BaseButton variant="ghost" size="sm" icon-left="heroicons:arrow-path" :loading="entrando" @click="entrar(senhaAceita)">
            Atualizar
          </BaseButton>
          <BaseThemeToggle />
        </div>
      </header>

      <main class="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        <BaseEmptyState
          v-if="!relatorio.dados.pedidos.length"
          icon="heroicons:inbox"
          title="Ainda não há dados"
          description="Assim que houver pedidos no seu nome, eles aparecem aqui automaticamente."
        />
        <RelatoriosPainel v-else :definicao="relatorio.definicao" :dados="relatorio.dados" />
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { DadosRelatorio, DefinicaoRelatorio } from '#shared/utils/relatorios'

definePageMeta({ layout: 'default', title: 'Relatório' })
const tituloDaAba = ref('Relatório')
useHead({ title: tituloDaAba, meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

interface RelatorioPublico {
  nome: string
  descricao: string | null
  empresa: { nome: string | null; logo_url: string | null }
  cliente: string | null
  definicao: DefinicaoRelatorio
  dados: DadosRelatorio
}

const token = useRoute().params.token as string
// a senha fica só nesta aba (some ao fechar) — poupa redigitar ao recarregar a página
const CHAVE_SESSAO = `dz-relatorio-${token}`

const relatorio = ref<RelatorioPublico | null>(null)
const senha = ref('')
const senhaAceita = ref('')
const entrando = ref(false)
const erro = ref('')
const atualizadoEm = ref('')

async function entrar(tentativa: string, silencioso = false) {
  if (!tentativa.trim() || entrando.value) return
  entrando.value = true
  erro.value = ''
  try {
    relatorio.value = await $fetch<RelatorioPublico>('/api/relatorios/publico', {
      method: 'POST',
      body: { token, senha: tentativa }
    })
    senhaAceita.value = tentativa
    atualizadoEm.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    tituloDaAba.value = relatorio.value.nome
    try {
      sessionStorage.setItem(CHAVE_SESSAO, tentativa)
    } catch {
      // aba sem armazenamento (modo restrito): só vai pedir a senha de novo ao recarregar
    }
  } catch (e: any) {
    // senha trocada ou acesso bloqueado depois de aberto: volta pra tela de senha
    relatorio.value = null
    try {
      sessionStorage.removeItem(CHAVE_SESSAO)
    } catch {
      // idem acima
    }
    if (!silencioso) {
      erro.value = e?.statusCode === 401 || e?.status === 401 ? 'Link ou senha inválidos.' : 'Não foi possível abrir o relatório. Tente de novo.'
    }
  } finally {
    entrando.value = false
  }
}

onMounted(() => {
  let guardada = ''
  try {
    guardada = sessionStorage.getItem(CHAVE_SESSAO) ?? ''
  } catch {
    // sem armazenamento: segue pedindo a senha
  }
  if (guardada) entrar(guardada, true)
})
</script>
