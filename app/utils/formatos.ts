import type { Endereco } from '~/types/cliente'

const soDigitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')

/** CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) — serve de máscara enquanto digita. */
export function formatarDocumento(v: string | null | undefined): string {
  const d = soDigitos(v).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** (11) 98765-4321 / (11) 3456-7890 — serve de máscara enquanto digita. */
export function formatarTelefone(v: string | null | undefined): string {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Endereço em até duas linhas ("Rua X, 123 - Sala 2" / "Bairro · Cidade/UF · CEP"); vazio = []. */
export function formatarEndereco(e: Endereco | null | undefined): string[] {
  if (!e) return []
  const rua = [e.logradouro, e.numero].filter(Boolean).join(', ')
  const linha1 = [rua, e.complemento].filter(Boolean).join(' - ')
  const cidade = [e.cidade, e.uf].filter(Boolean).join('/')
  const linha2 = [e.bairro, cidade, e.cep ? `CEP ${e.cep}` : ''].filter(Boolean).join(' · ')
  return [linha1, linha2].filter(Boolean)
}
