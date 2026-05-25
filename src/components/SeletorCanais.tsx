'use client'
import { useState } from 'react'

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
    <div style={{ marginTop: 12, marginLeft: 44 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {CANAIS.map(canal => {
          const sel = selecionados.includes(canal.id)
          return (
            <button
              key={canal.id}
              onClick={() => toggle(canal.id)}
              disabled={confirmado}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                border: `1.5px solid ${sel ? '#1a73e8' : '#d1d5db'}`,
                background: sel ? '#1a73e8' : '#fff',
                color: sel ? '#fff' : '#202124',
                fontSize: 13,
                fontWeight: sel ? 600 : 400,
                cursor: confirmado ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                opacity: confirmado && !sel ? 0.45 : 1,
              }}
            >
              {sel ? `✓ ${canal.label}` : canal.label}
            </button>
          )
        })}
      </div>

      {confirmado ? (
        <div style={{ fontSize: 12, color: '#5f6368', padding: '4px 0' }}>
          ✓ Canais confirmados: {labelsConfirmados}
        </div>
      ) : (
        <button
          onClick={confirmar}
          disabled={selecionados.length === 0 || salvando}
          style={{
            padding: '10px 24px',
            borderRadius: 20,
            background: selecionados.length > 0 ? '#1a73e8' : '#e8eaed',
            color: selecionados.length > 0 ? '#fff' : '#9aa0a6',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: selecionados.length > 0 && !salvando ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
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
