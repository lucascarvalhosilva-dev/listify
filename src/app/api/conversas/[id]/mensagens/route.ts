import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })

  const { id } = await params

  const { data: conversa } = await supabase
    .from('conversas')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!conversa) return NextResponse.json({ error: 'conversa não encontrada' }, { status: 404 })

  const { data, error } = await supabase
    .from('chat_historico')
    .select('id, papel, conteudo, acoes_rapidas, criado_em')
    .eq('conversa_id', id)
    .order('criado_em', { ascending: true })

  if (error) {
    console.error('[CONVERSAS/MENSAGENS] erro:', error)
    return NextResponse.json({ error: 'erro ao carregar mensagens' }, { status: 500 })
  }

  return NextResponse.json({ mensagens: data ?? [] })
}
