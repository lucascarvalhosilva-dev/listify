import { createServiceClient } from '@/lib/supabase/service'

const REFRESH_MARGIN_MS = 60 * 1000

export async function getBlingAccessToken(userId: string): Promise<string> {
  const supabase = createServiceClient()

  const { data: conta } = await supabase
    .from('bling_contas')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!conta) {
    throw new Error('conta Bling não conectada')
  }

  const expiresAt = new Date(conta.expires_at).getTime()
  if (expiresAt > Date.now() + REFRESH_MARGIN_MS) {
    return conta.access_token
  }

  const clientId = process.env.BLING_CLIENT_ID ?? ''
  const clientSecret = process.env.BLING_CLIENT_SECRET ?? ''
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conta.refresh_token,
    }),
  })

  if (!res.ok) {
    throw new Error('sessão Bling expirada — reconecte a conta em /conexoes')
  }

  let token: { access_token: string; refresh_token: string; expires_in: number }
  try {
    token = await res.json()
  } catch {
    throw new Error('sessão Bling expirada — reconecte a conta em /conexoes')
  }

  const newExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()

  await supabase
    .from('bling_contas')
    .update({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq('user_id', userId)

  return token.access_token
}
