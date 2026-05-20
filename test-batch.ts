// Teste isolado de inferProductSpecsBatch
// Uso: npx ts-node test-batch.ts

import fs from 'fs'
import path from 'path'

// Carrega .env.local antes de instanciar qualquer cliente
const envLines = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n')
for (const line of envLines) {
  const eq = line.indexOf('=')
  if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
}

import Anthropic from '@anthropic-ai/sdk'

// ─── Mesmos prompt/formato do claude-client.ts ────────────────────────────────

const SYSTEM_PROMPT =
  'Você é um especialista em produtos para marketplaces brasileiros. ' +
  'Dado uma lista de produtos, gere especificações técnicas para cadastro em marketplaces. ' +
  'Responda APENAS com um array JSON válido, sem markdown, sem texto adicional.'

function buildPrompt(produtos: { sku: string; nome: string; custo: number }[], regime: string): string {
  const lista = produtos.map(p => `SKU ${p.sku}: ${p.nome} (custo R$${p.custo.toFixed(2)})`).join('\n')
  return `Regime tributário: ${regime}

Produtos:
${lista}

Retorne um array JSON com um objeto por produto, na mesma ordem, com exatamente estes campos:
[{
  "sku": "string (mesmo SKU fornecido)",
  "titulo_ml": "string (máx 60 chars, palavra-chave no início, sem caracteres especiais)",
  "titulo_shopee": "string (máx 120 chars, palavra-chave no início, Title Case)",
  "descricao": "string (specs técnicas + benefícios + modo de uso, máx 80 palavras)",
  "preco_ml": number,
  "preco_shopee": number,
  "peso_g": number,
  "comprimento_cm": number,
  "largura_cm": number,
  "altura_cm": number,
  "ncm": "string (8 dígitos)",
  "gtin": "string (EAN/GTIN ou 0 se não houver)",
  "confianca_dimensoes": "alta" ou "media"
}]`
}

// ─── Produtos de teste ────────────────────────────────────────────────────────

const PRODUTOS = [
  { sku: '80171', nome: 'Vara Telescópica CMIK 3m', custo: 11.60 },
  { sku: '81025', nome: 'Molinete Enjoylure SE3000', custo: 37.50 },
  { sku: '82010', nome: 'Linha Multifilamento 0.30mm 100m', custo: 8.90 },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  console.log('Enviando batch para a Claude API...')
  console.log('Produtos:', PRODUTOS.map(p => p.sku + ' - ' + p.nome).join(', '))
  console.log()

  const t0 = Date.now()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(PRODUTOS, 'MEI') }],
  })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  const raw = message.content[0]
  if (raw.type !== 'text') {
    console.error('Tipo inesperado:', raw.type)
    return
  }

  console.log('=== RESPOSTA BRUTA COMPLETA ===')
  console.log(raw.text)
  console.log('=== FIM DA RESPOSTA ===')
  console.log()
  console.log(`Tokens usados: ${message.usage.input_tokens} input / ${message.usage.output_tokens} output`)
  console.log(`Tempo: ${elapsed}s`)
  console.log(`stop_reason: ${message.stop_reason}`)
  console.log()

  // Tenta parsear para confirmar que o JSON é válido
  try {
    const parsed = JSON.parse(raw.text.trim())
    console.log(`Parse direto: OK — ${Array.isArray(parsed) ? parsed.length + ' itens' : 'não é array'}`)
  } catch {
    const stripped = raw.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const start = stripped.indexOf('[')
    const end = stripped.lastIndexOf(']')
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(stripped.slice(start, end + 1))
        console.log(`Parse via extração []: OK — ${Array.isArray(parsed) ? parsed.length + ' itens' : 'não é array'}`)
      } catch (e2) {
        console.error('Parse falhou mesmo após extração:', (e2 as Error).message)
      }
    } else {
      console.error('Nenhum [ ] encontrado na resposta')
    }
  }
}

main().catch(err => {
  console.error('Erro:', err.message)
  process.exit(1)
})
