<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="w-full max-w-xs">
      <BasePesquisa
        v-model="filtros.q"
        placeholder="Buscar por nome…"
        @search="carregar()"
      />
    </div>

    <!-- Situação -->
    <div class="inline-flex overflow-hidden rounded-default border border-shift3-input-border">
      <button
        v-for="opt in opcoes"
        :key="opt.valor"
        type="button"
        class="px-3 py-1.5 text-xs font-medium transition"
        :class="
          filtros.ativo === opt.valor
            ? 'bg-shift3-green/25 text-shift3-text'
            : 'text-shift3-text-secondary hover:bg-shift3-bg-light'
        "
        @click="selecionar(opt.valor)"
      >
        {{ opt.rotulo }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { filtros, carregar } = useClientes()

const opcoes = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' }
] as const

function selecionar(valor: (typeof opcoes)[number]['valor']) {
  filtros.value.ativo = valor
  carregar()
}
</script>
