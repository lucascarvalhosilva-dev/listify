import { createClient } from '@/lib/supabase/server'

export const LIMITES = {
  free:          { produtos: 5,      canais: 2, catalogos: 1      },
  starter:       { produtos: 100,    canais: 2, catalogos: 5      },
  profissional:  { produtos: 500,    canais: 4, catalogos: 30     },
  agencia:       { produtos: 999999, canais: 6, catalogos: 999999 },
}

export const CANAIS_FREE = ['shopee', 'ml']

export type Plano = keyof typeof LIMITES

export async function getPlanoUsuario(): Promise<Plano> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'
  const { data } = await supabase
    .from('profiles')
    .select('plano')
    .eq('id', user.id)
    .maybeSingle()
  return (data?.plano as Plano) || 'free'
}

export async function getProdutosUsadosMes(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const { data } = await supabase
    .from('geracoes')
    .select('total_produtos')
    .eq('user_id', user.id)
    .gte('criado_em', inicioMes.toISOString())
  return data?.reduce((acc, g) => acc + (g.total_produtos || 0), 0) || 0
}

export async function getCatalogosCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await supabase
    .from('catalogos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  return count || 0
}

export async function checarLimiteProdutos(qtdNovos: number): Promise<{ ok: boolean; mensagem?: string }> {
  const plano = await getPlanoUsuario()
  const limite = LIMITES[plano].produtos
  const usados = await getProdutosUsadosMes()
  console.log('[PLANOS] usados no mês:', usados, '| tentando adicionar:', qtdNovos, '| limite:', limite)
  if (usados + qtdNovos > limite) {
    return {
      ok: false,
      mensagem: `Limite do plano ${plano} atingido. Você usou ${usados} de ${limite} produtos este mês.`,
    }
  }
  return { ok: true }
}

export async function checarLimiteCatalogos(): Promise<{ ok: boolean; mensagem?: string }> {
  const plano = await getPlanoUsuario()
  const limite = LIMITES[plano].catalogos
  const atual = await getCatalogosCount()
  if (atual >= limite) {
    return {
      ok: false,
      mensagem: `Limite de catálogos do plano ${plano} atingido (${limite} catálogos).`,
    }
  }
  return { ok: true }
}

export async function checarLimiteCanais(canaisSelecionados: string[]): Promise<{ ok: boolean; mensagem?: string }> {
  const plano = await getPlanoUsuario()
  const limiteQtd = LIMITES[plano].canais
  if (canaisSelecionados.length > limiteQtd) {
    return {
      ok: false,
      mensagem: `Seu plano permite até ${limiteQtd} canais simultâneos.`,
    }
  }
  if (plano === 'free') {
    const canaisNaoPermitidos = canaisSelecionados.filter(c => !CANAIS_FREE.includes(c.toLowerCase()))
    if (canaisNaoPermitidos.length > 0) {
      return {
        ok: false,
        mensagem: `O plano Free permite apenas Shopee e Mercado Livre.`,
      }
    }
  }
  return { ok: true }
}
