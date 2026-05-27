import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ML_CLIENT_ID!,
    redirect_uri: process.env.ML_REDIRECT_URI!,
    state: user.id,
  })

  return NextResponse.redirect(
    `https://auth.mercadolivre.com.br/authorization?${params.toString()}`
  )
}
