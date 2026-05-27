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
  const clientId = process.env.ML_CLIENT_ID ?? ''
  const clientSecret = process.env.ML_CLIENT_SECRET ?? ''
  const redirectUri = process.env.ML_REDIRECT_URI ?? ''

  console.log('[ML callback] client_id length:', clientId.length, 'value:', clientId)
  console.log('[ML callback] client_secret length:', clientSecret.length, 'first4:', clientSecret.slice(0, 4), 'last4:', clientSecret.slice(-4))
  console.log('[ML callback] redirect_uri:', redirectUri)
  console.log('[ML callback] code:', code)

  const requestBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  })

  console.log('[ML callback] request body type: form-urlencoded')
  console.log('[ML callback] body string:', requestBody.toString())

  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: requestBody,
  })

  const tokenRaw = await tokenRes.text()
  console.log('[ML callback] token response status:', tokenRes.status)
  console.log('[ML callback] token response body:', tokenRaw)

  if (!tokenRes.ok) {
    return Response.json({ error: 'falha ao obter token' }, { status: 502 })
  }

  const token = JSON.parse(tokenRaw) as {
    access_token: string
    refresh_token: string
    expires_in: number
    user_id: number
  }

  // Busca dados do usuário ML
  const meRes = await fetch('https://api.mercadolibre.com/users/me', {
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
