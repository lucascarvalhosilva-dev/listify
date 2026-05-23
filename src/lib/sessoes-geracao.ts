import { createClient } from '@/lib/supabase/server'

export type Etapa =
  | 'iniciada'
  | 'aguardando_planilha'
  | 'validando_planilha'
  | 'aguardando_drive'
  | 'validando_drive'
  | 'processando'
  | 'concluida'
  | 'cancelada'

export type SessaoGeracao = {
  id: string
  user_id: string
  etapa: Etapa
  canal_alvo: string | null
  dados_planilha: Record<string, unknown>
  drive_url: string | null
  resultado_geracao_id: string | null
  criado_em: string
  atualizado_em: string
}

export async function buscarSessaoAtiva(userId: string): Promise<SessaoGeracao | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sessoes_geracao')
    .select('*')
    .eq('user_id', userId)
    .not('etapa', 'in', '("concluida","cancelada")')
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export async function criarSessao(userId: string): Promise<SessaoGeracao> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sessoes_geracao')
    .insert({ user_id: userId, etapa: 'iniciada' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarEtapa(
  sessaoId: string,
  novaEtapa: Etapa,
  dadosExtras?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  const update: Record<string, unknown> = { etapa: novaEtapa }

  if (dadosExtras) {
    const { data: current } = await supabase
      .from('sessoes_geracao')
      .select('dados_planilha')
      .eq('id', sessaoId)
      .single()
    update.dados_planilha = { ...(current?.dados_planilha ?? {}), ...dadosExtras }
  }

  await supabase.from('sessoes_geracao').update(update).eq('id', sessaoId)
}

export async function cancelarSessoesAntigas(userId: string): Promise<void> {
  const supabase = await createClient()
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('sessoes_geracao')
    .update({ etapa: 'cancelada' })
    .eq('user_id', userId)
    .not('etapa', 'in', '("concluida","cancelada")')
    .lt('atualizado_em', limite)
}
