import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { calcularPrecos, detectarFrete } from '@/lib/pricing'
import { gerarPlanilhaShopee, type ProdutoProcessado } from '@/lib/channels/shopee'
import { gerarPlanilhaML } from '@/lib/channels/ml'
import { gerarCSVTikTok } from '@/lib/channels/tiktok'
import { gerarCSVBling } from '@/lib/channels/bling'
import { gerarCSVMagalu } from '@/lib/channels/magalu'
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
  peso_g: number
  comprimento_cm: number
  largura_cm: number
  altura_cm: number
  confianca_dimensoes: 'alta' | 'media'
  titulo_ml: string
  titulo_shopee: string
  descricao: string
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
        descricao_ml: p.descricao,
        descricao_shopee: p.descricao,
        palavras_chave: [],
        confianca_dimensoes: p.confianca_dimensoes,
      }

      return { sku: p.sku, nome: p.nome, custo: p.custo, estoque: p.estoque, regime, specs, precos, foto_capa_url: drive_folder_url }
    })

    const arquivos: { shopee: string | null; ml: string | null; tiktok: string | null; bling: string | null; magalu: string | null } = {
      shopee: null, ml: null, tiktok: null, bling: null, magalu: null,
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
