import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const titulo = typeof body.titulo === 'string' ? body.titulo.slice(0, 60) : null

  const { data, error } = await supabase
    .from('conversas')
    .insert({ user_id: user.id, titulo })
    .select('id, titulo, criada_em')
    .single()

  if (error) {
    console.error('[CONVERSAS] erro ao criar:', error)
    return Response.json({ error: 'erro ao criar conversa' }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listarArquivadas = searchParams.get('arquivadas') === '1' || searchParams.get('arquivadas') === 'true'

  const { data, error } = await supabase
    .from('conversas')
    .select('id, titulo, criada_em, atualizada_em, arquivada')
    .eq('user_id', user.id)
    .eq('arquivada', listarArquivadas)
    .order('atualizada_em', { ascending: false })

  if (error) {
    console.error('[CONVERSAS] erro ao listar:', error)
    return Response.json({ error: 'erro ao listar conversas' }, { status: 500 })
  }

  return Response.json(data ?? [])
}
