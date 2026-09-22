import Anthropic from '@anthropic-ai/sdk'
import type { CampoSchema, SchemaModelo, TipoCampo } from '~/types/modelo'

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
}): Promise<ResultadoLegibilidade> {
  const blocoArquivo = construirBlocoArquivo(opts.arquivoBuffer, opts.mediaType, opts.tipoOrigem)

  try {
    const response = await getClient().messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system:
          'Você faz uma checagem rápida de qualidade antes de uma extração de dados mais cara. ' +
          'Diga se o arquivo é um documento de pedido de compra (nota, orçamento, pedido, planilha ' +
          'impressa etc.) legível o suficiente pra extrair dados — texto/números visíveis, página ' +
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
}): Promise<ResultadoExtracao> {
  const jsonSchema = montarJsonSchemaExtracao(opts.schema.campos)
  const blocoArquivo = construirBlocoArquivo(opts.arquivoBuffer, opts.mediaType, opts.tipoOrigem)

  const dicasTexto = opts.dicas?.trim() ? `\n\nDicas adicionais pra essa extração: ${opts.dicas.trim()}` : ''

  const stream = getClient().messages.stream(
    {
      model: 'claude-opus-5',
      max_tokens: 64_000,
      system:
        'Você extrai dados estruturados de documentos de pedido de compra (foto ou PDF). ' +
        'Em "campos", extraia SOMENTE os campos definidos no schema — nunca invente valores ' +
        'que não estão no documento; deixe vazio/null quando não encontrar. ' +
        'Em "colunas_item"/"itens", extraia a TABELA DE ITENS exatamente como impressa no ' +
        'documento: primeiro liste os nomes das colunas (cabeçalho da tabela, palavra por ' +
        'palavra como aparece — não traduza nem renomeie), depois uma entrada por linha de ' +
        'produto, com os valores na MESMA ORDEM das colunas. Não tente decidir qual coluna ' +
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
