'use client'
import { useState } from 'react'
import { extrairUrlDrive } from '@/lib/validador-drive'

type Validacao = 'vazio' | 'invalido' | 'valido'

type Props = {
  onEnviar: (url: string) => void | Promise<void>
  valorInicial?: string
}

function calcValidacao(val: string): Validacao {
  if (!val.trim()) return 'vazio'
  return extrairUrlDrive(val) ? 'valido' : 'invalido'
}

export default function CardEnvioDrive({ onEnviar, valorInicial = '' }: Props) {
  const [url, setUrl] = useState(valorInicial)
  const [enviando, setEnviando] = useState(false)

  const validacao = calcValidacao(url)

  const handleEnviar = async () => {
    if (validacao !== 'valido' || enviando) return
    const urlExtraida = extrairUrlDrive(url)!
    setEnviando(true)
    try {
      await onEnviar(urlExtraida)
    } finally {
      setEnviando(false)
    }
  }

  const borderColor =
    validacao === 'invalido' ? '#ea4335' :
    validacao === 'valido' ? '#34a853' : '#dadce0'

  const msgColor =
    validacao === 'invalido' ? '#ea4335' :
    validacao === 'valido' ? '#34a853' : '#9aa0a6'

  const msgText =
    validacao === 'invalido' ? 'Esse link não parece ser de uma pasta do Google Drive' :
    validacao === 'valido' ? 'Link reconhecido ✓' :
    'Cole o link da pasta com as fotos'

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8eaed',
      borderRadius: 12,
      padding: '16px 18px',
      maxWidth: 480,
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>📁</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#202124' }}>
          Link da pasta do Google Drive
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleEnviar() }}
          placeholder="https://drive.google.com/drive/folders/..."
          disabled={enviando}
          aria-label="Link da pasta do Google Drive"
          style={{
            flex: '1 1 200px',
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            color: '#202124',
            background: enviando ? '#f8f9fa' : '#fff',
            transition: 'border-color 0.15s',
          }}
        />
        <button
          onClick={handleEnviar}
          disabled={validacao !== 'valido' || enviando}
          style={{
            flex: '0 0 auto',
            padding: '9px 18px',
            borderRadius: 20,
            background: validacao === 'valido' && !enviando ? '#1a73e8' : '#9aa0a6',
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: validacao === 'valido' && !enviando ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
        >
          {enviando ? 'Enviando…' : 'Enviar link'}
        </button>
      </div>

      <div style={{ fontSize: 12, color: msgColor, marginTop: 6 }}>
        {msgText}
      </div>
    </div>
  )
}
