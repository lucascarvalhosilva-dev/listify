import { calcularPrecos, detectarFrete } from '@/lib/pricing'
import { gerarPlanilhaShopee, type ProdutoProcessado } from '@/lib/channels/shopee'
import { gerarPlanilhaML } from '@/lib/channels/ml'
import { gerarCSVTikTok } from '@/lib/channels/tiktok'
import { gerarCSVBling } from '@/lib/channels/bling'
import { gerarCSVMagalu } from '@/lib/channels/magalu'
import { gerarCSVAmazon } from '@/lib/channels/amazon'
import type { ProductSpecs } from '@/lib/claude-client'

export type RegimeTributario = 'MEI' | 'SN'

export interface ProdutoRevisaoCatalogo {
  sku: string
  nome: string
  custo: number
  estoque: number
  embalagem?: number
  preco_ml: number
  preco_shopee: number
  preco_tiktok?: number
  preco_bling?: number
  preco_magalu?: number
  preco_amazon?: number
  peso_g: number
  comprimento_cm: number
  largura_cm: number
  altura_cm: number
  confianca_dimensoes: 'alta' | 'media'
  titulo_ml: string
  titulo_shopee: string
  titulo_amazon?: string
  descricao_ml?: string
  descricao_shopee?: string
  descricao_tiktok?: string
  descricao_magalu?: string
  descricao_bling?: string
  descricao_amazon?: string
  bullet_point1?: string
  bullet_point2?: string
  bullet_point3?: string
  bullet_point4?: string
  bullet_point5?: string
  ncm: string
  gtin: string
}

export interface ArquivosCatalogoBase64 {
  shopee: string | null
  ml: string | null
  tiktok: string | null
  bling: string | null
  magalu: string | null
  amazon: string | null
}

export const EXTENSAO_CATALOGO: Record<string, string> = {
  shopee: 'xlsx',
  ml: 'xlsx',
  tiktok: 'csv',
  tiktok_shop: 'csv',
  bling: 'csv',
  magalu: 'csv',
  amazon: 'csv',
}

export const CONTENT_TYPE_CATALOGO: Record<string, string> = {
  shopee: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ml: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  tiktok: 'text/csv',
  tiktok_shop: 'text/csv',
  bling: 'text/csv',
  magalu: 'text/csv',
  amazon: 'text/csv',
}

export const CANAL_LABELS_CATALOGO: Record<string, string> = {
  shopee: 'Shopee',
  ml: 'Mercado Livre',
  mercado_livre: 'Mercado Livre',
  tiktok_shop: 'TikTok Shop',
  tiktok: 'TikTok Shop',
  bling: 'Bling',
  magalu: 'Magalu',
  amazon: 'Amazon',
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return Buffer.from(binary, 'binary').toString('base64')
}

function montarProdutoProcessado(
  produto: ProdutoRevisaoCatalogo,
  regime: RegimeTributario,
  driveFolderUrl: string
): ProdutoProcessado {
  const basePrecos = calcularPrecos(produto.custo, regime, produto.comprimento_cm)
  const precos = {
    ...basePrecos,
    preco_ml: produto.preco_ml,
    preco_shopee: produto.preco_shopee,
    preco_tiktok_promo: produto.preco_tiktok ?? basePrecos.preco_tiktok_promo,
    preco_bling: produto.preco_bling ?? basePrecos.preco_bling,
    preco_magalu: produto.preco_magalu ?? basePrecos.preco_magalu,
    preco_amazon: produto.preco_amazon ?? basePrecos.preco_amazon,
    tipo_frete: detectarFrete(produto.comprimento_cm),
  }

  const specs: ProductSpecs = {
    dimensoes: {
      comprimento_cm: produto.comprimento_cm,
      largura_cm: produto.largura_cm,
      altura_cm: produto.altura_cm,
      peso_g: produto.peso_g,
    },
    ncm: produto.ncm,
    ean: produto.gtin,
    categoria: '',
    material: '',
    titulo_ml: produto.titulo_ml,
    titulo_shopee: produto.titulo_shopee,
    titulo_amazon: produto.titulo_amazon,
    descricao_ml: produto.descricao_ml ?? '',
    descricao_shopee: produto.descricao_shopee ?? '',
    descricao_tiktok: produto.descricao_tiktok,
    descricao_magalu: produto.descricao_magalu,
    descricao_bling: produto.descricao_bling,
    descricao_amazon: produto.descricao_amazon,
    bullet_point1: produto.bullet_point1,
    bullet_point2: produto.bullet_point2,
    bullet_point3: produto.bullet_point3,
    bullet_point4: produto.bullet_point4,
    bullet_point5: produto.bullet_point5,
    palavras_chave: [],
    confianca_dimensoes: produto.confianca_dimensoes,
  }

  return {
    sku: produto.sku,
    nome: produto.nome,
    custo: produto.custo,
    estoque: produto.estoque,
    regime,
    specs,
    precos,
    foto_capa_url: driveFolderUrl,
  }
}

export function gerarArquivosCatalogo(params: {
  produtos: ProdutoRevisaoCatalogo[]
  regime: RegimeTributario
  canais: string[]
  drive_folder_url: string
}): {
  arquivos: ArquivosCatalogoBase64
  produtos_processados: ProdutoProcessado[]
} {
  const produtosProcessados = params.produtos.map(produto =>
    montarProdutoProcessado(produto, params.regime, params.drive_folder_url)
  )

  const arquivos: ArquivosCatalogoBase64 = {
    shopee: null,
    ml: null,
    tiktok: null,
    bling: null,
    magalu: null,
    amazon: null,
  }

  if (produtosProcessados.length > 0) {
    if (params.canais.includes('shopee')) {
      arquivos.shopee = arrayBufferToBase64(gerarPlanilhaShopee(produtosProcessados, params.drive_folder_url))
    }
    if (params.canais.includes('ml') || params.canais.includes('mercado_livre')) {
      arquivos.ml = arrayBufferToBase64(gerarPlanilhaML(produtosProcessados))
    }
    if (params.canais.includes('tiktok_shop') || params.canais.includes('tiktok')) {
      arquivos.tiktok = arrayBufferToBase64(gerarCSVTikTok(produtosProcessados))
    }
    if (params.canais.includes('bling')) {
      arquivos.bling = arrayBufferToBase64(gerarCSVBling(produtosProcessados))
    }
    if (params.canais.includes('magalu')) {
      arquivos.magalu = arrayBufferToBase64(gerarCSVMagalu(produtosProcessados))
    }
    if (params.canais.includes('amazon')) {
      arquivos.amazon = arrayBufferToBase64(gerarCSVAmazon(produtosProcessados))
    }
  }

  return { arquivos, produtos_processados: produtosProcessados }
}
