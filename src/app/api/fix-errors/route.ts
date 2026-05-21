import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import * as XLSX from 'xlsx'
import Anthropic from '@anthropic-ai/sdk'
import { SHOPEE_ERROR_GUIDE, ML_ERROR_GUIDE } from '@/lib/errors/marketplace-errors'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface RequestBody {
  canal: 'shopee' | 'ml'
  mensagem?: string
  arquivo_base64?: string
}

interface Correction {
  linha: number
  sku: string
  correcoes: Record<string, string>
  diagnostico: string
}

function findErrorColumnIdx(headers: string[]): number {
  const patterns = [/motivo/i, /falha/i, /erro/i, /error/i, /reason/i, /resultado/i, /observa/i, /status/i]
  return headers.findIndex(h => patterns.some(p => p.test(String(h))))
}

function parseArraySafe(text: string): unknown[] {
  try { const d = JSON.parse(text); if (Array.isArray(d)) return d } catch {}
  const s = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { const d = JSON.parse(s); if (Array.isArray(d)) return d } catch {}
  const start = s.indexOf('['), end = s.lastIndexOf(']')
  if (start !== -1 && end > start) {
    try { const d = JSON.parse(s.slice(start, end + 1)); if (Array.isArray(d)) return d } catch {}
  }
  return []
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return Buffer.from(binary, 'binary').toString('base64')
}

function buildOutputFile(
  canal: 'shopee' | 'ml',
  headers: string[],
  rows: string[][],
  emptyRowsBefore: number
): ArrayBuffer {
  const outputData: string[][] = [
    ...Array.from({ length: emptyRowsBefore }, () => []),
    headers,
    ...rows,
  ]
  const ws = XLSX.utils.aoa_to_sheet(outputData)
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2,
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, canal === 'shopee' ? 'Shopee' : 'ML')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

function applyCorrections(
  corrections: Correction[],
  headers: string[],
  dataRows: string[][]
): { correctedRows: string[][]; diagnosticos: string[]; corrigidos: number } {
  const correctedRows = dataRows.map(row => [...row])
  const diagnosticos: string[] = []
  let corrigidos = 0
  const skuColIdx = headers.findIndex(h => /^sku/i.test(h.trim()))

  for (const c of corrections) {
    const rowIdx = parseInt(String(c.linha), 10)
    if (isNaN(rowIdx) || rowIdx < 0 || rowIdx >= correctedRows.length) continue
    const hasFix = Object.keys(c.correcoes ?? {}).length > 0
    if (hasFix) {
      for (const [colName, newVal] of Object.entries(c.correcoes)) {
        const colIdx = headers.indexOf(colName)
        if (colIdx >= 0) correctedRows[rowIdx][colIdx] = newVal
      }
      corrigidos++
    }
    if (c.diagnostico) {
      const sku = skuColIdx >= 0 ? String(correctedRows[rowIdx][skuColIdx]) : String(rowIdx + 1)
      diagnosticos.push(`${sku}: ${c.diagnostico}`)
    }
  }
  return { correctedRows, diagnosticos, corrigidos }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: RequestBody = await request.json()
    const { canal, mensagem, arquivo_base64 } = body

    if (!canal) return NextResponse.json({ error: 'Missing canal' }, { status: 400 })
    if (!mensagem && !arquivo_base64) {
      return NextResponse.json({ error: 'Provide mensagem or arquivo_base64' }, { status: 400 })
    }

    const guide = canal === 'shopee' ? SHOPEE_ERROR_GUIDE : ML_ERROR_GUIDE
    const canalLabel = canal === 'shopee' ? 'Shopee Brasil' : 'Mercado Livre Brasil'

    // ── Mode A: text-only Q&A (no file) ───────────────────────────────────────
    if (!arquivo_base64) {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: 'Você é um especialista em importação de produtos em marketplaces brasileiros. Responda de forma clara, objetiva e em português. Use listas quando ajudar. Se a solução envolver um arquivo de erros, mencione que o usuário pode usar o botão "Corrigir minha planilha gerada" para correção automática.',
        messages: [{
          role: 'user',
          content: `Canal: ${canalLabel}\n\n${guide}\n\nPergunta do usuário: ${mensagem}\n\nResponda de forma direta e útil.`,
        }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : 'Não consegui processar sua pergunta.'
      return NextResponse.json({ mensagem: text })
    }

    // ── Parse file ─────────────────────────────────────────────────────────────
    const buffer = Buffer.from(arquivo_base64, 'base64')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]

    const headerIdx = allRows.findIndex(row => row.some(cell => String(cell).trim() !== ''))
    if (headerIdx === -1) {
      return NextResponse.json({ error: 'Arquivo vazio ou formato inválido.' }, { status: 400 })
    }

    const headers = allRows[headerIdx].map(h => String(h))
    const dataRows = allRows.slice(headerIdx + 1).filter(row => row.some(cell => String(cell).trim() !== ''))
    const errorColIdx = findErrorColumnIdx(headers)

    // ── Mode C: generated file + text description (no error column) ────────────
    if (errorColIdx === -1) {
      if (!mensagem) {
        return NextResponse.json({
          error: 'Coluna de erros não encontrada. Verifique se o arquivo é o relatório de erros retornado pelo marketplace.',
        }, { status: 400 })
      }

      const allDataObjs = dataRows.map((row, i) => {
        const obj: Record<string, string> = { _linha: String(i) }
        headers.forEach((h, j) => { obj[h] = String(row[j] ?? '') })
        return obj
      })

      const promptC = `Canal: ${canalLabel}

${guide}

O usuário importou esta planilha no marketplace e relatou o seguinte problema:
"${mensagem}"

Conteúdo da planilha (todos os produtos):
${JSON.stringify(allDataObjs, null, 2)}

Cabeçalhos disponíveis: ${JSON.stringify(headers)}

Com base no erro relatado, identifique os produtos afetados e aplique as correções necessárias.
Use os NOMES EXATOS das colunas.
Responda APENAS com array JSON:
[{
  "linha": number (valor do campo _linha),
  "sku": "string",
  "correcoes": { "NOME_EXATO_DA_COLUNA": "valor_corrigido" },
  "diagnostico": "string curta explicando o erro e a correção aplicada"
}]

Inclua apenas os produtos que precisam de correção. Se nenhum precisar, retorne [].`

      const msgC = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: 'Você é um especialista em marketplaces brasileiros. Responda APENAS com array JSON válido, sem markdown.',
        messages: [{ role: 'user', content: promptC }],
      })

      const rawC = msgC.content[0]
      if (rawC.type !== 'text') throw new Error('Resposta inesperada da IA')

      const { correctedRows, diagnosticos, corrigidos } = applyCorrections(
        parseArraySafe(rawC.text) as Correction[],
        headers,
        dataRows
      )

      const emptyRowsBefore = canal === 'shopee' ? headerIdx : 0
      const outBuffer = buildOutputFile(canal, headers, correctedRows, emptyRowsBefore)

      const textoResposta = corrigidos > 0
        ? `Apliquei correções em ${corrigidos} produto${corrigidos !== 1 ? 's' : ''} com base no erro relatado. O arquivo corrigido está pronto para download.`
        : `Analisei a planilha mas não identifiquei correções automáticas para o erro relatado. Pode ser necessário ajuste manual ou o erro é específico de um campo não detectável automaticamente.`

      return NextResponse.json({
        mensagem: textoResposta,
        produtos_corrigidos: corrigidos,
        total_com_erros: corrigidos,
        diagnosticos,
        arquivo_corrigido: arrayBufferToBase64(outBuffer),
      })
    }

    // ── Mode B: marketplace error report (has error column) ────────────────────
    const errorColName = headers[errorColIdx]

    const rowsWithErrors = dataRows
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => String(row[errorColIdx]).trim() !== '')

    if (rowsWithErrors.length === 0) {
      return NextResponse.json({
        error: 'Nenhum erro encontrado no arquivo. Verifique se está enviando o arquivo de erros correto.',
      }, { status: 400 })
    }

    const errorData = rowsWithErrors.map(({ row, i }) => {
      const obj: Record<string, string> = { _linha: String(i) }
      headers.forEach((h, j) => { obj[h] = String(row[j] ?? '') })
      return obj
    })

    const contextoPergunta = mensagem ? `\n\nO usuário também perguntou: "${mensagem}"` : ''

    const promptB = `Canal: ${canalLabel}

${guide}

Produto(s) com erro no arquivo de importação (coluna "${errorColName}" contém o motivo):
${JSON.stringify(errorData, null, 2)}

Cabeçalhos disponíveis no arquivo: ${JSON.stringify(headers)}${contextoPergunta}

Para cada produto, analise o erro e retorne as correções necessárias.
Use os NOMES EXATOS das colunas listadas acima.
Responda APENAS com array JSON:
[{
  "linha": number (valor do campo _linha),
  "sku": "string",
  "correcoes": { "NOME_EXATO_DA_COLUNA": "valor_corrigido" },
  "diagnostico": "string curta explicando o erro e a correção aplicada"
}]

Regras:
- Não inclua a coluna "${errorColName}" nas correções
- Se não for possível corrigir automaticamente (ex: imagem faltando), use correcoes: {} e explique no diagnóstico
- Para Shopee: Peso (kg) deve estar em quilogramas (ex: 0.250 para 250g)
- Para ML: "Forma de envio" deve ser "Mercado Envios" se ≤105cm, "A combinar" se >105cm`

    const msgB = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: 'Você é um especialista em marketplaces brasileiros. Responda APENAS com array JSON válido, sem markdown.',
      messages: [{ role: 'user', content: promptB }],
    })

    const rawB = msgB.content[0]
    if (rawB.type !== 'text') throw new Error('Resposta inesperada da IA')

    const { correctedRows: correctedB, diagnosticos: diagB, corrigidos: corrigidosB } = applyCorrections(
      parseArraySafe(rawB.text) as Correction[],
      headers,
      dataRows
    )

    const filteredHeaders = headers.filter((_, i) => i !== errorColIdx)
    const filteredRows = correctedB.map(row => row.filter((_, i) => i !== errorColIdx))
    const emptyRowsBefore = canal === 'shopee' ? headerIdx : 0
    const outBufferB = buildOutputFile(canal, filteredHeaders, filteredRows, emptyRowsBefore)

    const textoRespostaB = corrigidosB > 0
      ? `Corrigi ${corrigidosB} de ${rowsWithErrors.length} produto${rowsWithErrors.length !== 1 ? 's' : ''}. O arquivo corrigido está pronto para download.`
      : `Encontrei ${rowsWithErrors.length} produto${rowsWithErrors.length !== 1 ? 's' : ''} com erros, mas eles precisam de ação manual — por exemplo, adicionar imagens ou preencher dados obrigatórios. Veja o diagnóstico para detalhes.`

    return NextResponse.json({
      mensagem: textoRespostaB,
      produtos_corrigidos: corrigidosB,
      total_com_erros: rowsWithErrors.length,
      diagnosticos: diagB,
      arquivo_corrigido: arrayBufferToBase64(outBufferB),
    })
  } catch (err) {
    console.error('[/api/fix-errors] Erro:', err instanceof Error ? err.stack : err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
