import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const { data } = await supabase
    .from('chat_historico')
    .select('papel, conteudo, acoes_rapidas, criado_em')
    .eq('user_id', user.id)
    .order('criado_em', { ascending: true })
    .limit(50)

  return Response.json({ historico: data || [] })
}
