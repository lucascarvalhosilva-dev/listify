'use client'
import { useState } from 'react'
import { BarChart3, Download, FileSpreadsheet, Music, Package, ShoppingBag, Store, type LucideIcon } from 'lucide-react'

const CANAL_ICONE: Record<string, LucideIcon> = {
  shopee: ShoppingBag,
  ml: Store,
  mercado_livre: Store,
  amazon: Package,
  magalu: ShoppingBag,
  tiktok: Music,
  tiktok_shop: Music,
  bling: BarChart3,
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
  const Icone = CANAL_ICONE[canal] ?? FileSpreadsheet

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
        setErro(data.error ?? 'Erro ao preparar exportação')
        return
      }
      const a = document.createElement('a')
      a.href = data.url
      a.download = nomeArquivo
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      setErro('Erro de rede ao tentar exportar')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.96)',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '13px 16px',
      gap: 12,
      maxWidth: 520,
      width: '100%',
      boxSizing: 'border-box',
      boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: '#eaf2ff',
          color: '#155bd5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icone size={18} strokeWidth={2.2} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#182233' }}>{nome_canal_label}</div>
          <div style={{ fontSize: 12, color: '#697386', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nomeArquivo} · {formatarTamanho(tamanho_bytes)}
          </div>
          {erro && <div style={{ fontSize: 11, color: '#ea4335', marginTop: 3 }}>{erro}</div>}
        </div>
      </div>
      <button
        onClick={handleBaixar}
        disabled={baixando}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 16px',
          borderRadius: 999,
          background: baixando ? '#9aa0a6' : '#155bd5',
          color: '#fff',
          border: 'none',
          fontSize: 13,
          fontWeight: 700,
          cursor: baixando ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          fontFamily: 'inherit',
          transition: 'background 0.15s, transform 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {!baixando && <Download size={14} strokeWidth={2.3} />}
        {baixando ? 'Preparando' : 'Exportar'}
      </button>
    </div>
  )
}
