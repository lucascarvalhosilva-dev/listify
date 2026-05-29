import { createClient } from '@supabase/supabase-js'
import { buscarDominioML } from '../lib/ml/dominio'
import { obterOuCriarGrade } from '../lib/ml/criar-grade'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const produtos = [
  { sku: '132-P', nome: 'Camiseta Manga Curta Basica Algodao', genero: 'Masculino', tamanho: 'P' },
  { sku: '132-M', nome: 'Camiseta Manga Curta Basica Algodao', genero: 'Masculino', tamanho: 'M' },
  { sku: '132-G', nome: 'Camiseta Manga Curta Basica Algodao', genero: 'Masculino', tamanho: 'G' },
]

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await sb.from('ml_contas').select('access_token, user_id').limit(1).single()
  const token = data?.access_token
  const userId = data?.user_id as string

  // 1. Deduplica nomes e busca domínios
  const nomesUnicos = [...new Set(produtos.map(p => p.nome))]
  const dominiosPorNome = new Map<string, string>()
  for (const nome of nomesUnicos) {
    const d = await buscarDominioML(nome)
    console.log('dominio para', nome, ':', d)
    if (d) dominiosPorNome.set(nome, d.domain_id)
  }

  // 2. Agrupa por domain_id + genero e coleta tamanhos
  const grupos = new Map<string, { domainId: string; genero: string; tamanhos: string[] }>()
  for (const p of produtos) {
    const domainId = dominiosPorNome.get(p.nome)
    if (!domainId) continue
    const chave = `${domainId}__${p.genero}`
    if (!grupos.has(chave)) grupos.set(chave, { domainId, genero: p.genero, tamanhos: [] })
    grupos.get(chave)!.tamanhos.push(p.tamanho)
  }

  // 3. Cria/reusa grade por grupo
  const gradesPorChave = new Map<string, { grid_id: string; rows: { tamanho: string; row_id: string }[] }>()
  for (const [chave, grupo] of grupos) {
    const grade = await obterOuCriarGrade({
      domainId: grupo.domainId,
      genero: grupo.genero,
      tamanhos: grupo.tamanhos,
      nomeProduto: produtos[0].nome,
      accessToken: token,
      userId,
    })
    console.log('grade para chave', chave, ':', JSON.stringify(grade, null, 2))
    if (grade) gradesPorChave.set(chave, grade)
  }

  // 4. Resolve size_grid_row_id por produto
  for (const p of produtos) {
    const domainId = dominiosPorNome.get(p.nome)
    if (!domainId) continue
    const chave = `${domainId}__${p.genero}`
    const grade = gradesPorChave.get(chave)
    const row = grade?.rows.find(r => r.tamanho.toUpperCase() === p.tamanho.toUpperCase())
    console.log(`${p.sku} → grid_id: ${grade?.grid_id} | row_id: ${row?.row_id}`)
  }
}

main()
