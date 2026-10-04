<template>
  <form id="configuracoes-formulario" @submit.prevent="salvar">
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <div v-if="carregando" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
        <BaseSpinner size="md" /> Carregando…
      </div>

      <BaseEmptyState
        v-else-if="!empresaId"
        icon="heroicons:exclamation-triangle"
        title="Não foi possível carregar os dados da empresa"
      />

      <template v-else>
        <!-- ───── Logomarca ───── -->
        <section class="space-y-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Logomarca</p>

          <div class="flex flex-wrap items-center gap-5 rounded-medium border border-shift3-border p-4">
            <!-- prévia sempre em fundo claro, como no papel da Ordem de Compra -->
            <div
              class="papel flex h-24 w-44 shrink-0 items-center justify-center rounded-medium border border-dashed border-shift3-input-border bg-shift3-bg-card p-3"
            >
              <img v-if="form.logo_url" :src="form.logo_url" alt="Logomarca" class="max-h-full max-w-full object-contain" />
              <Icon v-else name="heroicons:photo" class="h-8 w-8 text-shift3-text-muted" />
            </div>

            <div class="min-w-0 flex-1 space-y-2">
              <p class="text-sm text-shift3-text-secondary">
                Aparece no cabeçalho da Ordem de Compra — no link enviado ao cliente e no PDF.
              </p>
              <div class="flex flex-wrap gap-2">
                <BaseButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon-left="heroicons:arrow-up-tray"
                  :loading="enviandoLogo"
                  @click="inputLogo?.click()"
                >
                  {{ form.logo_url ? 'Trocar imagem' : 'Enviar imagem' }}
                </BaseButton>
                <BaseButton
                  v-if="form.logo_url"
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon-left="heroicons:trash"
                  :disabled="enviandoLogo"
                  @click="removerLogo"
                >
                  Remover
                </BaseButton>
              </div>
              <p class="text-xs text-shift3-text-muted">
                PNG, JPG ou WebP até 2 MB — de preferência com fundo transparente.
              </p>
              <input
                ref="inputLogo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden"
                @change="aoEscolherLogo"
              />
            </div>
          </div>
        </section>

        <!-- ───── Dados da empresa ───── -->
        <section class="space-y-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Dados da empresa</p>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              v-model="form.nome"
              label="Nome / Razão social"
              placeholder="Nome da representação"
              icon="heroicons:building-office-2"
              required
              :error="erroNome"
            />
            <BaseInput
              :model-value="form.documento_legal"
              label="CNPJ / CPF"
              placeholder="00.000.000/0000-00"
              icon="heroicons:identification"
              inputmode="numeric"
              :maxlength="18"
              @update:model-value="(v) => (form.documento_legal = formatarDocumento(String(v)))"
            />
            <BaseInput
              v-model="form.email"
              type="email"
              label="E-mail"
              placeholder="contato@empresa.com"
              icon="heroicons:envelope"
              :error="erroEmail"
            />
            <BaseInput
              :model-value="form.telefone"
              type="tel"
              label="Telefone (WhatsApp)"
              placeholder="(11) 98765-4321"
              icon="heroicons:device-phone-mobile"
              inputmode="tel"
              :maxlength="15"
              @update:model-value="(v) => (form.telefone = formatarTelefone(String(v)))"
            />
          </div>
        </section>

        <!-- ───── Endereço ───── -->
        <section class="space-y-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Endereço</p>
          <ClientesEnderecoCampos v-model="form.endereco" />
        </section>
      </template>
    </div>

    <!-- ───── Ações — teleportadas pra barra fixa do layout ───── -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div v-if="empresaId" class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
          <div class="mx-auto flex max-w-3xl items-center gap-3">
            <BaseButton
              type="submit"
              form="configuracoes-formulario"
              variant="primary"
              :loading="salvando"
              icon-left="heroicons:check"
            >
              Salvar alterações
            </BaseButton>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </form>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { Endereco } from '~/types/cliente'

definePageMeta({ layout: 'dashboard', title: 'Configurações' })

const TAMANHO_MAX_LOGO = 2 * 1024 * 1024
const TIPOS_LOGO = ['image/png', 'image/jpeg', 'image/webp']

const empresa = useEmpresa()
const toast = useToast()

const carregando = ref(true)
const salvando = ref(false)
const enviandoLogo = ref(false)
const empresaId = ref<string | null>(null)
const inputLogo = ref<HTMLInputElement | null>(null)
const erroNome = ref('')
const erroEmail = ref('')

const form = reactive({
  nome: '',
  documento_legal: '',
  email: '',
  telefone: '',
  logo_url: null as string | null,
  endereco: {} as Endereco
})

onMounted(async () => {
  try {
    const dados = await empresa.buscar()
    if (dados) {
      empresaId.value = dados.id
      Object.assign(form, {
        nome: dados.nome ?? '',
        documento_legal: formatarDocumento(dados.documento_legal),
        email: dados.email ?? '',
        telefone: formatarTelefone(dados.telefone),
        logo_url: dados.logo_url,
        endereco: { ...(dados.endereco ?? {}) }
      })
    }
  } catch {
    toast.error('Não foi possível carregar os dados da empresa')
  } finally {
    carregando.value = false
  }
})

const soDigitos = (v: string) => v.replace(/\D/g, '')
const limpo = (v: string) => v.trim() || null

async function salvar() {
  if (!empresaId.value) return
  erroNome.value = form.nome.trim().length >= 2 ? '' : 'Informe o nome da empresa'
  erroEmail.value = !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'E-mail inválido'
  if (erroNome.value || erroEmail.value) return

  salvando.value = true
  try {
    await empresa.salvar(empresaId.value, {
      nome: form.nome.trim(),
      documento_legal: soDigitos(form.documento_legal) || null,
      email: limpo(form.email),
      telefone: soDigitos(form.telefone) || null,
      endereco: Object.fromEntries(
        Object.entries(form.endereco).filter(([, val]) => (val ?? '').toString().trim() !== '')
      )
    })
    toast.success('Configurações salvas')
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível salvar')
  } finally {
    salvando.value = false
  }
}

/** A logo é gravada na hora (não espera o "Salvar alterações"). */
async function aoEscolherLogo(e: Event) {
  const input = e.target as HTMLInputElement
  const arquivo = input.files?.[0]
  input.value = '' // permite escolher o mesmo arquivo de novo
  if (!arquivo || !empresaId.value) return

  if (!TIPOS_LOGO.includes(arquivo.type)) {
    toast.error('Use uma imagem PNG, JPG ou WebP')
    return
  }
  if (arquivo.size > TAMANHO_MAX_LOGO) {
    toast.error('A imagem precisa ter até 2 MB')
    return
  }

  enviandoLogo.value = true
  try {
    form.logo_url = await empresa.enviarLogo(empresaId.value, arquivo, form.logo_url)
    toast.success('Logomarca atualizada')
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível enviar a imagem')
  } finally {
    enviandoLogo.value = false
  }
}

async function removerLogo() {
  if (!empresaId.value || !form.logo_url) return
  enviandoLogo.value = true
  try {
    await empresa.removerLogo(empresaId.value, form.logo_url)
    form.logo_url = null
    toast.success('Logomarca removida')
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível remover a imagem')
  } finally {
    enviandoLogo.value = false
  }
}
</script>
