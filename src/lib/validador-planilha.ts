import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

export type Etapa = string

export type ErroValidacao = {
  linha: number
  tipo: string
  mensagem: string
}

export type ProdutoValido = {
  sku: string
  nome: string
  marca?: string
  categoria?: string
  custo: number
  estoque: number
  cor?: string
  genero?: string
  tipo_roupa?: string
  tipo_manga?: string
  tamanho?: string
}

export type ResultadoValidacao = {
  valida: boolean
  total_linhas: number
  erros: ErroValidacao[]
  total_erros: number
  produtos_validos: ProdutoValido[]
}

const COLUNAS_CUSTO = ['Custo Unitário (R$)', 'Custo Unitário', 'Custo']
const COLUNAS_OBRIGATORIAS = ['SKU', 'Nome do Produto', 'Estoque']
export const LIMITE_PRODUTOS = 500

// ── Helpers ──────────────────────────────────────────────────────────────────

function parsearNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return isNaN(valor) ? null : valor
  if (!valor && valor !== 0) return null
  const s = String(valor).trim().replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parsearInteiro(valor: unknown): number | null {
  const n = parsearNumero(valor)
  if (n === null || n < 0) return null
  // Accept floats that are whole numbers (e.g. 50.0)
  return Math.floor(n) === n ? Math.floor(n) : null
}

function encontrarColunaCusto(colunas: string[]): string | null {
  return COLUNAS_CUSTO.find(c => colunas.includes(c)) ?? null
}

// ── Públicas ──────────────────────────────────────────────────────────────────

export async function baixarPlanilhaDoStorage(planilhaPath: string): Promise<Buffer> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from('planilhas-chat').download(planilhaPath)
  if (error || !data) throw new Error(error?.message ?? 'Falha no download')
  const ab = await data.arrayBuffer()
  return Buffer.from(ab)
}

export function parsearPlanilha(buffer: Buffer, nomeArquivo: string): Array<Record<string, unknown>> {
  const ext = nomeArquivo.split('.').pop()?.toLowerCase()

  let wb: XLSX.WorkBook
  if (ext === 'csv') {
    let csv = buffer.toString('utf8')
    // Strip BOM
    if (csv.charCodeAt(0) === 0xfeff) csv = csv.slice(1)
    wb = XLSX.read(csv, { type: 'string' })
  } else {
    wb = XLSX.read(buffer, { type: 'buffer' })
  }

  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { defval: '' }) as Array<Record<string, unknown>>
}

export function validarEstrutura(linhas: Array<Record<string, unknown>>): ResultadoValidacao {
  const erros: ErroValidacao[] = []
  const produtos_validos: ProdutoValido[] = []

  if (linhas.length === 0) {
    return {
      valida: false,
      total_linhas: 0,
      erros: [{ linha: 0, tipo: 'estrutura', mensagem: 'A planilha está vazia ou sem dados.' }],
      total_erros: 1,
      produtos_validos: [],
    }
  }

  const colunas = Object.keys(linhas[0])
  const ausentes = COLUNAS_OBRIGATORIAS.filter(c => !colunas.includes(c))
  const colunaCusto = encontrarColunaCusto(colunas)
  if (!colunaCusto) ausentes.push('Custo Unitário (R$)')

  if (ausentes.length > 0) {
    return {
      valida: false,
      total_linhas: linhas.length,
      erros: [{ linha: 0, tipo: 'estrutura', mensagem: `Colunas obrigatórias ausentes: ${ausentes.join(', ')}.` }],
      total_erros: 1,
      produtos_validos: [],
    }
  }

  const skusVistos = new Map<string, number>()

  for (let idx = 0; idx < linhas.length; idx++) {
    const linha = linhas[idx]
    const numLinha = idx + 2 // dados começam na linha 2 (linha 1 = cabeçalho)

    // Ignorar linhas completamente vazias
    const todosVazios = Object.values(linha).every(v => v === '' || v === null || v === undefined)
    if (todosVazios) continue

    const sku = String(linha['SKU'] ?? '').trim()
    const nome = String(linha['Nome do Produto'] ?? '').trim()
    const custoRaw = linha[colunaCusto!]
    const estoqueRaw = linha['Estoque']
    const marca = String(linha['Marca'] ?? '').trim() || undefined
    const categoria = String(linha['Categoria'] ?? '').trim() || undefined
    const cor = String(linha['Cor'] ?? '').trim() || undefined
    const genero = String(linha['Gênero'] ?? '').trim() || undefined
    const tipo_roupa = String(linha['Tipo de Roupa'] ?? '').trim() || undefined
    const tipo_manga = String(linha['Tipo de Manga'] ?? '').trim() || undefined
    const tamanho = String(linha['Tamanho'] ?? '').trim() || undefined

    let temErro = false

    if (!sku) {
      erros.push({ linha: numLinha, tipo: 'sku', mensagem: 'SKU vazio.' })
      temErro = true
    } else if (skusVistos.has(sku)) {
      erros.push({ linha: numLinha, tipo: 'sku_duplicado', mensagem: `SKU "${sku}" duplicado (já aparece na linha ${skusVistos.get(sku)}).` })
      temErro = true
    } else {
      skusVistos.set(sku, numLinha)
    }

    if (!nome || nome.length < 3) {
      erros.push({ linha: numLinha, tipo: 'nome', mensagem: `Nome inválido: "${nome}". Mínimo 3 caracteres.` })
      temErro = true
    }

    const custo = parsearNumero(custoRaw)
    if (custo === null || custo <= 0) {
      erros.push({ linha: numLinha, tipo: 'custo', mensagem: `Custo inválido: "${custoRaw}". Use um número maior que zero (ex: 11.60 ou 11,60).` })
      temErro = true
    }

    const estoque = parsearInteiro(estoqueRaw)
    if (estoque === null) {
      erros.push({ linha: numLinha, tipo: 'estoque', mensagem: `Estoque inválido: "${estoqueRaw}". Deve ser um número inteiro >= 0.` })
      temErro = true
    }

    if (!temErro) {
      produtos_validos.push({ sku, nome, marca, categoria, custo: custo!, estoque: estoque!, cor, genero, tipo_roupa, tipo_manga, tamanho })
    }
  }

  return {
    valida: erros.length === 0 && produtos_validos.length > 0,
    total_linhas: linhas.length,
    erros,
    total_erros: erros.length,
    produtos_validos,
  }
}

export function formatarErrosParaIA(resultado: ResultadoValidacao): string {
  if (resultado.erros.length === 0) return 'Nenhum erro encontrado.'

  const MAX_EXIBIR = 5
  const primeiros = resultado.erros.slice(0, MAX_EXIBIR)
  const resto = resultado.erros.length - MAX_EXIBIR

  const partes = primeiros.map(e =>
    e.linha === 0 ? e.mensagem : `Linha ${e.linha}: ${e.mensagem}`
  )

  if (resto > 0) partes.push(`+${resto} outros erros.`)
  return partes.join(' ')
}
