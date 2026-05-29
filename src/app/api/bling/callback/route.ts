import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return Response.json({ error: 'parâmetros inválidos' }, { status: 400 })
  }

  const clientId = process.env.BLING_CLIENT_ID ?? ''
  const clientSecret = process.env.BLING_CLIENT_SECRET ?? ''
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const tokenRes = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!tokenRes.ok) {
    console.error('[Bling callback] token error:', await tokenRes.text())
    return Response.json({ error: 'falha ao obter token' }, { status: 502 })
  }

  const token = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('bling_contas')
    .upsert(
      {
        user_id: userId,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: expiresAt,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[Bling callback] upsert error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(
    new URL('/conexoes?bling=conectado', request.nextUrl.origin)
  )
}
