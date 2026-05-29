import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  const { data: geracoes } = await supabase
    .from('geracoes')
    .select('total_produtos')
    .eq('user_id', user.id)
    .gte('criado_em', inicioMes.toISOString())

  const produtosUsados = geracoes?.reduce((acc, g) => acc + (g.total_produtos || 0), 0) || 0

  const limites: Record<string, number> = {
    free: 5, starter: 100, profissional: 500, agencia: 999999
  }

  return Response.json({
    nome: profile?.nome || '',
    email: user.email,
    regime_tributario: profile?.regime_tributario || 'MEI',
    margem_padrao: profile?.margem_padrao || '30',
    notif_email: profile?.notif_email !== false,
    notif_limite: profile?.notif_limite !== false,
    pausar_sem_estoque: profile?.pausar_sem_estoque ?? false,
    notif_estoque: profile?.notif_estoque !== false,
    plano: profile?.plano || 'free',
    produtos_usados: produtosUsados,
    limite_produtos: limites[profile?.plano || 'free'],
  })
}
