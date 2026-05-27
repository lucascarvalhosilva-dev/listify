import { createClient } from '@/lib/supabase/server'
import { montarCatalogoPreco, type CatalogoPrecoRow } from '@/lib/precos-catalogos'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'nao autenticado' }, { status: 401 })

    const { data, error } = await supabase
      .from('catalogos')
      .select('id, nome, canal, criado_em, atualizado_em, regime_tributario, drive_url, arquivo_path, produtos')
      .eq('user_id', user.id)
      .order('atualizado_em', { ascending: false })

    if (error) {
      console.error('[PRECOS/CATALOGOS] erro ao listar:', error)
      return Response.json({ error: 'erro ao listar catalogos' }, { status: 500 })
    }

    const catalogos = ((data ?? []) as CatalogoPrecoRow[])
      .map(montarCatalogoPreco)
      .filter(catalogo => catalogo.canal)

    return Response.json({ catalogos })
  } catch (error) {
    console.error('[PRECOS/CATALOGOS] erro:', error)
    return Response.json({ error: 'erro interno' }, { status: 500 })
  }
}
