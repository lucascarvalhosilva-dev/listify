import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const skuBaseParam = request.nextUrl.searchParams.get('sku_base')
  const skuBaseList = skuBaseParam
    ? skuBaseParam.split(',').map(s => s.trim()).filter(Boolean)
    : null

  let query = supabase
    .from('ml_publicacoes')
    .select('ml_item_id, permalink, status, sku_base, titulo, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (skuBaseList?.length) {
    query = query.in('sku_base', skuBaseList)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ publicacoes: data })
}
