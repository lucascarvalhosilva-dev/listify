import Anthropic from '@anthropic-ai/sdk'
import { ANTHROPIC_MODEL } from './constants'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Batch types ──────────────────────────────────────────────────────────────

export interface BatchProductSpec {
  sku: string
  titulo_ml: string
  titulo_shopee: string
  titulo_amazon?: string
  descricao_ml?: string
  descricao_shopee?: string
  descricao_tiktok?: string
  descricao_magalu?: string
  descricao_bling?: string
  descricao_amazon?: string
  bullet_point1?: string
  bullet_point2?: string
  bullet_point3?: string
  bullet_point4?: string
  bullet_point5?: string
  preco_ml: number
  preco_shopee: number
  peso_g: number
  comprimento_cm: number
  largura_cm: number
  altura_cm: number
  ncm: string
  gtin: string
  confianca_dimensoes: 'alta' | 'media'
  atributos?: { id: string; value_name: string }[]
}

interface ProdutoParaBatch {
  sku: string
  nome: string
  custo: number
  atributos_categoria?: { id: string; name: string; value_type: string; values_exemplo?: string[] }[]
}

const BATCH_SYSTEM_PROMPT =
  'Você é um especialista em produtos para marketplaces brasileiros. ' +
  'Dado uma lista de produtos, gere especificações técnicas para cadastro em marketplaces. ' +
  'Responda APENAS com um array JSON válido, sem markdown, sem texto adicional.'

function buildBatchUserPrompt(produtos: ProdutoParaBatch[], regime: string, canais: string[]): string {
  const lista = produtos.map(p => {
    let linha = `SKU ${p.sku}: ${p.nome} (custo R$${p.custo.toFixed(2)})`
    if (p.atributos_categoria?.length) {
      const atrsStr = p.atributos_categoria.map(a =>
        a.values_exemplo?.length
          ? `  - ${a.id} (${a.name}): escolha entre: ${a.values_exemplo.join(', ')}`
          : `  - ${a.id} (${a.name}): texto livre`
      ).join('\n')
      linha += `\n  Atributos a preencher (use seu conhecimento; omita os que não souber):\n${atrsStr}`
    }
    return linha
  }).join('\n\n')

  const descFields: string[] = []
  if (canais.includes('ml')) descFields.push('  "descricao_ml": "string (texto corrido sem HTML, sem bullet points, sem links — specs técnicas + benefícios + uso, máx 3000 chars)"')
  if (canais.includes('shopee'))        descFields.push('  "descricao_shopee": "string (bullet points com hífens em português — specs técnicas + indicação de uso + conteúdo da embalagem + garantia, máx 3000 chars)"')
  if (canais.includes('tiktok_shop'))   descFields.push('  "descricao_tiktok": "string (curta e impactante, linguagem jovem e direta, foco nos primeiros 150 chars, máx 500 chars)"')
  if (canais.includes('magalu'))        descFields.push('  "descricao_magalu": "string (texto corrido, sem links, sem dados de contato — specs + benefícios, máx 4000 chars)"')
  if (canais.includes('bling'))         descFields.push('  "descricao_bling": "string (descrição técnica completa para uso interno no ERP — specs, dimensões, materiais, NCM)"')
  if (canais.includes('amazon'))        descFields.push('  "descricao_amazon": "string (descrição longa estruturada — specs técnicas + benefícios + uso, máx 2000 chars)"')

  const temAmazon = canais.includes('amazon')

  const schemaFields = [
    '  "sku": "string (mesmo SKU fornecido)"',
    '  "titulo_ml": "string (máx 60 chars, palavra-chave no início, sem caracteres especiais)"',
    '  "titulo_shopee": "string (máx 120 chars, palavra-chave no início, Title Case)"',
    ...(temAmazon ? ['  "titulo_amazon": "string (máx 200 chars: Marca + Nome + Característica + Material)"'] : []),
    ...descFields,
    ...(temAmazon ? [
      '  "bullet_point1": "string (benefício principal + spec técnica, máx 500 chars)"',
      '  "bullet_point2": "string (segundo benefício + spec, máx 500 chars)"',
      '  "bullet_point3": "string (terceiro benefício + spec, máx 500 chars)"',
      '  "bullet_point4": "string (quarto benefício + spec, máx 500 chars)"',
      '  "bullet_point5": "string (quinto benefício + spec, máx 500 chars)"',
    ] : []),
    '  "preco_ml": number',
    '  "preco_shopee": number',
    '  "peso_g": number',
    '  "comprimento_cm": number',
    '  "largura_cm": number',
    '  "altura_cm": number',
    '  "ncm": "string (8 dígitos)"',
    '  "gtin": "string (EAN/GTIN ou 0 se não houver)"',
    '  "confianca_dimensoes": "alta" ou "media"',
    '  "atributos": [{ "id": "string (id do atributo)", "value_name": "string" }] // apenas os que souber; array vazio se nenhum',
  ].join(',\n')

  const prompt = `Regime tributário: ${regime}

Produtos:
${lista}

Retorne um array JSON com um objeto por produto, na mesma ordem, com exatamente estes campos:
[{
${schemaFields}
}]`
  console.log('[debug buildBatchUserPrompt] prompt completo:\n', prompt)
  return prompt
}

function parseArrayResponse(text: string): unknown[] {
  console.log('[parseArrayResponse] Resposta bruta (primeiros 500 chars):', text.slice(0, 500))

  // 1. Tentar JSON.parse direto na resposta bruta
  try {
    const direct = JSON.parse(text)
    if (Array.isArray(direct) && direct.length > 0) return direct
  } catch {
    // continua para próximas estratégias
  }

  // 2. Strip markdown fences e tentar novamente
  const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const afterStrip = JSON.parse(stripped)
    if (Array.isArray(afterStrip) && afterStrip.length > 0) return afterStrip
  } catch {
    // continua
  }

  // 3. Extrair entre o primeiro [ e o último ] e tentar
  const start = stripped.indexOf('[')
  const end = stripped.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Nenhum array JSON encontrado na resposta. Início: ${text.slice(0, 300)}`)
  }
  const arrayStr = stripped.slice(start, end + 1)
  try {
    const fromBrackets = JSON.parse(arrayStr)
    if (Array.isArray(fromBrackets) && fromBrackets.length > 0) return fromBrackets
  } catch {
    // continua para fallback por item
  }

  // 4. Fallback: parse produto por produto separando em }{ boundaries
  const inner = arrayStr.slice(1, -1).trim()
  const parts = inner.split(/\}\s*,\s*\{/)
  const results: unknown[] = []
  for (let i = 0; i < parts.length; i++) {
    let chunk = parts[i].trim()
    if (!chunk.startsWith('{')) chunk = '{' + chunk
    if (!chunk.endsWith('}')) chunk = chunk + '}'
    try {
      results.push(JSON.parse(chunk))
    } catch {
      // skip malformed chunk silently
    }
  }

  if (results.length === 0) {
    throw new Error(`Nenhum item pôde ser parseado. Início da resposta: ${stripped.slice(0, 300)}`)
  }
  return results
}

export async function inferProductSpecsBatch(
  produtos: ProdutoParaBatch[],
  regime: 'MEI' | 'SN',
  canais: string[],
  systemSuffix?: string
): Promise<BatchProductSpec[]> {
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 16000,
    system: BATCH_SYSTEM_PROMPT + (systemSuffix ?? ''),
    messages: [{ role: 'user', content: buildBatchUserPrompt(produtos, regime, canais) }],
  })

  const raw = message.content[0]
  if (raw.type !== 'text') {
    throw new Error(`inferProductSpecsBatch: resposta inesperada do tipo "${raw.type}"`)
  }

  const parsed = parseArrayResponse(raw.text)
  console.log('[debug inferProductSpecsBatch] atributos por produto:', JSON.stringify((parsed as BatchProductSpec[]).map(s => ({ sku: s.sku, atributos: s.atributos }))))
  return parsed as BatchProductSpec[]
}

export interface ProductSpecs {
  dimensoes: {
    comprimento_cm: number
    largura_cm: number
    altura_cm: number
    peso_g: number
  }
  ncm: string
  ean: string
  categoria: string
  material: string
  titulo_ml: string
  titulo_shopee: string
  titulo_amazon?: string
  descricao_ml: string
  descricao_shopee: string
  descricao_tiktok?: string
  descricao_magalu?: string
  descricao_bling?: string
  descricao_amazon?: string
  bullet_point1?: string
  bullet_point2?: string
  bullet_point3?: string
  bullet_point4?: string
  bullet_point5?: string
  palavras_chave: string[]
  confianca_dimensoes: 'alta' | 'media'
}

const SYSTEM_PROMPT =
  'Você é um especialista em produtos para pesca e marketplaces brasileiros. ' +
  'Dado o nome de um produto, infira as especificações técnicas necessárias para cadastro em marketplaces. ' +
  'Responda APENAS com JSON válido, sem markdown, sem texto adicional.'

const USER_PROMPT_TEMPLATE = (productName: string, regime: string) =>
  `Produto: ${productName}
Regime tributário: ${regime}

Retorne um JSON com exatamente estes campos:
{
  "dimensoes": { "comprimento_cm": number, "largura_cm": number, "altura_cm": number, "peso_g": number },
  "ncm": string,
  "ean": string,
  "categoria": string,
  "material": string,
  "titulo_ml": string (máx 60 chars, palavra-chave no início, sem caracteres especiais),
  "titulo_shopee": string (máx 120 chars, palavra-chave no início, Title Case),
  "descricao_ml": string (texto corrido, sem HTML, specs técnicas + benefícios + uso, ~200 palavras),
  "descricao_shopee": string (bullet points com hífens, specs + uso + conteúdo embalagem + garantia),
  "palavras_chave": string[],
  "confianca_dimensoes": "alta" | "media"
}`

export async function inferProductSpecs(
  productName: string,
  regime: 'MEI' | 'SN'
): Promise<ProductSpecs> {
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: USER_PROMPT_TEMPLATE(productName, regime) }],
  })

  const raw = message.content[0]
  if (raw.type !== 'text') {
    throw new Error(`inferProductSpecs: resposta inesperada do tipo "${raw.type}"`)
  }

  const cleaned = raw.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(
      `inferProductSpecs: falha ao parsear JSON para "${productName}". Resposta: ${cleaned.slice(0, 200)}`
    )
  }

  return parsed as ProductSpecs
}
