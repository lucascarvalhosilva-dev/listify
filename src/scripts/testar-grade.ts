import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { buscarDominioML } from '../lib/ml/dominio'
import { buscarSpecGrade } from '../lib/ml/grade-tamanho'

dotenv.config({ path: '.env.local' })

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await sb.from('ml_contas').select('access_token').limit(1).single()
  const token = data?.access_token
  console.log('token:', token ? 'encontrado' : 'não encontrado')
  if (!token) return

  const dominio = await buscarDominioML('Camiseta Manga Curta Basica Algodao')
  console.log('dominio:', dominio)
  if (!dominio) return

  const spec = await buscarSpecGrade(dominio.domain_id, token)
  console.log(JSON.stringify(spec, null, 2))
}

main()
