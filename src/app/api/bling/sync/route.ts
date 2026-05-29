import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getBlingAccessToken } from '@/lib/bling/token'
import { getValidMLToken } from '@/lib/ml/token'

const LIMITE = 100
const MAX_PAGINAS = 50
const DELAY_MS = 350

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface BlingProduto {
  id: number
  codigo?: string | null
  nome?: string
  preco?: number
  precoCusto?: number
  estoque?: {
    saldoVirtualTotal?: number
  }
}

interface MLUpdate {
  tipo: 'simples' | 'variacao'
  saldo?: number
  sku?: string
  variacoes?: { variation_id: number; sku: string; saldo: number }[]
}

interface Alerta {
  ml_item_id: string
  sku: string
  acao: 'zerado' | 'pausado'
}

interface ErroML {
  ml_item_id: string
  status: number | null
  motivo: string
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  let token: string
  try {
    token = await getBlingAccessToken(user.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro ao obter token Bling'
    return Response.json({ error: msg }, { status: 400 })
  }

  // ── Paginação Bling ───────────────────────────────────────────────────────
  const todosProdutos: BlingProduto[] = []
  let pagina = 1
  let paginasLidas = 0

  while (pagina <= MAX_PAGINAS) {
    const res = await fetch(
      `https://api.bling.com.br/Api/v3/produtos?pagina=${pagina}&limite=${LIMITE}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    const body = await res.json() as { data?: BlingProduto[] }

    if (!res.ok) {
      return NextResponse.json(
        { error: 'erro da API Bling', detalhes: body },
        { status: res.status }
      )
    }

    const data = body.data ?? []
    todosProdutos.push(...data)
    paginasLidas++

    if (data.length < LIMITE) break

    pagina++
    await sleep(DELAY_MS)
  }

  // ── Mapear e fazer upsert em bling_estoque ────────────────────────────────
  const now = new Date().toISOString()
  const linhas: {
    user_id: string
    sku: string
    bling_id: number
    nome: string | null
    saldo: number | null
    preco: number | null
    preco_custo: number | null
    synced_at: string
  }[] = []
  let pulados = 0

  for (const produto of todosProdutos) {
    if (!produto.codigo) {
      pulados++
      continue
    }
    linhas.push({
      user_id: user.id,
      sku: produto.codigo,
      bling_id: produto.id,
      nome: produto.nome ?? null,
      saldo: produto.estoque?.saldoVirtualTotal ?? null,
      preco: produto.preco ?? null,
      preco_custo: produto.precoCusto ?? null,
      synced_at: now,
    })
  }

  const service = createServiceClient()

  if (linhas.length > 0) {
    const { error } = await service
      .from('bling_estoque')
      .upsert(linhas, { onConflict: 'user_id,sku' })

    if (error) {
      console.error('[bling/sync] upsert error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // ── Token do ML ───────────────────────────────────────────────────────────
  const ml = await getValidMLToken(user.id)
  if (!ml) {
    return NextResponse.json({
      sincronizados: linhas.length,
      pulados,
      paginas_lidas: paginasLidas,
      ml_atualizados: 0,
      alertas: [],
      erros: [],
      erro_ml: 'ML não conectado — conecte em /conexoes',
    })
  }

  // ── Preferência de pausa ──────────────────────────────────────────────────
  const { data: profile } = await service
    .from('profiles')
    .select('pausar_sem_estoque')
    .eq('id', user.id)
    .maybeSingle()
  const pausarSemEstoque = profile?.pausar_sem_estoque ?? false

  // ── Ler bling_ml_mapping ─────────────────────────────────────────────────
  const { data: mappingRows } = await service
    .from('bling_ml_mapping')
    .select('bling_sku, ml_item_id, ml_variation_id')
    .eq('user_id', user.id)

  const mappingBySku = new Map<string, { ml_item_id: string; ml_variation_id: number | null }>()
  for (const m of mappingRows ?? []) {
    mappingBySku.set(m.bling_sku as string, {
      ml_item_id: m.ml_item_id as string,
      ml_variation_id: (m.ml_variation_id as number | null) ?? null,
    })
  }

  console.log('[sync] mappingBySku keys:', [...mappingBySku.keys()])

  // ── Cruzar bling_estoque com bling_ml_mapping ─────────────────────────────
  const mlUpdates = new Map<string, MLUpdate>()

  for (const linha of linhas) {
    console.log('[sync] tentando cruzar sku:', linha.sku, '| match:', mappingBySku.get(linha.sku))
    const match = mappingBySku.get(linha.sku)
    if (!match) continue

    const saldo = Math.max(0, linha.saldo ?? 0)

    if (match.ml_variation_id !== null) {
      const entry = mlUpdates.get(match.ml_item_id) ?? { tipo: 'variacao' as const, variacoes: [] }
      entry.variacoes!.push({ variation_id: match.ml_variation_id, sku: linha.sku, saldo })
      mlUpdates.set(match.ml_item_id, entry)
    } else {
      mlUpdates.set(match.ml_item_id, { tipo: 'simples', saldo, sku: linha.sku })
    }
  }

  // ── PUTs no ML ───────────────────────────────────────────────────────────
  const alertas: Alerta[] = []
  const erros: ErroML[] = []
  let mlAtualizados = 0
  const mlHeaders = {
    'Authorization': `Bearer ${ml.access_token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  for (const [ml_item_id, update] of mlUpdates) {
    await sleep(DELAY_MS)

    let putBody: Record<string, unknown>
    const acaoAlertas: Alerta[] = []

    if (update.tipo === 'simples') {
      const saldo = update.saldo ?? 0
      if (pausarSemEstoque && saldo <= 0) {
        putBody = { status: 'paused' }
        acaoAlertas.push({ ml_item_id, sku: update.sku!, acao: 'pausado' })
      } else {
        putBody = { available_quantity: saldo }
        if (saldo <= 0) acaoAlertas.push({ ml_item_id, sku: update.sku!, acao: 'zerado' })
      }
    } else {
      const variacoes = update.variacoes!
      const todasZeradas = variacoes.every(v => v.saldo <= 0)
      if (pausarSemEstoque && todasZeradas) {
        putBody = { status: 'paused' }
        acaoAlertas.push({ ml_item_id, sku: variacoes.map(v => v.sku).join(','), acao: 'pausado' })
      } else {
        putBody = {
          variations: variacoes.map(v => ({ id: v.variation_id, available_quantity: v.saldo })),
        }
        for (const v of variacoes) {
          if (v.saldo <= 0) acaoAlertas.push({ ml_item_id, sku: v.sku, acao: 'zerado' })
        }
      }
    }

    try {
      const res = await fetch(`https://api.mercadolibre.com/items/${ml_item_id}`, {
        method: 'PUT',
        headers: mlHeaders,
        body: JSON.stringify(putBody),
      })

      if (res.ok) {
        mlAtualizados++
        alertas.push(...acaoAlertas)
      } else {
        const resBody = await res.text()
        erros.push({ ml_item_id, status: res.status, motivo: resBody })
      }
    } catch (err) {
      erros.push({
        ml_item_id,
        status: null,
        motivo: err instanceof Error ? err.message : 'erro de rede',
      })
    }
  }

  return NextResponse.json({
    sincronizados: linhas.length,
    pulados,
    paginas_lidas: paginasLidas,
    ml_atualizados: mlAtualizados,
    alertas,
    erros,
  })
}
