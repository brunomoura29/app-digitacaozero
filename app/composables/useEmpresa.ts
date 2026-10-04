import type { EmpresaDados, EmpresaInput } from '~/types/empresa'

const COLUNAS = 'id, nome, documento_legal, logo_url, endereco, telefone, email'
const BUCKET = 'logos'

/** Dados da empresa do usuário logado (representante) + logomarca no Storage (bucket público `logos`). */
export function useEmpresa() {
  const supabase = useSupabaseClient()

  /** A RLS só devolve a empresa do próprio usuário — não precisa filtrar por id. */
  async function buscar(): Promise<EmpresaDados | null> {
    const { data, error } = await supabase.from('empresas').select(COLUNAS).maybeSingle()
    if (error) throw error
    return (data as unknown as EmpresaDados) ?? null
  }

  async function salvar(id: string, dados: EmpresaInput): Promise<void> {
    const { data, error } = await supabase.from('empresas').update(dados).eq('id', id).select('id')
    if (error) throw error
    // sem permissão a RLS não dá erro: só não altera nada
    if (!data?.length) throw new Error('Só o administrador pode alterar os dados da empresa')
  }

  /** Caminho do arquivo dentro do bucket a partir da URL pública (null se não for do bucket). */
  function caminhoDaLogo(url: string): string | null {
    const partes = url.split(`/object/public/${BUCKET}/`)
    return partes.length === 2 && partes[1] ? decodeURIComponent(partes[1]) : null
  }

  async function apagarArquivo(url: string) {
    const caminho = caminhoDaLogo(url)
    if (caminho) await supabase.storage.from(BUCKET).remove([caminho])
  }

  /** Sobe a imagem em `<empresa_id>/logo-<ts>.<ext>`, grava a URL na empresa e apaga a logo anterior. */
  async function enviarLogo(id: string, arquivo: File, logoAtual: string | null): Promise<string> {
    const ext = arquivo.name.split('.').pop()?.toLowerCase() || 'png'
    // nome único por envio: a URL muda junto, então o cache longo nunca mostra a logo velha
    const caminho = `${id}/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: '31536000' })
    if (error) throw error

    const url = supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl
    await salvar(id, { logo_url: url })
    if (logoAtual) await apagarArquivo(logoAtual)
    return url
  }

  async function removerLogo(id: string, logoAtual: string): Promise<void> {
    await salvar(id, { logo_url: null })
    await apagarArquivo(logoAtual)
  }

  return { buscar, salvar, enviarLogo, removerLogo }
}
