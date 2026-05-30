import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checarLimiteProdutos, checarLimiteCanais } from '@/lib/planos'
import { getCorrecoesPreventivas } from '@/lib/erros-aprendidos'
import { inferProductSpecsBatch, type BatchProductSpec } from '@/lib/claude-client'
import { calcularPrecos } from '@/lib/pricing'
import { gerarPlanilhaShopee, type ProdutoProcessado } from '@/lib/channels/shopee'
import { gerarPlanilhaML } from '@/lib/channels/ml'
import { gerarCSVTikTok } from '@/lib/channels/tiktok'
import { gerarCSVBling } from '@/lib/channels/bling'
import { gerarCSVMagalu } from '@/lib/channels/magalu'
import { gerarCSVAmazon } from '@/lib/channels/amazon'
import { type ProductSpecs } from '@/lib/claude-client'

const BATCH_SIZE = 5

interface ProdutoInput {
  sku: string
  nome: string
  marca?: string
  categoria?: string
  cor?: string
  genero?: string
  tipo_roupa?: string
  tipo_manga?: string
  tamanho?: string
  custo: number
  estoque: number
  atributos_categoria?: { id: string; name: string; value_type: string; values_exemplo?: string[] }[]
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
  titulo_amazon?: string
  descricao?: string
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
  peso_g: number
  comprimento_cm: number
  largura_cm: number
  altura_cm: number
  gtin: string
  confianca_dimensoes: 'alta' | 'media'
}

function normalizarSku(sku: string): string {
  return String(sku).replace(/^SKU\s+/i, '').trim()
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
    titulo_amazon: spec.titulo_amazon,
    descricao_ml: spec.descricao_ml ?? '',
    descricao_shopee: spec.descricao_shopee ?? '',
    descricao_tiktok: spec.descricao_tiktok,
    descricao_magalu: spec.descricao_magalu,
    descricao_bling: spec.descricao_bling,
    descricao_amazon: spec.descricao_amazon,
    bullet_point1: spec.bullet_point1,
    bullet_point2: spec.bullet_point2,
    bullet_point3: spec.bullet_point3,
    bullet_point4: spec.bullet_point4,
    bullet_point5: spec.bullet_point5,
    palavras_chave: [],
    confianca_dimensoes: spec.confianca_dimensoes,
  }
}

function cacheRowToBatchSpec(row: CacheRow, sku: string): BatchProductSpec {
  const fallback = row.descricao ?? ''
  return {
    sku,
    titulo_ml: row.titulo_ml,
    titulo_shopee: row.titulo_shopee,
    titulo_amazon: row.titulo_amazon,
    descricao_ml: row.descricao_ml ?? fallback,
    descricao_shopee: row.descricao_shopee ?? fallback,
    descricao_tiktok: row.descricao_tiktok ?? fallback,
    descricao_magalu: row.descricao_magalu ?? fallback,
    descricao_bling: row.descricao_bling ?? fallback,
    descricao_amazon: row.descricao_amazon ?? fallback,
    bullet_point1: row.bullet_point1,
    bullet_point2: row.bullet_point2,
    bullet_point3: row.bullet_point3,
    bullet_point4: row.bullet_point4,
    bullet_point5: row.bullet_point5,
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

    // Checar limite de produtos
    console.log('[LIMITE CHECK] produtos recebidos:', produtos?.length, 'plano do usuário será verificado')
    const checkProdutos = await checarLimiteProdutos(produtos?.length || 0)
    if (!checkProdutos.ok) {
      return NextResponse.json({ error: checkProdutos.mensagem, upgrade: true, motivo: 'produtos' }, { status: 403 })
    }

    // Checar limite de canais
    if (canais && canais.length > 0) {
      const checkCanais = await checarLimiteCanais(canais)
      if (!checkCanais.ok) {
        return NextResponse.json({ error: checkCanais.mensagem, upgrade: true, motivo: 'canais' }, { status: 403 })
      }
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
    console.log('[PROCESS-CATALOG] comCache:', comCache.length, 'semCache:', semCache.length)

    // Popula specsMap com os produtos do cache
    for (const p of comCache) {
      const cacheRow = cacheMap.get(p.nome)
      if (!cacheRow) {
        console.warn('[PROCESS-CATALOG] cache row ausente para SKU:', p.sku, 'nome:', p.nome, '— reprocessando via IA')
        semCache.push(p)
        continue
      }
      specsMap.set(p.sku, cacheRowToBatchSpec(cacheRow, p.sku))
    }
    console.log('[PROCESS-CATALOG] specsMap após cache:', specsMap.size)

    // ── Camada 2: Correções preventivas ────────────────────────────────────
    const correcoesPreventivas = (
      await Promise.all(canais.map(c => getCorrecoesPreventivas(c)))
    ).flat()
    const instrucaoPreventiva = correcoesPreventivas.length > 0
      ? `\n\nCORREÇÕES PREVENTIVAS OBRIGATÓRIAS para ${canais.join(', ')} (aplique sempre, sem exceção):\n` +
        correcoesPreventivas.map(c => `- ${c.tipo_erro}: ${c.solucao} (ocorreu ${c.ocorrencias} vezes)`).join('\n')
      : ''
    console.log(`[PREVENÇÃO] ${correcoesPreventivas.length} correções preventivas carregadas para ${canais.join(', ')}`)

    // ── 3. Chama Claude só para produtos sem cache ──────────────────────────
    if (semCache.length > 0) {
      // Deduplica por nome: variações do mesmo produto (ex: 132-P, 132-M, 132-G)
      // têm o mesmo nome → envia só 1 vez pra IA e propaga spec para todas
      const nomeParaPrincipal = new Map<string, ProdutoInput>()
      for (const p of semCache) {
        if (!nomeParaPrincipal.has(p.nome)) nomeParaPrincipal.set(p.nome, p)
      }
      const semCacheUnicos = [...nomeParaPrincipal.values()]

      const chunks: ProdutoInput[][] = []
      for (let i = 0; i < semCacheUnicos.length; i += BATCH_SIZE) {
        chunks.push(semCacheUnicos.slice(i, i + BATCH_SIZE))
      }

      console.log(`Chamando Claude para ${semCacheUnicos.length} produto(s) únicos (${semCache.length} total) em ${chunks.length} batch(es)`)

      const novasSpecs: Array<{ spec: BatchProductSpec; nome: string }> = []

      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c]
        try {
          console.log('[PROCESS-CATALOG] enviando para IA:', JSON.stringify({ skus: chunk.map(p => p.sku), nomes: chunk.map(p => p.nome) }))
          const specs = await inferProductSpecsBatch(
            chunk.map(p => ({ sku: p.sku, nome: p.nome, custo: p.custo, atributos_categoria: p.atributos_categoria })),
            regime,
            canais,
            instrucaoPreventiva
          )
          for (const spec of specs) {
            const principal = chunk.find(p => normalizarSku(p.sku) === normalizarSku(spec.sku))
            if (principal) {
              // Propaga spec para todas as variações com o mesmo nome
              for (const variante of semCache.filter(p => p.nome === principal.nome)) {
                specsMap.set(normalizarSku(variante.sku), { ...spec, sku: variante.sku })
              }
              novasSpecs.push({ spec, nome: principal.nome })
            } else {
              specsMap.set(normalizarSku(spec.sku), spec)
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
          titulo_amazon: spec.titulo_amazon,
          descricao_ml: spec.descricao_ml,
          descricao_shopee: spec.descricao_shopee,
          descricao_tiktok: spec.descricao_tiktok,
          descricao_magalu: spec.descricao_magalu,
          descricao_bling: spec.descricao_bling,
          descricao_amazon: spec.descricao_amazon,
          bullet_point1: spec.bullet_point1,
          bullet_point2: spec.bullet_point2,
          bullet_point3: spec.bullet_point3,
          bullet_point4: spec.bullet_point4,
          bullet_point5: spec.bullet_point5,
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

    console.log('[PROCESS-CATALOG] specsMap após IA:', [...specsMap.keys()])

    // ── Camada 3: Alerta de erros críticos ────────────────────────────────────
    const { data: errosCriticos } = await supabase
      .from('erros_aprendidos')
      .select('canal, tipo_erro, ocorrencias')
      .gte('ocorrencias', 20)

    if (errosCriticos && errosCriticos.length > 0) {
      console.warn('[CAMADA 3] Erros críticos que devem virar regra fixa no código:',
        errosCriticos.map(e => `${e.canal}: ${e.tipo_erro} (${e.ocorrencias}x)`).join(' | '))
    }

    // ── 5. Monta ProdutoProcessado[] (com_cache + sem_cache juntos) ─────────
    const produtosProcessados: ProdutoProcessado[] = []

    for (const p of produtos) {
      console.log('[PROCESS-CATALOG] verificando SKU:', p.sku, 'encontrado em specsMap:', specsMap.has(normalizarSku(p.sku)))
      const batchSpec = specsMap.get(normalizarSku(p.sku))
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
        marca: p.marca,
        categoria: p.categoria,
        cor: p.cor,
        genero: p.genero,
        tipo_roupa: p.tipo_roupa,
        tipo_manga: p.tipo_manga,
        tamanho: p.tamanho,
        custo: p.custo,
        estoque: p.estoque,
        regime,
        specs,
        precos,
        foto_capa_url: drive_folder_url,
      })
    }

    // ── 6. Gera planilhas ───────────────────────────────────────────────────
    const arquivos: { shopee: string | null; ml: string | null; tiktok: string | null; bling: string | null; magalu: string | null; amazon: string | null } = {
      shopee: null, ml: null, tiktok: null, bling: null, magalu: null, amazon: null,
    }

    if (produtosProcessados.length > 0) {
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
    }

    return NextResponse.json({
      status: 'success',
      produtos_processados: produtosProcessados.length,
      alertas,
      arquivos,
      produtos_revisao: produtosProcessados.map(p => ({
        sku: p.sku,
        nome: p.nome,
        marca: p.marca,
        categoria: p.categoria,
        cor: p.cor,
        genero: p.genero,
        tipo_roupa: p.tipo_roupa,
        tipo_manga: p.tipo_manga,
        tamanho: p.tamanho,
        custo: p.custo,
        preco_ml: p.precos.preco_ml,
        preco_shopee: p.precos.preco_shopee,
        preco_tiktok: p.precos.preco_tiktok_promo,
        preco_bling: p.precos.preco_bling,
        preco_magalu: p.precos.preco_magalu,
        preco_amazon: p.precos.preco_amazon,
        peso_g: p.specs.dimensoes.peso_g,
        comprimento_cm: p.specs.dimensoes.comprimento_cm,
        largura_cm: p.specs.dimensoes.largura_cm,
        altura_cm: p.specs.dimensoes.altura_cm,
        estoque: p.estoque,
        confianca_dimensoes: p.specs.confianca_dimensoes,
        titulo_ml: p.specs.titulo_ml,
        titulo_shopee: p.specs.titulo_shopee,
        titulo_amazon: p.specs.titulo_amazon,
        descricao_ml: p.specs.descricao_ml,
        descricao_shopee: p.specs.descricao_shopee,
        descricao_tiktok: p.specs.descricao_tiktok,
        descricao_magalu: p.specs.descricao_magalu,
        descricao_bling: p.specs.descricao_bling,
        descricao_amazon: p.specs.descricao_amazon,
        bullet_point1: p.specs.bullet_point1,
        bullet_point2: p.specs.bullet_point2,
        bullet_point3: p.specs.bullet_point3,
        bullet_point4: p.specs.bullet_point4,
        bullet_point5: p.specs.bullet_point5,
        ncm: p.specs.ncm,
        gtin: p.specs.ean,
        atributos_ia: specsMap.get(normalizarSku(p.sku))?.atributos ?? [],
      })),
    })
  } catch (err) {
    console.error('[/api/process-catalog] Erro inesperado:', err instanceof Error ? err.stack : err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
