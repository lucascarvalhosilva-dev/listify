'use client'
import { useState } from 'react'
import { AlertCircle, CheckCircle2, FolderOpen } from 'lucide-react'
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
      background: 'rgba(255,255,255,0.96)',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '16px 18px',
      maxWidth: 520,
      width: '100%',
      boxSizing: 'border-box',
      boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background: '#eaf2ff',
          color: '#155bd5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <FolderOpen size={18} strokeWidth={2.2} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#182233' }}>
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
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            color: '#182233',
            background: enviando ? '#f8f9fa' : '#fff',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: validacao === 'valido' ? '0 0 0 3px rgba(52,168,83,0.10)' : 'none',
          }}
        />
        <button
          onClick={handleEnviar}
          disabled={validacao !== 'valido' || enviando}
          style={{
            flex: '0 0 auto',
            padding: '10px 18px',
            borderRadius: 999,
            background: validacao === 'valido' && !enviando ? '#155bd5' : '#9aa0a6',
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: validacao === 'valido' && !enviando ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s, transform 0.15s',
          }}
        >
          {enviando ? 'Enviando...' : 'Enviar link'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: msgColor, marginTop: 8 }}>
        {validacao === 'valido' && <CheckCircle2 size={13} strokeWidth={2.2} />}
        {validacao === 'invalido' && <AlertCircle size={13} strokeWidth={2.2} />}
        {msgText}
      </div>
    </div>
  )
}
