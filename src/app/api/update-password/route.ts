import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const { senha_nova } = await request.json()

  const { error } = await supabase.auth.updateUser({ password: senha_nova })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
