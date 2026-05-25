'use client'
import { useState } from 'react'

const CANAL_ICONE: Record<string, string> = {
  shopee: '🛒',
  ml: '🏪',
  mercado_livre: '🏪',
  amazon: '📦',
  magalu: '🛍',
  tiktok: '🎵',
  tiktok_shop: '🎵',
  bling: '📊',
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type Props = {
  path: string
  canal: string
  nome_canal_label: string
  tamanho_bytes: number
}

export default function CardDownloadArquivo({ path, canal, nome_canal_label, tamanho_bytes }: Props) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState('')

  const nomeArquivo = path.split('/').pop() ?? path
  const icone = CANAL_ICONE[canal] ?? '📄'

  const handleBaixar = async () => {
    if (baixando) return
    setBaixando(true)
    setErro('')
    try {
      const res = await fetch('/api/download-arquivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = await res.json() as { sucesso?: boolean; url?: string; error?: string }
      if (!res.ok || !data.url) {
        setErro(data.error ?? 'Erro ao gerar link de download')
        return
      }
      const a = document.createElement('a')
      a.href = data.url
      a.download = nomeArquivo
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      setErro('Erro de rede ao tentar baixar')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#fff',
      border: '1px solid #e8eaed',
      borderRadius: 12,
      padding: '12px 16px',
      gap: 12,
      maxWidth: 480,
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icone}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#202124' }}>{nome_canal_label}</div>
          <div style={{ fontSize: 12, color: '#5f6368', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nomeArquivo} · {formatarTamanho(tamanho_bytes)}
          </div>
          {erro && <div style={{ fontSize: 11, color: '#ea4335', marginTop: 3 }}>{erro}</div>}
        </div>
      </div>
      <button
        onClick={handleBaixar}
        disabled={baixando}
        style={{
          padding: '8px 18px',
          borderRadius: 20,
          background: baixando ? '#9aa0a6' : '#1a73e8',
          color: '#fff',
          border: 'none',
          fontSize: 13,
          fontWeight: 600,
          cursor: baixando ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          fontFamily: 'inherit',
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {baixando ? '…' : 'Baixar'}
      </button>
    </div>
  )
}
