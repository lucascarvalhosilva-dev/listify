import { createClient } from '@/lib/supabase/server'
import { buscarSessaoAtiva } from '@/lib/sessoes-geracao'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const sessaoAtiva = await buscarSessaoAtiva(user.id)
  let conversaId: string | null = null

  if (sessaoAtiva) {
    const { data: conversaRecente } = await supabase
      .from('conversas')
      .select('id')
      .eq('user_id', user.id)
      .eq('arquivada', false)
      .order('atualizada_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    conversaId = conversaRecente?.id ?? null
  }

  return Response.json({
    historico: [],
    temSessaoAtiva: !!sessaoAtiva,
    etapaAtiva: sessaoAtiva?.etapa ?? null,
    sessaoId: sessaoAtiva?.id ?? null,
    conversaId,
    canaisAlvo: sessaoAtiva?.canais_alvo ?? [],
  })
}
