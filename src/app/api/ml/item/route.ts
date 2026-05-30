import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidMLToken } from '@/lib/ml/token'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'parâmetro id obrigatório' }, { status: 400 })

  const ml = await getValidMLToken(user.id)
  if (!ml) return Response.json({ error: 'ML não conectado — conecte em /conexoes' }, { status: 401 })

  const res = await fetch(`https://api.mercadolibre.com/items/${id}?include_attributes=all`, {
    headers: {
      'Authorization': `Bearer ${ml.access_token}`,
      'Accept': 'application/json',
    },
  })

  const body = await res.json() as {
    id?: string
    variations?: Array<{ id: number; attribute_combinations: unknown[] }>
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'erro da API ML', detalhes: body }, { status: res.status })
  }

  return NextResponse.json({
    ml_item_id: body.id ?? id,
    variations: (body.variations ?? []).map(v => ({
      id: v.id,
      attribute_combinations: v.attribute_combinations,
    })),
  })
}
