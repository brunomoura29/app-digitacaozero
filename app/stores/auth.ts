import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

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
  papel: 'admin' | 'cliente'
  cliente_id: string | null
  telefone: string | null
  avatar_url: string | null
  empresas: Empresa | null
}

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const perfil = ref<Perfil | null>(null)
  const carregandoPerfil = ref(false)

  const empresa = computed<Empresa | null>(() => perfil.value?.empresas ?? null)
  const isAdmin = computed(() => perfil.value?.papel === 'admin')
  const isCliente = computed(() => perfil.value?.papel === 'cliente')
  const nome = computed(
    () => perfil.value?.nome_completo || user.value?.email?.split('@')[0] || 'Usuário'
  )
  const email = computed(() => user.value?.email ?? null)

  /** Carrega o perfil + empresa do usuário logado. */
  async function carregarPerfil(force = false) {
    const uid = user.value?.id
    if (!uid) {
      perfil.value = null
      return
    }
    if (perfil.value?.id === uid && !force) return
    carregandoPerfil.value = true
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, empresa_id, nome_completo, papel, cliente_id, telefone, avatar_url, empresas(id, nome, email, telefone, moeda)')
        .eq('id', uid)
        .maybeSingle()
      if (error) throw error
      perfil.value = (data as unknown as Perfil) ?? null
    } catch (e) {
      console.error('[auth] falha ao carregar perfil:', e)
      perfil.value = null
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

  async function sair() {
    await supabase.auth.signOut()
    perfil.value = null
    await navigateTo('/login')
  }

  return {
    user,
    perfil,
    empresa,
    carregandoPerfil,
    isAdmin,
    isCliente,
    nome,
    email,
    carregarPerfil,
    cadastrar,
    entrar,
    sair
  }
})
