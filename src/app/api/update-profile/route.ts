import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const body = await request.json()
  const { nome, regime, margem, notif_email, notif_limite, pausar_sem_estoque, notif_estoque } = body

  const { error } = await supabase
    .from('profiles')
    .update({
      nome,
      regime_tributario: regime,
      margem_padrao: margem,
      notif_email,
      notif_limite,
      pausar_sem_estoque,
      notif_estoque,
    })
    .eq('id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
