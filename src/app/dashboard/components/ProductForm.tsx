'use client'

import { useEffect, useRef, useState } from 'react'
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
  preco_ml: number
  preco_shopee: number
  peso_g: number
  comprimento_cm: number
  largura_cm: number
  altura_cm: number
  confianca_dimensoes: 'alta' | 'media'
}

type CampoNumerico = 'preco_ml' | 'preco_shopee' | 'peso_g' | 'comprimento_cm' | 'largura_cm' | 'altura_cm'

interface ApiResultado {
  status: string
  produtos_processados: number
  alertas: string[]
  arquivos: {
    shopee: string | null
    ml: string | null
  }
  produtos_revisao: ProdutoRevisao[]
}

type Stage = 'formulario' | 'carregando' | 'pronto' | 'revisao' | 'resultado' | 'erro'

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
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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

function LoadingScreen({ numProdutos }: { numProdutos: number }) {
  const [progress, setProgress] = useState(0)
  const estimadoSeg = Math.max(20, numProdutos * 2.5)

  useEffect(() => {
    const tickMs = 300
    const incremento = (90 / (estimadoSeg * 1000)) * tickMs
    const id = setInterval(() => {
      setProgress(prev => {
        const next = prev + incremento
        if (next >= 90) { clearInterval(id); return 90 }
        return next
      })
    }, tickMs)
    return () => clearInterval(id)
  }, [estimadoSeg])

  const restanteSeg = Math.max(0, Math.round(estimadoSeg * (1 - progress / 90)))
  const tempoTexto = progress >= 90
    ? 'Finalizando...'
    : restanteSeg > 60
      ? `~${Math.ceil(restanteSeg / 60)} min restantes`
      : `~${restanteSeg}s restantes`

  return (
    <>
      <style>{`@keyframes listify-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
            width: 52, height: 52,
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--blue)',
            borderRadius: '50%',
            animation: 'listify-spin 0.8s linear infinite',
          }} />
          <div style={{ width: '100%' }}>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 10, letterSpacing: '-0.01em' }}>
              Processando seus produtos...
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 24px' }}>
              A IA está gerando títulos, descrições e preços.<br />
              {numProdutos} produto{numProdutos !== 1 ? 's' : ''} · {tempoTexto}
            </p>
            <div style={{ width: '100%', background: 'var(--navy-3)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--blue), var(--blue-glow))',
                borderRadius: 8,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, opacity: 0.6 }}>
              {Math.round(progress)}%
            </p>
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
            {numProdutos} produto{numProdutos !== 1 ? 's' : ''} prontos para revisão
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

// ─── Price tooltip helpers ────────────────────────────────────────────────────

function calcTooltip(
  preco: number,
  custo: number,
  canal: 'ml' | 'shopee',
  regime: 'MEI' | 'SN'
) {
  if (canal === 'ml') {
    const imposto = regime === 'SN' ? preco * 0.04 : 0
    const fixo = preco < 79 ? 12.25 : 5.5
    const comissao = preco * 0.115
    return { comissao, imposto, fixo, lucro: preco - custo - comissao - imposto - fixo, pctComissao: '11,5%', labelFixo: 'Taxa fixa ML' }
  } else {
    const comissao = preco * 0.14
    const imposto = regime === 'SN' ? preco * 0.04 : 0
    const extra = regime === 'MEI' ? 3.0 : 0
    const fixo = 2.5 + extra
    return { comissao, imposto, fixo, lucro: preco - custo - comissao - imposto - fixo, pctComissao: '14%', labelFixo: regime === 'MEI' ? 'Frete + extra' : 'Frete' }
  }
}

function PriceTooltipIcon({
  preco, custo, canal, regime,
}: {
  preco: number; custo: number; canal: 'ml' | 'shopee'; regime: 'MEI' | 'SN'
}) {
  const [show, setShow] = useState(false)
  const bd = calcTooltip(preco, custo, canal, regime)

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ fontSize: 11, color: 'var(--muted)', cursor: 'help', opacity: 0.55, userSelect: 'none' }}>ⓘ</span>
      {show && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--navy-3)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '12px 14px',
          minWidth: 210,
          zIndex: 200,
          textAlign: 'left',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Composição do preço
          </p>
          {(
            [
              { label: 'Custo',                    val: `R$ ${custo.toFixed(2)}`,          color: 'var(--white)' },
              { label: `Comissão (${bd.pctComissao})`, val: `−R$ ${bd.comissao.toFixed(2)}`, color: '#f87171'       },
              ...(bd.imposto > 0 ? [{ label: 'Imposto (4%)', val: `−R$ ${bd.imposto.toFixed(2)}`, color: '#f87171' }] : []),
              { label: bd.labelFixo,               val: `−R$ ${bd.fixo.toFixed(2)}`,       color: '#f87171'       },
            ] as { label: string; val: string; color: string }[]
          ).map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, marginBottom: 4, color: 'var(--muted)' }}>
              <span>{r.label}</span>
              <span style={{ color: r.color }}>{r.val}</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: 'var(--muted)' }}>Lucro estimado</span>
            <span style={{ color: bd.lucro >= 0 ? '#4ade80' : '#f87171' }}>R$ {bd.lucro.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Resultado screen ─────────────────────────────────────────────────────────

const ARQUIVO_INFO: Record<string, { label: string; filename: string }> = {
  shopee: { label: 'Shopee',        filename: 'listify-shopee.xlsx' },
  ml:     { label: 'Mercado Livre', filename: 'listify-ml.xlsx' },
}

function ResultadoScreen({
  resultado,
  onReset,
}: {
  resultado: ApiResultado
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
                    ⬇ Baixar .xlsx
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
          onClick={onReset}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Gerar novos produtos
        </button>
      </div>
    </div>
  )
}

// ─── Revisão screen ───────────────────────────────────────────────────────────

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

function RevisaoScreen({
  resultado,
  canais,
  regime,
  onConfirmar,
  onVoltar,
}: {
  resultado: ApiResultado
  canais: string[]
  regime: 'MEI' | 'SN'
  onConfirmar: (editados: ProdutoRevisao[]) => void
  onVoltar: () => void
}) {
  const [editados, setEditados] = useState<ProdutoRevisao[]>(() =>
    resultado.produtos_revisao.map(p => ({ ...p }))
  )
  const [ajustePct, setAjustePct] = useState('')
  const [ajusteDir, setAjusteDir] = useState<'+' | '-'>('+')
  const [resetKey, setResetKey] = useState(0)

  function update(i: number, campo: CampoNumerico, valor: string) {
    const num = parseFloat(valor)
    if (isNaN(num)) return
    setEditados(prev => prev.map((p, j) => j === i ? { ...p, [campo]: num } : p))
  }

  function aplicarAjuste() {
    const pct = parseFloat(ajustePct)
    if (isNaN(pct) || pct <= 0) return
    const factor = ajusteDir === '+' ? 1 + pct / 100 : 1 - pct / 100
    setEditados(prev => prev.map(p => ({
      ...p,
      preco_ml: Math.round(p.preco_ml * factor * 100) / 100,
      preco_shopee: Math.round(p.preco_shopee * factor * 100) / 100,
    })))
    setAjustePct('')
    setResetKey(k => k + 1)
  }

  const unico = editados.length === 1
  const temPreco = canais.includes('shopee') || canais.includes('mercado_livre')

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
        <div>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 6, letterSpacing: '-0.01em' }}>
            Revisar dados gerados pela IA
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
            Confira e ajuste os valores antes de gerar os arquivos.
            {editados.some(p => p.confianca_dimensoes === 'media') && (
              <span style={{ color: '#fbbf24' }}> Campos em amarelo têm confiança média — revise com atenção.</span>
            )}
          </p>
        </div>

        {temPreco && (
          <div style={{
            background: 'rgba(37,99,235,0.06)',
            border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>
              Ajuste em massa:
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
              <select
                value={ajusteDir}
                onChange={e => setAjusteDir(e.target.value as '+' | '-')}
                style={{ ...numInputBase, width: 56, padding: '6px 8px', cursor: 'pointer' }}
              >
                <option value="+">+</option>
                <option value="−">−</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={ajustePct}
                onChange={e => setAjustePct(e.target.value)}
                style={{ ...numInputBase, width: 72 }}
              />
              <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>%</span>
              <button
                onClick={aplicarAjuste}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8, border: 'none',
                  background: 'var(--blue)',
                  color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Aplicar a todos
              </button>
            </div>
          </div>
        )}

        {unico ? (
          <CardUnico key={resetKey} produto={editados[0]} canais={canais} regime={regime} onUpdate={(campo, val) => update(0, campo, val)} />
        ) : (
          <TabelaProdutos key={resetKey} produtos={editados} canais={canais} regime={regime} onUpdate={update} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onVoltar} className="btn-secondary" style={{ justifyContent: 'center' }}>
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

function CardUnico({
  produto,
  canais,
  regime,
  onUpdate,
}: {
  produto: ProdutoRevisao
  canais: string[]
  regime: 'MEI' | 'SN'
  onUpdate: (campo: CampoNumerico, valor: string) => void
}) {
  const warn = produto.confianca_dimensoes === 'media'

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

      {precos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: precos.length === 1 ? '1fr' : '1fr 1fr', gap: 12 }}>
          {precos.map(([campo, label, canal]) => (
            <div key={campo}>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                {label}
                <PriceTooltipIcon preco={produto[campo]} custo={produto.custo} canal={canal} regime={regime} />
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
  onUpdate,
}: {
  produtos: ProdutoRevisao[]
  canais: string[]
  regime: 'MEI' | 'SN'
  onUpdate: (i: number, campo: CampoNumerico, valor: string) => void
}) {
  const allCols: { campo: CampoNumerico; label: string; step: string; width: number; canal?: 'ml' | 'shopee'; onlyIf?: boolean }[] = [
    { campo: 'preco_ml',       label: 'Preço ML',    step: '0.01', width: 90,  canal: 'ml',     onlyIf: canais.includes('mercado_livre') },
    { campo: 'preco_shopee',   label: 'Preço Shopee',step: '0.01', width: 105, canal: 'shopee', onlyIf: canais.includes('shopee') },
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
            const warn = p.confianca_dimensoes === 'media'
            return (
              <tr
                key={p.sku}
                style={{ borderBottom: i < produtos.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', lineHeight: 1.4 }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>SKU: {p.sku}</div>
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
                        {c.canal && (
                          <div style={{ position: 'absolute', top: 2, right: 2 }}>
                            <PriceTooltipIcon preco={p[c.campo]} custo={p.custo} canal={c.canal} regime={regime} />
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
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
  const [resultado, setResultado] = useState<ApiResultado | null>(null)
  const [produtosEditados, setProdutosEditados] = useState<ProdutoRevisao[]>([])
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
    setProdutosEditados([])
    setErroMsg('')
    setNumProdutos(0)
  }

  function handleConfirmarRevisao(editados: ProdutoRevisao[]) {
    setProdutosEditados(editados)
    setStage('resultado')
  }

  async function handleConfirm() {
    if (!data.file) return
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
      setStage(result.produtos_revisao.length > 0 ? 'pronto' : 'resultado')
    } catch (err) {
      setErroMsg(err instanceof Error ? err.message : 'Erro desconhecido. Tente novamente.')
      setStage('erro')
    }
  }

  const regime = data.taxRegime === 'Simples Nacional' ? 'SN' : 'MEI'

  if (stage === 'carregando') return <LoadingScreen numProdutos={numProdutos} />
  if (stage === 'pronto' && resultado) return (
    <ProntoScreen
      numProdutos={resultado.produtos_processados}
      onContinuar={() => setStage('revisao')}
    />
  )
  if (stage === 'revisao' && resultado) return (
    <RevisaoScreen
      resultado={resultado}
      canais={data.channels}
      regime={regime}
      onConfirmar={handleConfirmarRevisao}
      onVoltar={() => { setStage('formulario'); setStep(4) }}
    />
  )
  if (stage === 'resultado' && resultado) return <ResultadoScreen resultado={resultado} onReset={handleReset} />
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
