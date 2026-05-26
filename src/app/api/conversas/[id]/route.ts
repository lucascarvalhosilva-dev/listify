import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const updates: Record<string, unknown> = {}
  if (typeof body.titulo === 'string') updates.titulo = body.titulo.slice(0, 60)
  if (typeof body.arquivada === 'boolean') updates.arquivada = body.arquivada

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('conversas')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, titulo, arquivada, atualizada_em')
    .maybeSingle()

  if (error) {
    console.error('[CONVERSAS] erro ao atualizar:', error)
    return NextResponse.json({ error: 'erro ao atualizar conversa' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'conversa não encontrada' }, { status: 404 })

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('conversas')
    .update({ arquivada: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[CONVERSAS] erro ao arquivar:', error)
    return NextResponse.json({ error: 'erro ao arquivar conversa' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'conversa não encontrada' }, { status: 404 })

  return NextResponse.json({ sucesso: true })
}
