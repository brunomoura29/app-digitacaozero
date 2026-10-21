import type { ItemApoio } from '~/utils/importacaoProdutos'
import { useAuthStore } from '~/stores/auth'
import type {
  ContextoImportacaoPrecos,
  LinhaImportacaoPreco,
  PlanoImportacaoPrecos,
  PrecoExistente,
  ProdutoDoCadastro
} from '~/utils/importacaoPrecos'

const PAGINA = 1000
const LOTE_GRAVACAO = 500
/** Chave do índice único `precos_produto_fabrica_ref_mes_uidx`. */
const CHAVE_PRECO = 'empresa_id,produto_id,fabrica_id,referencia_id,competencia'

export interface FiltrosModeloPrecos {
  q: string
  grupoId: string
  marcaId: string
  montadoraId: string
  apenasAtivos: boolean
}

export interface OpcoesModeloPrecos {
  fabrica: ItemApoio
  /** "YYYY-MM" */
  competenciaMes: string
  tabelas: ItemApoio[]
  filtros: FiltrosModeloPrecos
}

export interface FalhaImportacaoPreco {
  numero: number
  sku: string | null
  descricao: string | null
  motivo: string
}

export interface ResultadoImportacaoPrecos {
  criados: number
  substituidos: number
  falhas: FalhaImportacaoPreco[]
}

/**
 * Importação de preços por planilha: modelo já com os SKUs filtrados e o preço atual de cada
 * tabela, contexto pra prévia e gravação. As regras ficam em `utils/importacaoPrecos.ts`.
 * Grava pelo client do Supabase — a RLS vale como no cadastro manual.
 */
export function useImportarPrecos() {
  const supabase = useSupabaseClient()

  /** Busca em páginas de 1000 (limite do Supabase); `montar` recebe o intervalo. */
  async function buscarTudo<T>(montar: (de: number, ate: number) => PromiseLike<{ data: unknown; error: any }>): Promise<T[]> {
    const todos: T[] = []
    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await montar(inicio, inicio + PAGINA - 1)
      if (error) throw error
      const lista = (data as T[]) ?? []
      todos.push(...lista)
      if (lista.length < PAGINA) return todos
    }
  }

  /** Preços gravados das fábricas (e tabelas, se informadas), do mês mais novo pro mais velho. */
  function buscarPrecos(fabricaIds: string[], referenciaIds?: string[]): Promise<PrecoExistente[]> {
    if (!fabricaIds.length) return Promise.resolve([])
    return buscarTudo<PrecoExistente>((de, ate) => {
      let query = supabase
        .from('precos')
        .select('produto_id, fabrica_id, referencia_id, competencia, valor')
        .in('fabrica_id', fabricaIds)
      if (referenciaIds) query = query.in('referencia_id', referenciaIds)
      return query
        .order('competencia', { ascending: false })
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true })
        .range(de, ate)
    })
  }

  /** Cadastros que a prévia precisa: fábricas e tabelas (pra ler o arquivo) e os produtos. */
  async function carregarCadastros(): Promise<Omit<ContextoImportacaoPrecos, 'precos'>> {
    const [produtos, fabricas, referencias] = await Promise.all([
      buscarTudo<ProdutoDoCadastro>((de, ate) =>
        supabase.from('produtos').select('id, sku, descricao').order('id', { ascending: true }).range(de, ate)
      ),
      buscarTudo<ItemApoio>((de, ate) => supabase.from('fabricas').select('id, nome').order('id').range(de, ate)),
      buscarTudo<ItemApoio>((de, ate) => supabase.from('referencias_tabela').select('id, nome').order('id').range(de, ate))
    ])
    return { produtos, fabricas, referencias }
  }

  /**
   * Baixa o modelo: um SKU por linha (com os filtros do modal), fábrica e data já preenchidas e,
   * em cada tabela, o preço atual daquela fábrica. Devolve quantas linhas saíram e quantos
   * produtos ficaram de fora por não ter SKU.
   */
  async function baixarModelo(opcoes: OpcoesModeloPrecos): Promise<{ linhas: number; semSku: number }> {
    const { fabrica, competenciaMes, tabelas, filtros } = opcoes
    const [produtos, precos] = await Promise.all([
      buscarTudo<ProdutoDoCadastro>((de, ate) => {
        let query = supabase.from('produtos').select('id, sku, descricao')
        const termo = filtros.q.trim()
        if (termo) query = query.or(filtroContemEm(['descricao', 'sku', 'oem', 'codigo_barras'], termo))
        if (filtros.grupoId) query = query.eq('grupo_id', filtros.grupoId)
        if (filtros.marcaId) query = query.eq('marca_id', filtros.marcaId)
        if (filtros.montadoraId) query = query.eq('montadora_id', filtros.montadoraId)
        if (filtros.apenasAtivos) query = query.eq('ativo', true)
        return query.order('descricao', { ascending: true }).order('id', { ascending: true }).range(de, ate)
      }),
      buscarPrecos(
        [fabrica.id],
        tabelas.map((t) => t.id)
      )
    ])

    // preço atual = o mais novo (a lista já vem do mais novo pro mais velho)
    const atual = new Map<string, number>()
    for (const p of precos) {
      const k = `${p.produto_id}|${p.referencia_id}`
      if (!atual.has(k)) atual.set(k, Number(p.valor))
    }

    const comSku = produtos.filter((p) => p.sku?.trim())
    const XLSX = await import('xlsx')
    const titulos = [
      TITULOS_MODELO_PRECOS.sku,
      TITULOS_MODELO_PRECOS.descricao,
      TITULOS_MODELO_PRECOS.fabrica,
      TITULOS_MODELO_PRECOS.competencia,
      ...tabelas.map((t) => t.nome)
    ]
    const aba = XLSX.utils.aoa_to_sheet([
      titulos,
      ...comSku.map((p) => [
        p.sku!.trim(),
        p.descricao,
        fabrica.nome,
        null,
        ...tabelas.map((t) => atual.get(`${p.id}|${t.id}`) ?? null)
      ])
    ])

    // data como número de série do Excel montado à mão (Date passaria pelo fuso e podia virar
    // o último dia do mês anterior); preço com 2 casas
    const serial = competenciaParaSerialExcel(competenciaMes)
    for (let r = 1; r <= comSku.length; r++) {
      aba[XLSX.utils.encode_cell({ r, c: 3 })] = { t: 'n', v: serial, z: 'dd/mm/yyyy' }
      for (let c = 4; c < titulos.length; c++) {
        const celula = aba[XLSX.utils.encode_cell({ r, c })]
        if (celula?.t === 'n') celula.z = '#,##0.00'
      }
    }
    aba['!cols'] = [{ wch: 18 }, { wch: 50 }, { wch: 22 }, { wch: 16 }, ...tabelas.map((t) => ({ wch: Math.max(14, t.nome.length + 4) }))]
    aba['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: comSku.length, c: titulos.length - 1 } }) }

    const instrucoes = XLSX.utils.aoa_to_sheet([
      ['Coluna', 'O que preencher'],
      [TITULOS_MODELO_PRECOS.sku, 'SKU do produto, como está no cadastro. Não altere.'],
      [TITULOS_MODELO_PRECOS.descricao, 'Só para conferência — é ignorada na importação.'],
      [TITULOS_MODELO_PRECOS.fabrica, 'Nome da fábrica, como está no cadastro.'],
      [TITULOS_MODELO_PRECOS.competencia, 'Qualquer dia do mês de competência (ex: 01/11/2026). Vale o mês.'],
      ['Uma coluna por tabela', 'O título é o nome da tabela de preço cadastrada; o valor é o preço em R$.'],
      [],
      ['Como funciona'],
      ['', 'O modelo já sai com o preço atual de cada tabela. Altere só o que mudou.'],
      ['', 'Célula de preço vazia não altera nada.'],
      ['', 'Se já existir preço do mesmo SKU, fábrica, tabela e mês, o valor é substituído.'],
      ['', 'Preço igual ao atual não é gravado de novo.'],
      ['', 'Coluna com nome de tabela que não existe é ignorada — crie a tabela antes, no modal de importação.']
    ])
    instrucoes['!cols'] = [{ wch: 24 }, { wch: 100 }]

    const planilha = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(planilha, aba, 'Preços')
    XLSX.utils.book_append_sheet(planilha, instrucoes, 'Instruções')
    const nomeFabrica = chaveNome(fabrica.nome).normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    XLSX.writeFile(planilha, `precos-${nomeFabrica || 'fabrica'}-${competenciaMes}.xlsx`)

    return { linhas: comSku.length, semSku: produtos.length - comSku.length }
  }

  async function baixarFalhas(falhas: FalhaImportacaoPreco[]) {
    const XLSX = await import('xlsx')
    const aba = XLSX.utils.aoa_to_sheet([
      ['Linha', 'SKU', 'Descrição', 'Motivo'],
      ...falhas.map((f) => [f.numero, f.sku ?? '', f.descricao ?? '', f.motivo])
    ])
    aba['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 40 }, { wch: 80 }]
    const planilha = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(planilha, aba, 'Erros')
    XLSX.writeFile(planilha, 'erros-importacao-precos.xlsx')
  }

  /**
   * Grava os preços da prévia em lotes: novos com insert, substituídos com upsert na chave
   * produto + fábrica + tabela + mês. Lote recusado é refeito linha a linha pra apontar qual falhou.
   */
  async function gravar(
    plano: PlanoImportacaoPrecos,
    aoProgredir: (feitas: number, total: number) => void
  ): Promise<ResultadoImportacaoPrecos> {
    const hoje = new Date().toLocaleDateString('sv-SE')
    // vai explícito: é parte da chave do upsert (a RLS confere que é a empresa do usuário)
    const empresaId = useAuthStore().perfil?.empresa_id
    if (!empresaId) throw new Error('Perfil não carregado — recarregue a página')
    type Registro = { linha: LinhaImportacaoPreco; dados: Record<string, unknown> }
    const novos: Registro[] = []
    const substituidos: Registro[] = []
    for (const linha of plano.linhas) {
      for (const p of linha.precos) {
        if (p.acao === 'nada') continue
        const dados = {
          empresa_id: empresaId,
          produto_id: linha.produtoId,
          fabrica_id: linha.fabricaId,
          referencia_id: p.referenciaId,
          competencia: linha.competencia,
          valor: p.valor,
          data_registro: hoje
        }
        ;(p.acao === 'criar' ? novos : substituidos).push({ linha, dados })
      }
    }

    const total = novos.length + substituidos.length
    const resultado: ResultadoImportacaoPrecos = { criados: 0, substituidos: 0, falhas: [] }
    const linhasComFalha = new Map<number, FalhaImportacaoPreco>()
    const falhar = (l: LinhaImportacaoPreco, motivo: string) => {
      const ja = linhasComFalha.get(l.numero)
      if (ja) {
        if (!ja.motivo.includes(motivo)) ja.motivo += `; ${motivo}`
      } else linhasComFalha.set(l.numero, { numero: l.numero, sku: l.sku, descricao: l.descricao, motivo })
    }

    let feitas = 0
    aoProgredir(feitas, total)

    async function enviar(registros: Registro[], substituir: boolean) {
      const mandar = (lista: Record<string, unknown>[]) =>
        substituir
          ? supabase.from('precos').upsert(lista as any, { onConflict: CHAVE_PRECO }).select('id')
          : supabase.from('precos').insert(lista as any).select('id')
      for (let i = 0; i < registros.length; i += LOTE_GRAVACAO) {
        const lote = registros.slice(i, i + LOTE_GRAVACAO)
        const { data, error } = await mandar(lote.map((r) => r.dados))
        let ok = 0
        if (error) {
          for (const r of lote) {
            const { error: e } = await mandar([r.dados])
            if (e) falhar(r.linha, traduzirErro(e))
            else ok++
          }
        } else {
          ok = data?.length ?? lote.length
        }
        if (substituir) resultado.substituidos += ok
        else resultado.criados += ok
        feitas += lote.length
        aoProgredir(feitas, total)
      }
    }

    await enviar(novos, false)
    await enviar(substituidos, true)

    resultado.falhas = [...linhasComFalha.values()].sort((a, b) => a.numero - b.numero)
    return resultado
  }

  return { carregarCadastros, buscarPrecos, baixarModelo, baixarFalhas, gravar }
}

function traduzirErro(e: { code?: string; message: string }): string {
  if (e.code === '23505') return 'Já existe preço desse SKU nessa fábrica, tabela e mês (importe de novo para substituir)'
  if (e.code === '42501') return 'Sem permissão para gravar o preço'
  return e.message
}
