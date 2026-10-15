import type {
  CadastroApoio,
  CadastrosApoio,
  IdsApoio,
  LinhaImportacao,
  PlanoImportacao,
  ProdutoExistente
} from '~/utils/importacaoProdutos'

const PAGINA = 1000
const LOTE_INSERT = 500
const ATUALIZACOES_SIMULTANEAS = 6

const TABELA_APOIO: Record<CadastroApoio, string> = {
  marca: 'marcas',
  fabricante: 'fabricantes',
  montadora: 'montadoras',
  grupo: 'grupos'
}

export interface FalhaImportacao {
  numero: number
  sku: string | null
  descricao: string | null
  motivo: string
}

export interface ResultadoImportacao {
  criados: number
  atualizados: number
  falhas: FalhaImportacao[]
}

/**
 * Importação de produtos por planilha: modelo pra baixar, contexto pra prévia (produtos e
 * cadastros de apoio da empresa) e gravação. As regras ficam em `utils/importacaoProdutos.ts`.
 * Grava pelo client do Supabase — a RLS vale como em qualquer cadastro.
 */
export function useImportarProdutos() {
  const supabase = useSupabaseClient()

  /** Busca tudo de uma tabela em páginas (o Supabase devolve no máximo 1000 por vez). */
  async function buscarTudo<T>(tabela: string, colunas: string): Promise<T[]> {
    const todos: T[] = []
    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .order('id', { ascending: true })
        .range(inicio, inicio + PAGINA - 1)
      if (error) throw error
      todos.push(...((data as unknown as T[]) ?? []))
      if (!data || data.length < PAGINA) return todos
    }
  }

  async function carregarContexto(): Promise<{ existentes: ProdutoExistente[]; apoio: CadastrosApoio }> {
    const [existentes, marca, fabricante, montadora, grupo, subgrupo] = await Promise.all([
      buscarTudo<ProdutoExistente>('produtos', 'id, sku, grupo_id'),
      buscarTudo<CadastrosApoio['marca'][number]>('marcas', 'id, nome'),
      buscarTudo<CadastrosApoio['fabricante'][number]>('fabricantes', 'id, nome'),
      buscarTudo<CadastrosApoio['montadora'][number]>('montadoras', 'id, nome'),
      buscarTudo<CadastrosApoio['grupo'][number]>('grupos', 'id, nome'),
      buscarTudo<CadastrosApoio['subgrupo'][number]>('subgrupos', 'id, nome, grupo_id')
    ])
    return { existentes, apoio: { marca, fabricante, montadora, grupo, subgrupo } }
  }

  /** Planilha com os títulos na aba Produtos e o que vai em cada coluna na aba Instruções. */
  async function baixarModelo() {
    const XLSX = await import('xlsx')
    const colunas = COLUNAS_IMPORTACAO_PRODUTOS

    const aba = XLSX.utils.aoa_to_sheet([colunas.map((c) => c.titulo)])
    aba['!cols'] = colunas.map((c) => ({ wch: Math.max(14, c.titulo.length + 4) }))

    const instrucoes = XLSX.utils.aoa_to_sheet([
      ['Coluna', 'O que preencher', 'Exemplo'],
      ...colunas.map((c) => [c.titulo, c.ajuda, c.exemplo]),
      [],
      ['Como funciona'],
      ['', 'Pode apagar as colunas que não for usar; a ordem das colunas não importa.'],
      ['', 'Célula vazia não altera o valor que o produto já tem.'],
      ['', 'Se o SKU já existir no cadastro, o produto é atualizado; senão, é criado.'],
      ['', 'Para produto novo, só a Descrição do produto é obrigatória.']
    ])
    instrucoes['!cols'] = [{ wch: 22 }, { wch: 90 }, { wch: 28 }]

    const planilha = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(planilha, aba, 'Produtos')
    XLSX.utils.book_append_sheet(planilha, instrucoes, 'Instruções')
    XLSX.writeFile(planilha, 'modelo-importacao-produtos.xlsx')
  }

  async function baixarFalhas(falhas: FalhaImportacao[]) {
    const XLSX = await import('xlsx')
    const aba = XLSX.utils.aoa_to_sheet([
      ['Linha', 'SKU', 'Descrição do produto', 'Motivo'],
      ...falhas.map((f) => [f.numero, f.sku ?? '', f.descricao ?? '', f.motivo])
    ])
    aba['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 40 }, { wch: 80 }]
    const planilha = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(planilha, aba, 'Erros')
    XLSX.writeFile(planilha, 'erros-importacao-produtos.xlsx')
  }

  /** Cria os nomes que faltam e devolve o mapa nome → id de todos os cadastros de apoio. */
  async function prepararApoio(plano: PlanoImportacao, apoio: CadastrosApoio): Promise<IdsApoio> {
    const ids: IdsApoio = {
      marca: new Map(),
      fabricante: new Map(),
      montadora: new Map(),
      grupo: new Map(),
      subgrupo: new Map()
    }
    for (const tipo of ['marca', 'fabricante', 'montadora', 'grupo'] as const) {
      for (const item of apoio[tipo]) if (!ids[tipo].has(chaveNome(item.nome))) ids[tipo].set(chaveNome(item.nome), item.id)
      const novos = plano.novos[tipo]
      if (!novos.length) continue
      const { data, error } = await supabase
        .from(TABELA_APOIO[tipo])
        .insert(novos.map((nome) => ({ nome })) as any)
        .select('id, nome')
      if (error) throw new Error(`Não foi possível criar ${tipo === 'grupo' ? 'os grupos' : `as ${tipo}s`}: ${error.message}`)
      for (const item of (data as any[]) ?? []) ids[tipo].set(chaveNome(item.nome), item.id)
    }

    const nomeGrupoPorId = new Map<string, string>()
    for (const [nome, id] of ids.grupo) nomeGrupoPorId.set(id, nome)
    for (const s of apoio.subgrupo) {
      const grupo = nomeGrupoPorId.get(s.grupo_id)
      if (grupo) ids.subgrupo.set(`${grupo}|${chaveNome(s.nome)}`, s.id)
    }
    const novosSub = plano.novos.subgrupo
      .map((s) => ({ nome: s.nome, grupo_id: ids.grupo.get(chaveNome(s.grupo)) }))
      .filter((s) => s.grupo_id)
    if (novosSub.length) {
      const { data, error } = await supabase.from('subgrupos').insert(novosSub as any).select('id, nome, grupo_id')
      if (error) throw new Error(`Não foi possível criar os subgrupos: ${error.message}`)
      for (const s of (data as any[]) ?? []) {
        const grupo = nomeGrupoPorId.get(s.grupo_id)
        if (grupo) ids.subgrupo.set(`${grupo}|${chaveNome(s.nome)}`, s.id)
      }
    }
    return ids
  }

  /**
   * Grava as linhas válidas da prévia: cria os cadastros de apoio que faltam, insere os produtos
   * novos em lotes e atualiza os existentes (só os campos preenchidos). Uma linha que falhar não
   * impede as outras; vai pra lista de falhas.
   */
  async function gravar(
    plano: PlanoImportacao,
    apoio: CadastrosApoio,
    aoProgredir: (feitas: number, total: number) => void
  ): Promise<ResultadoImportacao> {
    const novas = plano.linhas.filter((l) => l.acao === 'criar')
    const atualizacoes = plano.linhas.filter((l) => l.acao === 'atualizar')
    const total = novas.length + atualizacoes.length
    const resultado: ResultadoImportacao = { criados: 0, atualizados: 0, falhas: [] }
    const falhar = (l: LinhaImportacao, motivo: string) =>
      resultado.falhas.push({ numero: l.numero, sku: l.sku, descricao: l.descricao, motivo })

    let feitas = 0
    aoProgredir(feitas, total)
    const ids = await prepararApoio(plano, apoio)

    for (let i = 0; i < novas.length; i += LOTE_INSERT) {
      const lote = novas.slice(i, i + LOTE_INSERT)
      const { data, error } = await supabase
        .from('produtos')
        .insert(lote.map((l) => payloadDaLinha(l, ids)) as any)
        .select('id')
      if (error) {
        // lote recusado inteiro: tenta linha a linha pra saber qual deu problema
        for (const l of lote) {
          const { error: e } = await supabase.from('produtos').insert(payloadDaLinha(l, ids) as any)
          if (e) falhar(l, e.message)
          else resultado.criados++
        }
      } else {
        resultado.criados += data?.length ?? lote.length
      }
      feitas += lote.length
      aoProgredir(feitas, total)
    }

    let proxima = 0
    async function trabalhador() {
      while (proxima < atualizacoes.length) {
        const l = atualizacoes[proxima++]!
        const { data, error } = await supabase
          .from('produtos')
          .update(payloadDaLinha(l, ids) as any)
          .eq('id', l.produtoId!)
          .select('id')
        if (error) falhar(l, error.message)
        else if (!data?.length) falhar(l, 'Produto não foi atualizado (sem permissão ou excluído)')
        else resultado.atualizados++
        aoProgredir(++feitas, total)
      }
    }
    await Promise.all(Array.from({ length: ATUALIZACOES_SIMULTANEAS }, trabalhador))

    resultado.falhas.sort((a, b) => a.numero - b.numero)
    return resultado
  }

  return { carregarContexto, baixarModelo, baixarFalhas, gravar }
}
