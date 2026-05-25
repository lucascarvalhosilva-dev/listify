import { createClient } from '@/lib/supabase/server'
import { extrairUrlDrive, validarAcessoDrive } from '@/lib/validador-drive'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'URL inválida' }, { status: 400 })
    }

    const urlNormalizada = extrairUrlDrive(url) ?? url
    const resultado = await validarAcessoDrive(urlNormalizada)

    return Response.json(resultado)
  } catch (error) {
    console.error('[VALIDAR DRIVE] erro:', error)
    return Response.json({ error: 'Erro ao validar link' }, { status: 500 })
  }
}
