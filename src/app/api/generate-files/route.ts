import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { gerarArquivosCatalogo, type ProdutoRevisaoCatalogo } from '@/lib/catalog-file-generator'

interface RequestBody {
  produtos: ProdutoRevisaoCatalogo[]
  regime: 'MEI' | 'SN'
  canais: string[]
  drive_folder_url: string
  alertas: string[]
}

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

    const body: RequestBody = await request.json()
    const { produtos, regime, canais, drive_folder_url, alertas } = body

    if (!produtos?.length || !regime || !canais?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { arquivos, produtos_processados: produtosProcessados } = gerarArquivosCatalogo({
      produtos,
      regime,
      canais,
      drive_folder_url,
    })

    const { error: gerErr } = await supabase
      .from('geracoes')
      .insert({ user_id: user.id, canais, total_produtos: produtosProcessados.length })
    if (gerErr) console.error('[generate-files] geracoes insert:', gerErr.message)

    return NextResponse.json({
      status: 'success',
      produtos_processados: produtosProcessados.length,
      alertas,
      arquivos,
      produtos_revisao: produtos,
    })
  } catch (err) {
    console.error('[/api/generate-files] Erro:', err instanceof Error ? err.stack : err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
