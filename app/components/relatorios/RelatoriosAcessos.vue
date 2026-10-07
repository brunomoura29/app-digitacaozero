<template>
  <ClientOnly>
    <Teleport to="body">
      <div class="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-4" @click.self="emit('fechar')">
        <div class="my-6 w-full max-w-2xl rounded-medium border border-shift3-border bg-shift3-bg-card shadow-xl">
          <div class="flex items-start justify-between gap-4 border-b border-shift3-border px-5 py-4">
            <div>
              <h3>Compartilhar com clientes</h3>
              <p class="mt-1 text-sm text-shift3-text-secondary">
                Cada cliente recebe um link e uma senha próprios e vê só os pedidos dele, sempre atualizados.
              </p>
            </div>
            <button type="button" class="text-shift3-text-muted hover:text-shift3-text" aria-label="Fechar" @click="emit('fechar')">
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
          </div>

          <div class="space-y-4 px-5 py-4">
            <!-- liberar um cliente -->
            <div class="flex flex-wrap items-end gap-2">
              <div class="min-w-0 flex-1 basis-56">
                <label>Liberar para</label>
                <select v-model="clienteEscolhido" :class="[SELECT, 'mt-1.5 w-full']" :disabled="!semAcesso.length">
                  <option value="">{{ semAcesso.length ? 'Escolha um cliente…' : 'Todos os clientes já têm acesso' }}</option>
                  <option v-for="c in semAcesso" :key="c.id" :value="c.id">{{ c.nome }}</option>
                </select>
              </div>
              <BaseButton variant="primary" icon-left="heroicons:key" :disabled="!clienteEscolhido" :loading="criando" @click="liberar">
                Gerar acesso
              </BaseButton>
            </div>

            <div v-if="carregando" class="flex items-center justify-center gap-2 py-8 text-sm text-shift3-text-muted">
              <BaseSpinner size="md" /> Carregando…
            </div>

            <p v-else-if="!acessos.length" class="rounded-default border border-dashed border-shift3-border px-4 py-6 text-center text-sm text-shift3-text-muted">
              Ninguém tem acesso ainda. Escolha um cliente acima para gerar o link e a senha dele.
            </p>

            <ul v-else class="space-y-3">
              <li
                v-for="a in acessos"
                :key="a.id"
                class="rounded-default border border-shift3-border p-3"
                :class="a.ativo ? '' : 'opacity-60'"
              >
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p class="min-w-0 flex-1 truncate text-sm font-semibold text-shift3-text">{{ a.clientes?.nome ?? 'Cliente' }}</p>
                  <p class="text-xs text-shift3-text-muted">
                    {{ a.visualizacoes ? `${a.visualizacoes} acesso(s) · último em ${dataCurta(a.ultimo_acesso_em)}` : 'Ainda não abriu' }}
                  </p>
                  <BaseSwitch :model-value="a.ativo" :label="a.ativo ? 'Ativo' : 'Bloqueado'" @update:model-value="(v) => alternarAtivo(a, v)" />
                </div>

                <div class="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    :value="linkDoAcesso(a)"
                    type="text"
                    readonly
                    class="w-full truncate rounded-default border border-shift3-border bg-shift3-bg-light px-3 py-1.5 font-mono text-xs text-shift3-text-secondary outline-none"
                    aria-label="Link"
                    @focus="(e) => (e.target as HTMLInputElement).select()"
                  />
                  <div class="flex items-center gap-2 rounded-default border border-shift3-border bg-shift3-bg-light px-3 py-1.5">
                    <Icon name="heroicons:lock-closed" class="h-3.5 w-3.5 text-shift3-text-muted" />
                    <span class="font-mono text-sm font-semibold tracking-wider text-shift3-text">{{ a.senha }}</span>
                  </div>
                </div>

                <div class="mt-2.5 flex flex-wrap gap-2">
                  <BaseButton variant="secondary" size="sm" icon-left="heroicons:chat-bubble-left-ellipsis" @click="copiarMensagem(a)">
                    Copiar mensagem pronta
                  </BaseButton>
                  <BaseButton variant="ghost" size="sm" icon-left="heroicons:link" @click="copiar(linkDoAcesso(a), 'Link copiado')">
                    Link
                  </BaseButton>
                  <BaseButton variant="ghost" size="sm" icon-left="heroicons:clipboard-document" @click="copiar(a.senha, 'Senha copiada')">
                    Senha
                  </BaseButton>
                  <BaseButton variant="ghost" size="sm" icon-left="heroicons:arrow-path" class="ml-auto" @click="trocando = a">
                    Nova senha
                  </BaseButton>
                  <BaseButton variant="ghost" size="sm" icon-left="heroicons:trash" class="text-danger" @click="removendo = a">
                    Remover
                  </BaseButton>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>

  <BaseConfirmDialog
    :model-value="!!trocando"
    title="Gerar nova senha?"
    :message="`A senha atual de ${trocando?.clientes?.nome ?? 'este cliente'} para de funcionar na hora. O link continua o mesmo — é só enviar a senha nova.`"
    confirm-label="Gerar nova senha"
    :loading="processando"
    @update:model-value="(v: boolean) => !v && (trocando = null)"
    @confirm="trocarSenha"
  />
  <BaseConfirmDialog
    :model-value="!!removendo"
    title="Remover o acesso?"
    :message="`O link de ${removendo?.clientes?.nome ?? 'este cliente'} deixa de abrir. Para liberar de novo será gerado outro link e outra senha.`"
    confirm-label="Remover acesso"
    danger
    :loading="processando"
    @update:model-value="(v: boolean) => !v && (removendo = null)"
    @confirm="remover"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { gerarSenhaRelatorio, type AcessoRelatorio, type ClienteResumo } from '~/composables/useRelatorios'

const props = defineProps<{ relatorioId: string; nomeRelatorio: string }>()
const emit = defineEmits<{ fechar: [] }>()

const SELECT =
  'rounded-default border border-shift3-input-border bg-shift3-input px-2.5 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:opacity-60'

const { carregarAcessos, criarAcesso, atualizarAcesso, removerAcesso, linkDoAcesso, listarClientes } = useRelatorios()
const clientes = ref<ClienteResumo[]>([])
const toast = useToast()

const acessos = ref<AcessoRelatorio[]>([])
const carregando = ref(true)
const criando = ref(false)
const processando = ref(false)
const clienteEscolhido = ref('')
const trocando = ref<AcessoRelatorio | null>(null)
const removendo = ref<AcessoRelatorio | null>(null)

onMounted(async () => {
  try {
    const [lista, todos] = await Promise.all([carregarAcessos(props.relatorioId), listarClientes()])
    acessos.value = lista
    clientes.value = todos
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível carregar os acessos')
  } finally {
    carregando.value = false
  }
})

const semAcesso = computed(() => {
  const comAcesso = new Set(acessos.value.map((a) => a.cliente_id))
  return clientes.value.filter((c) => c.ativo && !comAcesso.has(c.id))
})

function dataCurta(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
}

function copiar(texto: string, aviso: string) {
  navigator.clipboard.writeText(texto)
  toast.success(aviso)
}

function copiarMensagem(a: AcessoRelatorio) {
  copiar(
    `Olá! Segue o acesso ao relatório “${props.nomeRelatorio}”.\n\nLink: ${linkDoAcesso(a)}\nSenha: ${a.senha}\n\nOs dados são atualizados automaticamente — é só abrir o link quando quiser consultar.`,
    'Mensagem copiada — é só colar no WhatsApp ou e-mail'
  )
}

function trocarNaLista(novo: AcessoRelatorio) {
  acessos.value = acessos.value.map((a) => (a.id === novo.id ? novo : a))
}

async function liberar() {
  if (!clienteEscolhido.value) return
  criando.value = true
  try {
    acessos.value.push(await criarAcesso(props.relatorioId, clienteEscolhido.value))
    clienteEscolhido.value = ''
    toast.success('Acesso gerado — copie a mensagem e envie ao cliente')
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível gerar o acesso')
  } finally {
    criando.value = false
  }
}

async function alternarAtivo(a: AcessoRelatorio, ativo: boolean) {
  try {
    trocarNaLista(await atualizarAcesso(a.id, { ativo }))
    toast.success(ativo ? 'Acesso liberado de novo' : 'Acesso bloqueado — o link deixa de abrir')
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível alterar o acesso')
  }
}

async function trocarSenha() {
  if (!trocando.value) return
  processando.value = true
  try {
    trocarNaLista(await atualizarAcesso(trocando.value.id, { senha: gerarSenhaRelatorio() }))
    trocando.value = null
    toast.success('Nova senha gerada')
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível trocar a senha')
  } finally {
    processando.value = false
  }
}

async function remover() {
  if (!removendo.value) return
  processando.value = true
  try {
    await removerAcesso(removendo.value.id)
    acessos.value = acessos.value.filter((a) => a.id !== removendo.value!.id)
    removendo.value = null
    toast.success('Acesso removido')
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível remover o acesso')
  } finally {
    processando.value = false
  }
}
</script>
