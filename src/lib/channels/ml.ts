import * as XLSX from 'xlsx'
import { type ProdutoProcessado } from '@/lib/channels/shopee'

const HEADERS = [
  'Código do catálogo ML',
  'Título',
  'Condição',
  'Código universal de produto',
  'Fotos',
  'SKU',
  'Estoque',
  'Preço [R$]',
  'Descrição',
  'Tipo de anúncio',
  'Forma de envio',
  'Custo de envio',
  'Retirar pessoalmente',
  'Tipo de garantia',
  'Tempo de garantia',
  'Unidade de Tempo de garantia',
  'Marca',
  'Modelo',
]

function detectarCategoriaML(nomeProduto: string): string {
  const nome = nomeProduto.toLowerCase()
  if (/molinete|carretilha/.test(nome)) return 'Carretilhas e Molinetes'
  if (/linha|nylon|multifilamento/.test(nome)) return 'Linhas'
  return 'Varas'
}

export function gerarPlanilhaML(produtos: ProdutoProcessado[]): ArrayBuffer {
  // Agrupa produtos por categoria
  const categorias = new Map<string, ProdutoProcessado[]>()
  for (const p of produtos) {
    const cat = detectarCategoriaML(p.nome)
    const lista = categorias.get(cat) ?? []
    lista.push(p)
    categorias.set(cat, lista)
  }

  const wb = XLSX.utils.book_new()

  for (const [categoria, prods] of categorias) {
    const rows = prods.map(p => {
      const { comprimento_cm } = p.specs.dimensoes
      const formaEnvio = comprimento_cm <= 105 ? 'Mercado Envios' : 'A combinar'

      return [
        '',                               // Código do catálogo ML
        p.specs.titulo_ml,
        'Novo',
        p.specs.ean,
        '',                               // Fotos — adicionadas manualmente no painel ML
        p.sku,
        p.estoque,
        p.precos.preco_ml,
        p.specs.descricao_ml,
        'Clássico',
        formaEnvio,
        'Por conta do comprador',
        'Não aceito',
        'Garantia do vendedor',
        '12',
        'meses',
        '',                               // Marca
        '',                               // Modelo
      ]
    })

    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])

    ws['!cols'] = HEADERS.map((_, i) => ({
      wch: Math.max(
        HEADERS[i].length,
        ...rows.map(r => String(r[i] ?? '').length)
      ) + 2,
    }))

    XLSX.utils.book_append_sheet(wb, ws, categoria)
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
