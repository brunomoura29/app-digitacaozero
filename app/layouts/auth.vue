<template>
  <div class="flex min-h-screen bg-shift3-bg-card">
    <!-- ── Painel de marca (esconde no mobile) ── -->
    <aside
      class="relative hidden w-1/2 overflow-hidden bg-shift3-dark text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
    >
      <!-- gradiente + formas decorativas -->
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-shift3-dark via-shift3-dark to-shift3-teal" />
      <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-shift3-green/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-32 right-16 h-[28rem] w-[28rem] rounded-full bg-shift3-green/5" />

      <!-- logo -->
      <div class="relative flex items-center gap-2.5">
        <span class="grid h-9 w-9 place-items-center rounded-medium bg-white/10 text-shift3-green ring-1 ring-white/15">
          <Icon name="heroicons:bolt" class="h-5 w-5" />
        </span>
        <div class="leading-tight">
          <p class="text-[15px] font-bold tracking-tight">DigitacaoZero</p>
          <p class="text-xs text-white/60">Extração Inteligente de Dados</p>
        </div>
      </div>

      <!-- headline + stats -->
      <div class="relative max-w-lg">
        <h1 class="text-[34px] font-bold leading-[1.15] text-white xl:text-[40px]">
          Da foto do pedido à<br />ordem de compra<br />em minutos.
        </h1>
        <p class="mt-4 text-sm leading-relaxed text-white/70">
          Plataforma SaaS para representantes comerciais. Extraia dados de fotos, PDFs
          e planilhas, valide e envie a OC por WhatsApp — sem redigitar nada.
        </p>

        <div class="mt-8 grid grid-cols-3 gap-3">
          <div
            v-for="s in stats"
            :key="s.label"
            class="rounded-medium bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-sm"
          >
            <p class="text-lg font-bold text-white">{{ s.value }}</p>
            <p class="mt-0.5 text-[11px] text-white/60">{{ s.label }}</p>
          </div>
        </div>
      </div>

      <p class="relative text-xs text-white/40">
        © {{ new Date().getFullYear() }} DigitacaoZero · Todos os direitos reservados.
      </p>
    </aside>

    <!-- ── Área do formulário ── -->
    <main class="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
      <div class="absolute right-5 top-5">
        <BaseThemeToggle />
      </div>

      <div class="w-full max-w-sm">
        <slot />
      </div>

      <p class="absolute bottom-5 text-xs text-shift3-text-muted">DigitacaoZero · v1.0</p>
    </main>
  </div>
</template>

<script setup lang="ts">
const stats = [
  { value: '90%+', label: 'menos digitação' },
  { value: '< 30s', label: 'por documento' },
  { value: 'XLSX · PDF · Foto', label: 'formatos aceitos' }
]
</script>
