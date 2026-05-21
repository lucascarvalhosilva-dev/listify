import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
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

    const body = await request.json() as { nome?: string; produtos?: unknown; drive_url?: string; regime_tributario?: string }
    const { nome, produtos, drive_url, regime_tributario } = body

    if (!nome?.trim() || !Array.isArray(produtos) || !regime_tributario) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('catalogos')
      .insert({
        user_id: user.id,
        nome: nome.trim(),
        produtos,
        drive_url: drive_url ?? '',
        regime_tributario,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[save-catalog]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: (data as { id: string }).id })
  } catch (err) {
    console.error('[save-catalog]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
