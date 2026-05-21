import * as XLSX from 'xlsx'
import { type ProdutoProcessado } from '@/lib/channels/shopee'

const HEADERS = [
  'Descrição',
  'SKU',
  'Preço de custo',
  'Preço de venda',
  'Estoque',
  'NCM',
  'Peso bruto (kg)',
  'Comprimento',
  'Largura',
  'Altura',
  'GTIN/EAN',
  'Categoria',
  'Observações',
  'URL Imagem 1',
  'URL Imagem 2',
]

function detectarCategoriaBling(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('molinete')) return 'Molinetes'
  if (n.includes('vara')) return 'Varas'
  return 'Acessórios'
}

export function gerarCSVBling(produtos: ProdutoProcessado[]): ArrayBuffer {
  const rows = produtos.map(p => {
    const { comprimento_cm, largura_cm, altura_cm, peso_g } = p.specs.dimensoes
    return [
      p.nome,
      p.sku,
      p.custo,
      p.precos.preco_bling,
      p.estoque,
      p.specs.ncm,
      +(peso_g / 1000).toFixed(3),
      comprimento_cm,
      largura_cm,
      altura_cm,
      p.specs.ean || '',
      detectarCategoriaBling(p.nome),
      p.specs.descricao_bling ?? p.specs.descricao_ml,
      p.foto_capa_url,
      p.foto_capa_url,
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  ws['!cols'] = HEADERS.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bling')

  return XLSX.write(wb, { type: 'array', bookType: 'csv' }) as ArrayBuffer
}
