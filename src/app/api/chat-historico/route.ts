import { createClient } from '@/lib/supabase/server'
import { buscarSessaoAtiva } from '@/lib/sessoes-geracao'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const sessaoAtiva = await buscarSessaoAtiva(user.id)

  return Response.json({
    historico: [],
    temSessaoAtiva: !!sessaoAtiva,
    etapaAtiva: sessaoAtiva?.etapa ?? null,
    sessaoId: sessaoAtiva?.id ?? null,
    canaisAlvo: sessaoAtiva?.canais_alvo ?? [],
  })
}
