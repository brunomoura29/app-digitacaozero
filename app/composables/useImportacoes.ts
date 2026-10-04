import type { Importacao, ImportacaoInput } from '~/types/importacao'

const COLUNAS =
  'id, empresa_id, modelo_id, cliente_id, periodo, arquivo_nome, total_linhas, criado_em, modelos(nome), clientes(nome)'

/**
 * Importações de dados pra análise (Power BI). A gravação passa pela RPC `salvar_importacao`
 * — cabeçalho + linhas numa transação só, substituindo a importação anterior do mesmo
 * template + cliente + período.
 */
export function useImportacoes() {
  const supabase = useSupabaseClient()

  const itens = useState<Importacao[]>('importacoes:itens', () => [])
  const carregando = useState<boolean>('importacoes:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase.from('importacoes').select(COLUNAS).order('criado_em', { ascending: false })
      if (error) throw error
      itens.value = (data as unknown as Importacao[]) ?? []
    } finally {
      carregando.value = false
    }
  }

  /** Importação já gravada pro mesmo template + cliente + período (a que seria substituída). */
  async function buscarExistente(modeloId: string, clienteId: string, periodo: string): Promise<Importacao | null> {
    const { data, error } = await supabase
      .from('importacoes')
      .select(COLUNAS)
      .eq('modelo_id', modeloId)
      .eq('cliente_id', clienteId)
      .eq('periodo', periodo)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Importacao) ?? null
  }

  async function salvar(dados: ImportacaoInput): Promise<string> {
    const { data, error } = await supabase.rpc('salvar_importacao', {
      p_modelo_id: dados.modelo_id,
      p_cliente_id: dados.cliente_id,
      p_periodo: dados.periodo,
      p_arquivo_nome: dados.arquivo_nome,
      p_extracao_id: dados.extracao_id,
      p_cabecalho: dados.cabecalho,
      p_linhas: dados.linhas
    })
    if (error) throw error
    return data as string
  }

  async function remover(id: string): Promise<void> {
    // as linhas saem junto (FK on delete cascade)
    const { data, error } = await supabase.from('importacoes').delete().eq('id', id).select('id')
    if (error) throw error
    // sem permissão a RLS não dá erro: só não apaga nada
    if (!data?.length) throw new Error('Sem permissão para excluir esta importação')
    itens.value = itens.value.filter((i) => i.id !== id)
  }

  /** Chave do link de dados da empresa (a RLS só devolve a da própria), ou `null` se nunca foi gerada. */
  async function buscarChave(): Promise<string | null> {
    const { data, error } = await supabase.from('chaves_dados').select('chave').maybeSingle()
    if (error) throw error
    return (data as { chave: string } | null)?.chave ?? null
  }

  /** Gera (ou troca) a chave — os links antigos param de funcionar na hora. */
  async function gerarChave(empresaId: string): Promise<string> {
    // é a única credencial do link — precisa ser imprevisível
    const chave = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('chaves_dados').upsert({ empresa_id: empresaId, chave })
    if (error) throw error
    return chave
  }

  return { itens, carregando, carregar, buscarExistente, salvar, remover, buscarChave, gerarChave }
}
