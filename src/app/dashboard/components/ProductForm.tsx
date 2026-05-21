'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { downloadTemplate } from '../utils/templateGenerator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  file: File | null
  taxRegime: 'MEI' | 'Simples Nacional'
  driveLink: string
  channels: string[]
}

interface ProdutoRevisao {
  sku: string
  nome: string
  custo: number
  estoque: number
  embalagem: number
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

type CampoNumerico = 'preco_ml' | 'preco_shopee' | 'preco_tiktok' | 'preco_bling' | 'preco_magalu' | 'preco_amazon' | 'peso_g' | 'comprimento_cm' | 'largura_cm' | 'altura_cm' | 'embalagem'
type CampoTexto = 'titulo_ml' | 'titulo_shopee' | 'titulo_amazon' | 'descricao_ml' | 'descricao_shopee' | 'descricao_tiktok' | 'descricao_magalu' | 'descricao_bling' | 'descricao_amazon' | 'bullet_point1' | 'bullet_point2' | 'bullet_point3' | 'bullet_point4' | 'bullet_point5' | 'ncm' | 'gtin'

interface ApiResultado {
  status: string
  produtos_processados: number
  alertas: string[]
  arquivos: {
    shopee: string | null
    ml: string | null
    tiktok?: string | null
    bling?: string | null
    magalu?: string | null
    amazon?: string | null
  }
  produtos_revisao: ProdutoRevisao[]
}

type Stage = 'formulario' | 'carregando' | 'pronto' | 'revisao_precos' | 'revisao_dimensoes' | 'gerando' | 'resultado' | 'correcao' | 'erro'

interface CorrecaoApiResponse {
  mensagem: string
  arquivo_corrigido?: string | null
  produtos_corrigidos?: number
  total_com_erros?: number
  diagnosticos?: string[]
}

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  arquivo_corrigido?: string
  canal?: 'shopee' | 'ml'
  arquivoNome?: string
}

const INITIAL: FormData = {
  file: null,
  taxRegime: 'MEI',
  driveLink: '',
  channels: [],
}

const CHANNELS = [
  { id: 'shopee',        name: 'Shopee',        desc: 'Maior marketplace em volume de pedidos' },
  { id: 'mercado_livre', name: 'Mercado Livre', desc: 'Maior marketplace da América Latina' },
  { id: 'tiktok_shop',  name: 'TikTok Shop',   desc: 'Venda direto pelo feed do TikTok' },
  { id: 'amazon',       name: 'Amazon Brasil',  desc: 'Marketplace global com entrega rápida' },
  { id: 'magalu',       name: 'Magazine Luiza', desc: 'Grande varejista com alto tráfego' },
  { id: 'bling',        name: 'Bling (ERP)',    desc: 'Gestão integrada de estoque e pedidos' },
]

// ─── Utils ────────────────────────────────────────────────────────────────────

function downloadBase64(base64: string, filename: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--navy)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 15,
  color: 'var(--white)',
  outline: 'none',
  boxSizing: 'border-box',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
      {children}
    </label>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Planilha' },
    { n: 2, label: 'Config.' },
    { n: 3, label: 'Canais' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
      {steps.map((s, i) => {
        const done   = s.n < current
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
                width: 56, height: 2, marginBottom: 18, margin: '0 6px 18px',
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

// ─── File upload zone ─────────────────────────────────────────────────────────

function FileUploadZone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [typeError, setTypeError] = useState(false)

  function accept(f: File) {
    const ok = f.name.endsWith('.xlsx') || f.name.endsWith('.csv')
    setTypeError(!ok)
    if (ok) onFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) accept(f)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) accept(f)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--blue)' : file ? 'rgba(37,99,235,0.5)' : 'var(--border)'}`,
          borderRadius: 12,
          background: dragging ? 'rgba(37,99,235,0.06)' : file ? 'rgba(37,99,235,0.04)' : 'var(--navy)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s',
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
              Arraste o arquivo aqui ou <span style={{ color: 'var(--blue-glow)', fontWeight: 500 }}>clique para selecionar</span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.6 }}>Aceita .xlsx ou .csv</span>
          </div>
        )}
      </div>
      {typeError && (
        <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>
          Formato inválido. Envie um arquivo .xlsx ou .csv.
        </p>
      )}
    </div>
  )
}

// ─── Photo guide ──────────────────────────────────────────────────────────────

const DRIVE_STEPS = [
  {
    img: '/images/guia-drive/drive_step1.png',
    desc: 'Crie uma pasta no Google Drive e coloque todas as fotos nomeadas como 001_01.jpg, 001_02.jpg...',
  },
  {
    img: '/images/guia-drive/drive_step3.png',
    desc: 'Clique com botão direito na pasta → Compartilhar → Compartilhar',
  },
  {
    img: '/images/guia-drive/drive_step2.png',
    desc: "Em 'Acesso geral', selecione 'Qualquer pessoa com o link' e mude para 'Visualizador'",
  },
  {
    img: '/images/guia-drive/drive_step4.png',
    desc: "Clique em 'Copiar link' — o link está pronto para usar na Listify",
  },
]

const collapsibleBoxStyle: React.CSSProperties = {
  background: 'rgba(37,99,235,0.06)',
  border: '1px solid rgba(37,99,235,0.2)',
  borderRadius: 12,
  overflow: 'hidden',
}

const collapsibleTriggerStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
}

function PhotoGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div style={collapsibleBoxStyle}>
      <button type="button" onClick={() => setOpen(o => !o)} style={collapsibleTriggerStyle}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-glow)', display: 'flex', alignItems: 'center', gap: 8 }}>
          📸 Como preparar suas fotos
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {open ? 'Fechar guia ▲' : 'Ver passo a passo com imagens ▼'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {DRIVE_STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'white',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
              <img
                src={s.img}
                alt={`Passo ${i + 1}`}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  display: 'block',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SKU guide ────────────────────────────────────────────────────────────────

function SkuGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div style={collapsibleBoxStyle}>
      <button type="button" onClick={() => setOpen(o => !o)} style={collapsibleTriggerStyle}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-glow)' }}>
          ❓ O que é SKU?
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '4px 16px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
            SKU é o código único que identifica cada produto no seu estoque. Você cria o código
            — pode ser qualquer número ou letra.
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: '10px 0 0' }}>
            <strong style={{ color: 'var(--white)' }}>Exemplos: </strong>
            {['001', '002', 'CAM-P-PRETO'].map(ex => (
              <code key={ex} style={{
                background: 'var(--navy-3)',
                padding: '2px 7px', borderRadius: 4, fontSize: 12,
                marginRight: 6, display: 'inline-block',
              }}>{ex}</code>
            ))}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: '10px 0 0' }}>
            <strong style={{ color: 'var(--blue-glow)' }}>Dica:</strong>{' '}
            <span style={{ color: 'var(--muted)' }}>use números sequenciais simples como 001, 002, 003.</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Step 1 — Planilha de produtos ───────────────────────────────────────────

function Step1({
  data,
  onChange,
  onNext,
}: {
  data: FormData
  onChange: (p: Partial<FormData>) => void
  onNext: () => void
}) {
  const [error, setError] = useState('')

  function handleNext() {
    if (!data.file) { setError('Faça o upload da planilha antes de continuar.'); return }
    setError('')
    onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
        Baixe o template, preencha com seus produtos e faça o upload.
      </p>

      <button
        type="button"
        onClick={downloadTemplate}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 18px',
          background: 'rgba(37,99,235,0.1)',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: 10,
          color: 'var(--blue-glow)',
          fontSize: 14, fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
          alignSelf: 'flex-start',
        }}
      >
        ⬇ Baixar template Excel
      </button>

      <FileUploadZone
        file={data.file}
        onFile={f => { onChange({ file: f }); setError('') }}
      />

      <SkuGuide />

      {error && (
        <p style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
          {error}
        </p>
      )}

      <button onClick={handleNext} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
        Próximo →
      </button>
    </div>
  )
}

// ─── Step 2 — Configurações gerais ───────────────────────────────────────────

function Step2({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: FormData
  onChange: (p: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PhotoGuide />

      <div>
        <Label>Regime tributário</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['MEI', 'Simples Nacional'] as const).map(regime => {
            const active = data.taxRegime === regime
            return (
              <button
                key={regime}
                type="button"
                onClick={() => onChange({ taxRegime: regime })}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: `2px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                  background: active ? 'rgba(37,99,235,0.12)' : 'var(--navy)',
                  color: active ? 'var(--blue-glow)' : 'var(--muted)',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'center',
                }}
              >
                {regime}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Label>Link da pasta do Google Drive com as fotos</Label>
        <input
          style={inputStyle}
          type="url"
          required
          value={data.driveLink}
          onChange={e => onChange({ driveLink: e.target.value })}
          placeholder="https://drive.google.com/drive/folders/..."
        />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          Nomeie os arquivos como <strong style={{ color: 'var(--white)' }}>SKU_01.jpg</strong>, <strong style={{ color: 'var(--white)' }}>SKU_02.jpg</strong>...
          A IA mapeia automaticamente.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
        <button type="button" onClick={onBack} className="btn-secondary" style={{ justifyContent: 'center' }}>
          ← Voltar
        </button>
        <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
          Próximo →
        </button>
      </div>
    </form>
  )
}

// ─── Step 3 — Canais de venda ─────────────────────────────────────────────────

function Step3({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: FormData
  onChange: (p: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const [error, setError] = useState('')

  function toggle(id: string) {
    const next = data.channels.includes(id)
      ? data.channels.filter(c => c !== id)
      : [...data.channels, id]
    onChange({ channels: next })
    if (next.length > 0) setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (data.channels.length === 0) { setError('Selecione pelo menos um canal de venda.'); return }
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {CHANNELS.map(ch => {
          const selected = data.channels.includes(ch.id)
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => toggle(ch.id)}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: `2px solid ${selected ? 'var(--blue)' : 'var(--border)'}`,
                background: selected ? 'rgba(37,99,235,0.1)' : 'var(--navy)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {selected && (
                <div style={{
                  position: 'absolute', top: 8, right: 10,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: 'white', fontWeight: 700,
                }}>✓</div>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, color: selected ? 'var(--white)' : 'var(--muted)', marginBottom: 4 }}>
                {ch.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                {ch.desc}
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" onClick={onBack} className="btn-secondary" style={{ justifyContent: 'center' }}>
          ← Voltar
        </button>
        <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
          Revisar →
        </button>
      </div>
    </form>
  )
}

// ─── Step 4 — Revisão ─────────────────────────────────────────────────────────

function Step4({
  data,
  onBack,
  onConfirm,
}: {
  data: FormData
  onBack: () => void
  onConfirm: () => void
}) {
  const channelNames = data.channels
    .map(id => CHANNELS.find(c => c.id === id)?.name ?? id)
    .join(', ')

  const rows: [string, string][] = [
    ['Planilha',          data.file?.name ?? '—'],
    ['Regime tributário', data.taxRegime],
    ['Google Drive',      data.driveLink],
    ['Canais',            channelNames || '—'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        background: 'var(--navy)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {rows.map(([label, value], i) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
              padding: '12px 16px',
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
            <span style={{
              fontSize: 13, color: 'var(--white)', fontWeight: 500,
              textAlign: 'right', wordBreak: 'break-all', maxWidth: '65%',
            }}>{value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onConfirm}
        style={{
          width: '100%', padding: '14px',
          borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          color: 'white', fontSize: 15, fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 0 24px rgba(22,163,74,0.35)',
          transition: 'opacity 0.2s',
        }}
      >
        Confirmar e gerar arquivos
      </button>

      <button type="button" onClick={onBack} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
        ← Voltar e editar
      </button>
    </div>
  )
}

// ─── Loading screen ───────────────────────────────────────────────────────────

const MENSAGENS_LOADING = [
  'Analisando seus produtos...',
  'Pesquisando especificações técnicas...',
  'Gerando títulos otimizados por canal...',
  'Gerando descrições específicas...',
  'Calculando preços e margens...',
  'Montando arquivos de upload...',
  'Quase lá...',
]

function LoadingScreen({ numProdutos, numCanais, concluido }: { numProdutos: number; numCanais: number; concluido: boolean }) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    if (concluido) return
    const totalMs = Math.max(numProdutos * numCanais * 15_000, 6000)
    const intervalo = totalMs / (MENSAGENS_LOADING.length - 1)
    const timers = MENSAGENS_LOADING.map((_, i) =>
      i > 0 ? setTimeout(() => setMsgIdx(i), intervalo * i) : null
    ).filter(Boolean) as ReturnType<typeof setTimeout>[]
    return () => timers.forEach(clearTimeout)
  }, [numProdutos, numCanais, concluido])

  const mensagem = concluido ? 'Concluído!' : MENSAGENS_LOADING[msgIdx]

  return (
    <>
      <style>{`
        @keyframes listify-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes listify-bounce {
          0%, 100% { left: 0%; }
          50%       { left: 65%; }
        }
        @keyframes listify-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
      <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
        <div style={{
          background: 'var(--navy-2)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '64px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}>
          {concluido ? (
            <div style={{
              width: 52, height: 52,
              borderRadius: '50%',
              background: 'rgba(74,222,128,0.15)',
              border: '2px solid #4ade80',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: '#4ade80',
            }}>✓</div>
          ) : (
            <div style={{
              width: 52, height: 52,
              border: '3px solid var(--border)',
              borderTop: '3px solid var(--blue)',
              borderRadius: '50%',
              animation: 'listify-spin 0.8s linear infinite',
            }} />
          )}
          <div style={{ width: '100%' }}>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 10, letterSpacing: '-0.01em' }}>
              {mensagem}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 24px' }}>
              {concluido ? 'Redirecionando para revisão...' : `${numProdutos} produto${numProdutos !== 1 ? 's' : ''} · Processando...`}
            </p>
            <div style={{ position: 'relative', width: '100%', background: 'var(--navy-3)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
              {concluido ? (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0,
                  background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                  borderRadius: 8,
                  animation: 'listify-fill 0.3s ease forwards',
                }} />
              ) : (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  width: '35%',
                  background: 'linear-gradient(90deg, var(--blue), var(--blue-glow))',
                  borderRadius: 8,
                  animation: 'listify-bounce 2s ease-in-out infinite',
                }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Pronto screen ────────────────────────────────────────────────────────────

function ProntoScreen({ numProdutos, onContinuar }: { numProdutos: number; onContinuar: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
      <div style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '64px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>
        <div style={{
          width: 72, height: 72,
          background: 'rgba(22,163,74,0.15)',
          border: '2px solid rgba(22,163,74,0.5)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, color: '#4ade80',
          fontWeight: 700,
        }}>✓</div>
        <div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--white)', marginBottom: 8, letterSpacing: '-0.01em' }}>
            Seus produtos foram processados!
          </h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0 }}>
            {numProdutos} produto{numProdutos !== 1 ? 's' : ''} {numProdutos !== 1 ? 'prontos' : 'pronto'} para revisão
          </p>
        </div>
        <button
          onClick={onContinuar}
          style={{
            padding: '14px 36px',
            borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white', fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(22,163,74,0.35)',
          }}
        >
          Revisar e baixar arquivos →
        </button>
      </div>
    </div>
  )
}

// ─── Gerando screen ───────────────────────────────────────────────────────────

const ETAPAS_GERANDO = [
  { mensagem: 'Analisando produtos...', delay: 0 },
  { mensagem: 'Pesquisando especificações técnicas...', delay: 20_000 },
  { mensagem: 'Gerando títulos otimizados por canal...', delay: 50_000 },
  { mensagem: 'Gerando descrições específicas por canal...', delay: 90_000 },
  { mensagem: 'Calculando preços e margens...', delay: 140_000 },
  { mensagem: 'Montando arquivos de upload...', delay: 190_000 },
  { mensagem: 'Finalizando...', delay: 230_000 },
]

function GerandoScreen({ concluido }: { concluido: boolean }) {
  const [etapaIdx, setEtapaIdx] = useState(0)

  useEffect(() => {
    if (concluido) {
      setEtapaIdx(ETAPAS_GERANDO.length)
      return
    }
    const timers = ETAPAS_GERANDO.map((e, i) =>
      i > 0 ? setTimeout(() => setEtapaIdx(i), e.delay) : null
    ).filter(Boolean) as ReturnType<typeof setTimeout>[]
    return () => timers.forEach(clearTimeout)
  }, [concluido])

  const mensagem = concluido
    ? 'Concluído!'
    : (ETAPAS_GERANDO[etapaIdx]?.mensagem ?? 'Finalizando...')

  return (
    <>
      <style>{`
        @keyframes listify-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes listify-bounce {
          0%, 100% { left: 0%; }
          50%       { left: 65%; }
        }
        @keyframes listify-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
      <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
        <div style={{
          background: 'var(--navy-2)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '64px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}>
          {concluido ? (
            <div style={{
              width: 48, height: 48,
              borderRadius: '50%',
              background: 'rgba(74,222,128,0.15)',
              border: '2px solid #4ade80',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: '#4ade80',
            }}>✓</div>
          ) : (
            <div style={{
              width: 48, height: 48,
              border: '3px solid var(--border)',
              borderTop: '3px solid #4ade80',
              borderRadius: '50%',
              animation: 'listify-spin 0.8s linear infinite',
            }} />
          )}
          <div style={{ width: '100%' }}>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 8, letterSpacing: '-0.01em' }}>
              {mensagem}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>
              {concluido ? 'Arquivos prontos' : 'Processando...'}
            </p>
            <div style={{ position: 'relative', width: '100%', background: 'var(--navy-3)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
              {concluido ? (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0,
                  background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                  borderRadius: 8,
                  animation: 'listify-fill 0.3s ease forwards',
                }} />
              ) : (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  width: '35%',
                  background: 'linear-gradient(90deg, var(--blue), var(--blue-glow))',
                  borderRadius: 8,
                  animation: 'listify-bounce 2s ease-in-out infinite',
                }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}



// ─── Textos section ───────────────────────────────────────────────────────────

function TextosSection({
  produto,
  canais,
  onUpdate,
}: {
  produto: ProdutoRevisao
  canais: string[]
  onUpdate: (campo: CampoTexto, valor: string) => void
}) {
  const baseInput: React.CSSProperties = {
    width: '100%',
    background: 'var(--navy)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: 'var(--white)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  }

  const campos: { campo: CampoTexto; label: string; max?: number; softMax?: number; rows?: number }[] = [
    ...(canais.includes('mercado_livre') ? [{ campo: 'titulo_ml'        as CampoTexto, label: 'Título ML',             max: 60   }] : []),
    ...(canais.includes('shopee')        ? [{ campo: 'titulo_shopee'    as CampoTexto, label: 'Título Shopee',         max: 120  }] : []),
    ...(canais.includes('amazon')        ? [{ campo: 'titulo_amazon'    as CampoTexto, label: 'Título Amazon',         max: 200  }] : []),
    ...(canais.includes('mercado_livre') ? [{ campo: 'descricao_ml'     as CampoTexto, label: 'Descrição ML',          softMax: 3000, rows: 3 }] : []),
    ...(canais.includes('shopee')        ? [{ campo: 'descricao_shopee' as CampoTexto, label: 'Descrição Shopee',      softMax: 3000, rows: 3 }] : []),
    ...(canais.includes('tiktok_shop')   ? [{ campo: 'descricao_tiktok' as CampoTexto, label: 'Descrição TikTok',      softMax: 500,  rows: 2 }] : []),
    ...(canais.includes('magalu')        ? [{ campo: 'descricao_magalu' as CampoTexto, label: 'Descrição Magalu',      softMax: 4000, rows: 3 }] : []),
    ...(canais.includes('bling')         ? [{ campo: 'descricao_bling'  as CampoTexto, label: 'Descrição Bling (ERP)', softMax: 2000, rows: 3 }] : []),
    ...(canais.includes('amazon')        ? [{ campo: 'descricao_amazon' as CampoTexto, label: 'Descrição Amazon',      softMax: 2000, rows: 3 }] : []),
    { campo: 'ncm'  as CampoTexto, label: 'NCM (8 dígitos)' },
    { campo: 'gtin' as CampoTexto, label: 'GTIN / EAN' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {campos.map(c => {
        const rawVal = produto[c.campo] ?? ''
        const val = c.campo === 'gtin' && (rawVal === '0' || rawVal === '') ? '' : rawVal
        const over = c.max !== undefined && val.length > c.max
        const borderColor = over ? 'rgba(248,113,113,0.6)' : 'var(--border)'
        const bg         = over ? 'rgba(248,113,113,0.05)' : 'var(--navy)'
        const counter = c.max ?? c.softMax
        return (
          <div key={c.campo}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{c.label}</span>
              {counter !== undefined && (
                <span style={{ fontSize: 11, color: over ? '#f87171' : 'var(--muted)', opacity: over ? 1 : 0.65 }}>
                  {val.length}/{counter}
                </span>
              )}
            </div>
            {c.rows ? (
              <textarea
                value={val}
                rows={c.rows}
                onChange={e => onUpdate(c.campo, e.target.value)}
                style={{ ...baseInput, border: `1px solid var(--border)`, background: 'var(--navy)', resize: 'vertical' }}
              />
            ) : (
              <input
                type="text"
                value={val}
                onChange={e => onUpdate(c.campo, e.target.value)}
                style={{ ...baseInput, border: `1px solid ${borderColor}`, background: bg }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Resultado screen ─────────────────────────────────────────────────────────

const ARQUIVO_INFO: Record<string, { label: string; filename: string }> = {
  shopee:  { label: 'Shopee',          filename: 'listify-shopee.xlsx' },
  ml:      { label: 'Mercado Livre',   filename: 'listify-ml.xlsx' },
  tiktok:  { label: 'TikTok Shop',     filename: 'listify-tiktok.csv' },
  bling:   { label: 'Bling (ERP)',     filename: 'listify-bling.csv' },
  magalu:  { label: 'Magazine Luiza',  filename: 'listify-magalu.csv' },
  amazon:  { label: 'Amazon Brasil',   filename: 'listify-amazon.csv' },
}

function ResultadoScreen({
  resultado,
  onCorrecao,
  onReset,
}: {
  resultado: ApiResultado
  onCorrecao: () => void
  onReset: () => void
}) {
  const arquivosGerados = Object.entries(resultado.arquivos).filter(([, b64]) => b64 !== null) as [string, string][]

  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <div style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52,
            background: 'rgba(22,163,74,0.15)',
            border: '1px solid rgba(22,163,74,0.35)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
            margin: '0 auto 16px',
          }}>✅</div>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 6, letterSpacing: '-0.01em' }}>
            Arquivos prontos para download
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            {resultado.produtos_processados} produto{resultado.produtos_processados !== 1 ? 's' : ''} processado{resultado.produtos_processados !== 1 ? 's' : ''}
          </p>
        </div>

        {arquivosGerados.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {arquivosGerados.map(([canal, b64]) => {
              const info = ARQUIVO_INFO[canal] ?? { label: canal, filename: `listify-${canal}.xlsx` }
              return (
                <div
                  key={canal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    background: 'var(--navy)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 18px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{info.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{info.filename}</div>
                  </div>
                  <button
                    onClick={() => downloadBase64(b64, info.filename)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '9px 16px',
                      background: 'rgba(37,99,235,0.12)',
                      border: '1px solid rgba(37,99,235,0.35)',
                      borderRadius: 8,
                      color: 'var(--blue-glow)',
                      fontSize: 13, fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    ⬇ Baixar {info.filename.endsWith('.csv') ? '.csv' : '.xlsx'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {resultado.alertas.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Alertas
            </p>
            {resultado.alertas.map((alerta, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: 'rgba(234,179,8,0.07)',
                  border: '1px solid rgba(234,179,8,0.25)',
                  borderRadius: 10,
                  padding: '11px 14px',
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <p style={{ fontSize: 13, color: '#fbbf24', lineHeight: 1.6, margin: 0 }}>{alerta}</p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onCorrecao}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Tive erros no upload →
        </button>

        <button
          onClick={onReset}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', opacity: 0.6, fontSize: 13 }}
        >
          Gerar novos produtos
        </button>
      </div>
    </div>
  )
}

// ─── Revisão screens ──────────────────────────────────────────────────────────

const numInputBase: React.CSSProperties = {
  background: 'var(--navy)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: 13,
  color: 'var(--white)',
  outline: 'none',
  textAlign: 'right' as const,
  width: '100%',
  boxSizing: 'border-box' as const,
}

const numInputWarn: React.CSSProperties = {
  ...numInputBase,
  border: '1px solid rgba(234,179,8,0.55)',
  background: 'rgba(234,179,8,0.05)',
}

// ─── ETAPA 1: Revisão de Preços ───────────────────────────────────────────────

type ModoAjuste = 'pct' | 'margem' | 'filtro'

function calcLucro(preco: number, custo: number, embalagem: number, comissao: number, imposto: number): number {
  return preco - custo - embalagem - preco * comissao - preco * imposto
}

function calcMargem(preco: number, custo: number, embalagem: number, comissao: number, imposto: number): number {
  if (preco <= 0) return 0
  return (calcLucro(preco, custo, embalagem, comissao, imposto) / preco) * 100
}

function precoParaMargem(custo: number, embalagem: number, comissao: number, imposto: number, targetMargem: number): number {
  const denom = 1 - targetMargem / 100 - comissao - imposto
  if (denom <= 0) return 0
  return Math.round(((custo + embalagem) / denom) * 100) / 100
}

function RevisaoPrecosScreen({
  editados,
  canais,
  regime,
  onProximo,
  onVoltar,
}: {
  editados: ProdutoRevisao[]
  canais: string[]
  regime: 'MEI' | 'SN'
  onProximo: (editados: ProdutoRevisao[]) => void
  onVoltar: () => void
}) {
  const [prods, setProds] = useState<ProdutoRevisao[]>(() => editados.map(p => ({ ...p })))
  const [modo, setModo] = useState<ModoAjuste>('pct')
  const [ajustePct, setAjustePct] = useState('')
  const [ajusteDir, setAjusteDir] = useState<'+' | '-'>('+')
  const [margemAlvo, setMargemAlvo] = useState('')
  const [canalAjuste, setCanalAjuste] = useState('todos')
  const [filtro, setFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [resetKey, setResetKey] = useState(0)
  const checkAllRef = useRef<HTMLInputElement>(null)

  const temML = canais.includes('mercado_livre')
  const temShopee = canais.includes('shopee')
  const temTikTok = canais.includes('tiktok_shop')
  const temBling = canais.includes('bling')
  const temMagalu = canais.includes('magalu')
  const temAmazon = canais.includes('amazon')

  const comissaoML = 0.115
  const comissaoShopee = 0.14
  const comissaoTikTok = 0.06
  const platfeeTikTok = 0.0299
  const comissaoMagalu = 0.14
  const comissaoAmazon = 0.15
  const imposto = regime === 'SN' ? 0.04 : 0

  const indicesFiltrados = (() => {
    if (busca.trim() === '') return prods.map((_, i) => i)
    const q = busca.trim().toLowerCase()
    return prods.reduce<number[]>((acc, p, i) => {
      if (p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) acc.push(i)
      return acc
    }, [])
  })()

  const todosSelecionadosVisiveis = indicesFiltrados.length > 0 && indicesFiltrados.every(i => selecionados.has(i))
  const algunsSelecionadosVisiveis = indicesFiltrados.some(i => selecionados.has(i)) && !todosSelecionadosVisiveis

  useEffect(() => {
    if (checkAllRef.current) checkAllRef.current.indeterminate = algunsSelecionadosVisiveis
  }, [algunsSelecionadosVisiveis])

  function update(i: number, campo: CampoNumerico, valor: string) {
    const num = parseFloat(valor)
    if (isNaN(num)) return
    setProds(prev => prev.map((p, j) => j === i ? { ...p, [campo]: num } : p))
  }

  function toggleSelecionado(i: number) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleTodos() {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (todosSelecionadosVisiveis) {
        indicesFiltrados.forEach(i => next.delete(i))
      } else {
        indicesFiltrados.forEach(i => next.add(i))
      }
      return next
    })
  }

  function prodsFiltrados(): number[] {
    if (modo !== 'filtro' || filtro.trim() === '') return prods.map((_, i) => i)
    const q = filtro.trim().toLowerCase()
    return prods.map((p, i) => (p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) ? i : -1).filter(i => i >= 0)
  }

  function aplicar() {
    const indices = selecionados.size > 0 ? [...selecionados] : prodsFiltrados()
    const all = canalAjuste === 'todos'
    setProds(prev => {
      const next = prev.map(p => ({ ...p }))
      if (modo === 'pct' || modo === 'filtro') {
        const pct = parseFloat(ajustePct)
        if (isNaN(pct) || pct <= 0) return next
        const factor = ajusteDir === '+' ? 1 + pct / 100 : 1 - pct / 100
        const r = (n: number) => Math.round(n * factor * 100) / 100
        for (const i of indices) {
          if ((all || canalAjuste === 'ml') && temML) next[i].preco_ml = r(next[i].preco_ml)
          if ((all || canalAjuste === 'shopee') && temShopee) next[i].preco_shopee = r(next[i].preco_shopee)
          if ((all || canalAjuste === 'tiktok_shop') && temTikTok) next[i].preco_tiktok = r(next[i].preco_tiktok ?? 0)
          if ((all || canalAjuste === 'bling') && temBling) next[i].preco_bling = r(next[i].preco_bling ?? 0)
          if ((all || canalAjuste === 'magalu') && temMagalu) next[i].preco_magalu = r(next[i].preco_magalu ?? 0)
          if ((all || canalAjuste === 'amazon') && temAmazon) next[i].preco_amazon = r(next[i].preco_amazon ?? 0)
        }
      } else if (modo === 'margem') {
        const m = parseFloat(margemAlvo)
        if (isNaN(m)) return next
        for (const i of indices) {
          const p = next[i]
          if ((all || canalAjuste === 'ml') && temML) next[i].preco_ml = precoParaMargem(p.custo, p.embalagem, comissaoML, imposto, m)
          if ((all || canalAjuste === 'shopee') && temShopee) next[i].preco_shopee = precoParaMargem(p.custo, p.embalagem, comissaoShopee, imposto, m)
          if ((all || canalAjuste === 'tiktok_shop') && temTikTok) next[i].preco_tiktok = precoParaMargem(p.custo, p.embalagem, platfeeTikTok, imposto, m)
          if ((all || canalAjuste === 'bling') && temBling) next[i].preco_bling = precoParaMargem(p.custo, p.embalagem, 0, imposto, m)
          if ((all || canalAjuste === 'magalu') && temMagalu) next[i].preco_magalu = precoParaMargem(p.custo, p.embalagem, comissaoMagalu, imposto, m)
          if ((all || canalAjuste === 'amazon') && temAmazon) next[i].preco_amazon = precoParaMargem(p.custo, p.embalagem, comissaoAmazon, imposto, m)
        }
      }
      return next
    })
    setSelecionados(new Set())
    setResetKey(k => k + 1)
  }

  const panelStyle: React.CSSProperties = {
    background: 'rgba(37,99,235,0.06)',
    border: '1px solid rgba(37,99,235,0.2)',
    borderRadius: 12,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  }

  const tabBtn = (m: ModoAjuste, label: string) => (
    <button
      type="button"
      onClick={() => setModo(m)}
      style={{
        padding: '5px 14px',
        borderRadius: 20,
        border: `1.5px solid ${modo === m ? 'var(--blue)' : 'var(--border)'}`,
        background: modo === m ? 'rgba(37,99,235,0.12)' : 'transparent',
        color: modo === m ? 'var(--blue-glow)' : 'var(--muted)',
        fontSize: 12, fontWeight: modo === m ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
      }}
    >{label}</button>
  )

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const mc = (m: number) => m >= 15 ? '#4ade80' : m >= 5 ? '#fbbf24' : '#f87171'

  const sTH = (left: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'sticky', left, zIndex: 4, background: 'var(--navy-3)', ...extra,
  })
  const sTD = (left: number, bg: string): React.CSSProperties => ({
    position: 'sticky', left, zIndex: 2, background: bg,
  })

  const priceCell = (val: number, campo: CampoNumerico, idx: number) => (
    <td style={{ padding: '7px 6px', verticalAlign: 'middle', minWidth: 100 }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--muted)', pointerEvents: 'none', userSelect: 'none' as const }}>R$</span>
        <input type="number" step="0.01" defaultValue={val.toFixed(2)}
          onChange={e => update(idx, campo, e.target.value)}
          onBlur={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) e.target.value = n.toFixed(2) }}
          style={{ ...numInputBase, width: '100%', paddingLeft: 26, textAlign: 'right' as const }} />
      </div>
    </td>
  )

  const valCell = (n: number, color?: string) => (
    <td style={{ padding: '7px 10px', verticalAlign: 'middle', textAlign: 'right' as const, minWidth: 90, whiteSpace: 'nowrap' as const }}>
      <span style={{ fontSize: 12, color: color ?? 'var(--muted)', fontWeight: color ? 600 : 400 }}>R$ {fmt(n)}</span>
    </td>
  )

  const pctCell = (pct: number, color: string) => (
    <td style={{ padding: '7px 10px', verticalAlign: 'middle', textAlign: 'right' as const, minWidth: 72, whiteSpace: 'nowrap' as const }}>
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
    </td>
  )

  const canaisOpcoes = [
    { value: 'todos', label: 'Todos os canais' },
    ...(temML     ? [{ value: 'ml',         label: 'Mercado Livre'   }] : []),
    ...(temShopee ? [{ value: 'shopee',      label: 'Shopee'         }] : []),
    ...(temTikTok ? [{ value: 'tiktok_shop', label: 'TikTok Shop'    }] : []),
    ...(temBling  ? [{ value: 'bling',       label: 'Bling (ERP)'    }] : []),
    ...(temMagalu ? [{ value: 'magalu',      label: 'Magazine Luiza' }] : []),
    ...(temAmazon ? [{ value: 'amazon',      label: 'Amazon Brasil'  }] : []),
  ]

  return (
    <div style={{ width: '100%', maxWidth: 1100 }}>
      <div style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Etapa 1 de 2</p>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 6, letterSpacing: '-0.01em' }}>
            Revisar preços
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
            Ajuste custos, embalagem e preços de venda. Lucro e margem são calculados automaticamente.
          </p>
        </div>

        {/* Bulk panel */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tabBtn('pct', 'Ajuste %')}
            {tabBtn('margem', 'Margem mínima')}
            {tabBtn('filtro', 'Por produto')}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' as const }}>Canal:</span>
            <select value={canalAjuste} onChange={e => setCanalAjuste(e.target.value)}
              style={{ ...numInputBase, padding: '6px 8px', cursor: 'pointer', fontSize: 12 }}>
              {canaisOpcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {(modo === 'pct' || modo === 'filtro') && (
              <>
                {modo === 'filtro' && (
                  <input type="text" placeholder="Nome ou SKU..." value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                    style={{ ...numInputBase, width: 180, textAlign: 'left' as const }} />
                )}
                <select value={ajusteDir} onChange={e => setAjusteDir(e.target.value as '+' | '-')}
                  style={{ ...numInputBase, width: 52, padding: '6px 8px', cursor: 'pointer' }}>
                  <option value="+">+</option>
                  <option value="-">−</option>
                </select>
                <input type="number" min="0" step="0.5" placeholder="0" value={ajustePct}
                  onChange={e => setAjustePct(e.target.value)}
                  style={{ ...numInputBase, width: 72 }} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>%</span>
              </>
            )}
            {modo === 'margem' && (
              <>
                <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' as const }}>Margem:</span>
                <input type="number" min="0" max="100" step="0.5" placeholder="20" value={margemAlvo}
                  onChange={e => setMargemAlvo(e.target.value)}
                  style={{ ...numInputBase, width: 80 }} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>%</span>
              </>
            )}
            <button onClick={aplicar} style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: 'var(--blue)', color: 'white', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0,
            }}>Aplicar</button>
          </div>
        </div>

        {/* Search + selection bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...numInputBase, textAlign: 'left' as const, flex: 1, maxWidth: 300 }}
          />
          {busca.trim() !== '' && (
            <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' as const }}>
              {indicesFiltrados.length} resultado{indicesFiltrados.length !== 1 ? 's' : ''}
            </span>
          )}
          {selecionados.size > 0 && (
            <span style={{ fontSize: 12, color: 'var(--blue-glow)', whiteSpace: 'nowrap' as const }}>
              {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Price table */}
        <div key={resetKey} style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'auto' as const }}>
            <thead>
              <tr style={{ background: 'var(--navy-3)' }}>
                <th rowSpan={2} style={{ ...TH_STYLE, ...sTH(0), width: 36, padding: '10px 8px', verticalAlign: 'bottom', textAlign: 'center' as const }}>
                  <input ref={checkAllRef} type="checkbox" checked={todosSelecionadosVisiveis} onChange={toggleTodos}
                    style={{ cursor: 'pointer', accentColor: 'var(--blue)', width: 14, height: 14 }} />
                </th>
                <th rowSpan={2} style={{ ...TH_STYLE, ...sTH(36), textAlign: 'left', paddingLeft: 14, minWidth: 180, verticalAlign: 'bottom' }}>Produto</th>
                <th rowSpan={2} style={{ ...TH_STYLE, ...sTH(216), minWidth: 90, verticalAlign: 'bottom' }}>Custo (R$)</th>
                <th rowSpan={2} style={{ ...TH_STYLE, ...sTH(306), minWidth: 100, verticalAlign: 'bottom' }}>Embalagem</th>
                {temML     && <th colSpan={5 + (imposto > 0 ? 1 : 0)} style={{ ...TH_STYLE, textAlign: 'center', color: '#60a5fa', background: 'rgba(37,99,235,0.12)',    borderBottom: '2px solid rgba(37,99,235,0.5)',    borderLeft: '1px solid rgba(37,99,235,0.3)',    borderRight: '1px solid rgba(37,99,235,0.3)',    whiteSpace: 'nowrap' }}>Mercado Livre</th>}
                {temShopee && <th colSpan={5 + (imposto > 0 ? 1 : 0)} style={{ ...TH_STYLE, textAlign: 'center', color: '#fb923c', background: 'rgba(249,115,22,0.1)',    borderBottom: '2px solid rgba(249,115,22,0.45)',  borderLeft: '1px solid rgba(249,115,22,0.25)',   borderRight: '1px solid rgba(249,115,22,0.25)',   whiteSpace: 'nowrap' }}>Shopee</th>}
                {temTikTok && <th colSpan={6 + (imposto > 0 ? 1 : 0)} style={{ ...TH_STYLE, textAlign: 'center', color: '#fb7185', background: 'rgba(244,63,94,0.08)',    borderBottom: '2px solid rgba(244,63,94,0.5)',    borderLeft: '1px solid rgba(244,63,94,0.3)',    borderRight: '1px solid rgba(244,63,94,0.3)',    whiteSpace: 'nowrap' }}>TikTok Shop</th>}
                {temBling  && <th colSpan={4}                         style={{ ...TH_STYLE, textAlign: 'center', color: '#94a3b8', background: 'rgba(148,163,184,0.06)',  borderBottom: '2px solid rgba(148,163,184,0.4)',  borderLeft: '1px solid rgba(148,163,184,0.25)',  borderRight: '1px solid rgba(148,163,184,0.25)',  whiteSpace: 'nowrap' }}>Bling (ERP)</th>}
                {temMagalu && <th colSpan={5 + (imposto > 0 ? 1 : 0)} style={{ ...TH_STYLE, textAlign: 'center', color: '#38bdf8', background: 'rgba(14,165,233,0.08)',   borderBottom: '2px solid rgba(14,165,233,0.5)',   borderLeft: '1px solid rgba(14,165,233,0.25)',   borderRight: '1px solid rgba(14,165,233,0.25)',   whiteSpace: 'nowrap' }}>Magazine Luiza</th>}
                {temAmazon && <th colSpan={5 + (imposto > 0 ? 1 : 0)} style={{ ...TH_STYLE, textAlign: 'center', color: '#f59e0b', background: 'rgba(245,158,11,0.08)',   borderBottom: '2px solid rgba(245,158,11,0.5)',   borderLeft: '1px solid rgba(245,158,11,0.25)',   borderRight: '1px solid rgba(245,158,11,0.25)',   whiteSpace: 'nowrap' }}>Amazon Brasil</th>}
              </tr>
              <tr style={{ background: 'var(--navy-3)' }}>
                {temML && <><th style={{ ...TH_STYLE, borderLeft: '1px solid rgba(37,99,235,0.3)' }}>Preço</th><th style={TH_STYLE}>Comissão</th>{imposto > 0 && <th style={TH_STYLE}>Imposto</th>}<th style={TH_STYLE}>Custo Total</th><th style={TH_STYLE}>Lucro</th><th style={{ ...TH_STYLE, borderRight: '1px solid rgba(37,99,235,0.3)' }}>Margem</th></>}
                {temShopee && <><th style={{ ...TH_STYLE, borderLeft: '1px solid rgba(249,115,22,0.25)' }}>Preço</th><th style={TH_STYLE}>Comissão</th>{imposto > 0 && <th style={TH_STYLE}>Imposto</th>}<th style={TH_STYLE}>Custo Total</th><th style={TH_STYLE}>Lucro</th><th style={{ ...TH_STYLE, borderRight: '1px solid rgba(249,115,22,0.25)' }}>Margem</th></>}
                {temTikTok && <><th style={{ ...TH_STYLE, borderLeft: '1px solid rgba(244,63,94,0.3)' }}>Preço Promo</th><th style={TH_STYLE}>Comissão</th><th style={TH_STYLE}>Taxa Pgto</th>{imposto > 0 && <th style={TH_STYLE}>Imposto</th>}<th style={TH_STYLE}>Custo Total</th><th style={TH_STYLE}>Lucro</th><th style={{ ...TH_STYLE, borderRight: '1px solid rgba(244,63,94,0.3)' }}>Margem</th></>}
                {temBling  && <><th style={{ ...TH_STYLE, borderLeft: '1px solid rgba(148,163,184,0.25)' }}>Preço</th><th style={TH_STYLE}>Custo Total</th><th style={TH_STYLE}>Lucro</th><th style={{ ...TH_STYLE, borderRight: '1px solid rgba(148,163,184,0.25)' }}>Margem</th></>}
                {temMagalu && <><th style={{ ...TH_STYLE, borderLeft: '1px solid rgba(14,165,233,0.25)' }}>Preço</th><th style={TH_STYLE}>Comissão</th>{imposto > 0 && <th style={TH_STYLE}>Imposto</th>}<th style={TH_STYLE}>Custo Total</th><th style={TH_STYLE}>Lucro</th><th style={{ ...TH_STYLE, borderRight: '1px solid rgba(14,165,233,0.25)' }}>Margem</th></>}
                {temAmazon && <><th style={{ ...TH_STYLE, borderLeft: '1px solid rgba(245,158,11,0.25)' }}>Preço</th><th style={TH_STYLE}>Comissão</th>{imposto > 0 && <th style={TH_STYLE}>Imposto</th>}<th style={TH_STYLE}>Custo Total</th><th style={TH_STYLE}>Lucro</th><th style={{ ...TH_STYLE, borderRight: '1px solid rgba(245,158,11,0.25)' }}>Margem</th></>}
              </tr>
            </thead>
            <tbody>
              {indicesFiltrados.map((idx, rowIdx) => {
                const p = prods[idx]
                const isSel = selecionados.has(idx)
                const isLast = rowIdx === indicesFiltrados.length - 1
                const rowBg = isSel ? '#1a2744' : 'var(--navy-2)'

                const comisML = p.preco_ml * comissaoML
                const impML   = p.preco_ml * imposto
                const ctML    = p.custo + p.embalagem + comisML + impML
                const lucroML = p.preco_ml - ctML
                const mML     = p.preco_ml > 0 ? (lucroML / p.preco_ml) * 100 : 0

                const comisSH = p.preco_shopee * comissaoShopee
                const impSH   = p.preco_shopee * imposto
                const ctSH    = p.custo + p.embalagem + comisSH + impSH
                const lucroSH = p.preco_shopee - ctSH
                const mSH     = p.preco_shopee > 0 ? (lucroSH / p.preco_shopee) * 100 : 0

                const precoTT = p.preco_tiktok ?? 0
                const taxaTT  = precoTT * platfeeTikTok
                const impTT   = precoTT * imposto
                const ctTT    = p.custo + p.embalagem + taxaTT + impTT
                const lucroTT = precoTT - ctTT
                const mTT     = precoTT > 0 ? (lucroTT / precoTT) * 100 : 0

                const precoBL = p.preco_bling ?? 0
                const ctBL    = p.custo + p.embalagem
                const lucroBL = precoBL - ctBL
                const mBL     = precoBL > 0 ? (lucroBL / precoBL) * 100 : 0

                const precoMG = p.preco_magalu ?? 0
                const comisMG = precoMG * comissaoMagalu
                const impMG   = precoMG * imposto
                const ctMG    = p.custo + p.embalagem + comisMG + impMG
                const lucroMG = precoMG - ctMG
                const mMG     = precoMG > 0 ? (lucroMG / precoMG) * 100 : 0

                const precoAZ = p.preco_amazon ?? 0
                const comisAZ = precoAZ * comissaoAmazon
                const impAZ   = precoAZ * imposto
                const ctAZ    = p.custo + p.embalagem + comisAZ + impAZ
                const lucroAZ = precoAZ - ctAZ
                const mAZ     = precoAZ > 0 ? (lucroAZ / precoAZ) * 100 : 0

                return (
                  <tr key={p.sku} style={{ borderBottom: !isLast ? '1px solid var(--border)' : 'none', background: rowBg }}>
                    <td style={{ ...sTD(0, rowBg), padding: '10px 8px', textAlign: 'center' as const, verticalAlign: 'middle' }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelecionado(idx)}
                        style={{ cursor: 'pointer', accentColor: 'var(--blue)', width: 14, height: 14 }} />
                    </td>
                    <td style={{ ...sTD(36, rowBg), padding: '10px 14px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', lineHeight: 1.3 }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>SKU: {p.sku}</div>
                    </td>
                    <td style={{ ...sTD(216, rowBg), padding: '10px 10px', textAlign: 'right' as const, verticalAlign: 'middle', whiteSpace: 'nowrap' as const }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>R$ {fmt(p.custo)}</span>
                    </td>
                    <td style={{ ...sTD(306, rowBg), padding: '7px 6px', verticalAlign: 'middle' }}>
                      <div style={{ position: 'relative', minWidth: 90 }}>
                        <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--muted)', pointerEvents: 'none', userSelect: 'none' as const }}>R$</span>
                        <input type="number" step="0.01" defaultValue={p.embalagem.toFixed(2)}
                          onChange={e => update(idx, 'embalagem', e.target.value)}
                          onBlur={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) e.target.value = n.toFixed(2) }}
                          style={{ ...numInputBase, width: '100%', paddingLeft: 26, textAlign: 'right' as const }} />
                      </div>
                    </td>

                    {temML && <>{priceCell(p.preco_ml, 'preco_ml', idx)}{valCell(comisML)}{imposto > 0 && valCell(impML)}{valCell(ctML)}{valCell(lucroML, lucroML >= 0 ? '#4ade80' : '#f87171')}{pctCell(mML, mc(mML))}</>}
                    {temShopee && <>{priceCell(p.preco_shopee, 'preco_shopee', idx)}{valCell(comisSH)}{imposto > 0 && valCell(impSH)}{valCell(ctSH)}{valCell(lucroSH, lucroSH >= 0 ? '#4ade80' : '#f87171')}{pctCell(mSH, mc(mSH))}</>}
                    {temTikTok && <>{priceCell(precoTT, 'preco_tiktok', idx)}{valCell(0)}{valCell(taxaTT)}{imposto > 0 && valCell(impTT)}{valCell(ctTT)}{valCell(lucroTT, lucroTT >= 0 ? '#4ade80' : '#f87171')}{pctCell(mTT, mc(mTT))}</>}
                    {temBling  && <>{priceCell(precoBL, 'preco_bling',  idx)}{valCell(ctBL)}{valCell(lucroBL, lucroBL >= 0 ? '#4ade80' : '#f87171')}{pctCell(mBL, mc(mBL))}</>}
                    {temMagalu && <>{priceCell(precoMG, 'preco_magalu', idx)}{valCell(comisMG)}{imposto > 0 && valCell(impMG)}{valCell(ctMG)}{valCell(lucroMG, lucroMG >= 0 ? '#4ade80' : '#f87171')}{pctCell(mMG, mc(mMG))}</>}
                    {temAmazon && <>{priceCell(precoAZ, 'preco_amazon', idx)}{valCell(comisAZ)}{imposto > 0 && valCell(impAZ)}{valCell(ctAZ)}{valCell(lucroAZ, lucroAZ >= 0 ? '#4ade80' : '#f87171')}{pctCell(mAZ, mc(mAZ))}</>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onVoltar} className="btn-secondary" style={{ justifyContent: 'center' }}>
            ← Voltar
          </button>
          <button
            onClick={() => onProximo(prods)}
            style={{
              padding: '14px',
              borderRadius: 10, border: 'none',
              background: 'var(--blue)',
              color: 'white', fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(37,99,235,0.25)',
            }}
          >
            Próximo: Revisar dimensões →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ETAPA 2: Revisão de Dimensões ────────────────────────────────────────────

function RevisaoDimensoesScreen({
  editadosInit,
  canais,
  regime,
  onConfirmar,
  onVoltar,
}: {
  editadosInit: ProdutoRevisao[]
  canais: string[]
  regime: 'MEI' | 'SN'
  onConfirmar: (editados: ProdutoRevisao[]) => void
  onVoltar: (editados: ProdutoRevisao[]) => void
}) {
  const [editados, setEditados] = useState<ProdutoRevisao[]>(() => editadosInit.map(p => ({ ...p })))
  const [ocultarAlertas, setOcultarAlertas] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  function update(i: number, campo: CampoNumerico, valor: string) {
    const num = parseFloat(valor)
    if (isNaN(num)) return
    setEditados(prev => prev.map((p, j) => j === i ? { ...p, [campo]: num } : p))
  }

  function updateTexto(i: number, campo: CampoTexto, valor: string) {
    setEditados(prev => prev.map((p, j) => j === i ? { ...p, [campo]: valor } : p))
  }

  const unico = editados.length === 1
  const temAlertas = editados.some(p => p.confianca_dimensoes === 'media')

  return (
    <div style={{ width: '100%', maxWidth: unico ? 560 : 820 }}>
      <div style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Etapa 2 de 2</p>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 6, letterSpacing: '-0.01em' }}>
              Revisar dimensões
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
              Confira peso e dimensões antes de gerar os arquivos.
              {temAlertas && !ocultarAlertas && (
                <span style={{ color: '#fbbf24' }}> Campos em amarelo têm confiança média.</span>
              )}
            </p>
          </div>
          {temAlertas && (
            <button
              type="button"
              onClick={() => setOcultarAlertas(o => !o)}
              style={{
                padding: '6px 14px', borderRadius: 20, flexShrink: 0,
                border: `1.5px solid ${ocultarAlertas ? 'var(--border)' : 'rgba(234,179,8,0.45)'}`,
                background: ocultarAlertas ? 'transparent' : 'rgba(234,179,8,0.07)',
                color: ocultarAlertas ? 'var(--muted)' : '#fbbf24',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {ocultarAlertas ? 'Mostrar alertas ⚠️' : 'Ocultar alertas ⚠️'}
            </button>
          )}
        </div>

        {unico ? (
          <CardUnico
            key={resetKey}
            produto={editados[0]}
            canais={canais}
            regime={regime}
            showPrecos={false}
            ocultarAlertas={ocultarAlertas}
            onUpdate={(campo, val) => update(0, campo, val)}
            onUpdateTexto={(campo, val) => updateTexto(0, campo, val)}
          />
        ) : (
          <TabelaProdutos
            key={resetKey}
            produtos={editados}
            canais={canais}
            regime={regime}
            showPrecos={false}
            ocultarAlertas={ocultarAlertas}
            onUpdate={update}
            onUpdateTexto={updateTexto}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          <button type="button" onClick={() => onVoltar(editados)} className="btn-secondary" style={{ justifyContent: 'center' }}>
            ← Voltar
          </button>
          <button
            onClick={() => onConfirmar(editados)}
            style={{
              padding: '14px',
              borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white', fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(22,163,74,0.3)',
            }}
          >
            Confirmar e baixar arquivos
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card layout (1 produto) ──────────────────────────────────────────────────

function BulletPointsSection({
  produto,
  onUpdateTexto,
}: {
  produto: ProdutoRevisao
  onUpdateTexto: (campo: CampoTexto, valor: string) => void
}) {
  const baseInput: React.CSSProperties = {
    width: '100%',
    background: 'var(--navy)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: 'var(--white)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  }
  const bullets: { campo: CampoTexto; label: string }[] = [
    { campo: 'bullet_point1', label: 'Bullet 1 — Benefício principal + spec técnica' },
    { campo: 'bullet_point2', label: 'Bullet 2' },
    { campo: 'bullet_point3', label: 'Bullet 3' },
    { campo: 'bullet_point4', label: 'Bullet 4' },
    { campo: 'bullet_point5', label: 'Bullet 5' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {bullets.map(b => (
        <div key={b.campo}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{b.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.65 }}>
              {(produto[b.campo] ?? '').length}/500
            </span>
          </div>
          <textarea
            value={produto[b.campo] ?? ''}
            rows={2}
            onChange={e => onUpdateTexto(b.campo, e.target.value)}
            style={baseInput}
          />
        </div>
      ))}
    </div>
  )
}

function CardUnico({
  produto,
  canais,
  regime,
  showPrecos = true,
  ocultarAlertas = false,
  onUpdate,
  onUpdateTexto,
}: {
  produto: ProdutoRevisao
  canais: string[]
  regime: 'MEI' | 'SN'
  showPrecos?: boolean
  ocultarAlertas?: boolean
  onUpdate: (campo: CampoNumerico, valor: string) => void
  onUpdateTexto: (campo: CampoTexto, valor: string) => void
}) {
  const [textosAbertos, setTextosAbertos] = useState(false)
  const [bulletsAbertos, setBulletsAbertos] = useState(false)
  const warn = produto.confianca_dimensoes === 'media' && !ocultarAlertas

  const precos: [CampoNumerico, string, 'ml' | 'shopee'][] = [
    ...(canais.includes('mercado_livre') ? [['preco_ml',    'Preço ML (R$)',     'ml']     as [CampoNumerico, string, 'ml' | 'shopee']] : []),
    ...(canais.includes('shopee')        ? [['preco_shopee','Preço Shopee (R$)', 'shopee'] as [CampoNumerico, string, 'ml' | 'shopee']] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--navy)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px',
      }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)', margin: 0 }}>{produto.nome}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>SKU: {produto.sku}</p>
      </div>

      {showPrecos && precos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: precos.length === 1 ? '1fr' : '1fr 1fr', gap: 12 }}>
          {precos.map(([campo, label, canal]) => (
            <div key={campo}>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px' }}>
                {label}
              </p>
              <input
                type="number"
                step="0.01"
                defaultValue={produto[campo]}
                onChange={e => onUpdate(campo, e.target.value)}
                style={numInputBase}
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <p style={{ fontSize: 12, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: warn ? '#fbbf24' : 'var(--muted)' }}>Peso (g)</span>
          {warn && <span title="Confiança média">⚠️</span>}
        </p>
        <input
          type="number"
          step="1"
          defaultValue={produto.peso_g}
          onChange={e => onUpdate('peso_g', e.target.value)}
          style={warn ? numInputWarn : numInputBase}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {([
          ['comprimento_cm', 'Comprimento (cm)'],
          ['largura_cm',     'Largura (cm)'],
          ['altura_cm',      'Altura (cm)'],
        ] as [CampoNumerico, string][]).map(([campo, label]) => (
          <div key={campo}>
            <p style={{ fontSize: 12, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: warn ? '#fbbf24' : 'var(--muted)' }}>{label}</span>
              {warn && <span title="Confiança média" style={{ fontSize: 11 }}>⚠️</span>}
            </p>
            <input
              type="number"
              step="0.1"
              defaultValue={produto[campo]}
              onChange={e => onUpdate(campo, e.target.value)}
              style={warn ? numInputWarn : numInputBase}
            />
          </div>
        ))}
      </div>

      <div style={collapsibleBoxStyle}>
        <button type="button" onClick={() => setTextosAbertos(o => !o)} style={collapsibleTriggerStyle}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-glow)', display: 'flex', alignItems: 'center', gap: 6 }}>
            ✏️ Textos gerados pela IA
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {textosAbertos ? 'Fechar ▲' : 'Ver e editar ▼'}
          </span>
        </button>
        {textosAbertos && (
          <div style={{ padding: '4px 16px 20px' }}>
            <TextosSection produto={produto} canais={canais} onUpdate={onUpdateTexto} />
          </div>
        )}
      </div>
      {canais.includes('amazon') && (
        <div style={collapsibleBoxStyle}>
          <button type="button" onClick={() => setBulletsAbertos(o => !o)} style={collapsibleTriggerStyle}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
              📦 Bullet Points Amazon
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {bulletsAbertos ? 'Fechar ▲' : 'Ver e editar ▼'}
            </span>
          </button>
          {bulletsAbertos && (
            <div style={{ padding: '4px 16px 20px' }}>
              <BulletPointsSection produto={produto} onUpdateTexto={onUpdateTexto} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tabela layout (2+ produtos) ──────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  padding: '10px 10px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
}

function TabelaProdutos({
  produtos,
  canais,
  regime,
  showPrecos = true,
  ocultarAlertas = false,
  onUpdate,
  onUpdateTexto,
}: {
  produtos: ProdutoRevisao[]
  canais: string[]
  regime: 'MEI' | 'SN'
  showPrecos?: boolean
  ocultarAlertas?: boolean
  onUpdate: (i: number, campo: CampoNumerico, valor: string) => void
  onUpdateTexto: (i: number, campo: CampoTexto, valor: string) => void
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  function toggleTextos(sku: string) {
    setAbertos(prev => {
      const next = new Set(prev)
      next.has(sku) ? next.delete(sku) : next.add(sku)
      return next
    })
  }

  const allCols: { campo: CampoNumerico; label: string; step: string; width: number; canal?: 'ml' | 'shopee'; onlyIf?: boolean }[] = [
    { campo: 'preco_ml',       label: 'Preço ML',    step: '0.01', width: 90,  canal: 'ml',     onlyIf: showPrecos && canais.includes('mercado_livre') },
    { campo: 'preco_shopee',   label: 'Preço Shopee',step: '0.01', width: 105, canal: 'shopee', onlyIf: showPrecos && canais.includes('shopee') },
    { campo: 'peso_g',         label: 'Peso (g)',     step: '1',    width: 82  },
    { campo: 'comprimento_cm', label: 'Comp. (cm)',   step: '0.1',  width: 88  },
    { campo: 'largura_cm',     label: 'Larg. (cm)',   step: '0.1',  width: 82  },
    { campo: 'altura_cm',      label: 'Alt. (cm)',    step: '0.1',  width: 78  },
  ]
  const cols = allCols.filter(c => c.onlyIf !== false)

  const dimCampos = new Set<CampoNumerico>(['peso_g','comprimento_cm','largura_cm','altura_cm'])

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
        <thead>
          <tr style={{ background: 'var(--navy-3)' }}>
            <th style={{ ...TH_STYLE, textAlign: 'left', paddingLeft: 14, width: 180 }}>Produto</th>
            {cols.map(c => (
              <th key={c.campo} style={{ ...TH_STYLE, width: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {produtos.map((p, i) => {
            const warn = p.confianca_dimensoes === 'media' && !ocultarAlertas
            const expanded = abertos.has(p.sku)
            const isLast = i === produtos.length - 1
            return (
              <Fragment key={p.sku}>
                <tr style={{ borderBottom: (!expanded && !isLast) ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', lineHeight: 1.4 }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>SKU: {p.sku}</div>
                    <button
                      type="button"
                      onClick={() => toggleTextos(p.sku)}
                      style={{
                        marginTop: 6, background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11, color: 'var(--blue-glow)', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      {expanded ? '▲ Fechar textos' : '▼ Ver textos'}
                    </button>
                  </td>
                  {cols.map(c => {
                    const isDim = dimCampos.has(c.campo)
                    const estilo = isDim && warn ? numInputWarn : numInputBase
                    return (
                      <td key={c.campo} style={{ padding: '8px 8px', verticalAlign: 'middle' }}>
                        <div style={{ position: 'relative' }}>
                          {isDim && warn && (
                            <span
                              title="Confiança média"
                              style={{ position: 'absolute', left: -18, top: '50%', transform: 'translateY(-50%)', fontSize: 11 }}
                            >⚠️</span>
                          )}
                          <input
                            type="number"
                            step={c.step}
                            defaultValue={p[c.campo]}
                            onChange={e => onUpdate(i, c.campo, e.target.value)}
                            style={estilo}
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
                {expanded && (
                  <tr style={{ borderBottom: !isLast ? '1px solid var(--border)' : 'none' }}>
                    <td
                      colSpan={cols.length + 1}
                      style={{
                        padding: '16px 20px 20px',
                        background: 'rgba(37,99,235,0.03)',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ✏️ Textos gerados pela IA — {p.nome}
                      </p>
                      <TextosSection produto={p} canais={canais} onUpdate={(campo, val) => onUpdateTexto(i, campo, val)} />
                      {canais.includes('amazon') && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', margin: '20px 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            📦 Bullet Points Amazon
                          </p>
                          <BulletPointsSection produto={p} onUpdateTexto={(campo, val) => onUpdateTexto(i, campo, val)} />
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Correção screen (chat) ───────────────────────────────────────────────────

function CorrecaoScreen({
  resultado,
  onVoltar,
}: {
  resultado: ApiResultado
  onVoltar: () => void
}) {
  const canaisDisponiveis: { id: 'shopee' | 'ml'; label: string }[] = [
    ...(resultado.arquivos.shopee ? [{ id: 'shopee' as const, label: 'Shopee' }] : []),
    ...(resultado.arquivos.ml    ? [{ id: 'ml'     as const, label: 'Mercado Livre' }] : []),
  ]

  const [canal, setCanal] = useState<'shopee' | 'ml'>(canaisDisponiveis[0]?.id ?? 'shopee')
  const [mensagens, setMensagens] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: 'Olá! Descreva o que aconteceu no upload, faça uma pergunta sobre um erro específico, ou anexe o relatório de erros do marketplace para correção automática.',
  }])
  const [input, setInput] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ultimoTextoRef = useRef('')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens, enviando])

  async function enviar() {
    const texto = input.trim()
    if (!texto && !arquivo) return

    const userMsg: ChatMsg = {
      role: 'user',
      content: texto || `Arquivo anexado: ${arquivo!.name}`,
      arquivoNome: arquivo?.name,
    }
    setMensagens(prev => [...prev, userMsg])
    setInput('')
    if (texto) ultimoTextoRef.current = texto
    const arquivoAtual = arquivo
    setArquivo(null)
    setEnviando(true)

    try {
      const bodyObj: Record<string, string> = { canal }
      if (texto) bodyObj.mensagem = texto
      if (arquivoAtual) bodyObj.arquivo_base64 = await fileToBase64(arquivoAtual)

      const res = await fetch('/api/fix-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
      })
      if (res.status === 401) throw new Error('Sessão expirada. Recarregue a página.')
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Erro ${res.status}`)
      }
      const data: CorrecaoApiResponse = await res.json()
      setMensagens(prev => [...prev, {
        role: 'assistant',
        content: data.mensagem,
        arquivo_corrigido: data.arquivo_corrigido ?? undefined,
        canal,
      }])
    } catch (err) {
      setMensagens(prev => [...prev, {
        role: 'assistant',
        content: `Erro: ${err instanceof Error ? err.message : 'Falha na comunicação com o servidor.'}`,
      }])
    } finally {
      setEnviando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  async function corrigirArquivoGerado() {
    const arquivoB64 = resultado.arquivos[canal]
    if (!arquivoB64 || enviando) return
    const canalLabel = canal === 'shopee' ? 'Shopee' : 'Mercado Livre'
    setMensagens(prev => [...prev, {
      role: 'user' as const,
      content: `Corrija minha planilha do ${canalLabel} com base nos erros descritos acima.`,
    }])
    setEnviando(true)
    try {
      const res = await fetch('/api/fix-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal, mensagem: ultimoTextoRef.current, arquivo_base64: arquivoB64 }),
      })
      if (res.status === 401) throw new Error('Sessão expirada. Recarregue a página.')
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Erro ${res.status}`)
      }
      const data: CorrecaoApiResponse = await res.json()
      setMensagens(prev => [...prev, {
        role: 'assistant' as const,
        content: data.mensagem,
        arquivo_corrigido: data.arquivo_corrigido ?? undefined,
        canal,
      }])
    } catch (err) {
      setMensagens(prev => [...prev, {
        role: 'assistant' as const,
        content: `Erro: ${err instanceof Error ? err.message : 'Falha na comunicação com o servidor.'}`,
      }])
    } finally {
      setEnviando(false)
    }
  }

  const canSend = (input.trim() !== '' || arquivo !== null) && !enviando

  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <button
        type="button"
        onClick={onVoltar}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 20, padding: 0,
        }}
      >
        ← Voltar aos downloads
      </button>

      <div style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '28px 28px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 6, letterSpacing: '-0.01em' }}>
            O que aconteceu no upload?
          </h2>
          {canaisDisponiveis.length > 1 ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {canaisDisponiveis.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCanal(c.id)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 20,
                    border: `1.5px solid ${canal === c.id ? 'var(--blue)' : 'var(--border)'}`,
                    background: canal === c.id ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: canal === c.id ? 'var(--blue-glow)' : 'var(--muted)',
                    fontSize: 12, fontWeight: canal === c.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >{c.label}</button>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
              Canal: {canaisDisponiveis[0]?.label ?? canal}
            </p>
          )}
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: 380,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {mensagens.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}>
              <div style={{
                maxWidth: '85%',
                background: m.role === 'user' ? 'rgba(37,99,235,0.15)' : 'var(--navy)',
                border: `1px solid ${m.role === 'user' ? 'rgba(37,99,235,0.35)' : 'var(--border)'}`,
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--white)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}>
                {m.arquivoNome && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--muted)', fontSize: 12 }}>
                    📎 {m.arquivoNome}
                  </div>
                )}
                {m.content}
              </div>
              {m.arquivo_corrigido && m.canal && (
                <button
                  onClick={() => downloadBase64(m.arquivo_corrigido!, `listify-${m.canal}-corrigido.xlsx`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    background: 'rgba(22,163,74,0.12)',
                    border: '1px solid rgba(22,163,74,0.35)',
                    borderRadius: 8,
                    color: '#4ade80',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ⬇ Baixar arquivo corrigido
                </button>
              )}
              {m.role === 'assistant' && i > 0 && !m.arquivo_corrigido && resultado.arquivos[canal] !== null && (
                <button
                  onClick={corrigirArquivoGerado}
                  disabled={enviando}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px',
                    background: 'rgba(37,99,235,0.1)',
                    border: '1px solid rgba(37,99,235,0.3)',
                    borderRadius: 8,
                    color: enviando ? 'var(--muted)' : 'var(--blue-glow)',
                    fontSize: 12, fontWeight: 600,
                    cursor: enviando ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  🔧 Corrigir minha planilha gerada
                </button>
              )}
            </div>
          ))}
          {enviando && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{
                background: 'var(--navy)',
                border: '1px solid var(--border)',
                borderRadius: '16px 16px 16px 4px',
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--muted)',
              }}>
                Analisando...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {arquivo && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(37,99,235,0.08)',
              border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: 8,
              padding: '5px 10px',
              alignSelf: 'flex-start',
            }}>
              <span style={{ fontSize: 12, color: 'var(--blue-glow)' }}>📎 {arquivo.name}</span>
              <button
                type="button"
                onClick={() => setArquivo(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: 0, lineHeight: 1 }}
              >×</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setArquivo(f); e.target.value = '' } }}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Anexar arquivo de erros (.xlsx)"
              style={{
                width: 38, height: 38,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--navy)',
                color: 'var(--muted)',
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >📎</button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o problema ou pergunte sobre um erro..."
              rows={1}
              style={{
                flex: 1,
                background: 'var(--navy)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '9px 12px',
                fontSize: 13,
                color: 'var(--white)',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={enviar}
              disabled={!canSend}
              style={{
                width: 38, height: 38,
                borderRadius: 8, border: 'none',
                background: canSend ? 'var(--blue)' : 'var(--navy-3)',
                color: canSend ? 'white' : 'var(--muted)',
                fontSize: 18,
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >→</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, opacity: 0.6 }}>
            Enter para enviar · Shift+Enter para nova linha · Anexe o relatório de erros para correção automática
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Erro screen ──────────────────────────────────────────────────────────────

function ErroScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <div style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52,
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
        }}>❌</div>

        <div>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 12, letterSpacing: '-0.01em' }}>
            Algo deu errado
          </h2>
          <p style={{
            fontSize: 13, lineHeight: 1.7, margin: 0,
            color: '#f87171',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 8,
            padding: '12px 16px',
            textAlign: 'left',
          }}>
            {message}
          </p>
        </div>

        <button
          onClick={onRetry}
          className="btn-primary"
          style={{ justifyContent: 'center' }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ProductForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [data, setData] = useState<FormData>(INITIAL)
  const [stage, setStage] = useState<Stage>('formulario')
  const [carregandoConcluido, setCarregandoConcluido] = useState(false)
  const [gerandoConcluido, setGerandoConcluido] = useState(false)
  const [resultado, setResultado] = useState<ApiResultado | null>(null)
  const [editados, setEditados] = useState<ProdutoRevisao[]>([])
  const [erroMsg, setErroMsg] = useState('')
  const [numProdutos, setNumProdutos] = useState(0)

  function patch(update: Partial<FormData>) {
    setData(prev => ({ ...prev, ...update }))
  }

  function handleReset() {
    setStage('formulario')
    setStep(1)
    setData(INITIAL)
    setResultado(null)
    setEditados([])
    setErroMsg('')
    setNumProdutos(0)
  }

  async function handleConfirmarRevisao(finais: ProdutoRevisao[]) {
    setEditados(finais)
    setGerandoConcluido(false)
    setStage('gerando')
    try {
      const regimeAPI = data.taxRegime === 'Simples Nacional' ? 'SN' : 'MEI'
      const canaisAPI = data.channels.map(ch => ch === 'mercado_livre' ? 'ml' : ch)
      const res = await fetch('/api/generate-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtos: finais,
          regime: regimeAPI,
          canais: canaisAPI,
          drive_folder_url: data.driveLink,
          alertas: resultado?.alertas ?? [],
        }),
      })
      if (res.status === 401) throw new Error('Sessão expirada. Recarregue a página.')
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Erro ${res.status} ao gerar arquivos.`)
      }
      const novoResultado: ApiResultado = await res.json()
      setResultado(novoResultado)
      setGerandoConcluido(true)
      await new Promise(r => setTimeout(r, 700))
      setStage('resultado')
    } catch (err) {
      setErroMsg(err instanceof Error ? err.message : 'Erro ao gerar arquivos.')
      setStage('erro')
    }
  }

  async function handleConfirm() {
    if (!data.file) return
    setCarregandoConcluido(false)
    setStage('carregando')

    try {
      // Parse the uploaded spreadsheet
      const buffer = await data.file.arrayBuffer()
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
      console.log('[parse] linhas lidas:', rows.length, '| colunas:', rows[0] ? Object.keys(rows[0]) : '(vazio)')

      const produtos = rows
        .map((row, i) => ({
          sku: String(row['SKU'] ?? `PROD_${i + 1}`),
          nome: String(row['Nome do produto'] ?? ''),
          custo: Number(row['Custo unitário (R$)'] ?? 0),
          estoque: Number(row['Estoque'] ?? 0),
        }))
        .filter(p => p.nome.trim() !== '')

      if (produtos.length === 0) {
        throw new Error(
          'Nenhum produto encontrado na planilha. Verifique se as colunas estão corretas: SKU, Nome do produto, Estoque, Custo unitário (R$).'
        )
      }

      setNumProdutos(produtos.length)

      const regime = data.taxRegime === 'Simples Nacional' ? 'SN' : 'MEI'
      const canais = data.channels.map(ch => ch === 'mercado_livre' ? 'ml' : ch)

      const res = await fetch('/api/process-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtos,
          regime,
          canais,
          drive_folder_url: data.driveLink,
        }),
      })

      if (res.status === 401) {
        throw new Error('Sessão expirada. Recarregue a página e faça login novamente.')
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Erro ${res.status} ao processar produtos.`)
      }

      const result: ApiResultado = await res.json()
      setResultado(result)
      const EMBALAGEM_PADRAO: Record<string, number> = { shopee: 2.5, mercado_livre: 5.5, tiktok_shop: 4.0, amazon: 5.5, magalu: 5.5 }
      const embalVals = data.channels.map(ch => EMBALAGEM_PADRAO[ch]).filter((v): v is number => v !== undefined)
      const embFinal = embalVals.length > 0 ? Math.min(...embalVals) : 0
      setEditados(result.produtos_revisao.map(p => ({ ...p, embalagem: embFinal })))
      setCarregandoConcluido(true)
      await new Promise(r => setTimeout(r, 700))
      setStage(result.produtos_revisao.length > 0 ? 'pronto' : 'resultado')
    } catch (err) {
      setErroMsg(err instanceof Error ? err.message : 'Erro desconhecido. Tente novamente.')
      setStage('erro')
    }
  }

  const regime = data.taxRegime === 'Simples Nacional' ? 'SN' : 'MEI'

  if (stage === 'carregando') return <LoadingScreen numProdutos={numProdutos} numCanais={data.channels.length} concluido={carregandoConcluido} />
  if (stage === 'gerando') return <GerandoScreen concluido={gerandoConcluido} />
  if (stage === 'pronto' && resultado) return (
    <ProntoScreen
      numProdutos={resultado.produtos_processados}
      onContinuar={() => setStage('revisao_precos')}
    />
  )
  if (stage === 'revisao_precos' && resultado) return (
    <RevisaoPrecosScreen
      editados={editados}
      canais={data.channels}
      regime={regime}
      onProximo={prods => { setEditados(prods); setStage('revisao_dimensoes') }}
      onVoltar={() => { setStage('formulario'); setStep(4) }}
    />
  )
  if (stage === 'revisao_dimensoes' && resultado) return (
    <RevisaoDimensoesScreen
      editadosInit={editados}
      canais={data.channels}
      regime={regime}
      onConfirmar={handleConfirmarRevisao}
      onVoltar={prods => { setEditados(prods); setStage('revisao_precos') }}
    />
  )
  if (stage === 'resultado' && resultado) return (
    <ResultadoScreen
      resultado={resultado}
      onCorrecao={() => setStage('correcao')}
      onReset={handleReset}
    />
  )
  if (stage === 'correcao' && resultado) return (
    <CorrecaoScreen resultado={resultado} onVoltar={() => setStage('resultado')} />
  )
  if (stage === 'erro') return <ErroScreen message={erroMsg} onRetry={() => setStage('formulario')} />

  const titles: Record<number, string> = {
    1: 'Planilha de produtos',
    2: 'Configurações gerais',
    3: 'Onde você quer vender?',
    4: 'Revisar antes de gerar',
  }

  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 24, padding: 0,
        }}
      >
        ← Voltar ao início
      </button>

      <div style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '36px 32px',
      }}>
        {step < 4 && <StepIndicator current={step as 1 | 2 | 3} />}

        <h2 className="font-display" style={{
          fontSize: 20, fontWeight: 700,
          color: 'var(--white)', marginBottom: 24,
          letterSpacing: '-0.01em',
        }}>
          {titles[step]}
        </h2>

        {step === 1 && <Step1 data={data} onChange={patch} onNext={() => setStep(2)} />}
        {step === 2 && <Step2 data={data} onChange={patch} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3 data={data} onChange={patch} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step4 data={data} onBack={() => setStep(3)} onConfirm={handleConfirm} />}
      </div>
    </div>
  )
}
