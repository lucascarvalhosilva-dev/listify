import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { buscarDominioML } from '../lib/ml/dominio'
import { obterOuCriarGrade } from '../lib/ml/criar-grade'

dotenv.config({ path: '.env.local' })

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await sb.from('ml_contas').select('access_token, user_id').limit(1).single()
  const token = data?.access_token
  const userId = data?.user_id
  console.log('token:', token ? 'encontrado' : 'não encontrado')
  console.log('userId:', userId ?? 'não encontrado')
  if (!token || !userId) return

  const dominio = await buscarDominioML('Camiseta Manga Curta Basica Algodao')
  console.log('dominio:', dominio)
  if (!dominio) return

  const resultado = await obterOuCriarGrade({
    domainId: dominio.domain_id,
    genero: 'Masculino',
    tamanhos: ['P', 'M', 'G'],
    nomeProduto: 'Camiseta Manga Curta Basica Algodao',
    accessToken: token,
    userId,
  })
  console.log(JSON.stringify(resultado, null, 2))
}

main()
