import { getCanalLabelPriceGuard, getCampoPrecoPorCanal, type ProdutoRevisaoPriceGuard } from '@/lib/price-guard'
import { normalizarCanalParaEngine } from '@/lib/normalizar-canais'

export type ComparadorListingStatus = 'melhorado' | 'revisar'

export interface ProdutoOriginalComparador {
  sku: string
  nome: string
  custo: number
  estoque: number
  marca?: string
  categoria?: string
}

export interface ComparadorListingProduto {
  sku: string
  nome_original: string
  nome_otimizado: string
  canal: string
  nome_canal_label: string
  preco: number | null
  custo: number | null
  estoque: number | null
  melhorias: string[]
  status: ComparadorListingStatus
}

export interface ComparadorListingData {
  acao: 'card_comparador_listing'
  titulo: string
  resumo: string
  total_produtos: number
  produtos_com_titulo: number
  produtos_com_descricao: number
  canais: string[]
  produtos_preview: ComparadorListingProduto[]
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numero(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function tituloPorCanal(produto: ProdutoRevisaoPriceGuard, canal: string): string {
  if (canal === 'shopee') return texto(produto.titulo_shopee)
  if (canal === 'ml' || canal === 'mercado_livre') return texto(produto.titulo_ml)
  if (canal === 'amazon') return texto(produto.titulo_amazon)
  return texto(produto.titulo_ml) || texto(produto.titulo_shopee) || texto(produto.nome)
}

function descricaoPorCanal(produto: ProdutoRevisaoPriceGuard, canal: string): string {
  if (canal === 'shopee') return texto(produto.descricao_shopee)
  if (canal === 'ml' || canal === 'mercado_livre') return texto(produto.descricao_ml)
  if (canal === 'amazon') return texto(produto.descricao_amazon)
  if (canal === 'magalu') return texto(produto.descricao_magalu)
  if (canal === 'bling') return texto(produto.descricao_bling)
  if (canal === 'tiktok' || canal === 'tiktok_shop') return texto(produto.descricao_tiktok)
  return ''
}

function montarMelhorias(params: {
  original: ProdutoOriginalComparador | undefined
  revisado: ProdutoRevisaoPriceGuard
  canal: string
  titulo: string
  descricao: string
  preco: number | null
}): string[] {
  const melhorias: string[] = []
  const nomeOriginal = texto(params.original?.nome) || texto(params.revisado.nome)

  if (params.titulo && params.titulo !== nomeOriginal) melhorias.push('Título otimizado para o canal')
  if (params.descricao.length >= 80) melhorias.push('Descrição pronta para publicar')
  if (params.preco !== null && params.preco > 0) melhorias.push('Preço calculado com margem')
  if (numero(params.revisado.peso_g) && numero(params.revisado.comprimento_cm) && numero(params.revisado.largura_cm) && numero(params.revisado.altura_cm)) {
    melhorias.push('Peso e dimensões preenchidos')
  }
  if (texto(params.revisado.ncm)) melhorias.push('NCM incluído')
  if (texto(params.revisado.gtin)) melhorias.push('GTIN/EAN incluído')

  return melhorias
}

export function criarComparadorListing(params: {
  produtosOriginais: ProdutoOriginalComparador[]
  produtosRevisao: ProdutoRevisaoPriceGuard[]
  canais: string[]
}): ComparadorListingData | null {
  const produtosRevisao = params.produtosRevisao
  if (produtosRevisao.length === 0) return null

  const originaisPorSku = new Map(params.produtosOriginais.map(produto => [produto.sku, produto]))
  const canais = params.canais.map(normalizarCanalParaEngine).filter(Boolean)
  const canalPrincipal = canais[0] ?? 'ml'

  let produtosComTitulo = 0
  let produtosComDescricao = 0

  const produtosPreview = produtosRevisao.slice(0, 4).map(produto => {
    const original = originaisPorSku.get(produto.sku)
    const canal = canalPrincipal
    const titulo = tituloPorCanal(produto, canal)
    const descricao = descricaoPorCanal(produto, canal)
    const campoPreco = getCampoPrecoPorCanal(canal)
    const preco = campoPreco ? numero(produto[campoPreco]) : null
    const custo = numero(produto.custo ?? original?.custo)
    const estoque = numero(produto.estoque ?? original?.estoque)
    const melhorias = montarMelhorias({ original, revisado: produto, canal, titulo, descricao, preco })

    if (titulo) produtosComTitulo += 1
    if (descricao) produtosComDescricao += 1

    return {
      sku: produto.sku,
      nome_original: texto(original?.nome) || texto(produto.nome) || 'Produto sem nome',
      nome_otimizado: titulo || texto(produto.nome) || 'Título não gerado',
      canal,
      nome_canal_label: getCanalLabelPriceGuard(canal),
      preco,
      custo,
      estoque,
      melhorias: melhorias.slice(0, 4),
      status: melhorias.length >= 3 ? 'melhorado' as const : 'revisar' as const,
    }
  })

  return {
    acao: 'card_comparador_listing',
    titulo: 'Antes e depois do cadastro',
    resumo: 'Veja o que o Guiamos transformou a partir dos dados básicos do produto.',
    total_produtos: produtosRevisao.length,
    produtos_com_titulo: produtosComTitulo,
    produtos_com_descricao: produtosComDescricao,
    canais,
    produtos_preview: produtosPreview,
  }
}
