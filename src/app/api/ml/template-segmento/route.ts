import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

const BASE_HEADERS = ['SKU', 'Nome do Produto', 'Marca', 'Custo Unitário (R$)', 'Estoque']

const COLUNAS_EXTRAS: Record<string, string[]> = {
  moda: ['Gênero', 'Tamanho', 'Cor', 'Tipo de Manga'],
  eletronicos: ['Voltagem', 'Modelo'],
  esportes: [],
  casa: ['Material'],
  saude: [],
  automotivo: ['Veículo compatível'],
  outro: [],
}

const BASE_WIDTHS = [
  { wch: 10 },  // SKU
  { wch: 38 },  // Nome do Produto
  { wch: 18 },  // Marca
  { wch: 20 },  // Custo Unitário (R$)
  { wch: 10 },  // Estoque
]

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const segmento = searchParams.get('segmento')?.toLowerCase() ?? 'outro'

  const extras = COLUNAS_EXTRAS[segmento] ?? []
  const headers = [...BASE_HEADERS, ...extras]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers])
  ws['!cols'] = [...BASE_WIDTHS, ...extras.map(() => ({ wch: 20 }))]
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos')

  if (segmento === 'moda') {
    const instrucoes = [
      ['Convenção de SKU para produtos com variações de tamanho ou cor'],
      [],
      ['Se seu produto tem mais de um tamanho ou cor, crie uma linha por variação.'],
      ['O sistema agrupa automaticamente todas as variações em um único anúncio no Mercado Livre.'],
      [],
      ['Exemplo:'],
      ['SKU', 'Nome do Produto', 'Tamanho', 'Cor'],
      ['132-P', 'Camiseta Básica', 'P', 'Branco'],
      ['132-M', 'Camiseta Básica', 'M', 'Branco'],
      ['132-G', 'Camiseta Básica', 'G', 'Branco'],
      ['132-P-PRETA', 'Camiseta Básica', 'P', 'Preto'],
      [],
      ['Regras:'],
      ['• SKU base (antes do primeiro "-") define o grupo: 132-P, 132-M, 132-G → produto "132"'],
      ['• Nome do Produto e Marca devem ser idênticos em todas as variações do mesmo grupo'],
      ['• Cada variação pode ter estoque diferente'],
      ['• Para produto sem variação, use o SKU simples: 132'],
    ]
    const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes)
    wsInstrucoes['!cols'] = [{ wch: 70 }]
    XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Instruções')
  }

  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  return new NextResponse(blob, {
    headers: {
      'Content-Disposition': `attachment; filename="template-guiamos-${segmento}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
