<template>
  <form id="vendedores-formulario" @submit.prevent="enviar">
    <!-- Conteúdo centralizado -->
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <!-- Instrução -->
      <p class="text-sm text-shift3-text-secondary">Preencha os dados do vendedor</p>

      <!-- ───── Dados principais ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Dados principais</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <BaseInput
              v-model="form.nome"
              label="Nome *"
              type="text"
              placeholder="Nome completo"
              icon="heroicons:user"
              required
              :error="erros.nome"
            />
          </div>
          <div class="sm:col-span-2 flex items-end pb-2">
            <BaseSwitch v-model="form.ativo" :label="form.ativo ? 'Ativo' : 'Inativo'" />
          </div>
        </div>
      </section>

      <!-- ───── Contato ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Contato</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="form.email"
            label="E-mail"
            type="email"
            placeholder="email@empresa.com"
            icon="heroicons:envelope"
            :error="erros.email"
          />
          <BaseInput
            :model-value="form.telefone"
            label="Telefone"
            type="tel"
            placeholder="(11) 98765-4321"
            icon="heroicons:device-phone-mobile"
            inputmode="tel"
            :maxlength="15"
            :error="erros.telefone"
            @update:model-value="(v) => (form.telefone = maskTel(v))"
          />
        </div>
      </section>

      <!-- ───── Acesso ao sistema ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Acesso ao sistema</p>

        <!-- já tem login: mostra status + troca de função + remover -->
        <div v-if="acesso" class="space-y-4">
          <div class="flex items-center gap-2 rounded-medium border border-shift3-border bg-shift3-bg-light px-4 py-3">
            <Icon name="heroicons:check-circle-solid" class="h-5 w-5 text-success" />
            <span class="text-sm text-shift3-text">Acesso ativo</span>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-shift3-text">Função</label>
              <select
                v-model="acessoForm.funcaoId"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
              >
                <option :value="null">Sem função (sem acesso a módulos)</option>
                <option v-for="f in funcoes.itens.value" :key="f.id" :value="f.id">{{ f.nome }}</option>
              </select>
            </div>
            <div class="flex items-end">
              <BaseButton type="button" variant="danger" size="sm" icon-left="heroicons:trash" @click="confirmarRemocao = true">
                Remover acesso
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- ainda não tem login: opção de criar -->
        <div v-else class="space-y-4">
          <BaseSwitch v-model="criarAcessoAtivo" label="Criar acesso ao sistema (login e senha)" />

          <div v-if="criarAcessoAtivo" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              v-model="acessoForm.email"
              label="E-mail de acesso *"
              type="email"
              placeholder="email@empresa.com"
              icon="heroicons:envelope"
              :error="erros.acessoEmail"
            />
            <BaseInput
              v-model="acessoForm.senha"
              label="Senha *"
              type="password"
              revealable
              placeholder="Mínimo 6 caracteres"
              icon="heroicons:lock-closed"
              :error="erros.acessoSenha"
            />
            <div class="sm:col-span-2">
              <label class="mb-1 block text-sm font-medium text-shift3-text">Função</label>
              <select
                v-model="acessoForm.funcaoId"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
              >
                <option :value="null">Sem função (sem acesso a módulos)</option>
                <option v-for="f in funcoes.itens.value" :key="f.id" :value="f.id">{{ f.nome }}</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>

    <BaseConfirmDialog
      v-model="confirmarRemocao"
      title="Remover acesso?"
      message="O vendedor não vai mais conseguir entrar no sistema com este login."
      confirm-label="Remover"
      danger
      @confirm="emit('remover-acesso')"
    />

    <!-- ───── Ações — teleportadas pra barra fixa do layout ───── -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
          <div class="mx-auto flex max-w-3xl items-center gap-3">
            <BaseButton
              type="submit"
              form="vendedores-formulario"
              variant="primary"
              :loading="salvando"
              icon-left="heroicons:check"
            >
              {{ modo === 'novo' ? 'Criar vendedor' : 'Salvar alterações' }}
            </BaseButton>
            <BaseButton type="button" variant="ghost" @click="$emit('cancelar')">Cancelar</BaseButton>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { AcessoVendedor, Vendedor, VendedorInput } from '~/types/vendedor'

/** O que fazer com o acesso ao salvar o formulário. */
export type AcessoAcaoSubmit =
  | { tipo: 'nenhum' }
  | { tipo: 'criar'; email: string; senha: string; funcaoId: string | null }
  | { tipo: 'atualizar-funcao'; funcaoId: string | null }

interface Props {
  modo: 'novo' | 'editar'
  vendedor?: Vendedor
  /** Login atual do vendedor, se já existir (undefined = ainda carregando). */
  acesso?: AcessoVendedor | null
  salvando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  acesso: null,
  salvando: false
})

const emit = defineEmits<{
  submit: [dados: VendedorInput, acesso: AcessoAcaoSubmit]
  cancelar: []
  'remover-acesso': []
}>()

const funcoes = useFuncoes()
onMounted(() => funcoes.carregar())

const criarAcessoAtivo = ref(false)
const confirmarRemocao = ref(false)

const acessoForm = reactive<{ email: string; senha: string; funcaoId: string | null }>({
  email: props.vendedor?.email ?? '',
  senha: '',
  funcaoId: props.acesso?.funcao_id ?? null
})

const form = reactive<{
  nome: string
  email: string
  telefone: string
  ativo: boolean
}>({
  nome: (props.vendedor?.nome ?? '') as string,
  email: (props.vendedor?.email ?? '') as string,
  telefone: (props.vendedor?.telefone ?? '') as string,
  ativo: props.vendedor?.ativo ?? true
})

const erros = reactive<{
  nome?: string
  email?: string
  telefone?: string
  acessoEmail?: string
  acessoSenha?: string
}>({})

const soDigitos = (v: string) => v.replace(/\D/g, '')

function maskTel(v: string) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function validar(campo: string) {
  const val = form[campo as keyof typeof form]

  if (campo === 'nome') {
    if (!val || (val as string).trim().length === 0) {
      erros[campo] = 'Nome é obrigatório'
    } else if ((val as string).length > 100) {
      erros[campo] = 'Nome não pode ter mais de 100 caracteres'
    } else {
      delete erros[campo]
    }
  }

  if (campo === 'email') {
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val as string)) {
      erros[campo] = 'E-mail inválido'
    } else {
      delete erros[campo]
    }
  }

  if (campo === 'telefone') {
    if (val && (val as string).replace(/\D/g, '').length < 10) {
      erros[campo] = 'Telefone inválido (mínimo 10 dígitos)'
    } else {
      delete erros[campo]
    }
  }
}

function validarAcesso() {
  if (!criarAcessoAtivo.value) {
    delete erros.acessoEmail
    delete erros.acessoSenha
    return
  }

  if (!acessoForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acessoForm.email)) {
    erros.acessoEmail = 'E-mail inválido'
  } else {
    delete erros.acessoEmail
  }

  if (!acessoForm.senha || acessoForm.senha.length < 6) {
    erros.acessoSenha = 'Mínimo 6 caracteres'
  } else {
    delete erros.acessoSenha
  }
}

function enviar() {
  validar('nome')
  validar('email')
  validar('telefone')
  validarAcesso()

  if (Object.keys(erros).length > 0) return

  let acao: AcessoAcaoSubmit = { tipo: 'nenhum' }
  if (props.acesso) {
    if (acessoForm.funcaoId !== props.acesso.funcao_id) {
      acao = { tipo: 'atualizar-funcao', funcaoId: acessoForm.funcaoId }
    }
  } else if (criarAcessoAtivo.value) {
    acao = { tipo: 'criar', email: acessoForm.email.trim(), senha: acessoForm.senha, funcaoId: acessoForm.funcaoId }
  }

  emit(
    'submit',
    {
      nome: form.nome.trim(),
      email: form.email.trim() || null,
      telefone: form.telefone ? soDigitos(form.telefone) : null,
      ativo: form.ativo
    },
    acao
  )
}
</script>
