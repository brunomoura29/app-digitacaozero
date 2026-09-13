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

/** Converte o schema do template (campos livres) num JSON Schema pra guiar a extração. */
export function montarJsonSchema(schema: SchemaModelo) {
  const cabecalho = propriedadesDeCampos(schema.campos)
  const item = propriedadesDeCampos(schema.campos_item)

  return {
    type: 'object',
    properties: {
      campos: {
        type: 'object',
        properties: cabecalho.properties,
        required: cabecalho.required,
        additionalProperties: false
      },
      itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: item.properties,
          required: item.required,
          additionalProperties: false
        }
      }
    },
    required: ['campos', 'itens'],
    additionalProperties: false
  }
}

export interface ResultadoExtracao {
  campos: Record<string, unknown>
  itens: Record<string, unknown>[]
}

/**
 * Extrai dados estruturados de uma imagem ou PDF via Claude Vision, guiado pelo
 * schema do template escolhido. Retry 3x / timeout 30s (mesmo padrão do plano original).
 */
export async function extrairDocumento(opts: {
  schema: SchemaModelo
  dicas?: string
  arquivoBuffer: Buffer
  mediaType: string
  tipoOrigem: 'imagem' | 'pdf'
}): Promise<ResultadoExtracao> {
  const jsonSchema = montarJsonSchema(opts.schema)
  const base64 = opts.arquivoBuffer.toString('base64')

  const blocoArquivo =
    opts.tipoOrigem === 'pdf'
      ? {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 }
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: opts.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64
          }
        }

  const dicasTexto = opts.dicas?.trim() ? `\n\nDicas adicionais pra essa extração: ${opts.dicas.trim()}` : ''

  const response = await getClient().messages.create(
    {
      model: 'claude-opus-5',
      max_tokens: 8000,
      system:
        'Você extrai dados estruturados de documentos de pedido de compra (foto ou PDF). ' +
        'Extraia SOMENTE os campos definidos no schema — nunca invente valores que não estão ' +
        'no documento; deixe o campo vazio/null quando não encontrar. Em "itens", extraia uma ' +
        'entrada por linha de produto do documento. ' +
        'Números e valores monetários no documento seguem o formato brasileiro: "." separa ' +
        'milhar e "," separa decimal. Ao converter para os campos numéricos do schema, use o ' +
        'valor numérico correto (ex: "R$ 23,00" vira 23; "1.234,56" vira 1234.56) — nunca trate ' +
        'a vírgula decimal como separador de milhar.' +
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
    { maxRetries: 3, timeout: 30_000 }
  )

  if (response.stop_reason === 'refusal') {
    throw new Error('A IA recusou processar esse documento.')
  }

  const blocoTexto = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!blocoTexto) throw new Error('A extração não retornou dados. Tente novamente.')

  try {
    return JSON.parse(blocoTexto.text) as ResultadoExtracao
  } catch {
    throw new Error('A extração retornou um formato inesperado. Tente novamente.')
  }
}
