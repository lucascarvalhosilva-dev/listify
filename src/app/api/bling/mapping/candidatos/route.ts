import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface VariacaoRaw {
  id: number
  sku?: string | null
  attribute_combinations?: Array<{ value_name?: string | null }>
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const service = createServiceClient()

  const [blingRes, mlRes, mappingRes] = await Promise.all([
    service
      .from('bling_estoque')
      .select('sku, nome, saldo')
      .eq('user_id', user.id)
      .order('sku'),
    service
      .from('ml_publicacoes')
      .select('ml_item_id, sku_base, variations')
      .eq('user_id', user.id)
      .order('ml_item_id'),
    service
      .from('bling_ml_mapping')
      .select('bling_sku, ml_item_id, ml_variation_id')
      .eq('user_id', user.id),
  ])

  const bling = (blingRes.data ?? []).map(row => ({
    sku: row.sku as string,
    nome: (row.nome as string | null) ?? null,
    saldo: (row.saldo as number | null) ?? null,
  }))

  const ml = (mlRes.data ?? []).map(row => {
    const variacoesRaw = Array.isArray(row.variations)
      ? (row.variations as VariacaoRaw[])
      : []

    const variations = variacoesRaw.map(v => {
      const attrsLabel = (v.attribute_combinations ?? [])
        .map(a => a.value_name)
        .filter(Boolean)
        .join(' / ')

      return {
        variation_id: v.id,
        sku: v.sku ?? null,
        attrs: attrsLabel || v.sku || '',
      }
    })

    return {
      ml_item_id: row.ml_item_id as string,
      sku_base: (row.sku_base as string | null) ?? null,
      variations,
    }
  })

  const mapeamentos = (mappingRes.data ?? []).map(row => ({
    bling_sku: row.bling_sku as string,
    ml_item_id: row.ml_item_id as string,
    ml_variation_id: (row.ml_variation_id as number | null) ?? null,
  }))

  return NextResponse.json({ bling, ml, mapeamentos })
}
