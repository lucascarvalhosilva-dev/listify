import * as XLSX from 'xlsx'
import { type ProdutoProcessado } from '@/lib/channels/shopee'

const HEADERS = [
  'item_sku',
  'item_name',
  'brand_name',
  'product_description',
  'bullet_point1',
  'bullet_point2',
  'bullet_point3',
  'bullet_point4',
  'bullet_point5',
  'standard_price',
  'quantity',
  'item_condition',
  'main_image_url',
  'external_product_id',
  'external_product_id_type',
  'item_type_keyword',
]

function detectarCategoriaAmazon(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('molinete')) return 'fishing-reels'
  if (n.includes('vara') || n.includes('cana')) return 'fishing-rods'
  if (n.includes('linha')) return 'fishing-lines'
  if (n.includes('anzol')) return 'fishing-hooks'
  if (n.includes('isca') || n.includes('lure')) return 'fishing-lures'
  if (n.includes('carretilha')) return 'fishing-reels'
  return 'fishing-accessories'
}

export function gerarCSVAmazon(produtos: ProdutoProcessado[]): ArrayBuffer {
  const rows = produtos.map(p => [
    p.sku,
    (p.specs.titulo_amazon ?? p.specs.titulo_ml).slice(0, 200),
    'Sem Marca',
    p.specs.descricao_amazon ?? p.specs.descricao_ml,
    p.specs.bullet_point1 ?? '',
    p.specs.bullet_point2 ?? '',
    p.specs.bullet_point3 ?? '',
    p.specs.bullet_point4 ?? '',
    p.specs.bullet_point5 ?? '',
    p.precos.preco_amazon,
    p.estoque,
    'New',
    '',
    p.specs.ean !== '0' ? p.specs.ean : '',
    'EAN',
    detectarCategoriaAmazon(p.nome),
  ])

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  ws['!cols'] = HEADERS.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Amazon')

  return XLSX.write(wb, { type: 'array', bookType: 'csv' }) as ArrayBuffer
}
