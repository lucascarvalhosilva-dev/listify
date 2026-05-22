import { createClient } from '@/lib/supabase/server'

export async function salvarErroAprendido({
  canal,
  tipoErro,
  causa,
  solucao,
  exemploOriginal,
  exemploCorrigido,
}: {
  canal: string
  tipoErro: string
  causa?: string
  solucao?: string
  exemploOriginal?: string
  exemploCorrigido?: string
}) {
  try {
    const supabase = await createClient()
    const { data: existente } = await supabase
      .from('erros_aprendidos')
      .select('id, ocorrencias')
      .eq('canal', canal)
      .eq('tipo_erro', tipoErro)
      .single()

    if (existente) {
      await supabase
        .from('erros_aprendidos')
        .update({
          ocorrencias: existente.ocorrencias + 1,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', existente.id)
    } else {
      await supabase.from('erros_aprendidos').insert({
        canal,
        tipo_erro: tipoErro,
        causa,
        solucao,
        exemplo_original: exemploOriginal,
        exemplo_corrigido: exemploCorrigido,
      })
    }
  } catch (e) {
    console.error('[ERROS APRENDIDOS] Falha ao salvar:', e)
  }
}

export async function getCorrecoesPreventivas(canal: string): Promise<Array<{tipo_erro: string, solucao: string, ocorrencias: number}>> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('erros_aprendidos')
      .select('tipo_erro, solucao, ocorrencias')
      .eq('canal', canal)
      .gte('ocorrencias', 5)
      .not('solucao', 'is', null)
      .order('ocorrencias', { ascending: false })
      .limit(20)
    return data || []
  } catch {
    return []
  }
}

export async function getErrosFrequentes(canal: string): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('erros_aprendidos')
      .select('tipo_erro, causa, solucao, ocorrencias')
      .eq('canal', canal)
      .order('ocorrencias', { ascending: false })
      .limit(10)

    if (!data || data.length === 0) return ''

    const lista = data.map(e =>
      `- Erro: ${e.tipo_erro}${e.causa ? ` | Causa: ${e.causa}` : ''}${e.solucao ? ` | Solução: ${e.solucao}` : ''} (${e.ocorrencias}x)`
    ).join('\n')

    return `\n\nErros frequentes já conhecidos para ${canal}:\n${lista}`
  } catch {
    return ''
  }
}
