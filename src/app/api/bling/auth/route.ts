import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.BLING_CLIENT_ID!,
    state: user.id,
  })

  return NextResponse.redirect(
    `https://www.bling.com.br/Api/v3/oauth/authorize?${params.toString()}`
  )
}
