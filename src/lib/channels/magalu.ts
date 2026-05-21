import * as XLSX from 'xlsx'
import { type ProdutoProcessado } from '@/lib/channels/shopee'

const HEADERS = [
  'Título',
  'Descrição',
  'SKU',
  'Preço',
  'Estoque',
  'Foto 1',
  'Foto 2',
]

const BLOCKED_WORDS_MAGALU = ['raticida', 'praticidade']

function sanitizarTitulo(titulo: string): string {
  let s = titulo.replace(/https?:\/\/\S+/g, '').trim()
  s = s.replace(/\b([A-Z]{3,})\b/g, w => w.charAt(0) + w.slice(1).toLowerCase())
  return s.slice(0, 100).trim()
}

function sanitizarDescricao(desc: string): string {
  let s = desc
  for (const word of BLOCKED_WORDS_MAGALU) {
    s = s.replace(new RegExp(word, 'gi'), '***')
  }
  return s.slice(0, 4000)
}

function sanitizarSku(sku: string): string {
  return sku.replace(/[^a-zA-Z0-9-]/g, '')
}

export function gerarCSVMagalu(produtos: ProdutoProcessado[]): ArrayBuffer {
  const rows = produtos.map(p => [
    sanitizarTitulo(p.specs.titulo_shopee || p.nome),
    sanitizarDescricao(p.specs.descricao_shopee),
    sanitizarSku(p.sku),
    p.precos.preco_magalu,
    p.estoque,
    p.foto_capa_url,
    p.foto_capa_url,
  ])

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  ws['!cols'] = HEADERS.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Magalu')

  return XLSX.write(wb, { type: 'array', bookType: 'csv' }) as ArrayBuffer
}
