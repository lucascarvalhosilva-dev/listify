import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBlingAccessToken } from '@/lib/bling/token'

export async function GET() {
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

  const res = await fetch('https://api.bling.com.br/Api/v3/produtos?pagina=1&limite=100', {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })

  const body = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: 'erro da API Bling', detalhes: body }, { status: res.status })
  }

  return NextResponse.json(body)
}
