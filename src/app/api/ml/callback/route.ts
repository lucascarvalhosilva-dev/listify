import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return Response.json({ error: 'parâmetros inválidos' }, { status: 400 })
  }

  // Troca code por tokens
  const tokenRes = await fetch('https://api.mercadolivre.com.br/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.ML_CLIENT_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      redirect_uri: process.env.ML_REDIRECT_URI!,
      code,
    }),
  })

  if (!tokenRes.ok) {
    console.error('[ML CALLBACK] token error:', await tokenRes.text())
    return Response.json({ error: 'falha ao obter token' }, { status: 502 })
  }

  const token = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
    user_id: number
  }

  // Busca dados do usuário ML
  const meRes = await fetch('https://api.mercadolivre.com.br/users/me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })

  if (!meRes.ok) {
    console.error('[ML CALLBACK] users/me error:', await meRes.text())
    return Response.json({ error: 'falha ao buscar dados do usuário ML' }, { status: 502 })
  }

  const me = await meRes.json() as { id: number; nickname: string }

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()

  console.log('[ML callback] user_id from state:', userId)
  console.log('[ML callback] ml_user_id:', me.id)

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('ml_contas')
    .upsert(
      {
        user_id: userId,
        ml_user_id: String(me.id),
        nickname: me.nickname,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: expiresAt,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[ML callback] upsert error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(
    new URL('/conexoes?ml=conectado', request.nextUrl.origin)
  )
}
