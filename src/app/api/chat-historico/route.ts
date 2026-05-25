import { createClient } from '@/lib/supabase/server'
import { buscarSessaoAtiva } from '@/lib/sessoes-geracao'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const [{ data }, sessaoAtiva] = await Promise.all([
    supabase
      .from('chat_historico')
      .select('papel, conteudo, acoes_rapidas, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: true })
      .limit(50),
    buscarSessaoAtiva(user.id),
  ])

  return Response.json({
    historico: data || [],
    temSessaoAtiva: !!sessaoAtiva,
    etapaAtiva: sessaoAtiva?.etapa ?? null,
    sessaoId: sessaoAtiva?.id ?? null,
    canaisAlvo: sessaoAtiva?.canais_alvo ?? [],
  })
}
