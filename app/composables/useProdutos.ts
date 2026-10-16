import type { Produto, ProdutoFiltros, ProdutoInput } from '~/types/produto'

const COLUNAS =
  'id, empresa_id, sku, codigo_barras, descricao, marca_id, fabricante_id, modelo, numero_serie, unidade, ncm, ' +
  'origem, montadora_id, oem, grupo_id, subgrupo_id, aplicacao, peso, altura, largura, comprimento, ' +
  'caixa_master, qtd_minima_venda, ipi, ativo, criado_em, atualizado_em, ' +
  'marcas(nome), fabricantes(nome), montadoras(nome), grupos(nome), subgrupos(nome)'

/** O Supabase devolve no máximo 1000 linhas por consulta. */
const LIMITE_CONSULTA = 1000

export const PRODUTOS_POR_PAGINA_OPCOES = [25, 50, 100] as const

/** Catálogo baixado há menos que isso é reaproveitado por quem só precisa "ter" o catálogo. */
const VALIDADE_CATALOGO_MS = 5 * 60 * 1000

/**
 * Download do catálogo em andamento — quem pedir enquanto ele corre espera o mesmo, em vez de
 * baixar de novo (cada linha de item do pedido tem uma busca de produto, e cada uma pedia o
 * catálogo inteiro ao aparecer: 20 itens = 20 downloads ao mesmo tempo).
 */
let catalogoEmAndamento: Promise<void> | null = null

/**
 * CRUD de produtos. Estado compartilhado via `useState` (SSR-safe).
 * Dois estados separados:
 * - `itens`: o catálogo inteiro, sem filtro — escolha de produto e vínculo no pedido;
 * - `pagina*`: a página da tela de Produtos, com filtros, buscada no banco página a página.
 * Chama o Supabase direto; a RLS garante o isolamento por empresa.
 */
export function useProdutos() {
  const supabase = useSupabaseClient()

  const itens = useState<Produto[]>('produtos:itens', () => [])
  const carregando = useState<boolean>('produtos:carregando', () => false)
  const catalogoCarregadoEm = useState<number>('produtos:catalogo:em', () => 0)
  const filtros = useState<ProdutoFiltros>('produtos:filtros', () => ({ q: '', ativo: 'todos' }))

  const paginaItens = useState<Produto[]>('produtos:pagina:itens', () => [])
  const paginaAtual = useState<number>('produtos:pagina:atual', () => 1)
  const porPagina = useState<number>('produtos:pagina:tamanho', () => 50)
  const total = useState<number>('produtos:pagina:total', () => 0)
  const carregandoPagina = useState<boolean>('produtos:pagina:carregando', () => false)

  /** Catálogo inteiro da empresa (sem filtro), em blocos de 1000. Sempre busca de novo (mas não em dobro). */
  function carregar(): Promise<void> {
    catalogoEmAndamento ??= baixarCatalogo().finally(() => {
      catalogoEmAndamento = null
    })
    return catalogoEmAndamento
  }

  /** Só garante que o catálogo está na memória — reaproveita o que foi baixado há pouco. */
  function garantirCatalogo(): Promise<void> {
    const recente = Date.now() - catalogoCarregadoEm.value < VALIDADE_CATALOGO_MS
    if (itens.value.length && recente) return Promise.resolve()
    return carregar()
  }

  async function baixarCatalogo() {
    carregando.value = true
    try {
      const todos: Produto[] = []
      for (let inicio = 0; ; inicio += LIMITE_CONSULTA) {
        const { data, error } = await supabase
          .from('produtos')
          .select(COLUNAS)
          .order('descricao', { ascending: true })
          .order('id', { ascending: true })
          .range(inicio, inicio + LIMITE_CONSULTA - 1)
        if (error) throw error
        todos.push(...((data as unknown as Produto[]) ?? []))
        if (!data || data.length < LIMITE_CONSULTA) break
      }
      itens.value = todos
      catalogoCarregadoEm.value = Date.now()
    } finally {
      carregando.value = false
    }
  }

  /**
   * Uma página da tela de Produtos, com os filtros atuais e o total pra paginação.
   * `pagina` omitida = recarrega a atual (ex.: depois de editar/importar).
   */
  async function carregarPagina(pagina = paginaAtual.value) {
    carregandoPagina.value = true
    try {
      const montar = (p: number) => {
        let query = supabase
          .from('produtos')
          .select(COLUNAS, { count: 'exact' })
          .order('descricao', { ascending: true })
          .order('id', { ascending: true })
          .range((p - 1) * porPagina.value, p * porPagina.value - 1)

        const termo = filtros.value.q.trim()
        if (termo) query = query.or(filtroContemEm(['descricao', 'sku', 'oem', 'codigo_barras'], termo))
        if (filtros.value.ativo === 'ativos') query = query.eq('ativo', true)
        if (filtros.value.ativo === 'inativos') query = query.eq('ativo', false)
        return query
      }

      let { data, error, count } = await montar(pagina)
      if (error) throw error
      // a página sumiu (excluiu os últimos, filtro diminuiu a lista): volta pra última que existe
      const ultima = Math.max(1, Math.ceil((count ?? 0) / porPagina.value))
      if (pagina > ultima) {
        pagina = ultima
        ;({ data, error, count } = await montar(pagina))
        if (error) throw error
      }

      paginaItens.value = (data as unknown as Produto[]) ?? []
      total.value = count ?? 0
      paginaAtual.value = pagina
    } finally {
      carregandoPagina.value = false
    }
  }

  function porId(id: string): Produto | null {
    return itens.value.find((p) => p.id === id) ?? paginaItens.value.find((p) => p.id === id) ?? null
  }

  /** Busca um produto direto no banco (tela de edição). */
  async function buscarUm(id: string): Promise<Produto | null> {
    const { data, error } = await supabase
      .from('produtos')
      .select(COLUNAS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Produto) ?? null
  }

  async function criar(dados: ProdutoInput): Promise<Produto> {
    const { data, error } = await supabase.from('produtos').insert(dados as any).select(COLUNAS).single()
    if (error) throw error
    const novo = data as unknown as Produto
    itens.value = [novo, ...itens.value]
    return novo
  }

  /** Cria vários produtos numa tacada só — usado no cadastro em lote a partir de itens de pedido sem correspondência. Devolve na mesma ordem da lista enviada. */
  async function criarEmLote(lista: ProdutoInput[]): Promise<Produto[]> {
    if (!lista.length) return []
    const { data, error } = await supabase.from('produtos').insert(lista as any).select(COLUNAS)
    if (error) throw error
    const novos = (data as unknown as Produto[]) ?? []
    itens.value = [...novos, ...itens.value]
    return novos
  }

  async function atualizar(id: string, dados: ProdutoInput): Promise<Produto> {
    const { data, error } = await supabase
      .from('produtos')
      .update(dados)
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    const atualizado = data as unknown as Produto
    itens.value = itens.value.map((p) => (p.id === id ? atualizado : p))
    paginaItens.value = paginaItens.value.map((p) => (p.id === id ? atualizado : p))
    return atualizado
  }

  /**
   * Edição em massa: aplica os mesmos campos a vários produtos. Vai em lotes de ids (o filtro
   * `in` viaja na URL) e devolve quantos produtos o banco de fato alterou (a RLS pode barrar).
   */
  async function atualizarEmMassa(ids: string[], dados: Partial<ProdutoInput>): Promise<number> {
    let alterados = 0
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase
        .from('produtos')
        .update(dados as any)
        .in('id', ids.slice(i, i + 200))
        .select('id')
      if (error) throw error
      alterados += data?.length ?? 0
    }
    return alterados
  }

  async function remover(id: string): Promise<void> {
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) throw error
    itens.value = itens.value.filter((p) => p.id !== id)
    paginaItens.value = paginaItens.value.filter((p) => p.id !== id)
  }

  return {
    itens,
    carregando,
    filtros,
    carregar,
    garantirCatalogo,
    paginaItens,
    paginaAtual,
    porPagina,
    total,
    carregandoPagina,
    carregarPagina,
    porId,
    buscarUm,
    criar,
    criarEmLote,
    atualizar,
    atualizarEmMassa,
    remover
  }
}
