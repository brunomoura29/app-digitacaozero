import { createHash, randomUUID } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { extrairDocumento, verificarLegibilidade } from '../utils/claude'
import type { SchemaModelo } from '~/types/modelo'

const TIPOS_ACEITOS: Record<string, 'imagem' | 'pdf'> = {
  'image/jpeg': 'imagem',
  'image/png': 'imagem',
  'image/gif': 'imagem',
  'image/webp': 'imagem',
  'application/pdf': 'pdf'
}

// o media type que o navegador manda no upload nem sempre bate com o conteúdo real do
// arquivo (ex.: print/print colado como .png mas os bytes são webp) — a Claude API rejeita
// nesse caso, então detectamos pelos magic bytes e usamos o tipo real em vez do declarado.
function detectarMediaType(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === 'GIF87a') return 'image/gif'
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif'
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf'
  return null
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const client = await serverSupabaseClient(event)

  // ── autorização: admin, ou vendedor com permissão de incluir em Pedidos ──
  const { data: perfil, error: erroPerfil } = await client
    .from('perfis')
    .select('empresa_id, papel')
    .eq('id', user.sub)
    .maybeSingle()
  if (erroPerfil) throw createError({ statusCode: 500, statusMessage: erroPerfil.message })
  if (!perfil) throw createError({ statusCode: 403, statusMessage: 'Perfil não encontrado' })

  if (perfil.papel !== 'admin') {
    const { data: podeIncluir, error: erroPermissao } = await client.rpc('tem_permissao', {
      p_modulo: 'pedidos',
      p_acao: 'incluir'
    })
    if (erroPermissao) throw createError({ statusCode: 500, statusMessage: erroPermissao.message })
    if (!podeIncluir) throw createError({ statusCode: 403, statusMessage: 'Sem permissão pra importar pedidos.' })
  }

  // ── lê o multipart: campo "arquivo" (o documento) + "modeloId" ──
  const partes = await readMultipartFormData(event)
  if (!partes) throw createError({ statusCode: 400, statusMessage: 'Requisição inválida.' })

  const parteArquivo = partes.find((p) => p.name === 'arquivo' && p.filename)
  const modeloId = partes.find((p) => p.name === 'modeloId')?.data.toString('utf-8')

  if (!parteArquivo || !parteArquivo.filename || !parteArquivo.data) {
    throw createError({ statusCode: 400, statusMessage: 'Arquivo não enviado.' })
  }
  if (!modeloId) throw createError({ statusCode: 400, statusMessage: 'Selecione um template.' })

  const buffer = parteArquivo.data as Buffer
  const mediaType = detectarMediaType(buffer) ?? parteArquivo.type ?? ''
  const tipoOrigem = TIPOS_ACEITOS[mediaType]
  if (!tipoOrigem) {
    throw createError({ statusCode: 400, statusMessage: 'Formato não aceito — envie imagem (JPEG/PNG/GIF/WebP) ou PDF.' })
  }

  // modelos é admin-only por RLS — o próprio vendedor não teria SELECT direto, então
  // busca via service role, mas sempre filtrando pela empresa do usuário logado.
  const admin = serverSupabaseServiceRole(event)
  const { data: modelo, error: erroModelo } = await admin
    .from('modelos')
    .select('id, versao, schema, ativo, empresa_id')
    .eq('id', modeloId)
    .eq('empresa_id', perfil.empresa_id)
    .maybeSingle()
  if (erroModelo) throw createError({ statusCode: 500, statusMessage: erroModelo.message })
  if (!modelo || !modelo.ativo) throw createError({ statusCode: 404, statusMessage: 'Template não encontrado.' })

  const hash = createHash('sha256').update(buffer).digest('hex')

  // dedupe: mesmo arquivo + mesmo template já extraído antes → reaproveita, não gasta de novo.
  // Só reaproveita se o resultado salvo já estiver no formato atual (`linhas`) — um
  // resultado salvo num formato antigo (de antes de alguma mudança no schema de extração)
  // quebraria o front, que não sabe mais ler o formato velho. Pega o mais recente primeiro
  // pra dar preferência a uma extração já "curada" nesse formato, se existir.
  const { data: candidatos } = await client
    .from('extracoes')
    .select('id, dados_extraidos')
    .eq('arquivo_hash', hash)
    .eq('modelo_id', modelo.id)
    .eq('status', 'concluido')
    .order('criado_em', { ascending: false })
    .limit(5)

  const existente = candidatos?.find(
    (c) => c.dados_extraidos && typeof c.dados_extraidos === 'object' && 'linhas' in c.dados_extraidos
  )

  if (existente) {
    return { extracaoId: existente.id, dadosExtraidos: existente.dados_extraidos, reaproveitado: true }
  }

  // checagem barata (Haiku) antes de gastar a extração cara (Opus): recusa arquivo
  // ilegível/borrado/em branco sem nem subir pro Storage.
  const generico = (modelo.schema as SchemaModelo)?.destino === 'dados'
  const legibilidade = await verificarLegibilidade({ arquivoBuffer: buffer, mediaType, tipoOrigem, generico })
  if (!legibilidade.legivel) {
    throw createError({
      statusCode: 422,
      statusMessage: legibilidade.motivo?.trim() || 'Arquivo não parece legível — tente uma foto mais nítida ou bem iluminada.'
    })
  }

  // sobe o arquivo original pro Storage antes de chamar a IA
  const caminho = `${perfil.empresa_id}/${randomUUID()}-${parteArquivo.filename}`
  const { error: erroUpload } = await client.storage.from('extracoes').upload(caminho, buffer, {
    contentType: mediaType,
    upsert: false
  })
  if (erroUpload) throw createError({ statusCode: 500, statusMessage: `Falha ao salvar arquivo: ${erroUpload.message}` })

  try {
    const schema = modelo.schema as SchemaModelo
    const resultado = await extrairDocumento({
      schema,
      dicas: schema.dicas?.geral,
      arquivoBuffer: buffer,
      mediaType,
      tipoOrigem,
      generico
    })

    const { data: extracao, error: erroInsert } = await client
      .from('extracoes')
      .insert({
        modelo_id: modelo.id,
        modelo_versao: modelo.versao,
        arquivo_nome: parteArquivo.filename,
        arquivo_hash: hash,
        arquivo_tamanho: buffer.length,
        arquivo_url: caminho,
        tipo_origem: tipoOrigem,
        dados_extraidos: resultado,
        status: 'concluido',
        criado_por: user.sub
      })
      .select('id')
      .single()
    if (erroInsert) throw createError({ statusCode: 500, statusMessage: erroInsert.message })

    return { extracaoId: extracao.id, dadosExtraidos: resultado, reaproveitado: false }
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : 'Falha ao extrair o documento.'
    await client.from('extracoes').insert({
      modelo_id: modelo.id,
      modelo_versao: modelo.versao,
      arquivo_nome: parteArquivo.filename,
      arquivo_hash: hash,
      arquivo_tamanho: buffer.length,
      arquivo_url: caminho,
      tipo_origem: tipoOrigem,
      status: 'erro',
      erro: mensagem,
      criado_por: user.sub
    })
    throw createError({ statusCode: 502, statusMessage: mensagem })
  }
})
