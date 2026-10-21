<template>
  <div class="mx-auto max-w-3xl space-y-5 pb-8">
    <BasePageHeader title="Fábricas" subtitle="Usadas na tabela de preço, nas condições de pagamento, nas políticas e nos pedidos" />

    <!-- ───── Nova fábrica ───── -->
    <form v-if="podeIncluir" class="flex gap-2" @submit.prevent="adicionar">
      <div class="min-w-0 flex-1">
        <BaseInput v-model="novoNome" placeholder="Nome da nova fábrica" icon="heroicons:building-office-2" />
      </div>
      <BaseButton type="submit" variant="primary" icon-left="heroicons:plus" :loading="criando" :disabled="!novoNome.trim()">
        Adicionar
      </BaseButton>
    </form>

    <div v-if="fabricas.itens.value.length > 8">
      <BaseInput v-model="busca" placeholder="Buscar fábrica…" icon="heroicons:magnifying-glass" />
    </div>

    <div v-if="carregando" class="flex items-center justify-center gap-2 py-10 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando fábricas…
    </div>

    <BaseEmptyState
      v-else-if="!fabricas.itens.value.length"
      icon="heroicons:building-office-2"
      title="Nenhuma fábrica cadastrada"
      description="Cadastre aqui ou direto nos campos de fábrica da tabela de preço e do pedido."
    />

    <div v-else class="overflow-hidden rounded-medium border border-shift3-border bg-shift3-bg-card">
      <ul>
        <li
          v-for="f in visiveis"
          :key="f.id"
          class="flex items-center gap-3 border-b border-shift3-border/60 px-4 py-3 last:border-0"
        >
          <form v-if="renomeando?.id === f.id" class="flex flex-1 items-center gap-2" @submit.prevent="salvarNome">
            <div class="min-w-0 flex-1">
              <BaseInput ref="campoRenomear" v-model="renomeando.nome" />
            </div>
            <BaseButton type="submit" variant="primary" size="sm" icon-left="heroicons:check" :loading="salvandoNome" :disabled="!renomeando.nome.trim()">
              Salvar
            </BaseButton>
            <BaseButton type="button" variant="ghost" size="sm" @click="renomeando = null">Cancelar</BaseButton>
          </form>

          <template v-else>
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-shift3-teal/10 text-shift3-teal">
              <Icon name="heroicons:building-office-2" class="h-4 w-4" />
            </span>
            <span class="min-w-0 flex-1 truncate font-medium text-shift3-text">{{ f.nome }}</span>
            <BaseDropdown v-if="acoes(f).length" align="right" :items="acoes(f)">
              <BaseButton variant="ghost" size="sm" icon-left="heroicons:ellipsis-vertical" :loading="verificando === f.id" />
            </BaseDropdown>
          </template>
        </li>
      </ul>
      <p v-if="!visiveis.length" class="px-4 py-6 text-center text-sm text-shift3-text-muted">Nenhuma fábrica com esse nome.</p>
    </div>

    <BaseConfirmDialog
      v-model="excluir.aberto"
      danger
      title="Excluir fábrica"
      :message="mensagemExclusao"
      confirm-label="Excluir"
      :loading="excluir.excluindo"
      @confirm="confirmarExclusao"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import type { Fabrica } from '~/types/fabrica'
import type { UsoFabrica } from '~/composables/useFabricas'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Fábricas' })

const auth = useAuthStore()
const toast = useToast()
const fabricas = useFabricas()

// mesma regra da RLS de `fabricas`: vendedor cria com permissão na tabela de preço;
// renomear e excluir é só do admin
const podeIncluir = computed(() => auth.podeIncluirModulo('tabela_preco') || auth.podeEditarModulo('tabela_preco'))
const podeAlterar = computed(() => auth.isAdmin)

const carregando = ref(true)
onMounted(async () => {
  try {
    await fabricas.carregar()
  } catch (e) {
    console.error('Erro ao carregar fábricas:', e)
    toast.error('Não foi possível carregar as fábricas')
  } finally {
    carregando.value = false
  }
})

const busca = ref('')
const visiveis = computed(() => {
  const termo = chaveNome(busca.value)
  return termo ? fabricas.itens.value.filter((f) => chaveNome(f.nome).includes(termo)) : fabricas.itens.value
})

const jaExiste = (nome: string, menosId?: string) =>
  fabricas.itens.value.some((f) => f.id !== menosId && chaveNome(f.nome) === chaveNome(nome))

function mensagemErro(e: any, padrao: string) {
  return e?.code === '23505' ? 'Já existe uma fábrica com esse nome' : e?.message || padrao
}

// ───── criar ─────

const novoNome = ref('')
const criando = ref(false)

async function adicionar() {
  const nome = novoNome.value.trim().replace(/\s+/g, ' ')
  if (!nome) return
  if (jaExiste(nome)) {
    toast.error('Já existe uma fábrica com esse nome')
    return
  }
  criando.value = true
  try {
    await fabricas.criar(nome)
    novoNome.value = ''
    toast.success('Fábrica adicionada')
  } catch (e) {
    console.error('Erro ao criar fábrica:', e)
    toast.error(mensagemErro(e, 'Não foi possível adicionar a fábrica'))
  } finally {
    criando.value = false
  }
}

// ───── renomear ─────

const renomeando = ref<{ id: string; nome: string } | null>(null)
const salvandoNome = ref(false)
const campoRenomear = ref<any>(null)

async function abrirRenomear(f: Fabrica) {
  renomeando.value = { id: f.id, nome: f.nome }
  await nextTick()
  const el = (Array.isArray(campoRenomear.value) ? campoRenomear.value[0] : campoRenomear.value)?.$el?.querySelector?.('input')
  el?.focus()
  el?.select()
}

async function salvarNome() {
  const r = renomeando.value
  if (!r) return
  const nome = r.nome.trim().replace(/\s+/g, ' ')
  if (!nome) return
  if (nome === fabricas.porId(r.id)?.nome) {
    renomeando.value = null
    return
  }
  if (jaExiste(nome, r.id)) {
    toast.error('Já existe uma fábrica com esse nome')
    return
  }
  salvandoNome.value = true
  try {
    await fabricas.renomear(r.id, nome)
    renomeando.value = null
    toast.success('Fábrica renomeada')
  } catch (e) {
    console.error('Erro ao renomear fábrica:', e)
    toast.error(mensagemErro(e, 'Não foi possível renomear a fábrica'))
  } finally {
    salvandoNome.value = false
  }
}

// ───── excluir ─────

const verificando = ref<string | null>(null)
const excluir = reactive<{ aberto: boolean; fabrica: Fabrica | null; uso: UsoFabrica | null; excluindo: boolean }>({
  aberto: false,
  fabrica: null,
  uso: null,
  excluindo: false
})

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Confere o uso antes: com preço ou pedido não dá pra excluir; políticas e condições vão junto. */
async function pedirExclusao(f: Fabrica) {
  verificando.value = f.id
  try {
    const uso = await fabricas.contarUso(f.id)
    if (uso.precos || uso.pedidos) {
      const onde = [uso.precos && plural(uso.precos, 'preço', 'preços'), uso.pedidos && plural(uso.pedidos, 'pedido', 'pedidos')]
        .filter(Boolean)
        .join(' e ')
      toast.error(`"${f.nome}" tem ${onde} — não pode ser excluída. Se o nome está errado, renomeie.`)
      return
    }
    excluir.fabrica = f
    excluir.uso = uso
    excluir.aberto = true
  } catch (e) {
    console.error('Erro ao verificar uso da fábrica:', e)
    toast.error('Não foi possível verificar onde a fábrica é usada')
  } finally {
    verificando.value = null
  }
}

const mensagemExclusao = computed(() => {
  const f = excluir.fabrica
  const uso = excluir.uso
  if (!f || !uso) return ''
  const junto = [
    uso.condicoes && plural(uso.condicoes, 'condição de pagamento', 'condições de pagamento'),
    uso.politicas && plural(uso.politicas, 'política comercial', 'políticas comerciais')
  ].filter(Boolean)
  return junto.length
    ? `Excluir "${f.nome}"? Também serão excluídas ${junto.join(' e ')} dessa fábrica. Esta ação não pode ser desfeita.`
    : `Excluir "${f.nome}"? Esta ação não pode ser desfeita.`
})

async function confirmarExclusao() {
  const f = excluir.fabrica
  if (!f) return
  excluir.excluindo = true
  try {
    await fabricas.remover(f.id)
    toast.success('Fábrica excluída')
    excluir.aberto = false
  } catch (e: any) {
    console.error('Erro ao excluir fábrica:', e)
    // alguém pode ter usado a fábrica entre a conferência e o clique
    toast.error(e?.code === '23503' ? 'A fábrica passou a ser usada em preço ou pedido — não pode ser excluída' : 'Não foi possível excluir a fábrica')
  } finally {
    excluir.excluindo = false
  }
}

function acoes(f: Fabrica) {
  if (!podeAlterar.value) return []
  return [
    { label: 'Renomear', icon: 'heroicons:pencil-square', onClick: () => abrirRenomear(f) },
    { label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => pedirExclusao(f) }
  ]
}
</script>
