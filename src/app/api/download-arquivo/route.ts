import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const { path } = await request.json()

    if (!path || typeof path !== 'string') {
      return Response.json({ error: 'path inválido' }, { status: 400 })
    }

    if (!path.startsWith(`${user.id}/`)) {
      return Response.json({ error: 'acesso negado' }, { status: 403 })
    }

    const supabaseService = createServiceClient()
    const { data, error } = await supabaseService.storage
      .from('geracoes')
      .createSignedUrl(path, 3600)

    if (error || !data?.signedUrl) {
      console.error('[DOWNLOAD-ARQUIVO] erro ao gerar URL assinada:', error)
      return Response.json({ error: 'não foi possível gerar o link de download' }, { status: 500 })
    }

    const expiraEm = new Date(Date.now() + 3600 * 1000).toISOString()

    return Response.json({ sucesso: true, url: data.signedUrl, expira_em: expiraEm })
  } catch (error) {
    console.error('[DOWNLOAD-ARQUIVO] erro:', error)
    return Response.json({ error: 'erro interno' }, { status: 500 })
  }
}
