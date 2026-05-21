import * as XLSX from 'xlsx'
import { type ProdutoProcessado } from '@/lib/channels/shopee'

const HEADERS = [
  'Nome do Produto',
  'SKU',
  'Preço',
  'Estoque',
  'Peso (kg)',
  'Comprimento (cm)',
  'Largura (cm)',
  'Altura (cm)',
  'Marca',
  'Categoria',
  'Descrição',
]

function capDim(val: number): number {
  return Math.min(Math.round(val), 99)
}

function tituloTikTok(titulo: string): string {
  return titulo.slice(0, 30).trim()
}

export function gerarCSVTikTok(produtos: ProdutoProcessado[]): ArrayBuffer {
  const rows = produtos.map(p => {
    const { comprimento_cm, largura_cm, altura_cm, peso_g } = p.specs.dimensoes

    return [
      tituloTikTok(p.specs.titulo_ml || p.nome),
      p.sku,
      p.precos.preco_tiktok_promo,
      p.estoque,
      +(peso_g / 1000).toFixed(3),
      capDim(comprimento_cm),
      capDim(largura_cm),
      capDim(altura_cm),
      'Sem marca',
      'Esportes ao ar livre > Acessórios esportivos',
      p.specs.descricao_shopee,
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  ws['!cols'] = HEADERS.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'TikTok')

  return XLSX.write(wb, { type: 'array', bookType: 'csv' }) as ArrayBuffer
}
