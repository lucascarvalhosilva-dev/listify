'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import Navbar from '../components/Navbar'
import type { CatalogoItem } from '../dashboard/components/ProductForm'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProdutoLinha {
  sku: string
  nome: string
  custo: number
  estoque: number
}

interface ProdutoSpec {
  sku: string
  nome: string
  custo: number
  estoque: number
  embalagem?: number
  preco_ml: number
  preco_shopee: number
  preco_tiktok?: number
  preco_bling?: number
  preco_magalu?: number
  preco_amazon?: number
  peso_g: number
  comprimento_cm: number
  largura_cm: number
  altura_cm: number
  confianca_dimensoes: 'alta' | 'media'
  titulo_ml: string
  titulo_shopee: string
  titulo_amazon?: string
  descricao_ml?: string
  descricao_shopee?: string
  descricao_tiktok?: string
  descricao_magalu?: string
  descricao_bling?: string
  descricao_amazon?: string
  bullet_point1?: string
  bullet_point2?: string
  bullet_point3?: string
  bullet_point4?: string
  bullet_point5?: string
  ncm: string
  gtin: string
}

type Etapa = 1 | 2 | 3 | 'processando' | 'resultado' | 'erro'

// ── Canais ─────────────────────────────────────────────────────────────────────

const CANAIS = [
  { id: 'shopee',        label: 'Shopee',         desc: 'Maior marketplace em volume de pedidos' },
  { id: 'mercado_livre', label: 'Mercado Livre',   desc: 'Maior marketplace da América Latina'    },
  { id: 'tiktok_shop',  label: 'TikTok Shop',     desc: 'Venda direto pelo feed do TikTok'       },
  { id: 'amazon',        label: 'Amazon Brasil',   desc: 'Marketplace global com entrega rápida'  },
  { id: 'magalu',        label: 'Magazine Luiza',  desc: 'Grande varejista com alto tráfego'      },
  { id: 'bling',         label: 'Bling (ERP)',     desc: 'Gestão integrada de estoque e pedidos'  },
]

const CANAL_TO_KEY: Record<string, string> = {
  shopee: 'shopee', mercado_livre: 'ml', tiktok_shop: 'tiktok',
  bling: 'bling', magalu: 'magalu', amazon: 'amazon',
}

const ARQUIVO_INFO: Record<string, { label: string; filename: string }> = {
  shopee: { label: 'Shopee',         filename: 'listify-shopee.xlsx' },
  ml:     { label: 'Mercado Livre',  filename: 'listify-ml.xlsx'    },
  tiktok: { label: 'TikTok Shop',    filename: 'listify-tiktok.csv' },
  bling:  { label: 'Bling (ERP)',    filename: 'listify-bling.csv'  },
  magalu: { label: 'Magazine Luiza', filename: 'listify-magalu.csv' },
  amazon: { label: 'Amazon Brasil',  filename: 'listify-amazon.csv' },
}

const EMBALAGEM_PADRAO: Record<string, number> = {
  shopee: 2.5, mercado_livre: 5.5, tiktok_shop: 4.0, amazon: 5.5, magalu: 5.5, bling: 0,
}

const CANAL_NOME: Record<string, string> = {
  shopee: 'Shopee', mercado_livre: 'Mercado Livre', tiktok_shop: 'TikTok Shop',
  bling: 'Bling (ERP)', magalu: 'Magazine Luiza', amazon: 'Amazon Brasil', todos: 'Todos os canais',
}

// ── Guias de upload ────────────────────────────────────────────────────────────

interface PassoGuia { texto: string; atencao?: boolean }
const GUIA_ADICIONAR: Record<string, { titulo: string; passos: PassoGuia[] }> = {
  shopee: {
    titulo: 'Como adicionar produtos novos no Shopee',
    passos: [
      { texto: 'Central do Vendedor → Produto → Upload em massa → aba Envio' },
      { texto: 'Selecione o arquivo gerado pela Listify' },
      { texto: 'Os produtos novos serão adicionados sem mexer nos existentes' },
    ],
  },
  ml: {
    titulo: 'Como adicionar produtos novos no Mercado Livre',
    passos: [
      { texto: 'ML → Vender → Produtos → Anunciador em Massa → Carregar planilha' },
      { texto: 'Selecione o arquivo gerado pela Listify' },
      { texto: 'Os produtos novos serão criados sem alterar os existentes' },
    ],
  },
  tiktok: {
    titulo: 'Como adicionar produtos novos no TikTok Shop',
    passos: [
      { texto: 'seller.tiktok.com → Produtos → Importar produtos em massa' },
      { texto: 'Selecione o CSV gerado pela Listify' },
      { texto: 'Adicione fotos em cada produto novo pelo painel após importação' },
    ],
  },
  bling: {
    titulo: 'Como adicionar produtos novos no Bling',
    passos: [
      { texto: 'Bling → Produtos → Importar Produtos' },
      { texto: 'Selecione o CSV gerado pela Listify' },
      { texto: 'SKUs novos serão criados. SKUs existentes serão atualizados.', atencao: true },
    ],
  },
  magalu: {
    titulo: 'Como adicionar produtos novos no Magazine Luiza',
    passos: [
      { texto: 'Acesse o painel IntegraCommerce' },
      { texto: 'Cadastre os produtos com o arquivo gerado pela Listify' },
      { texto: 'Aguarde aprovação (24–48h)' },
    ],
  },
  amazon: {
    titulo: 'Como adicionar produtos novos na Amazon Brasil',
    passos: [
      { texto: 'Seller Central → Catálogo → Adicionar Produtos' },
      { texto: 'Verifique se o produto já existe no catálogo Amazon pelo EAN antes de criar', atencao: true },
      { texto: 'Se não existir: use o arquivo gerado para criar o listing' },
    ],
  },
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function downloadBase64(base64: string, filename: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const mimeType = filename.endsWith('.csv')
    ? 'text/csv'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── FileUploadZone ─────────────────────────────────────────────────────────────

function FileUploadZone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [typeError, setTypeError] = useState(false)

  function accept(f: File) {
    const ok = f.name.endsWith('.xlsx') || f.name.endsWith('.csv')
    setTypeError(!ok)
    if (ok) onFile(f)
  }

  return (
    <div>
      <input
        ref={inputRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) accept(f) }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) accept(f) }}
        style={{
          border: `2px dashed ${dragging ? 'var(--blue)' : file ? 'rgba(37,99,235,0.5)' : 'var(--border)'}`,
          borderRadius: 12,
          background: dragging ? 'rgba(37,99,235,0.06)' : file ? 'rgba(37,99,235,0.04)' : 'var(--navy)',
          padding: '28px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{file.name}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Clique para trocar o arquivo</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 28, opacity: 0.5 }}>⬆️</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              Arraste o arquivo aqui ou{' '}
              <span style={{ color: 'var(--blue-glow)', fontWeight: 500 }}>clique para selecionar</span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.6 }}>Aceita .xlsx ou .csv</span>
          </div>
        )}
      </div>
      {typeError && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>Formato inválido. Envie .xlsx ou .csv.</p>}
    </div>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [{ n: 1, label: 'Catálogo' }, { n: 2, label: 'Produtos' }, { n: 3, label: 'Canal' }]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
      {steps.map((s, i) => {
        const done = s.n < current
        const active = s.n === current
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: done ? 'var(--blue)' : active ? 'rgba(37,99,235,0.2)' : 'var(--navy-3)',
                border: `2px solid ${done || active ? 'var(--blue)' : 'var(--border)'}`,
                color: done || active ? 'var(--white)' : 'var(--muted)',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : s.n}
              </div>
              <span style={{ fontSize: 11, color: active ? 'var(--blue-glow)' : 'var(--muted)', fontWeight: active ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 56, height: 2, margin: '0 6px 18px',
                background: done ? 'var(--blue)' : 'var(--border)',
                transition: 'background 0.2s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdicionarProdutosPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>(1)
  const [catalogos, setCatalogos] = useState<CatalogoItem[]>([])
  const [carregandoCatalogos, setCarregandoCatalogos] = useState(true)
  const [catalogoSelecionado, setCatalogoSelecionado] = useState<CatalogoItem | null>(null)
  const [catIdParam, setCatIdParam] = useState<string | null>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [linhasArquivo, setLinhasArquivo] = useState<ProdutoLinha[]>([])

  const [guiaAberto, setGuiaAberto] = useState(false)
  const [canal, setCanal] = useState('')
  const [regime, setRegime] = useState<'MEI' | 'Simples Nacional'>('MEI')

  const [numTotal, setNumTotal] = useState(0)
  const [numProcessados, setNumProcessados] = useState(0)
  const [resultado, setResultado] = useState<{ produtos_processados: number; arquivos: Record<string, string | null> } | null>(null)
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cat = params.get('cat')
    if (!cat) {
      router.push('/painel')
      return
    }
    setCatIdParam(cat)
  }, [router])

  useEffect(() => {
    if (!catIdParam || catalogos.length === 0) return
    const cat = catalogos.find(c => c.id === catIdParam)
    if (cat) setCatalogoSelecionado(cat)
  }, [catIdParam, catalogos])

  useEffect(() => {
    fetch('/api/get-catalogs')
      .then(r => r.ok ? r.json() : { catalogos: [] })
      .then((json: { catalogos?: CatalogoItem[] }) => setCatalogos(json.catalogos ?? []))
      .catch(() => setCatalogos([]))
      .finally(() => setCarregandoCatalogos(false))
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const skusExistentes = new Set(catalogoSelecionado?.produtos.map(p => p.sku.trim()) ?? [])
  const produtosNovos = linhasArquivo.filter(p => !skusExistentes.has(p.sku.trim()))
  const produtosRepetidos = linhasArquivo.filter(p => skusExistentes.has(p.sku.trim()))

  // ── File parsing ─────────────────────────────────────────────────────────────

  function handleArquivo(f: File) {
    setArquivo(f)
    setLinhasArquivo([])
    f.arrayBuffer().then(buf => {
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
      const linhas: ProdutoLinha[] = rows
        .map((row, i) => ({
          sku: String(row['SKU'] ?? `PROD_${i + 1}`),
          nome: String(row['Nome do produto'] ?? ''),
          custo: Number(row['Custo unitário (R$)'] ?? 0),
          estoque: Number(row['Estoque'] ?? 0),
        }))
        .filter(p => p.nome.trim() !== '')
      setLinhasArquivo(linhas)
    }).catch(() => setLinhasArquivo([]))
  }

  // ── Processing ────────────────────────────────────────────────────────────────

  async function processar() {
    if (!produtosNovos.length || !catalogoSelecionado || !canal) return
    setEtapa('processando')
    setNumTotal(produtosNovos.length)
    setNumProcessados(0)

    try {
      const regimeAPI = regime === 'Simples Nacional' ? 'SN' : 'MEI'
      const canalAPI = canal === 'mercado_livre' ? 'ml' : canal
      const driveUrl = catalogoSelecionado.drive_url

      const CHUNK_SIZE = 5
      const chunks: ProdutoLinha[][] = []
      for (let i = 0; i < produtosNovos.length; i += CHUNK_SIZE) {
        chunks.push(produtosNovos.slice(i, i + CHUNK_SIZE))
      }

      const allSpecs: ProdutoSpec[] = []
      const allAlertas: string[] = []
      let processados = 0

      for (const chunk of chunks) {
        const res = await fetch('/api/process-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ produtos: chunk, regime: regimeAPI, canais: [canalAPI], drive_folder_url: driveUrl }),
        })
        if (res.status === 401) throw new Error('Sessão expirada. Recarregue a página.')
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(err.error ?? `Erro ${res.status}`)
        }
        const chunk_data = await res.json() as { produtos_revisao: ProdutoSpec[]; alertas: string[] }
        allSpecs.push(...chunk_data.produtos_revisao)
        allAlertas.push(...chunk_data.alertas)
        processados += chunk.length
        setNumProcessados(processados)
      }

      const embFinal = EMBALAGEM_PADRAO[canal] ?? 0
      const produtosFinais = allSpecs.map(p => ({ ...p, embalagem: embFinal }))

      const genRes = await fetch('/api/generate-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtos: produtosFinais,
          regime: regimeAPI,
          canais: [canalAPI],
          drive_folder_url: driveUrl,
          alertas: allAlertas,
        }),
      })
      if (!genRes.ok) throw new Error('Erro ao gerar o arquivo.')
      const genData = await genRes.json() as { produtos_processados: number; arquivos: Record<string, string | null> }
      setResultado(genData)
      setEtapa('resultado')
    } catch (err) {
      setErroMsg(err instanceof Error ? err.message : 'Erro inesperado.')
      setEtapa('erro')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const canalKey = CANAL_TO_KEY[canal] ?? canal
  const arquivoGerado = resultado?.arquivos[canalKey] ?? null
  const arquivoInfo = ARQUIVO_INFO[canalKey]
  const guia = GUIA_ADICIONAR[canalKey]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* ── Step 1: Selecionar catálogo ─────────────────────────────── */}
          {etapa === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Banner "Como funciona?" */}
              <div style={{
                background: 'var(--navy-2)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <button
                  type="button"
                  onClick={() => setGuiaAberto(o => !o)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>ℹ️</span>
                    <span style={{ fontWeight: 500 }}>Como funciona?</span>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', transition: 'transform 0.2s', display: 'inline-block', transform: guiaAberto ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                </button>
                {guiaAberto && (
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'Selecione o catálogo que você já publicou em um canal',
                      'Faça upload da planilha com TODOS os seus produtos (novos e antigos)',
                      'A Listify identifica automaticamente quais SKUs são novos',
                      'Escolha o canal de destino e gere a planilha só com os novos',
                      'Faça upload no novo canal — os produtos existentes não são afetados',
                    ].map((texto, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: 'var(--blue-glow)',
                          background: 'rgba(37,99,235,0.15)', borderRadius: '50%',
                          width: 20, height: 20, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{texto}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card principal Step 1 */}
              <div style={{
                background: 'var(--navy-2)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '36px 32px',
              }}>
                <StepIndicator current={1} />
                <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                  Qual catálogo já está publicado?
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
                  Selecione o catálogo que você já publicou nesse canal. A Listify vai comparar os SKUs para identificar apenas os novos.
                </p>

                {carregandoCatalogos ? (
                  <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Carregando catálogos...</p>
                ) : !catIdParam ? (
                  <div style={{
                    background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)',
                    borderRadius: 10, padding: '14px 16px', marginBottom: 24,
                  }}>
                    <p style={{ fontSize: 13, color: '#fbbf24', margin: 0, lineHeight: 1.6 }}>
                      Para adicionar produtos, acesse <strong>Meus Catálogos</strong> e clique em <strong>✏️ Atualizar</strong> no catálogo que deseja expandir.{' '}
                      <Link href="/painel" style={{ color: '#fbbf24', fontWeight: 600 }}>Ir aos catálogos →</Link>
                    </p>
                  </div>
                ) : !catalogoSelecionado ? (
                  <div style={{
                    background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 10, padding: '14px 16px', marginBottom: 24,
                  }}>
                    <p style={{ fontSize: 13, color: '#f87171', margin: 0, lineHeight: 1.6 }}>
                      Catálogo não encontrado.{' '}
                      <Link href="/painel" style={{ color: '#f87171', fontWeight: 600 }}>Voltar aos catálogos →</Link>
                    </p>
                  </div>
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{
                      padding: '14px 16px', borderRadius: 10,
                      border: '2px solid var(--blue)',
                      background: 'rgba(37,99,235,0.1)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                          {catalogoSelecionado.nome}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {catalogoSelecionado.produtos.length} produto{catalogoSelecionado.produtos.length !== 1 ? 's' : ''}{' '}
                          · {catalogoSelecionado.regime_tributario}{' '}
                          · {new Date(catalogoSelecionado.atualizado_em).toLocaleDateString('pt-BR')}
                        </div>
                        {catalogoSelecionado.canal && (
                          <div style={{ fontSize: 11, color: 'var(--blue-glow)', marginTop: 4 }}>
                            📢 Canal: {CANAL_NOME[catalogoSelecionado.canal] ?? catalogoSelecionado.canal}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--blue)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: 'white', fontWeight: 700,
                      }}>✓</div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { if (catalogoSelecionado) setEtapa(2) }}
                  disabled={!catalogoSelecionado}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', opacity: catalogoSelecionado ? 1 : 0.5 }}
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Upload + comparação de SKUs ─────────────────────── */}
          {etapa === 2 && (
            <div style={{
              background: 'var(--navy-2)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '36px 32px',
            }}>
              <StepIndicator current={2} />
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                Quais produtos você quer adicionar?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
                Use a mesma planilha que você já usa. A Listify vai identificar automaticamente quais SKUs são novos
                comparando com{' '}
                <strong style={{ color: 'var(--white)' }}>{catalogoSelecionado?.nome}</strong>.
              </p>

              <div style={{ marginBottom: linhasArquivo.length > 0 ? 16 : 24 }}>
                <FileUploadZone file={arquivo} onFile={handleArquivo} />
              </div>

              {linhasArquivo.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {produtosNovos.length > 0 && (
                    <div style={{
                      background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)',
                      borderRadius: 10, overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '10px 14px', borderBottom: '1px solid rgba(74,222,128,0.15)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>
                          ✓ {produtosNovos.length} produto{produtosNovos.length !== 1 ? 's' : ''} novo{produtosNovos.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 11, color: 'rgba(74,222,128,0.6)' }}>serão processados</span>
                      </div>
                      <div style={{ maxHeight: 168, overflowY: 'auto', padding: '4px 0' }}>
                        {produtosNovos.map(p => (
                          <div key={p.sku} style={{ display: 'flex', gap: 10, padding: '5px 14px', alignItems: 'baseline' }}>
                            <code style={{ fontSize: 11, color: '#4ade80', flexShrink: 0 }}>{p.sku}</code>
                            <span style={{ fontSize: 12, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                              {p.nome}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {produtosRepetidos.length > 0 && (
                    <div style={{
                      background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)',
                      borderRadius: 10, overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '10px 14px', borderBottom: '1px solid rgba(251,191,36,0.15)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>
                          ⚠ {produtosRepetidos.length} já cadastrado{produtosRepetidos.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 11, color: 'rgba(251,191,36,0.6)' }}>serão ignorados</span>
                      </div>
                      <div style={{ maxHeight: 120, overflowY: 'auto', padding: '4px 0' }}>
                        {produtosRepetidos.map(p => (
                          <div key={p.sku} style={{ display: 'flex', gap: 10, padding: '5px 14px', alignItems: 'baseline' }}>
                            <code style={{ fontSize: 11, color: '#fbbf24', flexShrink: 0 }}>{p.sku}</code>
                            <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                              {p.nome}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {produtosNovos.length === 0 && (
                    <div style={{
                      background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
                      borderRadius: 10, padding: '12px 14px',
                    }}>
                      <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>
                        Nenhum produto novo encontrado — todos os SKUs já existem no catálogo selecionado.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => setEtapa(1)} className="btn-secondary" style={{ justifyContent: 'center' }}>
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={() => { if (produtosNovos.length > 0) setEtapa(3) }}
                  disabled={produtosNovos.length === 0}
                  className="btn-primary"
                  style={{ justifyContent: 'center', opacity: produtosNovos.length > 0 ? 1 : 0.5 }}
                >
                  Usar os novos ({produtosNovos.length}) →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Canal + regime ───────────────────────────────────── */}
          {etapa === 3 && (
            <div style={{
              background: 'var(--navy-2)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '36px 32px',
            }}>
              <StepIndicator current={3} />
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                Em qual canal você quer adicionar?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
                Selecione um canal. Serão gerados {produtosNovos.length} produto{produtosNovos.length !== 1 ? 's' : ''} novo{produtosNovos.length !== 1 ? 's' : ''}.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {CANAIS.map(ch => {
                  const sel = canal === ch.id
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setCanal(ch.id)}
                      style={{
                        padding: '14px 16px', borderRadius: 12, textAlign: 'left' as const,
                        border: `2px solid ${sel ? 'var(--blue)' : 'var(--border)'}`,
                        background: sel ? 'rgba(37,99,235,0.1)' : 'var(--navy)',
                        cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                      }}
                    >
                      {sel && (
                        <div style={{
                          position: 'absolute', top: 8, right: 10,
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'var(--blue)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: 'white', fontWeight: 700,
                        }}>✓</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 600, color: sel ? 'var(--white)' : 'var(--muted)', marginBottom: 4 }}>
                        {ch.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{ch.desc}</div>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                  Regime tributário
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(['MEI', 'Simples Nacional'] as const).map(r => {
                    const active = regime === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRegime(r)}
                        style={{
                          padding: '12px 16px', borderRadius: 10, textAlign: 'center' as const,
                          border: `2px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                          background: active ? 'rgba(37,99,235,0.12)' : 'var(--navy)',
                          color: active ? 'var(--blue-glow)' : 'var(--muted)',
                          fontSize: 14, fontWeight: active ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => setEtapa(2)} className="btn-secondary" style={{ justifyContent: 'center' }}>
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={processar}
                  disabled={!canal}
                  style={{
                    padding: '14px', borderRadius: 10, border: 'none',
                    background: canal ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'var(--navy-3)',
                    color: canal ? 'white' : 'var(--muted)',
                    fontSize: 15, fontWeight: 600,
                    cursor: canal ? 'pointer' : 'not-allowed',
                    boxShadow: canal ? '0 0 20px rgba(22,163,74,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  Gerar planilha
                </button>
              </div>
            </div>
          )}

          {/* ── Processando ──────────────────────────────────────────────── */}
          {etapa === 'processando' && (
            <>
              <style>{`@keyframes ap-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              <div style={{
                background: 'var(--navy-2)', border: '1px solid var(--border)', borderRadius: 20,
                padding: '64px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 24, textAlign: 'center',
              }}>
                <div style={{
                  width: 52, height: 52,
                  border: '3px solid var(--border)', borderTop: '3px solid var(--blue)',
                  borderRadius: '50%', animation: 'ap-spin 0.8s linear infinite',
                }} />
                <div style={{ width: '100%' }}>
                  <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 10 }}>
                    {numProcessados === 0
                      ? 'Processando...'
                      : `Processando ${numProcessados} de ${numTotal}...`}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>
                    Aguarde, isso pode levar alguns minutos
                  </p>
                  <div style={{ position: 'relative', width: '100%', background: 'var(--navy-3)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left: 0,
                      width: numTotal > 0 ? `${Math.round((numProcessados / numTotal) * 100)}%` : '0%',
                      minWidth: numProcessados > 0 ? 24 : 0,
                      background: 'linear-gradient(90deg, var(--blue), var(--blue-glow))',
                      borderRadius: 8, transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Resultado ────────────────────────────────────────────────── */}
          {etapa === 'resultado' && resultado && (
            <div style={{
              background: 'var(--navy-2)', border: '1px solid var(--border)', borderRadius: 20,
              padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, background: 'rgba(22,163,74,0.15)',
                  border: '1px solid rgba(22,163,74,0.35)', borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, margin: '0 auto 16px',
                }}>✅</div>
                <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                  Planilha pronta!
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  {resultado.produtos_processados} produto{resultado.produtos_processados !== 1 ? 's' : ''} processado{resultado.produtos_processados !== 1 ? 's' : ''}
                </p>
              </div>

              {arquivoGerado && arquivoInfo && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  background: 'var(--navy)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '14px 18px',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{arquivoInfo.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{arquivoInfo.filename}</div>
                  </div>
                  <button
                    onClick={() => downloadBase64(arquivoGerado, arquivoInfo.filename)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '9px 16px',
                      background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.35)',
                      borderRadius: 8, color: 'var(--blue-glow)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      whiteSpace: 'nowrap' as const, flexShrink: 0,
                    }}
                  >
                    ⬇ Baixar {arquivoInfo.filename.endsWith('.csv') ? '.csv' : '.xlsx'}
                  </button>
                </div>
              )}

              {guia && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--navy)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>📋 {guia.titulo}</span>
                  </div>
                  <div style={{
                    padding: '12px 16px 14px', background: 'rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    {(() => {
                      let passoNum = 0
                      return guia.passos.map((passo, i) => {
                        if (!passo.atencao) passoNum++
                        const num = passoNum
                        return (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1, color: passo.atencao ? '#fbbf24' : '#4ade80' }}>
                              {passo.atencao ? '⚠' : '✓'}
                            </span>
                            <p style={{ fontSize: 12, margin: 0, lineHeight: 1.6, color: passo.atencao ? '#fbbf24' : 'var(--muted)' }}>
                              {passo.atencao
                                ? <><strong style={{ color: '#fbbf24' }}>Atenção:</strong>{' '}{passo.texto}</>
                                : <><strong style={{ color: 'var(--white)' }}>Passo {num}:</strong>{' '}{passo.texto}</>
                              }
                            </p>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}

              <button
                onClick={() => setEtapa(1)}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                ← Adicionar outros produtos
              </button>
            </div>
          )}

          {/* ── Erro ─────────────────────────────────────────────────────── */}
          {etapa === 'erro' && (
            <div style={{
              background: 'var(--navy-2)', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 20, padding: '48px 40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52, background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)', borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>❌</div>
              <div>
                <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>
                  Algo deu errado
                </h2>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>{erroMsg}</p>
              </div>
              <button onClick={() => setEtapa(3)} className="btn-primary" style={{ justifyContent: 'center' }}>
                Tentar novamente
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
