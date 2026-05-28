import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarAtributosObrigatorios } from '@/lib/ml/atributos'
import * as XLSX from 'xlsx'

const SEGMENTO_CATEGORIAS: Record<string, string[]> = {
  moda: ['MLB31447', 'MLB178702'],
  eletronicos: ['MLB1648', 'MLB1051'],
  esportes: ['MLB1276', 'MLB264586'],
  casa: ['MLB1574'],
  saude: ['MLB1246'],
  automotivo: ['MLB1747'],
}

const ATTR_COLUNA: Record<string, string> = {
  COLOR: 'Cor',
  COR: 'Cor',
  MAIN_COLOR: 'Cor',
  SIZE: 'Tamanho',
  TAMANHO: 'Tamanho',
  GENDER: 'Gênero',
  GENERO: 'Gênero',
  'GÊNERO': 'Gênero',
  GARMENT_TYPE: 'Tipo de Roupa',
  SLEEVE_TYPE: 'Tipo de Manga',
  MATERIAL: 'Material',
  AGE_GROUP: 'Faixa Etária',
  COLOR_SECONDARY: 'Cor Secundária',
  LINE: 'Linha',
  ALPHANUMERIC_SIZE: 'Tamanho',
}

const SKIP_ATTRS = new Set([
  'BRAND', 'MARCA',
  'MODEL', 'MODELO',
  'SELLER_SKU',
  'ITEM_CONDITION',
])

const BASE_HEADERS = ['SKU', 'Nome do Produto', 'Marca', 'Categoria', 'Custo Unitário (R$)', 'Estoque']

const EXEMPLOS_POR_SEGMENTO: Record<string, [string, string]> = {
  moda: ['Camiseta Básica Masculina', 'MLB31447'],
  eletronicos: ['Smartphone Android 128GB', 'MLB1051'],
  esportes: ['Raquete de Tênis Adulto', 'MLB1276'],
  casa: ['Porta-Retratos 10x15 cm', 'MLB1574'],
  saude: ['Suplemento Vitamina C 1000mg', 'MLB1246'],
  automotivo: ['Suporte Veicular para Celular', 'MLB1747'],
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const segmento = searchParams.get('segmento')?.toLowerCase() ?? 'outro'

  const categorias = SEGMENTO_CATEGORIAS[segmento] ?? []

  const attrsPorCat = await Promise.all(
    categorias.map(c => buscarAtributosObrigatorios(c).catch(() => []))
  )

  const seen = new Set<string>()
  const colunasExtras: string[] = []

  for (const attrs of attrsPorCat) {
    for (const attr of attrs) {
      const id = attr.id.toUpperCase()
      if (SKIP_ATTRS.has(id)) continue
      if (seen.has(id)) continue
      seen.add(id)
      const coluna = ATTR_COLUNA[id] ?? attr.name
      if (!colunasExtras.includes(coluna)) colunasExtras.push(coluna)
    }
  }

  const headers = [...BASE_HEADERS, ...colunasExtras]

  const [exNome, exCategoria] = EXEMPLOS_POR_SEGMENTO[segmento] ?? ['Produto Exemplo', categorias[0] ?? '']
  const exRow = [
    'SKU001', exNome, 'Marca Exemplo', exCategoria, 29.90, 10,
    ...colunasExtras.map(() => ''),
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, exRow])
  ws['!cols'] = [
    { wch: 10 },
    { wch: 38 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    ...colunasExtras.map(() => ({ wch: 18 })),
  ]
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
