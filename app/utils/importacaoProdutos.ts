/**
 * Importação de produtos por planilha — regras puras (sem banco): colunas do modelo, leitura dos
 * títulos, validação de cada linha e decisão criar/atualizar. Quem grava é `useImportarProdutos`.
 *
 * Regras combinadas com o usuário:
 * - o SKU identifica o produto: já existe → atualiza; não existe (ou linha sem SKU) → cria;
 * - célula vazia não mexe no valor atual; coluna que não veio no arquivo também não;
 * - Marca, Fabricante, Montadora, Grupo e Subgrupo vêm pelo nome e são criados se não existirem;
 * - só a Descrição é obrigatória, e só pra produto novo.
 */

export type TipoColunaImportacao = 'texto' | 'numero' | 'nome' | 'origem' | 'ativo'

export type CampoImportacao =
  | 'sku'
  | 'descricao'
  | 'origem'
  | 'marca'
  | 'fabricante'
  | 'montadora'
  | 'oem'
  | 'grupo'
  | 'subgrupo'
  | 'aplicacao'
  | 'modelo'
  | 'numero_serie'
  | 'unidade'
  | 'peso'
  | 'altura'
  | 'largura'
  | 'comprimento'
  | 'caixa_master'
  | 'qtd_minima_venda'
  | 'codigo_barras'
  | 'ncm'
  | 'ipi'
  | 'ativo'

export interface ColunaImportacao {
  campo: CampoImportacao
  titulo: string
  tipo: TipoColunaImportacao
  ajuda: string
  exemplo: string
  /** Outros títulos aceitos (já normalizados com `normalizarTitulo`). */
  apelidos?: string[]
}

/** Colunas do modelo, na ordem em que saem na planilha. */
export const COLUNAS_IMPORTACAO_PRODUTOS: ColunaImportacao[] = [
  { campo: 'sku', titulo: 'SKU', tipo: 'texto', ajuda: 'Código interno. Se já existir no cadastro, o produto é atualizado; senão, é criado.', exemplo: 'PF-1020', apelidos: ['codigo', 'codigointerno'] },
  { campo: 'origem', titulo: 'Origem', tipo: 'origem', ajuda: 'Origem fiscal, de 0 a 8 (0 = Nacional, 1 = Estrangeira importação direta, 2 = Estrangeira mercado interno…).', exemplo: '0' },
  { campo: 'marca', titulo: 'Marca', tipo: 'nome', ajuda: 'Nome da marca. Se não existir, é criada.', exemplo: 'Bosch' },
  { campo: 'montadora', titulo: 'Montadora', tipo: 'nome', ajuda: 'Nome da montadora. Se não existir, é criada.', exemplo: 'Volkswagen' },
  { campo: 'oem', titulo: 'OEM', tipo: 'texto', ajuda: 'Código original da peça.', exemplo: '5U0698151', apelidos: ['codigooem'] },
  { campo: 'grupo', titulo: 'Grupo', tipo: 'nome', ajuda: 'Nome do grupo. Se não existir, é criado.', exemplo: 'Freios' },
  { campo: 'subgrupo', titulo: 'Subgrupo', tipo: 'nome', ajuda: 'Nome do subgrupo, dentro do Grupo da mesma linha (ou do grupo que o produto já tem). Se não existir, é criado.', exemplo: 'Pastilhas' },
  { campo: 'descricao', titulo: 'Descrição do produto', tipo: 'texto', ajuda: 'Obrigatória para produto novo (até 200 caracteres).', exemplo: 'Pastilha de freio dianteira', apelidos: ['descricao', 'produto', 'nome'] },
  { campo: 'aplicacao', titulo: 'Aplicação do produto', tipo: 'texto', ajuda: 'Veículos, modelos e anos em que o produto é usado.', exemplo: 'Gol G5/G6 1.0 2009-2016', apelidos: ['aplicacao'] },
  { campo: 'peso', titulo: 'Peso (kg)', tipo: 'numero', ajuda: 'Em quilos. Aceita vírgula.', exemplo: '0,850', apelidos: ['peso'] },
  { campo: 'altura', titulo: 'Altura (cm)', tipo: 'numero', ajuda: 'Em centímetros.', exemplo: '5', apelidos: ['altura'] },
  { campo: 'largura', titulo: 'Largura (cm)', tipo: 'numero', ajuda: 'Em centímetros.', exemplo: '12', apelidos: ['largura'] },
  { campo: 'comprimento', titulo: 'Comprimento (cm)', tipo: 'numero', ajuda: 'Em centímetros.', exemplo: '18', apelidos: ['comprimento'] },
  { campo: 'caixa_master', titulo: 'Caixa master', tipo: 'numero', ajuda: 'Quantas unidades vêm na caixa master.', exemplo: '20' },
  { campo: 'qtd_minima_venda', titulo: 'Qtd. mínima de venda', tipo: 'numero', ajuda: 'Quantidade mínima por venda.', exemplo: '2', apelidos: ['qtdminimodevendas', 'qtdminimadevendas', 'qtdminimodevenda', 'qtdminima', 'quantidademinima', 'quantidademinimadevenda'] },
  { campo: 'codigo_barras', titulo: 'Código de barras', tipo: 'texto', ajuda: 'EAN / GTIN. Deixe a coluna como Texto no Excel pra não perder zeros à esquerda.', exemplo: '7891234567890', apelidos: ['codigobarras', 'ean', 'gtin'] },
  { campo: 'ncm', titulo: 'NCM', tipo: 'texto', ajuda: 'Código NCM.', exemplo: '8708.30.90' },
  { campo: 'ipi', titulo: '% IPI', tipo: 'numero', ajuda: 'Alíquota em %, de 0 a 100.', exemplo: '5', apelidos: ['ipi', 'ipi%', 'aliquotaipi', 'aliquotadeipi'] },
  { campo: 'fabricante', titulo: 'Fabricante', tipo: 'nome', ajuda: 'Nome do fabricante. Se não existir, é criado.', exemplo: 'Robert Bosch Ltda' },
  { campo: 'modelo', titulo: 'Modelo', tipo: 'texto', ajuda: 'Modelo do produto.', exemplo: '' },
  { campo: 'numero_serie', titulo: 'Número de série', tipo: 'texto', ajuda: 'Número de série.', exemplo: '', apelidos: ['numeroserie', 'nserie', 'nºdeserie'] },
  { campo: 'unidade', titulo: 'Unidade', tipo: 'texto', ajuda: 'UN, CX, KG… Produto novo sem unidade fica UN.', exemplo: 'UN', apelidos: ['un'] },
  { campo: 'ativo', titulo: 'Ativo', tipo: 'ativo', ajuda: 'Sim ou Não. Produto novo sem essa coluna fica ativo.', exemplo: 'Sim', apelidos: ['situacao'] }
]

/** Os cadastros de apoio que entram pelo nome. */
export type CadastroApoio = 'marca' | 'fabricante' | 'montadora' | 'grupo'

/** "Descrição do Produto" → "descricaodoproduto" — títulos batem sem acento, espaço ou caixa. */
export function normalizarTitulo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%]/g, '')
}

/** Chave de comparação de nomes e SKUs: sem espaço nas pontas, sem caixa. */
export const chaveNome = (nome: string) => nome.trim().replace(/\s+/g, ' ').toLowerCase()

const COLUNA_POR_TITULO = new Map<string, ColunaImportacao>()
for (const c of COLUNAS_IMPORTACAO_PRODUTOS) {
  COLUNA_POR_TITULO.set(normalizarTitulo(c.titulo), c)
  for (const a of c.apelidos ?? []) COLUNA_POR_TITULO.set(a, c)
}

/** "1.234,5" ou "1234.5" → 1234.5; vazio → null; texto que não é número → NaN. */
export function textoParaNumero(texto: string): number | null {
  const t = texto.trim().replace(/\s/g, '')
  if (!t) return null
  const normalizado = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return /^\d+(\.\d+)?$/.test(normalizado) ? Number(normalizado) : NaN
}

/** Valores lidos de uma linha — só as células preenchidas das colunas reconhecidas. */
export interface CamposImportados {
  sku?: string
  descricao?: string
  oem?: string
  aplicacao?: string
  modelo?: string
  numero_serie?: string
  unidade?: string
  codigo_barras?: string
  ncm?: string
  origem?: number
  peso?: number
  altura?: number
  largura?: number
  comprimento?: number
  caixa_master?: number
  qtd_minima_venda?: number
  ipi?: number
  ativo?: boolean
  marca?: string
  fabricante?: string
  montadora?: string
  grupo?: string
  subgrupo?: string
}

export type AcaoImportacao = 'criar' | 'atualizar' | 'nada' | 'erro'

export interface LinhaImportacao {
  /** Número da linha no Excel (o título é a linha 1). */
  numero: number
  acao: AcaoImportacao
  /** Produto que vai ser atualizado. */
  produtoId: string | null
  /** Grupo que o produto já tem — decide o grupo do subgrupo e se o subgrupo antigo cai. */
  grupoAtualId: string | null
  /** Grupo (nome) dentro do qual o subgrupo da linha é procurado/criado. */
  grupoDoSubgrupo: string | null
  sku: string | null
  descricao: string | null
  erros: string[]
  campos: CamposImportados
}

export interface ProdutoExistente {
  id: string
  sku: string | null
  grupo_id: string | null
}

export interface ItemApoio {
  id: string
  nome: string
}

export interface SubgrupoApoio extends ItemApoio {
  grupo_id: string
}

export interface CadastrosApoio {
  marca: ItemApoio[]
  fabricante: ItemApoio[]
  montadora: ItemApoio[]
  grupo: ItemApoio[]
  subgrupo: SubgrupoApoio[]
}

export interface PlanoImportacao {
  /** Títulos do arquivo que viraram campo, já com o título oficial. */
  colunasReconhecidas: string[]
  /** Títulos do arquivo que não batem com nenhum campo (são ignorados). */
  colunasIgnoradas: string[]
  linhas: LinhaImportacao[]
  /** Nomes que não existem e serão criados (grafia da primeira vez que apareceu). */
  novos: Record<CadastroApoio, string[]> & { subgrupo: { grupo: string; nome: string }[] }
  totais: Record<AcaoImportacao, number>
}

export interface PermissoesImportacao {
  incluir: boolean
  editar: boolean
}

function celulaTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (valor instanceof Date) return valor.toISOString().slice(0, 10)
  return String(valor).trim()
}

function lerOrigem(texto: string): number | null {
  const m = /^([0-8])(\D|$)/.exec(texto.trim())
  return m ? Number(m[1]) : null
}

function lerAtivo(texto: string): boolean | null {
  const t = normalizarTitulo(texto)
  if (['sim', 's', 'ativo', '1', 'true', 'x', 'verdadeiro'].includes(t)) return true
  if (['nao', 'n', 'inativo', '0', 'false', 'falso'].includes(t)) return false
  return null
}

/**
 * Lê as linhas da planilha (primeira linha = títulos) e decide o que fazer com cada uma.
 * Não grava nada — é a prévia que o usuário confere antes de importar.
 */
export function planejarImportacaoProdutos(
  titulos: string[],
  linhasPlanilha: Record<string, unknown>[],
  existentes: ProdutoExistente[],
  apoio: CadastrosApoio,
  permissoes: PermissoesImportacao
): PlanoImportacao {
  const colunasReconhecidas: string[] = []
  const colunasIgnoradas: string[] = []
  const mapa: { titulo: string; coluna: ColunaImportacao }[] = []
  const camposVistos = new Set<CampoImportacao>()
  for (const titulo of titulos) {
    const coluna = COLUNA_POR_TITULO.get(normalizarTitulo(titulo))
    // coluna repetida no arquivo: vale a primeira
    if (!coluna || camposVistos.has(coluna.campo)) {
      if (titulo.trim() && !titulo.startsWith('__EMPTY')) colunasIgnoradas.push(titulo)
      continue
    }
    camposVistos.add(coluna.campo)
    colunasReconhecidas.push(coluna.titulo)
    mapa.push({ titulo, coluna })
  }

  // SKU → produtos do cadastro (pode haver mais de um com o mesmo SKU)
  const porSku = new Map<string, ProdutoExistente[]>()
  for (const p of existentes) {
    if (!p.sku?.trim()) continue
    const k = chaveNome(p.sku)
    porSku.set(k, [...(porSku.get(k) ?? []), p])
  }

  const nomeGrupoPorId = new Map(apoio.grupo.map((g) => [g.id, g.nome]))
  const existe = {
    marca: new Set(apoio.marca.map((i) => chaveNome(i.nome))),
    fabricante: new Set(apoio.fabricante.map((i) => chaveNome(i.nome))),
    montadora: new Set(apoio.montadora.map((i) => chaveNome(i.nome))),
    grupo: new Set(apoio.grupo.map((i) => chaveNome(i.nome))),
    subgrupo: new Set(
      apoio.subgrupo.map((s) => `${chaveNome(nomeGrupoPorId.get(s.grupo_id) ?? '')}|${chaveNome(s.nome)}`)
    )
  }

  const linhas: LinhaImportacao[] = []
  const skuNaPlanilha = new Map<string, number>()

  linhasPlanilha.forEach((bruta, i) => {
    const numero = i + 2
    const campos: CamposImportados = {}
    const erros: string[] = []

    for (const { titulo, coluna } of mapa) {
      const texto = celulaTexto(bruta[titulo])
      if (!texto) continue
      const c = coluna.campo as keyof CamposImportados

      if (coluna.tipo === 'numero') {
        const n = typeof bruta[titulo] === 'number' ? (bruta[titulo] as number) : textoParaNumero(texto)
        if (n === null) continue
        if (Number.isNaN(n) || n < 0) erros.push(`${coluna.titulo}: "${texto}" não é um número válido`)
        else if (coluna.campo === 'ipi' && n > 100) erros.push(`${coluna.titulo}: no máximo 100`)
        else (campos as any)[c] = n
      } else if (coluna.tipo === 'origem') {
        const o = lerOrigem(texto)
        if (o === null) erros.push(`Origem: "${texto}" — use um número de 0 a 8`)
        else campos.origem = o
      } else if (coluna.tipo === 'ativo') {
        const a = lerAtivo(texto)
        if (a === null) erros.push(`Ativo: "${texto}" — use Sim ou Não`)
        else campos.ativo = a
      } else {
        ;(campos as any)[c] = texto.replace(/\s+/g, ' ')
      }
    }

    // linha toda em branco: não entra na prévia
    if (!Object.keys(campos).length && !erros.length) return

    if (campos.descricao && campos.descricao.length > 200) erros.push('Descrição: mais de 200 caracteres')

    let produtoId: string | null = null
    let grupoAtualId: string | null = null
    if (campos.sku) {
      const k = chaveNome(campos.sku)
      const anterior = skuNaPlanilha.get(k)
      if (anterior) erros.push(`SKU repetido na planilha (já está na linha ${anterior})`)
      else skuNaPlanilha.set(k, numero)

      const achados = porSku.get(k) ?? []
      if (achados.length > 1) erros.push(`Há ${achados.length} produtos com esse SKU no cadastro`)
      else if (achados.length === 1) {
        produtoId = achados[0]!.id
        grupoAtualId = achados[0]!.grupo_id
      }
    }

    let grupoDoSubgrupo: string | null = null
    if (campos.subgrupo) {
      grupoDoSubgrupo = campos.grupo ?? (grupoAtualId ? nomeGrupoPorId.get(grupoAtualId) ?? null : null)
      if (!grupoDoSubgrupo) erros.push('Subgrupo sem Grupo: preencha o Grupo na mesma linha')
    }

    let acao: AcaoImportacao
    if (produtoId) {
      const muda = Object.keys(campos).some((c) => c !== 'sku')
      acao = muda ? 'atualizar' : 'nada'
      if (acao === 'atualizar' && !permissoes.editar) erros.push('Você não tem permissão para editar produtos')
    } else {
      acao = 'criar'
      if (!campos.descricao) erros.push('Descrição do produto é obrigatória para produto novo')
      if (!permissoes.incluir) erros.push('Você não tem permissão para incluir produtos')
    }
    if (erros.length) acao = 'erro'

    linhas.push({
      numero,
      acao,
      produtoId,
      grupoAtualId,
      grupoDoSubgrupo,
      sku: campos.sku ?? null,
      descricao: campos.descricao ?? null,
      erros,
      campos
    })
  })

  // o que vai ser criado nos cadastros de apoio — só das linhas que serão gravadas
  const novos: PlanoImportacao['novos'] = { marca: [], fabricante: [], montadora: [], grupo: [], subgrupo: [] }
  const jaListado = new Set<string>()
  for (const l of linhas) {
    if (l.acao !== 'criar' && l.acao !== 'atualizar') continue
    for (const tipo of ['marca', 'fabricante', 'montadora', 'grupo'] as const) {
      const nome = l.campos[tipo]
      if (!nome) continue
      const k = chaveNome(nome)
      if (existe[tipo].has(k) || jaListado.has(`${tipo}|${k}`)) continue
      jaListado.add(`${tipo}|${k}`)
      novos[tipo].push(nome)
    }
    if (l.campos.subgrupo && l.grupoDoSubgrupo) {
      const k = `${chaveNome(l.grupoDoSubgrupo)}|${chaveNome(l.campos.subgrupo)}`
      if (existe.subgrupo.has(k) || jaListado.has(`subgrupo|${k}`)) continue
      jaListado.add(`subgrupo|${k}`)
      novos.subgrupo.push({ grupo: l.grupoDoSubgrupo, nome: l.campos.subgrupo })
    }
  }

  const totais: Record<AcaoImportacao, number> = { criar: 0, atualizar: 0, nada: 0, erro: 0 }
  for (const l of linhas) totais[l.acao]++

  return { colunasReconhecidas, colunasIgnoradas, linhas, novos, totais }
}

/** Ids dos cadastros de apoio por nome — preenchido depois de criar os que faltam. */
export interface IdsApoio {
  marca: Map<string, string>
  fabricante: Map<string, string>
  montadora: Map<string, string>
  grupo: Map<string, string>
  /** chave `grupo|subgrupo` (com `chaveNome`) */
  subgrupo: Map<string, string>
}

const CAMPOS_DIRETOS = [
  'sku', 'descricao', 'oem', 'aplicacao', 'modelo', 'numero_serie', 'unidade', 'codigo_barras', 'ncm',
  'origem', 'peso', 'altura', 'largura', 'comprimento', 'caixa_master', 'qtd_minima_venda', 'ipi', 'ativo'
] as const

/**
 * O que vai pro banco a partir de uma linha: só os campos preenchidos (atualização) ou o
 * produto completo com padrões (criação — insert em lote precisa de todas as colunas).
 */
export function payloadDaLinha(linha: LinhaImportacao, ids: IdsApoio): Record<string, unknown> {
  const c = linha.campos
  const dados: Record<string, unknown> = {}
  for (const campo of CAMPOS_DIRETOS) if (c[campo] !== undefined) dados[campo] = c[campo]

  if (c.marca) dados.marca_id = ids.marca.get(chaveNome(c.marca)) ?? null
  if (c.fabricante) dados.fabricante_id = ids.fabricante.get(chaveNome(c.fabricante)) ?? null
  if (c.montadora) dados.montadora_id = ids.montadora.get(chaveNome(c.montadora)) ?? null
  if (c.grupo) dados.grupo_id = ids.grupo.get(chaveNome(c.grupo)) ?? null
  if (c.subgrupo && linha.grupoDoSubgrupo) {
    dados.subgrupo_id = ids.subgrupo.get(`${chaveNome(linha.grupoDoSubgrupo)}|${chaveNome(c.subgrupo)}`) ?? null
  } else if (dados.grupo_id !== undefined && dados.grupo_id !== linha.grupoAtualId) {
    // trocou de grupo sem dizer o subgrupo: o subgrupo antigo era do outro grupo
    dados.subgrupo_id = null
  }

  if (linha.acao !== 'criar') {
    // o SKU só identificou o produto — não regrava (evita trocar a grafia do cadastro)
    delete dados.sku
    return dados
  }

  return {
    sku: null,
    codigo_barras: null,
    marca_id: null,
    fabricante_id: null,
    modelo: null,
    numero_serie: null,
    ncm: null,
    origem: null,
    montadora_id: null,
    oem: null,
    grupo_id: null,
    subgrupo_id: null,
    aplicacao: null,
    peso: null,
    altura: null,
    largura: null,
    comprimento: null,
    caixa_master: null,
    qtd_minima_venda: null,
    ipi: null,
    ...dados,
    unidade: (dados.unidade as string | undefined) ?? 'UN',
    ativo: (dados.ativo as boolean | undefined) ?? true
  }
}
