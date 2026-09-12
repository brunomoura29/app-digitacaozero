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

        <div class="overflow-x-auto rounded-medium border border-shift3-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-shift3-border bg-shift3-bg-light text-xs uppercase tracking-wide text-shift3-text-muted">
                <th class="px-4 py-2 text-left font-semibold">Módulo</th>
                <th v-for="acao in ACOES_PERMISSAO" :key="acao.chave" class="px-4 py-2 text-center font-semibold">
                  {{ acao.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-shift3-border/60">
              <tr v-for="modulo in MODULOS_SISTEMA" :key="modulo.chave">
                <td class="px-4 py-3 font-medium text-shift3-text">{{ modulo.label }}</td>
                <td v-for="acao in ACOES_PERMISSAO" :key="acao.chave" class="px-4 py-3 text-center">
                  <input
                    v-model="form.permissoes[modulo.chave][acao.chave]"
                    type="checkbox"
                    class="h-4 w-4 cursor-pointer rounded border-shift3-input-border accent-shift3-green"
                  />
                </td>
              </tr>
            </tbody>
          </table>
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
import { ACOES_PERMISSAO, MODULOS_SISTEMA, permissaoModuloVazia } from '~/types/funcao'
import type { Funcao, FuncaoInput, PermissaoModulo } from '~/types/funcao'

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

function permissoesIniciais(): Record<string, PermissaoModulo> {
  const base: Record<string, PermissaoModulo> = {}
  for (const modulo of MODULOS_SISTEMA) {
    base[modulo.chave] = { ...permissaoModuloVazia(), ...props.funcao?.permissoes?.[modulo.chave] }
  }
  return base
}

const form = reactive<{ nome: string; descricao: string; permissoes: Record<string, PermissaoModulo> }>({
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
