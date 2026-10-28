import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AcaoPermissao, PermissaoModulo } from '~/types/funcao'

export interface Empresa {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  moeda: string
}

export interface Perfil {
  id: string
  empresa_id: string
  nome_completo: string | null
  papel: 'admin' | 'vendedor' | 'cliente'
  cliente_id: string | null
  vendedor_id: string | null
  funcao_id: string | null
  telefone: string | null
  avatar_url: string | null
  empresas: Empresa | null
  funcoes: { permissoes: Record<string, PermissaoModulo> } | null
}

/** 'teste' | 'ativa' | 'vencida' (nos 5 dias de tolerância) | 'bloqueada' — calculada no banco. */
export type SituacaoAssinatura = 'teste' | 'ativa' | 'vencida' | 'bloqueada'

/** Retorno de `meu_contexto()`: empresa/papel efetivos (o master em suporte vira admin da empresa atendida). */
export interface ContextoUsuario {
  empresa_id: string | null
  papel: Perfil['papel'] | null
  eh_master: boolean
  em_suporte: boolean
  empresa_nome: string | null
  situacao: SituacaoAssinatura | null
  vence_em: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const perfil = ref<Perfil | null>(null)
  const contexto = ref<ContextoUsuario | null>(null)
  const carregandoPerfil = ref(false)

  const empresa = computed<Empresa | null>(() => perfil.value?.empresas ?? null)
  const isAdmin = computed(() => perfil.value?.papel === 'admin')
  const isVendedor = computed(() => perfil.value?.papel === 'vendedor')
  const isCliente = computed(() => perfil.value?.papel === 'cliente')
  const nome = computed(
    () => perfil.value?.nome_completo || user.value?.email?.split('@')[0] || 'Usuário'
  )
  const email = computed(() => user.value?.email ?? null)

  const ehMaster = computed(() => contexto.value?.eh_master ?? false)
  const emSuporte = computed(() => contexto.value?.em_suporte ?? false)
  /** O master nunca é bloqueado (nem a empresa que ele está atendendo). */
  const bloqueada = computed(() => contexto.value?.situacao === 'bloqueada' && !ehMaster.value)

  /** Checa uma ação específica (ver/incluir/editar/deletar) num módulo — admin sempre pode tudo. */
  function temPermissao(modulo: string, acao: AcaoPermissao): boolean {
    if (!perfil.value) return false
    if (perfil.value.papel === 'admin') return true
    if (perfil.value.papel === 'vendedor') return perfil.value.funcoes?.permissoes?.[modulo]?.[acao] ?? false
    return false
  }

  /** true se o usuário tem ao menos uma das 4 ações no módulo — controla menu/rota. */
  function podeAcessarModulo(modulo: string) {
    return (['ver', 'incluir', 'editar', 'deletar'] as AcaoPermissao[]).some((acao) => temPermissao(modulo, acao))
  }

  function podeVerModulo(modulo: string) {
    return temPermissao(modulo, 'ver')
  }
  function podeIncluirModulo(modulo: string) {
    return temPermissao(modulo, 'incluir')
  }
  function podeEditarModulo(modulo: string) {
    return temPermissao(modulo, 'editar')
  }
  function podeExcluirModulo(modulo: string) {
    return temPermissao(modulo, 'deletar')
  }

  /** Carrega o perfil + empresa do usuário logado. */
  async function carregarPerfil(force = false) {
    // useSupabaseUser() retorna o payload do JWT (getClaims()) — o id do usuário é `sub`, não `id`.
    const uid = user.value?.sub
    if (!uid) {
      perfil.value = null
      return
    }
    if (perfil.value?.id === uid && !force) return
    carregandoPerfil.value = true
    try {
      const [resPerfil, resContexto] = await Promise.all([
        supabase
          .from('perfis')
          .select(
            'id, empresa_id, nome_completo, papel, cliente_id, vendedor_id, funcao_id, telefone, avatar_url, funcoes(permissoes)'
          )
          .eq('id', uid)
          .maybeSingle(),
        supabase.rpc('meu_contexto')
      ])
      if (resPerfil.error) throw resPerfil.error
      if (resContexto.error) throw resContexto.error
      const ctx = (resContexto.data as ContextoUsuario | null) ?? null
      const dados = (resPerfil.data as unknown as Perfil) ?? null
      contexto.value = ctx
      // empresa e papel efetivos: em suporte o master vê/age como admin da empresa atendida
      perfil.value =
        dados && ctx
          ? { ...dados, empresa_id: ctx.empresa_id ?? dados.empresa_id, papel: ctx.papel ?? dados.papel }
          : dados
    } catch (e) {
      console.error('[auth] falha ao carregar perfil:', e)
      perfil.value = null
      contexto.value = null
    } finally {
      carregandoPerfil.value = false
    }
  }

  /** Cria a conta do admin da empresa. O trigger no banco cria empresa + perfil. */
  async function cadastrar(input: {
    nome: string
    telefone: string
    email: string
    senha: string
  }) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.senha,
      options: {
        data: { full_name: input.nome.trim(), phone: input.telefone.replace(/\D/g, '') }
      }
    })
    if (error) throw error
    // se "confirmar e-mail" estiver desligado, já vem sessão
    return { precisaConfirmarEmail: !data.session }
  }

  async function entrar(emailInput: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password: senha
    })
    if (error) throw error
    await carregarPerfil(true)
  }

  /**
   * Master: entra no acesso de uma empresa (ou volta pra própria). Recarrega a página inteira —
   * os composables guardam listas em useState e precisam começar do zero na outra empresa.
   */
  async function entrarEmpresa(empresaId: string) {
    const { error } = await supabase.rpc('master_entrar_empresa', { p_empresa: empresaId })
    if (error) throw error
    window.location.assign('/')
  }

  async function sairDaEmpresa() {
    const { error } = await supabase.rpc('master_sair_empresa')
    if (error) throw error
    window.location.assign('/master')
  }

  async function sair() {
    await supabase.auth.signOut()
    perfil.value = null
    contexto.value = null
    await navigateTo('/login')
  }

  return {
    user,
    perfil,
    contexto,
    empresa,
    carregandoPerfil,
    isAdmin,
    isVendedor,
    isCliente,
    nome,
    email,
    ehMaster,
    emSuporte,
    bloqueada,
    temPermissao,
    podeAcessarModulo,
    podeVerModulo,
    podeIncluirModulo,
    podeEditarModulo,
    podeExcluirModulo,
    carregarPerfil,
    cadastrar,
    entrar,
    sair,
    entrarEmpresa,
    sairDaEmpresa
  }
})
