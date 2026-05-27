import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidMLToken } from '@/lib/ml/token'

interface PublicarBody {
  titulo: string
  preco: number
  moeda: string
  quantidade: number
  condicao: 'new' | 'used'
  categoria_ml: string
  descricao: string
  fotos: string[]
  atributos?: { id: string; value_name: string }[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const ml = await getValidMLToken(user.id)
  if (!ml) return Response.json({ error: 'ML não conectado' }, { status: 401 })

  const body = await request.json() as PublicarBody

  const payload = {
    title: body.titulo,
    price: body.preco,
    currency_id: body.moeda ?? 'BRL',
    available_quantity: body.quantidade,
    condition: body.condicao,
    category_id: body.categoria_ml,
    listing_type_id: 'gold_special',
    description: { plain_text: body.descricao },
    pictures: body.fotos.map(url => ({ source: url })),
    ...(body.atributos?.length ? { attributes: body.atributos } : {}),
  }

  console.log('[ML publicar] userId:', user.id, '| categoria:', body.categoria_ml, '| titulo:', body.titulo)

  const mlRes = await fetch('https://api.mercadolibre.com/items', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ml.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const mlBody = await mlRes.json() as Record<string, unknown>

  console.log('[ML publicar] ML response status:', mlRes.status, '| body:', JSON.stringify(mlBody))

  if (!mlRes.ok) {
    const mensagem = typeof mlBody.message === 'string' ? mlBody.message : 'Erro ao publicar no Mercado Livre'
    return Response.json({ error: mensagem, detalhes: mlBody }, { status: 502 })
  }

  return Response.json({
    id: mlBody.id,
    permalink: mlBody.permalink,
    status: mlBody.status,
  })
}
