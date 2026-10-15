/** Palavras que ficam minúsculas no meio da frase ("Pastilha de Freio", não "Pastilha De Freio"). */
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'com', 'sem', 'por', 'a', 'o', 'as', 'os', 'p/', 'c/', 's/'])

/** Primeira letra maiúscula, inclusive depois de hífen, barra, parêntese ou aspas ("Anti-Chama", "(Kit)"). Apóstrofo não: "D'água". */
function capitalizar(palavra: string): string {
  return palavra.toLocaleLowerCase('pt-BR').replace(/(^|[-(/"“])(\p{L})/gu, (_, antes: string, letra: string) => antes + letra.toLocaleUpperCase('pt-BR'))
}

/**
 * Texto de produto com só a primeira letra de cada palavra maiúscula — só pra exibir (o cadastro
 * não muda): "ADITIVO RADIADOR CONCENTRADO 1L" → "Aditivo Radiador Concentrado 1L".
 * Preserva o que viraria bagunça: palavra com número ("1L", "5W30", "G5/G6") e sigla curta
 * sem vogal ("KG", "ML", "CX", "PCT") ficam como estão; conectivos ficam minúsculos.
 */
export function primeiraMaiuscula(texto: string | null | undefined): string {
  if (!texto) return ''
  let primeira = true
  return texto.replace(/\S+/g, (palavra) => {
    const eraPrimeira = primeira
    primeira = false
    if (/\d/.test(palavra)) return palavra.toLocaleUpperCase('pt-BR')
    const minuscula = palavra.toLocaleLowerCase('pt-BR')
    if (!eraPrimeira && CONECTIVOS.has(minuscula)) return minuscula
    const letras = palavra.replace(/[^\p{L}]/gu, '')
    if (letras.length > 0 && letras.length <= 3 && !/[aeiouáéíóúâêôãõà]/i.test(letras)) return palavra.toLocaleUpperCase('pt-BR')
    return capitalizar(palavra)
  })
}
