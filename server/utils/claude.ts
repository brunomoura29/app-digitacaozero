import Anthropic from '@anthropic-ai/sdk'
import type { AnaliseLayout, CampoSchema, SchemaModelo, TipoCampo } from '~/types/modelo'
import { ESTILOS_BLOCO, ICONES_BLOCO, IDS_CORES } from '#shared/utils/relatorios'

let clienteAnthropic: Anthropic | null = null

function getClient(): Anthropic {
  if (!clienteAnthropic) clienteAnthropic = new Anthropic()
  return clienteAnthropic
}

function tipoParaJsonSchema(tipo: TipoCampo): Record<string, unknown> {
  switch (tipo) {
    case 'numero':
    case 'moeda':
      return { type: 'number' }
    case 'data':
      return { type: 'string', format: 'date' }
    case 'booleano':
      return { type: 'boolean' }
    default:
      return { type: 'string' }
  }
}

function propriedadesDeCampos(campos: CampoSchema[]) {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const campo of campos) {
    properties[campo.id] = { ...tipoParaJsonSchema(campo.tipo), description: campo.nome }
    if (campo.obrigatorio) required.push(campo.id)
  }
  return { properties, required }
}

/**
 * Monta o JSON Schema pra guiar a extração: o cabeçalho (`campos`) segue fixo pelo que o
 * template define, mas os ITENS não — em vez de forçar a IA a encaixar cada linha nos
 * campos do template (o que obrigava ela a "adivinhar" qual coluna do documento
 * corresponde a qual campo, mal resolvido quando há colunas parecidas tipo "SKU Fábrica" x
 * "SKU Cliente"), pede a tabela de itens EXATAMENTE como impressa no documento — colunas
 * livres + uma linha de valores por item, na mesma ordem das colunas. Quem decide depois
 * qual coluna do documento vira qual campo do template é o usuário, na tela de mapeamento.
 */
function montarJsonSchemaExtracao(camposCabecalho: CampoSchema[]) {
  const cabecalho = propriedadesDeCampos(camposCabecalho)

  return {
    type: 'object',
    properties: {
      campos: {
        type: 'object',
        properties: cabecalho.properties,
        required: cabecalho.required,
        additionalProperties: false
      },
      colunas_item: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Nomes das colunas da tabela de itens/produtos, exatamente como aparecem impressas no cabeçalho da tabela do documento (ex: "SKU", "Descrição", "Qtd.", "Preço Unit.").'
      },
      itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            valores: {
              type: 'array',
              items: { type: 'string' },
              description: 'Valores dessa linha da tabela, na MESMA ORDEM de "colunas_item" — um valor por coluna.'
            }
          },
          required: ['valores'],
          additionalProperties: false
        }
      }
    },
    required: ['campos', 'colunas_item', 'itens'],
    additionalProperties: false
  }
}

export interface ResultadoExtracao {
  campos: Record<string, unknown>
  /** Nomes das colunas da tabela de itens, como impressas no documento (não os campos do template). */
  colunasItem: string[]
  /** Uma linha por item, já zipada coluna→valor (chaves = `colunasItem`). */
  linhas: Record<string, unknown>[]
}

function construirBlocoArquivo(arquivoBuffer: Buffer, mediaType: string, tipoOrigem: 'imagem' | 'pdf') {
  const base64 = arquivoBuffer.toString('base64')
  return tipoOrigem === 'pdf'
    ? {
        type: 'document' as const,
        source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 }
      }
    : {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64
        }
      }
}

export interface ResultadoLegibilidade {
  legivel: boolean
  motivo?: string
}

/**
 * Checagem rápida e barata (Haiku) antes da extração completa (Opus, ~8000 tokens de saída):
 * recusa gastar o token caro de extração em arquivo ilegível, borrado, em branco ou que
 * claramente não é um documento de pedido. Em caso de dúvida ou falha da própria checagem,
 * falha aberto (deixa passar) — o objetivo é economizar, não virar um novo ponto de falha
 * que bloqueia extrações válidas.
 */
export async function verificarLegibilidade(opts: {
  arquivoBuffer: Buffer
  mediaType: string
  tipoOrigem: 'imagem' | 'pdf'
  /** Template de "dados para análise": qualquer documento com tabela vale, não só pedido. */
  generico?: boolean
}): Promise<ResultadoLegibilidade> {
  const blocoArquivo = construirBlocoArquivo(opts.arquivoBuffer, opts.mediaType, opts.tipoOrigem)
  const tipoDocumento = opts.generico
    ? 'um documento com dados em tabela (balancete, relatório, extrato, listagem, planilha impressa etc.)'
    : 'um documento de pedido de compra (nota, orçamento, pedido, planilha impressa etc.)'

  try {
    const response = await getClient().messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system:
          'Você faz uma checagem rápida de qualidade antes de uma extração de dados mais cara. ' +
          `Diga se o arquivo é ${tipoDocumento} ` +
          'legível o suficiente pra extrair dados — texto/números visíveis, página ' +
          'certa, não cortado, não borrado/escuro demais, não em branco. Seja permissivo: fotos ' +
          'tortas ou com qualidade mediana mas legíveis devem passar. Só reprove casos claros.',
        messages: [
          {
            role: 'user',
            content: [blocoArquivo, { type: 'text', text: 'Esse arquivo está legível o suficiente pra extrair dados dele?' }]
          }
        ],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                legivel: { type: 'boolean' },
                motivo: { type: 'string', description: 'Motivo curto quando não estiver legível; vazio quando legível' }
              },
              required: ['legivel', 'motivo'],
              additionalProperties: false
            }
          }
        }
      },
      { maxRetries: 2, timeout: 45_000 }
    )

    if (response.stop_reason === 'refusal') return { legivel: true }

    const blocoTexto = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    if (!blocoTexto) return { legivel: true }

    return JSON.parse(blocoTexto.text) as ResultadoLegibilidade
  } catch {
    return { legivel: true }
  }
}

const SISTEMA_LAYOUT = `Você analisa o layout de planilhas Excel que clientes enviam "do jeito deles": relatórios exportados de sistemas, com dados da empresa no topo, títulos de coluna no meio da página, subtotais e rodapés.

Você recebe os campos de um template (o que o usuário quer extrair) e uma AMOSTRA da planilha, célula por célula, com o número da linha e a letra da coluna. Você NÃO copia valores: descreve COMO ler a planilha, e um programa aplica a sua descrição ao arquivo inteiro. Por isso responda sempre com números de linha e letras de coluna exatamente como aparecem na amostra.

Como o programa lê, e o que cada parte da sua resposta controla:

- linha_titulos: a linha onde estão os títulos das colunas da tabela principal. Os dados começam na linha seguinte. Se o título de cada coluna está partido em duas linhas (ex: "Saldo" em cima e "Débito" / "Crédito" embaixo), informe a linha DE BAIXO e marque titulos_em_duas_linhas.

- campos: para cada campo do template que existe na planilha, de onde sai o valor.
  - origem "coluna": o valor está nas células. Em "colunas", liste as letras onde os VALORES aparecem nas linhas de dado — pode não ser a mesma coluna do título (título mesclado). Se a mesma informação vem recuada em várias colunas do Excel, uma por nível (comum em plano de contas: o nome da conta mais à direita quanto mais fundo o nível), liste todas: o programa junta numa coluna só.
  - origem "nivel": só quando existe uma coluna recuada em níveis como a descrita acima. O programa calcula o nível da linha (1 = mais à esquerda). Use pra um campo que pede o nível / grau / hierarquia. Em "colunas", as mesmas letras da coluna recuada.
  - origem "tipo_linha": também só com coluna recuada. O programa calcula "Total" (linha que tem linhas de nível mais fundo logo abaixo — conta sintética) ou "Detalhe" (conta analítica). Use pra um campo que pede tipo de linha / sintética ou analítica / total ou detalhe. Em "colunas", as mesmas letras.
  - origem "ancestral": também só com coluna recuada. O programa repete em cada linha o texto da linha-mãe de um nível (em "nivel": 1 = o mais alto, 2 = o seguinte...). Ex: com nivel 1, todas as contas dentro de "ATIVO" recebem "ATIVO", e a própria linha "ATIVO" também. Serve pra filtrar depois "tudo que está dentro de X": é o que atende pedidos como "repita pra baixo a conta X" ou "quero saber a que grupo cada conta pertence". O nível certo é o da linha X na amostra (conte em qual das colunas recuadas o texto dela está). Não existe pro último nível. Em "colunas", as mesmas letras da coluna recuada.
  - origem "grupo": o valor é o título de grupo que vale pra linha (ver coluna_grupo). "colunas" fica vazio.
  - Campo sem correspondência na planilha: deixe FORA da lista. Não force uma coluna parecida.
  - "nivel" só é usado na origem "ancestral"; nas outras, mande 0.
  Case pelo significado, não só pelo nome: "Vl. Saldo Ant." é "Saldo Anterior", "Cód. Reduzido" pode ser "Código".

- ignorar: linhas de subtotal, total geral ou saldo que aparecem no meio ou no fim dos dados COM valores nas colunas, e que duplicariam a soma. Cada regra é uma coluna + um texto que aparece nela nessas linhas (ex: coluna "B", contém "Total do grupo"). Use um texto específico, que não apareça em linha de dado legítima. NÃO use isso pra contas sintéticas de uma coluna recuada em níveis — essas ficam, e são separadas pelo "tipo_linha". Linhas vazias, rodapés em célula mesclada e títulos repetidos a cada página o programa já descarta sozinho.

- coluna_grupo: quando há linhas com UMA célula só que dão nome a um bloco (ex: "Filial 01", "Centro de custo: Vendas") e valem pras linhas de baixo, a letra da coluna onde esse texto aparece. Senão, "".

- resumo: 2 a 4 frases curtas, em português simples, pra quem não é técnico: onde estão os títulos, o que foi ligado a quê, o que fica de fora. Se algum campo do template ficou sem coluna, ou se você ficou em dúvida, diga qual.

- confianca: "alta" quando o layout é claro; "media" quando há ambiguidade em um ou dois campos; "baixa" quando a amostra não parece ter uma tabela que atenda o template.

INSTRUÇÕES DO USUÁRIO E ETAPAS DE TRATAMENTO

Junto com os campos pode vir um texto livre em que o usuário diz como trataria o arquivo antes de analisar os dados — é o raciocínio dele, e você deve segui-lo. Leia a instrução, olhe a amostra e o template, e traduza o pedido em "etapas": passos que o programa executa em TODAS as linhas, na ordem, depois de ler a planilha e antes de ligar os campos (como as etapas aplicadas do Power Query). Sem instrução, ou quando a ligação de campos acima já resolve o pedido, "etapas" fica vazia — não invente tratamento que ninguém pediu.

Tipos de etapa:
- "coluna": cria uma coluna nova, com o nome em "nome" e o valor de cada linha calculado por "formula". Com "repetir_abaixo" verdadeiro, onde a fórmula der vazio a linha recebe o último valor não vazio de cima (preencher pra baixo). Pra o valor chegar ao Power BI, ligue um campo do template a ela: em "campos", origem "calculada" e "coluna_calculada" = o mesmo nome.
- "manter": fica só com as linhas em que a fórmula é verdadeira.
- "remover": tira as linhas em que a fórmula é verdadeira.
Em "manter" e "remover", "nome" fica "" e "repetir_abaixo" falso. Em toda etapa, "explicacao" diz em uma frase simples o que ela faz.

Linguagem das fórmulas (parecida com o Excel em português; só existe o que está listado aqui):
- Referências, sempre entre colchetes: [M] = valor da coluna M do Excel na linha (numa coluna recuada em níveis, qualquer uma das letras dela devolve o texto da linha); [#nivel] = nível da linha (1, 2, 3...); [#tipo] = "Total" ou "Detalhe"; [#mae1], [#mae2]... = texto da linha-mãe daquele nível; [#grupo] = título de grupo da linha; [@Nome] = coluna criada por uma etapa anterior; [!Rótulo] = informação solta acima da linha dos títulos, numa linha com um rótulo e o valor ao lado (ex: a linha A="Período:" G="01/09/2023 - 30/09/2023" é lida com [!Período]; A="C.N.P.J.:" com [!CNPJ]) — é o mesmo valor em todas as linhas, e serve pra levar empresa, CNPJ ou período pra cada linha.
- Valores: números com ponto decimal (1234.5), texto entre aspas duplas ("Receita"), VERDADEIRO, FALSO.
- Operadores: + - * / pra contas; & junta textos; = <> < > <= >= comparam. Comparação de texto ignora maiúsculas e acentos.
- Funções, com argumentos separados por ponto e vírgula: SE(condição; então; senão), E(a; b; ...), OU(a; b; ...), NAO(a), VAZIO(x), CONTEM(texto; trecho), COMECA(texto; trecho), TERMINA(texto; trecho), MAIUSCULA(t), MINUSCULA(t), ARRUMAR(t) (tira espaços sobrando), TAMANHO(t), ESQUERDA(t; n), DIREITA(t; n), TROCAR(t; de; para), TEXTO(x), NUMERO(x), ABS(x), ARREDONDAR(x; casas).
- Conta com célula vazia ou texto dá vazio. Número negativo: use 0 - [M] ou -[M].

Exemplos:
- "inverta o sinal do saldo": coluna "Saldo ajustado", fórmula -[S]; ligue o campo de saldo a ela em vez da coluna S.
- "quero só as contas de resultado": manter, fórmula CONTEM([#mae1]; "RESULTADO").
- "tire as contas sem movimento": remover, fórmula E(NUMERO([N]) = 0; NUMERO([P]) = 0).
- "classifique em Receita ou Despesa pelo sinal": coluna "Natureza", fórmula SE(NUMERO([S]) < 0; "Receita"; "Despesa").
- "margem em % sobre a venda": coluna "Margem %", fórmula ARREDONDAR(([D] - [E]) / [D] * 100; 2).
- "o nome da filial só aparece na primeira linha de cada bloco, repita": coluna "Filial", fórmula [B], repetir_abaixo verdadeiro.
- "quero a data de início do período em cada linha" (com A="Período:" G="01/09/2023 - 30/09/2023" no topo): coluna "Início do período", fórmula ESQUERDA([!Período]; 10).
- "marque as contas de pessoal": coluna "É pessoal", fórmula SE(OU(CONTEM([J]; "SALÁRIO"); CONTEM([J]; "INSS"); CONTEM([J]; "FGTS")); "Sim"; "Não").

Regras:
- Toda informação nova por linha precisa de um campo do template pra recebê-la. Ligue ao campo cujo nome combina. Se não houver nenhum, NÃO reaproveite um campo de outra coisa: crie a etapa mesmo assim, deixe-a sem campo e diga no resumo que falta criar um campo no template, sugerindo um nome.
- As etapas trabalham linha a linha. O programa NÃO soma nem compara várias linhas entre si (totais, médias, percentual sobre o total, saldo acumulado), não cruza com outro arquivo e não transforma colunas em linhas. Se a instrução pedir isso, não finja nem aproxime: diga no resumo, em uma frase, o que não foi feito e que dá pra fazer no Power BI.
- No resumo, conte também o que cada etapa faz, na linguagem do usuário.`

function esquemaLayout(idsCampos: string[]) {
  const letra = { type: 'string', description: 'Letra da coluna do Excel, como na amostra (ex: "A", "M", "AB").' }
  return {
    type: 'object',
    properties: {
      linha_titulos: { type: 'integer', description: 'Número da linha dos títulos, como na amostra.' },
      titulos_em_duas_linhas: { type: 'boolean' },
      campos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            campo_id: { type: 'string', enum: idsCampos },
            origem: { type: 'string', enum: ['coluna', 'nivel', 'tipo_linha', 'ancestral', 'grupo', 'calculada'] },
            colunas: { type: 'array', items: letra },
            nivel: { type: 'integer', description: 'Só na origem "ancestral": nível da linha-mãe (1 = o mais alto). Nas outras, 0.' },
            coluna_calculada: {
              type: 'string',
              description: 'Só na origem "calculada": o "nome" da etapa que cria a coluna. Nas outras, "".'
            }
          },
          required: ['campo_id', 'origem', 'colunas', 'nivel', 'coluna_calculada'],
          additionalProperties: false
        }
      },
      etapas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: ['coluna', 'manter', 'remover'] },
            nome: { type: 'string' },
            formula: { type: 'string' },
            repetir_abaixo: { type: 'boolean' },
            explicacao: { type: 'string' }
          },
          required: ['tipo', 'nome', 'formula', 'repetir_abaixo', 'explicacao'],
          additionalProperties: false
        }
      },
      ignorar: {
        type: 'array',
        items: {
          type: 'object',
          properties: { coluna: letra, contem: { type: 'string' } },
          required: ['coluna', 'contem'],
          additionalProperties: false
        }
      },
      coluna_grupo: { type: 'string', description: 'Letra da coluna dos títulos de grupo, ou "" quando não há.' },
      resumo: { type: 'string' },
      confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] }
    },
    required: ['linha_titulos', 'titulos_em_duas_linhas', 'campos', 'etapas', 'ignorar', 'coluna_grupo', 'resumo', 'confianca'],
    additionalProperties: false
  }
}

const NOME_TIPO: Record<TipoCampo, string> = {
  texto: 'texto',
  numero: 'número',
  moeda: 'valor em dinheiro',
  data: 'data',
  booleano: 'sim/não'
}

/**
 * Lê o LAYOUT de uma planilha (não os dados): a partir de uma amostra das células, diz onde
 * estão os títulos, que coluna alimenta cada campo do template e quais linhas ficam de fora.
 * Quem extrai os valores depois é o código (utils/gradePlanilha.ts), no arquivo inteiro — a
 * IA nunca copia número, então não tem como trocar um dígito nem pular linha.
 */
export async function analisarLayoutPlanilha(opts: {
  campos: CampoSchema[]
  amostra: string
  /** Dicas do template — valem pra todos os clientes. */
  dicas?: string
  /** O que o usuário pediu pra este cliente/arquivo, na tela de importação. */
  instrucoes?: string
}): Promise<AnaliseLayout> {
  const listaCampos = opts.campos
    .map((c) => `- id "${c.id}": ${c.nome} (${NOME_TIPO[c.tipo]}${c.obrigatorio ? ', obrigatório' : ''})`)
    .join('\n')
  const dicas =
    (opts.dicas?.trim() ? `\n\nInstruções do usuário pra este template (valem pra todos os arquivos): ${opts.dicas.trim()}` : '') +
    (opts.instrucoes?.trim() ? `\n\nInstruções do usuário pra este arquivo: ${opts.instrucoes.trim()}` : '')

  const response = await getClient().beta.messages.create(
    {
      model: 'claude-opus-5-5',
      max_tokens: 16_000,
      // se o modelo recusar por política, a própria API refaz o pedido num modelo substituto
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      system: SISTEMA_LAYOUT,
      messages: [
        {
          role: 'user',
          content: `Campos do template:\n${listaCampos}${dicas}\n\nAmostra da planilha:\n${opts.amostra}`
        }
      ],
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: esquemaLayout(opts.campos.map((c) => c.id)) }
      }
    },
    { maxRetries: 2, timeout: 120_000 }
  )

  if (response.stop_reason === 'refusal') throw new Error('A IA recusou analisar essa planilha.')
  if (response.stop_reason === 'max_tokens') throw new Error('A análise do layout ficou longa demais.')

  const blocoTexto = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
  if (!blocoTexto) throw new Error('A análise do layout não retornou nada.')

  try {
    return JSON.parse(blocoTexto.text) as AnaliseLayout
  } catch {
    throw new Error('A análise do layout retornou um formato inesperado.')
  }
}

/**
 * Extrai dados estruturados de uma imagem ou PDF via Claude Vision, guiado pelo
 * schema do template escolhido. Documento de várias páginas/muitos itens pode
 * legitimamente gerar uma resposta longa e demorar bastante — por isso usa streaming
 * (evita a conexão cair por inatividade em respostas longas, como recomendado pro SDK
 * quando `max_tokens` é alto) e um teto de saída generoso (64k) pra não truncar o JSON
 * no meio de um pedido com muitos itens.
 */
export async function extrairDocumento(opts: {
  schema: SchemaModelo
  dicas?: string
  arquivoBuffer: Buffer
  mediaType: string
  tipoOrigem: 'imagem' | 'pdf'
  /** Template de "dados para análise": a tabela é de dados quaisquer, não de itens de pedido. */
  generico?: boolean
}): Promise<ResultadoExtracao> {
  const tipoDocumento = opts.generico ? 'documentos com dados em tabela' : 'documentos de pedido de compra'
  const tipoLinha = opts.generico ? 'registro da tabela' : 'produto'
  const jsonSchema = montarJsonSchemaExtracao(opts.schema.campos)
  const blocoArquivo = construirBlocoArquivo(opts.arquivoBuffer, opts.mediaType, opts.tipoOrigem)

  const dicasTexto = opts.dicas?.trim() ? `\n\nDicas adicionais pra essa extração: ${opts.dicas.trim()}` : ''

  const stream = getClient().messages.stream(
    {
      model: 'claude-opus-5',
      max_tokens: 64_000,
      system:
        `Você extrai dados estruturados de ${tipoDocumento} (foto ou PDF). ` +
        'Em "campos", extraia SOMENTE os campos definidos no schema — nunca invente valores ' +
        'que não estão no documento; deixe vazio/null quando não encontrar. ' +
        'Em "colunas_item"/"itens", extraia a TABELA DE ITENS exatamente como impressa no ' +
        'documento: primeiro liste os nomes das colunas (cabeçalho da tabela, palavra por ' +
        'palavra como aparece — não traduza nem renomeie), depois uma entrada por linha de ' +
        `${tipoLinha}, com os valores na MESMA ORDEM das colunas. Não tente decidir qual coluna ` +
        '"significa" o quê nem descartar colunas — extraia todas, mesmo repetidas ou parecidas ' +
        '(ex: se houver "Código Fábrica" e "Código Cliente", extraia as duas colunas separadas). ' +
        'Valores da tabela viram texto (string), mesmo quando são números. ' +
        'Números e valores monetários no documento seguem o formato brasileiro: "." separa ' +
        'milhar e "," separa decimal — preserve o valor como está impresso, sem reformatar.' +
        dicasTexto,
      messages: [
        {
          role: 'user',
          content: [blocoArquivo, { type: 'text', text: 'Extraia os dados desse documento seguindo o schema.' }]
        }
      ],
      output_config: {
        format: { type: 'json_schema', schema: jsonSchema }
      }
    },
    { maxRetries: 2, timeout: 300_000 }
  )

  const response = await stream.finalMessage()

  if (response.stop_reason === 'refusal') {
    throw new Error('A IA recusou processar esse documento.')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      'O documento tem itens/páginas demais pra extrair de uma vez — tente dividir em partes menores.'
    )
  }

  const blocoTexto = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!blocoTexto) throw new Error('A extração não retornou dados. Tente novamente.')

  let bruto: { campos?: Record<string, unknown>; colunas_item?: string[]; itens?: { valores?: unknown[] }[] }
  try {
    bruto = JSON.parse(blocoTexto.text)
  } catch {
    throw new Error('A extração retornou um formato inesperado. Tente novamente.')
  }

  const colunasItem = bruto.colunas_item ?? []
  const linhas = (bruto.itens ?? []).map((item) => {
    const linha: Record<string, unknown> = {}
    colunasItem.forEach((coluna, i) => {
      linha[coluna] = item.valores?.[i] ?? null
    })
    return linha
  })

  return { campos: bruto.campos ?? {}, colunasItem, linhas }
}

/** Erro da API da Anthropic numa frase que faz sentido pra quem está na tela. */
export function mensagemErroIA(e: unknown, padrao: string): string {
  if (e instanceof Anthropic.RateLimitError) return 'A IA está ocupada agora — tente de novo em instantes.'
  if (e instanceof Anthropic.AuthenticationError) return 'A chave da IA não está configurada no servidor.'
  if (e instanceof Anthropic.APIConnectionError) return 'Não foi possível falar com a IA — confira a conexão do servidor.'
  if (e instanceof Anthropic.APIError) {
    // o motivo vem no corpo da resposta; "erro 400" sozinho não diz nada a quem está na tela
    const detalhe = (e.error as { error?: { message?: string } } | undefined)?.error?.message ?? e.message
    // saldo esgotado não tem tipo de erro próprio na API (vem como 400 comum) — só dá pra reconhecer pelo texto
    return /credit balance/i.test(detalhe)
      ? 'Os créditos da conta da Anthropic (a IA) acabaram — é preciso recarregar em console.anthropic.com, em Plans & Billing.'
      : `A IA devolveu um erro (${e.status ?? 'sem código'}): ${detalhe}`
  }
  return e instanceof Error ? e.message : padrao
}

const SISTEMA_RELATORIO = `Você monta painéis de análise (dashboards) para um sistema de ordens de compra de um representante comercial. O usuário descreve em português o que quer ver; você devolve a PLANTA do painel. Você NÃO calcula nem inventa números: um programa lê a sua planta e calcula tudo sobre os dados reais. Use somente os ids de campo listados na mensagem.

Como os dados se organizam:
- Há dois conjuntos de linhas: uma linha por PEDIDO e uma linha por ITEM de pedido. Cada campo diz de qual linha ele sai ("linha de pedido" ou "linha de item").
- Os cadastros (cliente, vendedor, produto) já vêm colados em cada linha — não existe "relacionar tabelas", é só usar o campo.
- Um bloco que usa qualquer campo de item passa a ler as linhas de item. Para valores por produto, marca ou fabricante, use "Total do item" e "Quantidade", não o total do pedido.
- Os campos "item.*" vêm do próprio pedido e estão sempre preenchidos. Os campos "produto.*" vêm do cadastro e ficam vazios quando o item não foi ligado a um produto cadastrado — para ranking de produtos prefira "item.descricao", a não ser que o resumo dos dados mostre o cadastro bem preenchido ou o usuário peça marca, fabricante, unidade ou NCM.
- Quem abre o link público é um cliente e vê só os pedidos dele; o administrador vê todos.

Blocos (em "blocos", na ordem em que aparecem na tela, da esquerda pra direita e de cima pra baixo):
- tipo "numero": cartão com um número em destaque. 1 medida, sem grupos. Largura 3.
- tipo "colunas": barras verticais. Bom pra poucas categorias ou pra evolução no tempo com poucos períodos.
- tipo "barras": barras horizontais em ranking. Bom pra "os maiores" (produtos, clientes, cidades) e pra nomes compridos.
- tipo "linha" e "area": evolução no tempo. O 1º grupo deve ser um campo de data com período.
- tipo "rosca": participação no total. Só quando há poucas categorias (até 5; o resto vira "Outros").
- tipo "tabela": detalhamento. Vários grupos viram colunas de texto e várias medidas viram colunas de número.

Em cada bloco:
- "medidas": o que é calculado. "op" pode ser soma, media, minimo, maximo (só em campo de número ou moeda) ou contagem, que conta valores DIFERENTES do campo (contagem de "pedido.numero" = quantidade de pedidos; contagem de "cliente.nome" = quantos clientes). Ticket médio = media de "pedido.total". Gráficos usam uma medida; só coloque duas ou mais no mesmo gráfico se forem da mesma unidade (ex: subtotal e total). Nunca misture dinheiro com quantidade no mesmo gráfico: faça dois blocos.
- "grupos": por onde o valor é quebrado. O 1º grupo são as categorias (eixo, fatias). Um 2º grupo, opcional, vira séries com legenda (ex: por mês, separado por situação) — use só quando o usuário pedir uma quebra dessas. Em campo de data, "periodo" é dia, mes, trimestre ou ano; nos outros campos, "".
- "ordem": valor_desc (maiores primeiro), valor_asc ou rotulo (alfabética). Datas sempre saem em ordem de tempo.
- "limite": quantas categorias mostrar (ex: 10 num "top 10"). 0 usa o padrão do tipo.
- "largura": numa grade de 12 colunas: 3 (cartão), 4, 6 (meia tela), 8 ou 12 (tela inteira). Monte linhas que somem 12.
- "filtros": só deste bloco. "op" igual ou diferente, com os valores exatamente como aparecem nos dados.
- "titulo": curto e claro, em português, dizendo o que o bloco mostra.

Aparência (cada bloco tem "cor", "icone" e "estilo"; a raiz tem "cor", que vale pros blocos com cor ""):
- "cor": "" (neutro, ou a cor do painel) ou uma das cores da lista. Pinta o ícone do bloco, o destaque do cartão e o gráfico quando ele tem UMA série só. Gráfico com várias séries e rosca usam sempre a paleta padrão do sistema — isso não muda, porque é o que mantém as séries distinguíveis.
- "icone": "" (sem ícone) ou um nome da lista, que aparece ao lado do título. Escolha pelo assunto do bloco (ex: "banknotes" pra dinheiro, "shopping-cart" pra pedidos, "cube" pra produtos, "users" pra clientes, "truck" pra entrega, "trophy" pra ranking).
- "estilo": "simples" (cartão neutro), "suave" (fundo levemente tingido, borda e sombra na cor — é o que atende "sombra colorida") ou "cheio" (fundo inteiro na cor com texto em contraste; só existe em bloco "numero"). "suave" e "cheio" precisam de uma cor (do bloco ou do painel).
- "curva": só em "linha" e "area": "reta" (ponto a ponto) ou "suave" (curva arredondada, sem os pontos marcados e com um degradê leve embaixo — é o que atende "linha suave", "elegante", "arredondada"). Nos outros tipos, "reta".
- "rotulos": true escreve o valor em cada barra, ponto ou fatia; false deixa o valor só ao passar o mouse. Use true quando pedirem pra "mostrar os valores/números no gráfico" e evite em séries com muitos pontos (ex: por dia), que ficam poluídas.
- Sem pedido de aparência, não invente enfeite: "cor" "", "estilo" "simples", "curva" "reta", "rotulos" false, e ícone só nos cartões de número. Quando o usuário pedir visual mais moderno, colorido ou destacado, aí sim use: cores diferentes por cartão, estilo "suave" ou "cheio" nos cartões, ícones em todos os blocos e cor nos gráficos de uma série.
- Num ajuste só de aparência, mude apenas "cor", "icone", "estilo", "curva" e "rotulos": campos, títulos, filtros e ordem dos blocos ficam iguais.
- Não existe: espessura da linha, linha tracejada, cor fora da lista (hex, "dourado"), cor por série ou por barra, fonte, tamanho de texto, fundo da página, imagem ou logo. Se pedirem, use o mais próximo e conte em "avisos".

"filtros" na raiz valem pro painel inteiro. Só adicione filtro que o usuário pediu ou que seja óbvio pelo pedido (ex: "só pedidos aprovados"). Não filtre por período: a tela já tem um filtro de período e clicar num gráfico filtra os outros.

Boa montagem, quando o usuário não detalhar: comece com 3 ou 4 cartões de número (largura 3), depois uma evolução no tempo, depois rankings ou participação, e uma tabela de detalhe no fim. Entre 4 e 9 blocos costuma bastar. Não repita a mesma informação em dois blocos.

Ao receber um PAINEL ATUAL junto com um pedido de ajuste, devolva o painel inteiro já ajustado: mantenha como estão os blocos que o usuário não mencionou (mesmos campos, títulos e ordem) e mude só o que foi pedido.

O programa NÃO faz: contas entre medidas (margem, percentual de crescimento, diferença), metas, acumulado, projeção, mapas, e não usa dados fora dos campos listados. Se o usuário pedir algo assim, monte o mais próximo que os blocos permitem e diga em "avisos", numa frase simples cada, o que ficou de fora. Sem ressalvas, "avisos" fica vazio.

"resumo": 1 a 3 frases, em português simples, contando o que você montou (ou mudou).
"nome_sugerido": um nome curto pro relatório (ex: "Vendas por fábrica").`

function esquemaRelatorio(idsCampos: string[]) {
  const filtros = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        campo: { type: 'string', enum: idsCampos },
        op: { type: 'string', enum: ['igual', 'diferente'] },
        valores: { type: 'array', items: { type: 'string' } }
      },
      required: ['campo', 'op', 'valores'],
      additionalProperties: false
    }
  }
  return {
    type: 'object',
    properties: {
      nome_sugerido: { type: 'string' },
      resumo: { type: 'string' },
      avisos: { type: 'array', items: { type: 'string' } },
      cor: { type: 'string', enum: ['', ...IDS_CORES] },
      filtros,
      blocos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: ['numero', 'colunas', 'barras', 'linha', 'area', 'rosca', 'tabela'] },
            titulo: { type: 'string' },
            largura: { type: 'integer', enum: [3, 4, 6, 8, 12] },
            medidas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  campo: { type: 'string', enum: idsCampos },
                  op: { type: 'string', enum: ['soma', 'media', 'minimo', 'maximo', 'contagem'] }
                },
                required: ['campo', 'op'],
                additionalProperties: false
              }
            },
            grupos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  campo: { type: 'string', enum: idsCampos },
                  periodo: { type: 'string', enum: ['', 'dia', 'mes', 'trimestre', 'ano'] }
                },
                required: ['campo', 'periodo'],
                additionalProperties: false
              }
            },
            ordem: { type: 'string', enum: ['valor_desc', 'valor_asc', 'rotulo'] },
            limite: { type: 'integer' },
            filtros,
            cor: { type: 'string', enum: ['', ...IDS_CORES] },
            icone: { type: 'string', enum: ['', ...ICONES_BLOCO] },
            estilo: { type: 'string', enum: [...ESTILOS_BLOCO] },
            curva: { type: 'string', enum: ['reta', 'suave'] },
            rotulos: { type: 'boolean' }
          },
          required: ['tipo', 'titulo', 'largura', 'medidas', 'grupos', 'ordem', 'limite', 'filtros', 'cor', 'icone', 'estilo', 'curva', 'rotulos'],
          additionalProperties: false
        }
      }
    },
    required: ['nome_sugerido', 'resumo', 'avisos', 'cor', 'filtros', 'blocos'],
    additionalProperties: false
  }
}

export interface PlantaRelatorioIA {
  nome_sugerido: string
  resumo: string
  avisos: string[]
  cor: string
  filtros: unknown[]
  blocos: unknown[]
}

/**
 * Monta (ou ajusta) a planta de um relatório a partir do pedido do usuário. A IA recebe os
 * campos disponíveis e um resumo dos valores que existem — nunca as linhas — e devolve só a
 * descrição dos blocos. Quem valida a planta é `normalizarDefinicao`; quem calcula é o navegador.
 */
export async function montarRelatorioIA(opts: {
  idsCampos: string[]
  /** Campos disponíveis + valores que existem em cada um (ver `resumoParaIA`). */
  resumoDados: string
  pedido: string
  /** JSON da planta atual, quando é um ajuste. */
  painelAtual?: string
}): Promise<PlantaRelatorioIA> {
  const atual = opts.painelAtual ? `\n\nPAINEL ATUAL (JSON):\n${opts.painelAtual}` : ''

  const response = await getClient().beta.messages.create(
    {
      model: 'claude-opus-5-5',
      max_tokens: 16_000,
      // se o modelo recusar por política, a própria API refaz o pedido num modelo substituto
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      system: SISTEMA_RELATORIO,
      messages: [
        {
          role: 'user',
          content: `Campos disponíveis e o que existe em cada um:\n${opts.resumoDados}${atual}\n\nPedido do usuário:\n${opts.pedido}`
        }
      ],
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: esquemaRelatorio(opts.idsCampos) }
      }
    },
    { maxRetries: 2, timeout: 120_000 }
  )

  if (response.stop_reason === 'refusal') throw new Error('A IA recusou montar esse relatório.')
  if (response.stop_reason === 'max_tokens') throw new Error('O relatório pedido ficou grande demais — peça menos blocos de uma vez.')

  const blocoTexto = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
  if (!blocoTexto) throw new Error('A IA não retornou nada.')

  try {
    return JSON.parse(blocoTexto.text) as PlantaRelatorioIA
  } catch {
    throw new Error('A IA retornou um formato inesperado. Tente novamente.')
  }
}
