const PATTERNS_CADASTRO = [
  /cadastrar?\s+produtos?/i,
  /gerar?\s+(novos?\s+)?produtos?/i,
  /subir?\s+produtos?/i,
  /subir?\s+planilha/i,
  /come[cç]ar?\s+cadastro/i,
  /novo\s+cadastro/i,
  /primeiros?\s+produtos?/i,
]

export function detectarIntencaoCadastro(mensagem: string): boolean {
  return PATTERNS_CADASTRO.some(p => p.test(mensagem))
}
