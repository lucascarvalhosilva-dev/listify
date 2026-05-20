'use client'

import { useRef, useState } from 'react'
import { downloadTemplate } from '../utils/templateGenerator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  file: File | null
  taxRegime: 'MEI' | 'Simples Nacional'
  driveLink: string
  channels: string[]
}

const INITIAL: FormData = {
  file: null,
  taxRegime: 'MEI',
  driveLink: '',
  channels: [],
}

const CHANNELS = [
  { id: 'shopee',        name: 'Shopee',         desc: 'Maior marketplace em volume de pedidos' },
  { id: 'mercado_livre', name: 'Mercado Livre',  desc: 'Maior marketplace da América Latina' },
  { id: 'tiktok_shop',  name: 'TikTok Shop',    desc: 'Venda direto pelo feed do TikTok' },
  { id: 'amazon',       name: 'Amazon Brasil',   desc: 'Marketplace global com entrega rápida' },
  { id: 'magalu',       name: 'Magazine Luiza',  desc: 'Grande varejista com alto tráfego' },
  { id: 'bling',        name: 'Bling (ERP)',     desc: 'Gestão integrada de estoque e pedidos' },
]

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

// ─── Photo guide ─────────────────────────────────────────────────────────────

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

// ─── Step 1 — Planilha de produtos ────────────────────────────────────────────

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

// ─── Step 4 — Review ─────────────────────────────────────────────────────────

function Step4({ data, onBack }: { data: FormData; onBack: () => void }) {
  const [toast, setToast] = useState(false)

  function handleConfirm() {
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  const channelNames = data.channels
    .map(id => CHANNELS.find(c => c.id === id)?.name ?? id)
    .join(', ')

  const rows: [string, string][] = [
    ['Planilha',           data.file?.name ?? '—'],
    ['Produtos',           '0 produtos'],
    ['Regime tributário',  data.taxRegime],
    ['Google Drive',       data.driveLink],
    ['Canais',             channelNames || '—'],
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
        onClick={handleConfirm}
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

      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--navy-2)',
          border: '1px solid rgba(37,99,235,0.4)',
          borderRadius: 10,
          padding: '12px 24px',
          fontSize: 14, color: 'var(--white)', fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap', zIndex: 100,
          animation: 'fadeUp 0.3s ease',
        }}>
          🚀 Em breve — geração automática em desenvolvimento!
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ProductForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [data, setData] = useState<FormData>(INITIAL)

  function patch(update: Partial<FormData>) {
    setData(prev => ({ ...prev, ...update }))
  }

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
        {step === 4 && <Step4 data={data} onBack={() => setStep(3)} />}
      </div>
    </div>
  )
}
