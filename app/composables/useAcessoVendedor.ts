import type { AcessoVendedor } from '~/types/vendedor'

/**
 * Gerencia o login (perfis.papel='vendedor') associado a um vendedor.
 * Criar/remover exigem a service role key → passam pelas rotas server;
 * ler e trocar a função são operações simples cobertas pela RLS de `perfis`.
 */
export function useAcessoVendedor() {
  const supabase = useSupabaseClient()

  async function buscarAcesso(vendedorId: string): Promise<AcessoVendedor | null> {
    const { data, error } = await supabase
      .from('perfis')
      .select('id, funcao_id, criado_em')
      .eq('vendedor_id', vendedorId)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as AcessoVendedor) ?? null
  }

  async function criarAcesso(dados: { vendedorId: string; email: string; senha: string; funcaoId: string | null }) {
    return await $fetch('/api/vendedores/acesso', {
      method: 'POST',
      body: { vendedorId: dados.vendedorId, email: dados.email, senha: dados.senha, funcaoId: dados.funcaoId }
    })
  }

  async function removerAcesso(perfilId: string) {
    return await $fetch('/api/vendedores/acesso', {
      method: 'DELETE',
      body: { perfilId }
    })
  }

  async function atualizarFuncao(perfilId: string, funcaoId: string | null) {
    const { error } = await supabase.from('perfis').update({ funcao_id: funcaoId }).eq('id', perfilId)
    if (error) throw error
  }

  return { buscarAcesso, criarAcesso, removerAcesso, atualizarFuncao }
}
