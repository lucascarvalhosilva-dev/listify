import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ plano: 'free' })
  const { data } = await supabase
    .from('profiles')
    .select('plano')
    .eq('id', user.id)
    .maybeSingle()
  return Response.json({ plano: data?.plano || 'free' })
}
