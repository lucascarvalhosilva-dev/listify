import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getBlingAccessToken } from '@/lib/bling/token'

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

  if (linhas.length > 0) {
    const service = createServiceClient()
    const { error } = await service
      .from('bling_estoque')
      .upsert(linhas, { onConflict: 'user_id,sku' })

    if (error) {
      console.error('[bling/sync] upsert error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    sincronizados: linhas.length,
    pulados,
    paginas_lidas: paginasLidas,
  })
}
