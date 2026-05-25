import { createClient } from '@/lib/supabase/server'

const CANAIS_VALIDOS = ['shopee', 'mercado_livre', 'amazon', 'magalu', 'tiktok_shop', 'bling'] as const
type CanalValido = typeof CANAIS_VALIDOS[number]

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const { sessao_id, canais } = await request.json()

    if (!sessao_id || typeof sessao_id !== 'string') {
      return Response.json({ error: 'sessao_id inválido' }, { status: 400 })
    }
    if (!Array.isArray(canais) || canais.length === 0) {
      return Response.json({ error: 'canais deve ser array não-vazio' }, { status: 400 })
    }

    const invalidos = canais.filter((c: string) => !CANAIS_VALIDOS.includes(c as CanalValido))
    if (invalidos.length > 0) {
      return Response.json({ error: `canais inválidos: ${invalidos.join(', ')}` }, { status: 400 })
    }

    const canaisUnicos: string[] = [...new Set<string>(canais)]

    const { data: sessao, error: buscaErr } = await supabase
      .from('sessoes_geracao')
      .select('id, etapa')
      .eq('id', sessao_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (buscaErr || !sessao) {
      return Response.json({ error: 'sessão não encontrada' }, { status: 404 })
    }
    if (sessao.etapa !== 'processando') {
      return Response.json({ error: 'sessão não está em etapa processando' }, { status: 400 })
    }

    const { error: updateErr } = await supabase
      .from('sessoes_geracao')
      .update({ canais_alvo: canaisUnicos })
      .eq('id', sessao_id)

    if (updateErr) {
      console.error('[SALVAR CANAIS] erro ao atualizar:', updateErr)
      return Response.json({ error: 'erro ao salvar canais' }, { status: 500 })
    }

    return Response.json({ sucesso: true, canais_salvos: canaisUnicos })
  } catch (error) {
    console.error('[SALVAR CANAIS] erro:', error)
    return Response.json({ error: 'erro interno' }, { status: 500 })
  }
}
