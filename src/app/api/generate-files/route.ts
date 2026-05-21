import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { calcularPrecos, detectarFrete } from '@/lib/pricing'
import { gerarPlanilhaShopee, type ProdutoProcessado } from '@/lib/channels/shopee'
import { gerarPlanilhaML } from '@/lib/channels/ml'
import { gerarCSVTikTok } from '@/lib/channels/tiktok'
import { gerarCSVBling } from '@/lib/channels/bling'
import { gerarCSVMagalu } from '@/lib/channels/magalu'
import { gerarCSVAmazon } from '@/lib/channels/amazon'
import type { ProductSpecs } from '@/lib/claude-client'

interface ProdutoRevisao {
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

interface RequestBody {
  produtos: ProdutoRevisao[]
  regime: 'MEI' | 'SN'
  canais: string[]
  drive_folder_url: string
  alertas: string[]
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return Buffer.from(binary, 'binary').toString('base64')
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: RequestBody = await request.json()
    const { produtos, regime, canais, drive_folder_url, alertas } = body

    if (!produtos?.length || !regime || !canais?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const produtosProcessados: ProdutoProcessado[] = produtos.map(p => {
      const basePrecos = calcularPrecos(p.custo, regime, p.comprimento_cm)
      const precos = {
        ...basePrecos,
        preco_ml: p.preco_ml,
        preco_shopee: p.preco_shopee,
        preco_tiktok_promo: p.preco_tiktok ?? basePrecos.preco_tiktok_promo,
        preco_bling: p.preco_bling ?? basePrecos.preco_bling,
        preco_magalu: p.preco_magalu ?? basePrecos.preco_magalu,
        preco_amazon: p.preco_amazon ?? basePrecos.preco_amazon,
        tipo_frete: detectarFrete(p.comprimento_cm),
      }

      const specs: ProductSpecs = {
        dimensoes: {
          comprimento_cm: p.comprimento_cm,
          largura_cm: p.largura_cm,
          altura_cm: p.altura_cm,
          peso_g: p.peso_g,
        },
        ncm: p.ncm,
        ean: p.gtin,
        categoria: '',
        material: '',
        titulo_ml: p.titulo_ml,
        titulo_shopee: p.titulo_shopee,
        titulo_amazon: p.titulo_amazon,
        descricao_ml: p.descricao_ml ?? '',
        descricao_shopee: p.descricao_shopee ?? '',
        descricao_tiktok: p.descricao_tiktok,
        descricao_magalu: p.descricao_magalu,
        descricao_bling: p.descricao_bling,
        descricao_amazon: p.descricao_amazon,
        bullet_point1: p.bullet_point1,
        bullet_point2: p.bullet_point2,
        bullet_point3: p.bullet_point3,
        bullet_point4: p.bullet_point4,
        bullet_point5: p.bullet_point5,
        palavras_chave: [],
        confianca_dimensoes: p.confianca_dimensoes,
      }

      return { sku: p.sku, nome: p.nome, custo: p.custo, estoque: p.estoque, regime, specs, precos, foto_capa_url: drive_folder_url }
    })

    const arquivos: { shopee: string | null; ml: string | null; tiktok: string | null; bling: string | null; magalu: string | null; amazon: string | null } = {
      shopee: null, ml: null, tiktok: null, bling: null, magalu: null, amazon: null,
    }

    if (canais.includes('shopee')) {
      arquivos.shopee = arrayBufferToBase64(gerarPlanilhaShopee(produtosProcessados, drive_folder_url))
    }
    if (canais.includes('ml')) {
      arquivos.ml = arrayBufferToBase64(gerarPlanilhaML(produtosProcessados))
    }
    if (canais.includes('tiktok_shop')) {
      arquivos.tiktok = arrayBufferToBase64(gerarCSVTikTok(produtosProcessados))
    }
    if (canais.includes('bling')) {
      arquivos.bling = arrayBufferToBase64(gerarCSVBling(produtosProcessados))
    }
    if (canais.includes('magalu')) {
      arquivos.magalu = arrayBufferToBase64(gerarCSVMagalu(produtosProcessados))
    }
    if (canais.includes('amazon')) {
      arquivos.amazon = arrayBufferToBase64(gerarCSVAmazon(produtosProcessados))
    }

    return NextResponse.json({
      status: 'success',
      produtos_processados: produtosProcessados.length,
      alertas,
      arquivos,
      produtos_revisao: produtos,
    })
  } catch (err) {
    console.error('[/api/generate-files] Erro:', err instanceof Error ? err.stack : err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
