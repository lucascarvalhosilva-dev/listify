import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('catalogos')
      .select('id, nome, criado_em, atualizado_em, regime_tributario, drive_url, produtos')
      .eq('user_id', user.id)
      .order('atualizado_em', { ascending: false })

    if (error) {
      console.error('[get-catalogs]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ catalogos: data ?? [] })
  } catch (err) {
    console.error('[get-catalogs]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
