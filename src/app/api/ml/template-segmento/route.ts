import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

const BASE_HEADERS = ['SKU', 'Nome do Produto', 'Marca', 'Custo Unitário (R$)', 'Estoque']

const COLUNAS_EXTRAS: Record<string, string[]> = {
  moda: ['Gênero', 'Tamanho'],
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
