import {
  criarCardPriceGuard,
  getCanalLabelPriceGuard,
  type PriceGuardData,
  type ProdutoRevisaoPriceGuard,
  type RegimePriceGuard,
} from '@/lib/price-guard'
import { normalizarCanalParaEngine } from '@/lib/normalizar-canais'
import { validarPreUploadCatalogo, type ValidadorUploadData } from '@/lib/validador-pre-upload'

export interface CatalogoPrecoRow {
  id: string
  nome: string
  canal?: string | null
  criado_em: string
  atualizado_em: string
  regime_tributario?: string | null
  drive_url?: string | null
  arquivo_path?: string | null
  produtos: unknown
}

export interface CatalogoPrecoItem {
  id: string
  nome: string
  canal: string
  nome_canal_label: string
  criado_em: string
  atualizado_em: string
  regime_tributario: string
  regime: RegimePriceGuard
  drive_url: string
  arquivo_path: string | null
  total_produtos: number
  produtos: ProdutoRevisaoPriceGuard[]
  price_guard: PriceGuardData
  validador_upload: ValidadorUploadData
  editavel: boolean
  motivo_bloqueio?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numero(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function texto(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function normalizarRegimePreco(regime: unknown): RegimePriceGuard {
  return regime === 'SN' || regime === 'Simples Nacional' ? 'SN' : 'MEI'
}

export function normalizarProdutosPreco(produtos: unknown): ProdutoRevisaoPriceGuard[] {
  if (!Array.isArray(produtos)) return []

  return produtos
    .filter(isRecord)
    .map(produto => ({
      sku: texto(produto.sku, '-'),
      nome: texto(produto.nome, 'Produto sem nome'),
      custo: numero(produto.custo),
      estoque: numero(produto.estoque),
      embalagem: numero(produto.embalagem),
      preco_ml: numero(produto.preco_ml, NaN),
      preco_shopee: numero(produto.preco_shopee, NaN),
      preco_tiktok: numero(produto.preco_tiktok, NaN),
      preco_bling: numero(produto.preco_bling, NaN),
      preco_magalu: numero(produto.preco_magalu, NaN),
      preco_amazon: numero(produto.preco_amazon, NaN),
      peso_g: numero(produto.peso_g),
      comprimento_cm: numero(produto.comprimento_cm),
      largura_cm: numero(produto.largura_cm),
      altura_cm: numero(produto.altura_cm),
      confianca_dimensoes: produto.confianca_dimensoes === 'alta' ? 'alta' as const : 'media' as const,
      titulo_ml: texto(produto.titulo_ml),
      titulo_shopee: texto(produto.titulo_shopee),
      titulo_amazon: texto(produto.titulo_amazon),
      descricao_ml: texto(produto.descricao_ml),
      descricao_shopee: texto(produto.descricao_shopee),
      descricao_tiktok: texto(produto.descricao_tiktok),
      descricao_magalu: texto(produto.descricao_magalu),
      descricao_bling: texto(produto.descricao_bling),
      descricao_amazon: texto(produto.descricao_amazon),
      bullet_point1: texto(produto.bullet_point1),
      bullet_point2: texto(produto.bullet_point2),
      bullet_point3: texto(produto.bullet_point3),
      bullet_point4: texto(produto.bullet_point4),
      bullet_point5: texto(produto.bullet_point5),
      ncm: texto(produto.ncm),
      gtin: texto(produto.gtin),
    }))
    .filter(produto => produto.sku.trim().length > 0 && Number.isFinite(produto.custo))
}

export function montarCatalogoPreco(row: CatalogoPrecoRow): CatalogoPrecoItem {
  const canal = row.canal ? normalizarCanalParaEngine(row.canal) : ''
  const regime = normalizarRegimePreco(row.regime_tributario)
  const produtos = normalizarProdutosPreco(row.produtos)
  const canais = canal ? [canal] : []
  const card = criarCardPriceGuard({ produtosRevisao: produtos, canais, regime })
  const driveUrl = row.drive_url ?? ''
  const arquivoPath = row.arquivo_path ?? null
  const validadorUpload = validarPreUploadCatalogo({
    produtos,
    canal,
    driveUrl,
    arquivoPath,
  })
  const editavel = produtos.length > 0 && canais.length > 0 && Boolean(driveUrl)

  return {
    id: row.id,
    nome: row.nome,
    canal,
    nome_canal_label: canal ? getCanalLabelPriceGuard(canal) : 'Canal nao informado',
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
    regime_tributario: row.regime_tributario ?? regime,
    regime,
    drive_url: driveUrl,
    arquivo_path: arquivoPath,
    total_produtos: produtos.length,
    produtos,
    price_guard: card.price_guard,
    validador_upload: validadorUpload,
    editavel,
    motivo_bloqueio: editavel
      ? undefined
      : !driveUrl
        ? 'Catalogo sem link do Drive para regenerar a planilha.'
        : produtos.length === 0
          ? 'Catalogo sem produtos editaveis.'
          : 'Catalogo sem canal definido.',
  }
}
