'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'

const CANAIS = [
  { id: 'shopee', label: 'Shopee' },
  { id: 'mercado_livre', label: 'Mercado Livre' },
  { id: 'amazon', label: 'Amazon' },
  { id: 'magalu', label: 'Magalu' },
  { id: 'tiktok_shop', label: 'TikTok Shop' },
  { id: 'bling', label: 'Bling' },
]

type Props = {
  sessaoId: string
  onConfirmar: (canais: string[]) => void
  valorInicial?: string[]
}

export default function SeletorCanais({ sessaoId, onConfirmar, valorInicial = [] }: Props) {
  const [selecionados, setSelecionados] = useState<string[]>(valorInicial)
  const [confirmado, setConfirmado] = useState(valorInicial.length > 0)
  const [salvando, setSalvando] = useState(false)

  const toggle = (id: string) => {
    if (confirmado) return
    setSelecionados(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const confirmar = async () => {
    if (selecionados.length === 0 || salvando || confirmado) return
    setSalvando(true)
    try {
      await fetch('/api/salvar-canais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessao_id: sessaoId, canais: selecionados }),
      })
      setConfirmado(true)
      onConfirmar(selecionados)
    } finally {
      setSalvando(false)
    }
  }

  const labelsConfirmados = selecionados
    .map(id => CANAIS.find(c => c.id === id)?.label ?? id)
    .join(', ')

  return (
    <div style={{ marginTop: 12, marginLeft: 46 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 10 }}>
        {CANAIS.map(canal => {
          const sel = selecionados.includes(canal.id)
          return (
            <button
              key={canal.id}
              onClick={() => toggle(canal.id)}
              disabled={confirmado}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 15px',
                borderRadius: 999,
                border: `1px solid ${sel ? '#155bd5' : '#d8e0eb'}`,
                background: sel ? '#155bd5' : 'rgba(255,255,255,0.92)',
                color: sel ? '#fff' : '#263241',
                fontSize: 13,
                fontWeight: 700,
                cursor: confirmado ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background .18s, border-color .18s, box-shadow .18s, transform .18s',
                opacity: confirmado && !sel ? 0.45 : 1,
                boxShadow: sel ? '0 8px 22px rgba(26,115,232,0.14)' : 'none',
              }}
            >
              {sel && <Check size={14} strokeWidth={2.4} />}
              {canal.label}
            </button>
          )
        })}
      </div>

      {confirmado ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0f8a62', padding: '5px 0' }}>
          <Check size={13} strokeWidth={2.4} /> Canais confirmados: {labelsConfirmados}
        </div>
      ) : (
        <button
          onClick={confirmar}
          disabled={selecionados.length === 0 || salvando}
          style={{
            padding: '10px 24px',
            borderRadius: 999,
            background: selecionados.length > 0 ? 'linear-gradient(135deg, #1a73e8 0%, #0f9f75 100%)' : '#e8edf4',
            color: selecionados.length > 0 ? '#fff' : '#9aa0a6',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: selecionados.length > 0 && !salvando ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'filter .18s, transform .18s',
            boxShadow: selecionados.length > 0 ? '0 12px 26px rgba(26,115,232,0.18)' : 'none',
          }}
        >
          {salvando
            ? 'Salvando...'
            : `Confirmar canais${selecionados.length > 0 ? ` (${selecionados.length})` : ''}`}
        </button>
      )}
    </div>
  )
}
