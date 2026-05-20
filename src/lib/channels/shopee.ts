import * as XLSX from 'xlsx'
import { type inferProductSpecs } from '@/lib/claude-client'
import { type calcularPrecos } from '@/lib/pricing'

export interface ProdutoProcessado {
  sku: string
  nome: string
  custo: number
  estoque: number
  regime: 'MEI' | 'SN'
  specs: ReturnType<typeof inferProductSpecs> extends Promise<infer T> ? T : never
  precos: ReturnType<typeof calcularPrecos>
  foto_capa_url: string
}

const HEADERS = [
  'Nome do Produto',
  'Descrição do Produto',
  'SKU principal',
  'Preço',
  'Estoque',
  'Imagem de capa',
  'Peso (kg)',
  'Comprimento (cm)',
  'Largura (cm)',
  'Altura (cm)',
  'Correios',
  'NCM',
  'CFOP (Mesmo Estado)',
  'CFOP (Outro Estado)',
  'Origem',
  'CSOSN',
  'Unidade de Medida',
]

export function gerarPlanilhaShopee(
  produtos: ProdutoProcessado[],
  driveFolderUrl: string
): ArrayBuffer {
  const rows = produtos.map(p => {
    const { comprimento_cm, largura_cm, altura_cm, peso_g } = p.specs.dimensoes
    const correios = comprimento_cm <= 105 ? 'Ligado' : ''

    return [
      p.nome,
      p.specs.descricao_shopee,
      p.sku,
      p.precos.preco_shopee,
      p.estoque,
      p.foto_capa_url || driveFolderUrl,
      +(peso_g / 1000).toFixed(3),
      Math.round(comprimento_cm),
      Math.round(largura_cm),
      Math.round(altura_cm),
      correios,
      p.specs.ncm,
      '5102',
      '6102',
      '0',
      '400',
      'UN',
    ]
  })

  // 7 linhas vazias + 1 linha de cabeçalho = 8 linhas antes dos dados (linha 9)
  const emptyRows = Array.from({ length: 7 }, () => [])
  const ws = XLSX.utils.aoa_to_sheet([...emptyRows, HEADERS, ...rows])

  ws['!cols'] = HEADERS.map((_, i) => ({
    wch: Math.max(
      HEADERS[i].length,
      ...rows.map(r => String(r[i] ?? '').length)
    ) + 2,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Shopee')

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
