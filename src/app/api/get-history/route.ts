import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: geracoes, error } = await supabase
      .from('geracoes')
      .select('id, canais, total_produtos, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[get-history]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ geracoes: geracoes ?? [] })
  } catch (err) {
    console.error('[get-history]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
