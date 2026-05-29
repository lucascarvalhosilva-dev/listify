import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface MapeamentoInput {
  bling_sku: string
  ml_item_id: string
  ml_variation_id: number | null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  let body: { mapeamentos?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'body JSON inválido' }, { status: 400 })
  }

  if (!Array.isArray(body.mapeamentos)) {
    return Response.json({ error: 'mapeamentos deve ser um array' }, { status: 400 })
  }

  const mapeamentos: MapeamentoInput[] = []
  for (let i = 0; i < body.mapeamentos.length; i++) {
    const item = body.mapeamentos[i] as Record<string, unknown>
    if (typeof item.bling_sku !== 'string' || !item.bling_sku.trim()) {
      return Response.json({ error: `item[${i}]: bling_sku inválido` }, { status: 400 })
    }
    if (typeof item.ml_item_id !== 'string' || !item.ml_item_id.trim()) {
      return Response.json({ error: `item[${i}]: ml_item_id inválido` }, { status: 400 })
    }
    if (item.ml_variation_id !== null && typeof item.ml_variation_id !== 'number') {
      return Response.json({ error: `item[${i}]: ml_variation_id deve ser number ou null` }, { status: 400 })
    }
    mapeamentos.push({
      bling_sku: item.bling_sku.trim(),
      ml_item_id: item.ml_item_id.trim(),
      ml_variation_id: (item.ml_variation_id as number | null) ?? null,
    })
  }

  const service = createServiceClient()

  const { error: deleteError } = await service
    .from('bling_ml_mapping')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[bling/mapping/salvar] delete error:', JSON.stringify(deleteError))
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (mapeamentos.length > 0) {
    const linhas = mapeamentos.map(m => ({
      user_id: user.id,
      bling_sku: m.bling_sku,
      ml_item_id: m.ml_item_id,
      ml_variation_id: m.ml_variation_id,
    }))

    const { error: insertError } = await service
      .from('bling_ml_mapping')
      .insert(linhas)

    if (insertError) {
      console.error('[bling/mapping/salvar] insert error:', JSON.stringify(insertError))
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, total: mapeamentos.length })
}
