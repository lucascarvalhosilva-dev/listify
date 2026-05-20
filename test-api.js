// Usage: node test-api.js <email> <senha>
// O servidor Next.js deve estar rodando em localhost:3000

'use strict'

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// ── Carrega .env.local ─────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local')
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) env[key.trim()] = rest.join('=').trim()
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

const [email, senha] = process.argv.slice(2)
if (!email || !senha) {
  console.error('Uso: node test-api.js <email> <senha>')
  process.exit(1)
}

// ── Payload de teste ───────────────────────────────────────────────────────
const PAYLOAD = {
  produtos: [
    { sku: '80171', nome: 'Vara Telescópica CMIK 3m', custo: 11.60, estoque: 10 },
    { sku: '81025', nome: 'Molinete Enjoylure SE3000', custo: 37.50, estoque: 5 },
  ],
  regime: 'MEI',
  canais: ['shopee', 'ml'],
  drive_folder_url: 'https://drive.google.com/drive/folders/teste',
}

// ── Helper: faz uma requisição HTTP/HTTPS e retorna { status, body } ───────
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const driver = parsed.protocol === 'https:' ? https : http
    const payload = body ? JSON.stringify(body) : null

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(options.headers || {}),
      },
    }

    const req = driver.request(reqOptions, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let json
        try { json = JSON.parse(text) } catch { json = text }
        resolve({ status: res.statusCode, body: json })
      })
    })

    req.on('error', reject)

    if (payload) req.write(payload)
    req.end()
  })
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  // 1. Login via Supabase REST API
  console.log(`\nAutenticando como ${email}...`)
  const loginRes = await request(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY },
    },
    { email, password: senha }
  )

  if (loginRes.status !== 200) {
    const err = loginRes.body
    console.error('Falha no login:', err.error_description ?? err.msg ?? loginRes.status)
    process.exit(1)
  }

  const session = loginRes.body
  console.log('Login OK — token expira em', new Date(session.expires_at * 1000).toLocaleTimeString('pt-BR'))

  // 2. Monta cookie de sessão que o @supabase/ssr espera
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const cookieValue = encodeURIComponent(JSON.stringify(session))

  // 3. Chama /api/process-catalog
  console.log('\nChamando POST /api/process-catalog...')
  console.log('Produtos:', PAYLOAD.produtos.map(p => `${p.sku} - ${p.nome}`).join(', '))
  const t0 = Date.now()

  const apiRes = await request(
    'http://localhost:3000/api/process-catalog',
    {
      method: 'POST',
      headers: { Cookie: `${cookieName}=${cookieValue}` },
    },
    PAYLOAD
  )

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\nStatus: ${apiRes.status} (${elapsed}s)\n`)

  const data = apiRes.body

  if (apiRes.status !== 200) {
    console.error('Erro:', data)
    process.exit(1)
  }

  // 4. Imprime resultado
  console.log('-'.repeat(50))
  console.log(`status             : ${data.status}`)
  console.log(`produtos_processados: ${data.produtos_processados}`)
  console.log(`alertas (${data.alertas.length}):`)
  if (data.alertas.length === 0) {
    console.log('  (nenhum)')
  } else {
    data.alertas.forEach(a => console.log(`  ! ${a}`))
  }
  console.log('\narquivos gerados:')
  for (const [canal, b64] of Object.entries(data.arquivos)) {
    if (b64) {
      const sizeKb = Math.round((b64.length * 3) / 4 / 1024)
      console.log(`  OK ${canal.padEnd(8)} — ${sizeKb} KB (base64)`)
    } else {
      console.log(`  -- ${canal.padEnd(8)} — nao gerado`)
    }
  }
  console.log('-'.repeat(50))
}

main().catch(err => {
  console.error('Erro inesperado:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
  process.exit(1)
})
