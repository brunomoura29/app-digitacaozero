<template>
  <form id="funcoes-formulario" @submit.prevent="enviar">
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <p class="text-sm text-shift3-text-secondary">Defina o nome e o que essa função pode acessar no sistema</p>

      <!-- ───── Dados principais ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Dados principais</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="form.nome"
            label="Nome *"
            type="text"
            placeholder="Ex: Vendedor externo"
            icon="heroicons:identification"
            required
            :error="erros.nome"
          />
          <BaseInput
            v-model="form.descricao"
            label="Descrição"
            type="text"
            placeholder="Opcional"
            icon="heroicons:pencil"
          />
        </div>
      </section>

      <!-- ───── Acessos ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Acessos por módulo</p>

        <div class="divide-y divide-shift3-border/60 rounded-medium border border-shift3-border">
          <div
            v-for="modulo in MODULOS_SISTEMA"
            :key="modulo.chave"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span class="text-sm font-medium text-shift3-text">{{ modulo.label }}</span>

            <div class="inline-flex shrink-0 rounded-pill border border-shift3-border bg-shift3-bg-light p-0.5">
              <button
                v-for="opcao in OPCOES_NIVEL"
                :key="opcao.valor"
                type="button"
                class="rounded-pill px-3 py-1 text-xs font-medium transition"
                :class="
                  form.permissoes[modulo.chave] === opcao.valor
                    ? 'bg-shift3-green/25 font-semibold text-shift3-teal'
                    : 'text-shift3-text-secondary hover:text-shift3-text'
                "
                @click="form.permissoes[modulo.chave] = opcao.valor"
              >
                {{ opcao.label }}
              </button>
            </div>
          </div>
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
              form="funcoes-formulario"
              variant="primary"
              :loading="salvando"
              icon-left="heroicons:check"
            >
              {{ modo === 'novo' ? 'Criar função' : 'Salvar alterações' }}
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
import { MODULOS_SISTEMA } from '~/types/funcao'
import type { Funcao, FuncaoInput, NivelPermissao } from '~/types/funcao'

const OPCOES_NIVEL: { valor: NivelPermissao; label: string }[] = [
  { valor: 'nenhum', label: 'Nenhum' },
  { valor: 'ver', label: 'Ver' },
  { valor: 'editar', label: 'Editar' }
]

interface Props {
  modo: 'novo' | 'editar'
  funcao?: Funcao
  salvando?: boolean
}

const props = withDefaults(defineProps<Props>(), { salvando: false })

const emit = defineEmits<{
  submit: [dados: FuncaoInput]
  cancelar: []
}>()

function permissoesIniciais(): Record<string, NivelPermissao> {
  const base: Record<string, NivelPermissao> = {}
  for (const modulo of MODULOS_SISTEMA) {
    base[modulo.chave] = props.funcao?.permissoes?.[modulo.chave] ?? 'nenhum'
  }
  return base
}

const form = reactive<{ nome: string; descricao: string; permissoes: Record<string, NivelPermissao> }>({
  nome: props.funcao?.nome ?? '',
  descricao: props.funcao?.descricao ?? '',
  permissoes: permissoesIniciais()
})

const erros = reactive<{ nome?: string }>({})

function validar() {
  if (!form.nome.trim()) {
    erros.nome = 'Nome é obrigatório'
  } else {
    delete erros.nome
  }
}

function enviar() {
  validar()
  if (Object.keys(erros).length === 0) {
    emit('submit', {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      permissoes: form.permissoes
    })
  }
}
</script>
