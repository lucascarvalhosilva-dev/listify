'use client'

import { AlertTriangle, CheckCircle2, FileSpreadsheet, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { ValidadorUploadData } from '@/lib/validador-pre-upload'

function cortarTexto(texto: string, limite = 92) {
  return texto.length > limite ? `${texto.slice(0, limite - 3)}...` : texto
}

export default function CardValidadorUpload({
  status,
  titulo,
  resumo,
  checks,
  itens_preview,
  erros_count,
  avisos_count,
}: ValidadorUploadData) {
  const tema = {
    pronto: {
      cor: '#0f7b58',
      fundo: '#ecfdf5',
      borda: '#b7ead2',
      Icone: ShieldCheck,
      badge: 'Pronto para publicar',
    },
    atencao: {
      cor: '#a16207',
      fundo: '#fff8e6',
      borda: '#f3d48b',
      Icone: AlertTriangle,
      badge: 'Revisar antes',
    },
    bloqueado: {
      cor: '#b42318',
      fundo: '#fff1f0',
      borda: '#f7b4ad',
      Icone: ShieldAlert,
      badge: 'Bloqueado',
    },
  }[status]

  const IconeStatus = tema.Icone

  return (
    <div style={{
      maxWidth: 520,
      width: '100%',
      border: `1px solid ${tema.borda}`,
      borderRadius: 16,
      background: 'rgba(255,255,255,0.96)',
      boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
        padding: '14px 16px',
        background: tema.fundo,
        borderBottom: '1px solid rgba(15,23,42,0.06)',
      }}>
        <span style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          color: tema.cor,
          flexShrink: 0,
          boxShadow: '0 6px 14px rgba(15,23,42,0.06)',
        }}>
          <IconeStatus size={18} strokeWidth={2.3} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ color: '#182233', fontSize: 14, fontWeight: 850 }}>{titulo}</div>
            <span style={{
              border: `1px solid ${tema.borda}`,
              background: '#fff',
              color: tema.cor,
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 850,
              whiteSpace: 'nowrap',
            }}>
              {tema.badge}
            </span>
          </div>
          <div style={{ color: '#586174', fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>{resumo}</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 8,
        padding: 12,
      }}>
        {checks.map(check => (
          <div key={check.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #e6edf6',
            borderRadius: 12,
            padding: '9px 10px',
            background: '#fbfdff',
            minWidth: 0,
          }}>
            {check.ok
              ? <CheckCircle2 size={15} color="#0f7b58" strokeWidth={2.3} />
              : <AlertTriangle size={15} color={tema.cor} strokeWidth={2.3} />
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#697386', fontWeight: 800 }}>{check.label}</div>
              <div style={{ fontSize: 12, color: '#182233', fontWeight: 850, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {check.valor}
              </div>
            </div>
          </div>
        ))}
      </div>

      {itens_preview.length > 0 ? (
        <div style={{
          borderTop: '1px solid #e6edf6',
          padding: '10px 14px 12px',
          color: status === 'bloqueado' ? '#7f1d1d' : '#6b4e00',
          fontSize: 12,
          lineHeight: 1.45,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 850, marginBottom: 6 }}>
            <FileSpreadsheet size={14} strokeWidth={2.3} />
            {erros_count > 0 ? `${erros_count} erro${erros_count === 1 ? '' : 's'}` : 'Sem erros'}
            {avisos_count > 0 && ` · ${avisos_count} aviso${avisos_count === 1 ? '' : 's'}`}
          </div>
          {itens_preview.map((item, index) => (
            <div key={`${item.titulo}-${item.sku ?? ''}-${index}`} style={{ marginTop: index === 0 ? 0 : 4 }}>
              <strong>{item.sku ? `${item.sku} · ` : ''}{item.titulo}:</strong> {cortarTexto(item.detalhe)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          borderTop: '1px solid #e6edf6',
          padding: '10px 14px 12px',
          color: '#0f7b58',
          fontSize: 12,
          fontWeight: 800,
        }}>
          Nenhum bloqueio encontrado nos campos principais.
        </div>
      )}
    </div>
  )
}
