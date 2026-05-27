import { createServiceClient } from '@/lib/supabase/service'

const REFRESH_MARGIN_MS = 5 * 60 * 1000

export async function getValidMLToken(
  userId: string
): Promise<{ access_token: string; ml_user_id: string } | null> {
  try {
    const supabase = createServiceClient()

    const { data: conta } = await supabase
      .from('ml_contas')
      .select('ml_user_id, access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (!conta) return null

    const expiresAt = new Date(conta.expires_at).getTime()
    if (expiresAt > Date.now() + REFRESH_MARGIN_MS) {
      return { access_token: conta.access_token, ml_user_id: conta.ml_user_id }
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID ?? '',
      client_secret: process.env.ML_CLIENT_SECRET ?? '',
      refresh_token: conta.refresh_token,
    })

    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!res.ok) {
      await supabase.from('ml_contas').delete().eq('user_id', userId)
      return null
    }

    let token: { access_token: string; refresh_token: string; expires_in: number }
    try {
      token = await res.json()
    } catch {
      await supabase.from('ml_contas').delete().eq('user_id', userId)
      return null
    }

    const newExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()

    await supabase
      .from('ml_contas')
      .update({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: newExpiresAt,
      })
      .eq('user_id', userId)

    return { access_token: token.access_token, ml_user_id: conta.ml_user_id }
  } catch {
    return null
  }
}
