<template>
  <div class="min-h-screen bg-shift3-bg-light">
    <header class="border-b border-shift3-border bg-shift3-bg-card">
      <div class="mx-auto flex max-w-5xl items-start justify-between gap-lg px-lg py-lg">
        <div>
          <h1>Design System — Shift3</h1>
          <p class="text-secondary">Tokens e componentes base do DigitacaoZero</p>
        </div>
        <BaseThemeToggle />
      </div>
    </header>

    <main class="mx-auto max-w-5xl space-y-2xl px-lg py-2xl">
      <!-- Cores -->
      <section class="space-y-lg">
        <h2>Paleta</h2>
        <div class="grid grid-cols-2 gap-lg sm:grid-cols-3 lg:grid-cols-4">
          <div v-for="c in swatches" :key="c.token" class="overflow-hidden rounded-medium border border-shift3-border bg-shift3-bg-card shadow-sm">
            <div class="h-16" :style="{ background: c.hex }" />
            <div class="p-md">
              <p class="font-mono text-xs text-shift3-text">{{ c.token }}</p>
              <p class="font-mono text-xs text-shift3-text-muted">{{ c.hex }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Botões -->
      <section class="space-y-lg">
        <h2>BaseButton</h2>
        <div class="flex flex-wrap items-center gap-md rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-sm">
          <BaseButton variant="primary">Primary</BaseButton>
          <BaseButton variant="secondary">Secondary</BaseButton>
          <BaseButton variant="accent" icon-left="heroicons:paper-airplane">Enviar</BaseButton>
          <BaseButton variant="danger" icon-left="heroicons:trash">Excluir</BaseButton>
          <BaseButton variant="ghost" icon-right="heroicons:arrow-right">Ghost</BaseButton>
          <BaseButton :loading="loading" @click="simularCarregamento">Com loading</BaseButton>
          <BaseButton size="sm">sm</BaseButton>
          <BaseButton size="lg">lg</BaseButton>
          <BaseButton disabled>Disabled</BaseButton>
        </div>
      </section>

      <!-- Inputs -->
      <section class="space-y-lg">
        <h2>BaseInput</h2>
        <div class="grid gap-lg rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-sm sm:grid-cols-2">
          <BaseInput v-model="form.nome" label="Nome" placeholder="Seu nome" icon="heroicons:user" />
          <BaseInput v-model="form.email" label="Email" type="email" placeholder="seu@email.com" icon="heroicons:envelope" hint="Usado para login" />
          <BaseInput v-model="form.senha" label="Senha" type="password" placeholder="••••••••" :error="form.senha && form.senha.length < 6 ? 'Mínimo 6 caracteres' : ''" />
          <BaseInput v-model="form.bloqueado" label="Desabilitado" disabled placeholder="—" />
        </div>
      </section>

      <!-- Pesquisa -->
      <section class="space-y-lg">
        <h2>BasePesquisa</h2>
        <div class="space-y-md rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-sm">
          <BasePesquisa v-model="busca" placeholder="Buscar extrações..." @search="onSearch" />
          <p class="text-xs text-shift3-text-muted">
            Último <code>@search</code>: <span class="font-mono text-shift3-text">{{ ultimaBusca || '—' }}</span>
          </p>
        </div>
      </section>

      <!-- Dropdown -->
      <section class="space-y-lg">
        <h2>BaseDropdown</h2>
        <div class="flex gap-md rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-sm">
          <BaseDropdown :items="acoes" align="left">
            <BaseButton variant="secondary" icon-right="heroicons:chevron-down">Ações</BaseButton>
          </BaseDropdown>
          <BaseDropdown :items="acoes" align="right">
            <BaseButton variant="ghost" icon-left="heroicons:ellipsis-vertical" />
          </BaseDropdown>
        </div>
      </section>

      <!-- Upload -->
      <section class="space-y-lg">
        <h2>BaseUpload</h2>
        <div class="space-y-md rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-sm">
          <BaseUpload
            v-model="arquivos"
            accept=".xlsx,.xls,.csv,.pdf,image/*"
            :max-size-mb="50"
            hint="XLSX, CSV, PDF ou imagem — até 50 MB"
            @add="processarArquivos"
            @reject="onReject"
          />
          <BaseButton
            v-if="arquivos.length"
            variant="ghost"
            size="sm"
            icon-left="heroicons:arrow-path"
            @click="processarArquivos(arquivos)"
          >
            Reprocessar
          </BaseButton>
        </div>
      </section>

      <!-- Toast -->
      <section class="space-y-lg">
        <h2>Toast — useToast()</h2>
        <div class="flex flex-wrap gap-md rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-sm">
          <BaseButton variant="accent" @click="toast.success('Extração aprovada com sucesso')">success</BaseButton>
          <BaseButton variant="danger" @click="toast.error('Falha ao enviar o arquivo', { title: 'Erro' })">error</BaseButton>
          <BaseButton variant="secondary" @click="toast.warning('Verifique os campos destacados')">warning</BaseButton>
          <BaseButton variant="primary" @click="toast.info('Processando 225 registros...')">info</BaseButton>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DropdownItem } from '~/components/BaseDropdown.vue'
import type { UploadFile } from '~/composables/useUpload'

const toast = useToast()

// ── BaseUpload (simula ler / processar / extrair) ──
const arquivos = ref<UploadFile[]>([])

async function processarArquivos(alvos: UploadFile[]) {
  await processUploads(
    alvos,
    async (item, setProgress) => {
      for (let p = 0; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 110))
        setProgress(p)
      }
      // etapa de "extração" (sem progresso determinado)
      await new Promise((r) => setTimeout(r, 800))
      if (item.name.toLowerCase().includes('erro')) throw new Error('formato não reconhecido')
    },
    { concurrency: 2 }
  )
  const ok = arquivos.value.filter((f) => f.status === 'done').length
  if (ok) toast.success(`${ok} arquivo(s) processado(s)`)
}

function onReject(items: { file: File; reason: string }[]) {
  items.forEach((i) => toast.error(`${i.file.name}: ${i.reason}`))
}

const loading = ref(false)
const simularCarregamento = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    toast.success('Pronto!')
  }, 1200)
}

const form = ref({ nome: '', email: '', senha: '', bloqueado: '' })

const busca = ref('')
const ultimaBusca = ref('')
const onSearch = (v: string) => {
  ultimaBusca.value = v
}

const acoes: DropdownItem[] = [
  { label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => toast.info('Editar') },
  { label: 'Exportar', icon: 'heroicons:arrow-down-tray', onClick: () => toast.info('Exportar') },
  { divider: true },
  { label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => toast.error('Excluído') }
]

const swatches = [
  { token: 'shift3-dark', hex: '#191E24' },
  { token: 'shift3-teal', hex: '#2D5F4F' },
  { token: 'shift3-green', hex: '#7FD7AB' },
  { token: 'shift3-bg-light', hex: '#F5F7FA' },
  { token: 'shift3-bg-card', hex: '#FFFFFF' },
  { token: 'shift3-border', hex: '#E8E8E8' },
  { token: 'shift3-text', hex: '#1A1A1A' },
  { token: 'shift3-text-secondary', hex: '#666666' },
  { token: 'shift3-text-muted', hex: '#999999' },
  { token: 'shift3-text-light', hex: '#A8B5C4' },
  { token: 'warning', hex: '#FFC107' },
  { token: 'danger', hex: '#FF6B6B' }
]
</script>
