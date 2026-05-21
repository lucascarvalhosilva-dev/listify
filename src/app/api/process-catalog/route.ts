import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { inferProductSpecsBatch, type BatchProductSpec } from '@/lib/claude-client'
import { calcularPrecos } from '@/lib/pricing'
import { gerarPlanilhaShopee, type ProdutoProcessado } from '@/lib/channels/shopee'
import { gerarPlanilhaML } from '@/lib/channels/ml'
import { type ProductSpecs } from '@/lib/claude-client'

const BATCH_SIZE = 20

interface ProdutoInput {
  sku: string
  nome: string
  custo: number
  estoque: number
}

interface RequestBody {
  produtos: ProdutoInput[]
  regime: 'MEI' | 'SN'
  canais: string[]
  drive_folder_url: string
}

interface CacheRow {
  nome_produto: string
  titulo_ml: string
  titulo_shopee: string
  descricao: string
  ncm: string
  peso_g: number
  comprimento_cm: number
  largura_cm: number
  altura_cm: number
  gtin: string
  confianca_dimensoes: 'alta' | 'media'
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return Buffer.from(binary, 'binary').toString('base64')
}

function batchSpecToProductSpecs(spec: BatchProductSpec): ProductSpecs {
  return {
    dimensoes: {
      comprimento_cm: spec.comprimento_cm,
      largura_cm: spec.largura_cm,
      altura_cm: spec.altura_cm,
      peso_g: spec.peso_g,
    },
    ncm: spec.ncm,
    ean: String(spec.gtin),
    categoria: '',
    material: '',
    titulo_ml: spec.titulo_ml,
    titulo_shopee: spec.titulo_shopee,
    descricao_ml: spec.descricao,
    descricao_shopee: spec.descricao,
    palavras_chave: [],
    confianca_dimensoes: spec.confianca_dimensoes,
  }
}

function cacheRowToBatchSpec(row: CacheRow, sku: string): BatchProductSpec {
  return {
    sku,
    titulo_ml: row.titulo_ml,
    titulo_shopee: row.titulo_shopee,
    descricao: row.descricao,
    preco_ml: 0,
    preco_shopee: 0,
    peso_g: row.peso_g,
    comprimento_cm: row.comprimento_cm,
    largura_cm: row.largura_cm,
    altura_cm: row.altura_cm,
    ncm: row.ncm,
    gtin: row.gtin,
    confianca_dimensoes: row.confianca_dimensoes,
  }
}

export async function POST(request: NextRequest) {
  console.log('→ Requisição recebida em /api/process-catalog')
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: RequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { produtos, regime, canais, drive_folder_url } = body

    if (!produtos?.length || !regime || !canais?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const alertas: string[] = []
    const specsMap = new Map<string, BatchProductSpec>()

    // ── 1. Busca cache no Supabase ──────────────────────────────────────────
    const nomes = produtos.map(p => p.nome)
    const { data: cachedRows, error: cacheError } = await supabase
      .from('produtos_cache')
      .select('*')
      .in('nome_produto', nomes)

    if (cacheError) {
      console.error('Erro ao consultar cache:', cacheError.message)
    }

    const cacheMap = new Map<string, CacheRow>()
    for (const row of cachedRows ?? []) {
      cacheMap.set((row as CacheRow).nome_produto, row as CacheRow)
    }

    // ── 2. Separa com_cache e sem_cache ────────────────────────────────────
    const comCache: ProdutoInput[] = []
    const semCache: ProdutoInput[] = []
    for (const p of produtos) {
      if (cacheMap.has(p.nome)) {
        comCache.push(p)
      } else {
        semCache.push(p)
      }
    }

    console.log(`Cache: ${comCache.length} produto(s) com cache, ${semCache.length} sem cache`)

    // Popula specsMap com os produtos do cache
    for (const p of comCache) {
      specsMap.set(p.sku, cacheRowToBatchSpec(cacheMap.get(p.nome)!, p.sku))
    }

    // ── 3. Chama Claude só para produtos sem cache ──────────────────────────
    if (semCache.length > 0) {
      const chunks: ProdutoInput[][] = []
      for (let i = 0; i < semCache.length; i += BATCH_SIZE) {
        chunks.push(semCache.slice(i, i + BATCH_SIZE))
      }

      console.log(`Chamando Claude para ${semCache.length} produto(s) em ${chunks.length} batch(es)`)

      const novasSpecs: Array<{ spec: BatchProductSpec; nome: string }> = []

      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c]
        try {
          const specs = await inferProductSpecsBatch(
            chunk.map(p => ({ sku: p.sku, nome: p.nome, custo: p.custo })),
            regime
          )
          for (const spec of specs) {
            specsMap.set(spec.sku, spec)
            const produto = chunk.find(p => p.sku === spec.sku)
            if (produto) {
              novasSpecs.push({ spec, nome: produto.nome })
            }
          }
          console.log(`Batch ${c + 1}/${chunks.length}: ${specs.length} spec(s) recebidas`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`Batch ${c + 1}/${chunks.length} falhou:`, msg)
          for (const p of chunk) {
            alertas.push(`Produto "${p.nome}" (SKU ${p.sku}): falha no batch — ${msg}`)
          }
        }
      }

      // ── 4. Salva novas specs no cache ─────────────────────────────────────
      if (novasSpecs.length > 0) {
        const rowsParaUpsert: CacheRow[] = novasSpecs.map(({ spec, nome }) => ({
          nome_produto: nome,
          titulo_ml: spec.titulo_ml,
          titulo_shopee: spec.titulo_shopee,
          descricao: spec.descricao,
          ncm: spec.ncm,
          peso_g: spec.peso_g,
          comprimento_cm: spec.comprimento_cm,
          largura_cm: spec.largura_cm,
          altura_cm: spec.altura_cm,
          gtin: String(spec.gtin),
          confianca_dimensoes: spec.confianca_dimensoes,
        }))

        const { error: upsertError } = await supabase
          .from('produtos_cache')
          .upsert(rowsParaUpsert, { onConflict: 'nome_produto' })

        if (upsertError) {
          console.error('Erro ao salvar cache:', upsertError.message)
        } else {
          console.log(`Cache: ${rowsParaUpsert.length} produto(s) salvos`)
        }
      }
    }

    // ── 5. Monta ProdutoProcessado[] (com_cache + sem_cache juntos) ─────────
    const produtosProcessados: ProdutoProcessado[] = []

    for (const p of produtos) {
      const batchSpec = specsMap.get(p.sku)
      if (!batchSpec) {
        if (!alertas.some(a => a.includes(`SKU ${p.sku}`))) {
          alertas.push(`Produto "${p.nome}" (SKU ${p.sku}): não retornado pela IA — ignorado.`)
        }
        continue
      }

      const specs = batchSpecToProductSpecs(batchSpec)
      const precos = calcularPrecos(p.custo, regime, specs.dimensoes.comprimento_cm)

      if (specs.dimensoes.comprimento_cm > 105) {
        alertas.push(`Produto "${p.nome}" (SKU ${p.sku}): comprimento ${specs.dimensoes.comprimento_cm}cm — frete a combinar.`)
      }

      if (specs.confianca_dimensoes === 'media') {
        alertas.push(`Produto "${p.nome}" (SKU ${p.sku}): dimensões com confiança média — verifique antes de publicar.`)
      }

      produtosProcessados.push({
        sku: p.sku,
        nome: p.nome,
        custo: p.custo,
        estoque: p.estoque,
        regime,
        specs,
        precos,
        foto_capa_url: drive_folder_url,
      })
    }

    // ── 6. Gera planilhas ───────────────────────────────────────────────────
    const arquivos: { shopee: string | null; ml: string | null } = {
      shopee: null,
      ml: null,
    }

    if (produtosProcessados.length > 0) {
      if (canais.includes('shopee')) {
        const buffer = gerarPlanilhaShopee(produtosProcessados, drive_folder_url)
        arquivos.shopee = arrayBufferToBase64(buffer)
      }
      if (canais.includes('ml')) {
        const buffer = gerarPlanilhaML(produtosProcessados)
        arquivos.ml = arrayBufferToBase64(buffer)
      }
    }

    return NextResponse.json({
      status: 'success',
      produtos_processados: produtosProcessados.length,
      alertas,
      arquivos,
      produtos_revisao: produtosProcessados.map(p => ({
        sku: p.sku,
        nome: p.nome,
        custo: p.custo,
        preco_ml: p.precos.preco_ml,
        preco_shopee: p.precos.preco_shopee,
        peso_g: p.specs.dimensoes.peso_g,
        comprimento_cm: p.specs.dimensoes.comprimento_cm,
        largura_cm: p.specs.dimensoes.largura_cm,
        altura_cm: p.specs.dimensoes.altura_cm,
        confianca_dimensoes: p.specs.confianca_dimensoes,
        titulo_ml: p.specs.titulo_ml,
        titulo_shopee: p.specs.titulo_shopee,
        descricao: p.specs.descricao_ml,
        ncm: p.specs.ncm,
        gtin: p.specs.ean,
      })),
    })
  } catch (err) {
    console.error('[/api/process-catalog] Erro inesperado:', err instanceof Error ? err.stack : err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
