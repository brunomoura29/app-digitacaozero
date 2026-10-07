import {
  normalizarDefinicao,
  type DadosRelatorio,
  type DefinicaoRelatorio,
  type FonteId
} from '#shared/utils/relatorios'

export interface Relatorio {
  id: string
  nome: string
  descricao: string | null
  definicao: DefinicaoRelatorio
  criado_em: string
  atualizado_em: string
}

/** Acesso público de um cliente a um relatório: o link (`token`) + a senha dele. */
export interface AcessoRelatorio {
  id: string
  relatorio_id: string
  cliente_id: string
  token: string
  senha: string
  ativo: boolean
  visualizacoes: number
  ultimo_acesso_em: string | null
  criado_em: string
  clientes: { nome: string } | null
}

export interface ClienteResumo {
  id: string
  nome: string
  ativo: boolean
}

export interface RespostaMontagem {
  definicao: DefinicaoRelatorio
  nome: string
  resumo: string
  avisos: string[]
}

const COLUNAS = 'id, nome, descricao, definicao, criado_em, atualizado_em'
const COLUNAS_ACESSO =
  'id, relatorio_id, cliente_id, token, senha, ativo, visualizacoes, ultimo_acesso_em, criado_em, clientes(nome)'

/** Sem 0/O, 1/I/L: a senha é ditada por telefone e digitada à mão. */
const ALFABETO_SENHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Senha no formato XXX-XXX-XXX, sorteada pelo gerador seguro do navegador. */
export function gerarSenhaRelatorio(): string {
  const sorteio = crypto.getRandomValues(new Uint32Array(9))
  const letras = [...sorteio].map((n) => ALFABETO_SENHA[n % ALFABETO_SENHA.length])
  return [letras.slice(0, 3), letras.slice(3, 6), letras.slice(6)].map((p) => p.join('')).join('-')
}

function comDefinicao(linha: any): Relatorio {
  return { ...linha, definicao: normalizarDefinicao(linha.definicao) }
}

/**
 * Relatórios montados pelo usuário. A planta (`definicao`) fica no banco; os números são
 * calculados no navegador a partir das linhas que `buscarDados` traz do servidor.
 */
export function useRelatorios() {
  const supabase = useSupabaseClient()

  const itens = useState<Relatorio[]>('relatorios:itens', () => [])
  const carregando = useState<boolean>('relatorios:carregando', () => false)

  async function carregar() {
    carregando.value = true
    try {
      const { data, error } = await supabase.from('relatorios').select(COLUNAS).order('atualizado_em', { ascending: false })
      if (error) throw error
      itens.value = ((data as any[]) ?? []).map(comDefinicao)
    } finally {
      carregando.value = false
    }
  }

  async function buscarUm(id: string): Promise<Relatorio | null> {
    const { data, error } = await supabase.from('relatorios').select(COLUNAS).eq('id', id).maybeSingle()
    if (error) throw error
    return data ? comDefinicao(data) : null
  }

  async function criar(dados: { nome: string; descricao?: string | null; definicao: DefinicaoRelatorio }): Promise<Relatorio> {
    const { data, error } = await supabase
      .from('relatorios')
      .insert({ nome: dados.nome, descricao: dados.descricao ?? null, definicao: dados.definicao } as never)
      .select(COLUNAS)
      .single()
    if (error) throw error
    return comDefinicao(data)
  }

  async function atualizar(
    id: string,
    dados: { nome: string; descricao: string | null; definicao: DefinicaoRelatorio }
  ): Promise<Relatorio> {
    const { data, error } = await supabase
      .from('relatorios')
      .update({ ...dados, atualizado_em: new Date().toISOString() } as never)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    return comDefinicao(data)
  }

  async function remover(id: string): Promise<void> {
    // os acessos saem junto (FK on delete cascade) — os links param de abrir
    const { data, error } = await supabase.from('relatorios').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error('Sem permissão para excluir este relatório')
    itens.value = itens.value.filter((r) => r.id !== id)
  }

  /** Linhas pro painel. Com `clienteId`, só as daquele cliente ("ver como o cliente"). */
  function buscarDados(fontes: FonteId[], clienteId?: string | null): Promise<DadosRelatorio> {
    return $fetch<DadosRelatorio>('/api/relatorios/dados', { method: 'POST', body: { fontes, clienteId: clienteId ?? null } })
  }

  /** Pede a planta à IA. Com `definicaoAtual`, é um ajuste do painel que já existe. */
  function montarComIA(fontes: FonteId[], pedido: string, definicaoAtual?: DefinicaoRelatorio): Promise<RespostaMontagem> {
    return $fetch<RespostaMontagem>('/api/relatorios/montar', { method: 'POST', body: { fontes, pedido, definicaoAtual } })
  }

  /** Todos os clientes da empresa, por nome — sem os filtros da tela de Clientes (que `useClientes` guarda). */
  async function listarClientes(): Promise<ClienteResumo[]> {
    const { data, error } = await supabase.from('clientes').select('id, nome, ativo').order('nome', { ascending: true })
    if (error) throw error
    return (data as unknown as ClienteResumo[]) ?? []
  }

  // ───── acessos (link + senha por cliente) ─────

  async function carregarAcessos(relatorioId: string): Promise<AcessoRelatorio[]> {
    const { data, error } = await supabase
      .from('relatorios_acessos')
      .select(COLUNAS_ACESSO)
      .eq('relatorio_id', relatorioId)
      .order('criado_em', { ascending: true })
    if (error) throw error
    return (data as unknown as AcessoRelatorio[]) ?? []
  }

  async function criarAcesso(relatorioId: string, clienteId: string): Promise<AcessoRelatorio> {
    // o token é metade da credencial do link — precisa ser imprevisível (Math.random não é)
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const { data, error } = await supabase
      .from('relatorios_acessos')
      .insert({ relatorio_id: relatorioId, cliente_id: clienteId, token, senha: gerarSenhaRelatorio() } as never)
      .select(COLUNAS_ACESSO)
      .single()
    if (error) throw error
    return data as unknown as AcessoRelatorio
  }

  async function atualizarAcesso(id: string, dados: { senha?: string; ativo?: boolean }): Promise<AcessoRelatorio> {
    const { data, error } = await supabase
      .from('relatorios_acessos')
      .update(dados as never)
      .eq('id', id)
      .select(COLUNAS_ACESSO)
      .single()
    if (error) throw error
    return data as unknown as AcessoRelatorio
  }

  async function removerAcesso(id: string): Promise<void> {
    const { error } = await supabase.from('relatorios_acessos').delete().eq('id', id)
    if (error) throw error
  }

  function linkDoAcesso(acesso: Pick<AcessoRelatorio, 'token'>): string {
    return `${window.location.origin}/public/relatorio/${acesso.token}`
  }

  return {
    itens,
    carregando,
    carregar,
    buscarUm,
    criar,
    atualizar,
    remover,
    buscarDados,
    montarComIA,
    listarClientes,
    carregarAcessos,
    criarAcesso,
    atualizarAcesso,
    removerAcesso,
    linkDoAcesso
  }
}
