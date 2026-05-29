'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, DollarSign, ShieldCheck, SlidersHorizontal, TrendingUp } from 'lucide-react'
import type { PriceGuardData } from '@/lib/price-guard'

export type { PriceGuardCanalResumo, PriceGuardData, PriceGuardRisco, PriceGuardStatus } from '@/lib/price-guard'

function formatarMoeda(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarPercentual(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return '-'
  return `${valor.toFixed(1).replace('.', ',')}%`
}

function cortarTexto(texto: string, limite = 76) {
  return texto.length > limite ? `${texto.slice(0, limite - 3)}...` : texto
}

export default function CardPriceGuard({
  status,
  titulo,
  resumo,
  canais,
  riscos_preview,
  nota,
  onAjustarPrecos,
}: PriceGuardData & { onAjustarPrecos?: () => void }) {
  const tema = {
    ok: {
      cor: '#0f7b58',
      fundo: '#ecfdf5',
      borda: '#b7ead2',
      Icone: ShieldCheck,
      badge: 'Margem positiva',
    },
    atencao: {
      cor: '#a16207',
      fundo: '#fff8e6',
      borda: '#f3d48b',
      Icone: AlertTriangle,
      badge: 'Revisar margem',
    },
    risco: {
      cor: '#b42318',
      fundo: '#fff1f0',
      borda: '#f7b4ad',
      Icone: AlertTriangle,
      badge: 'Risco de prejuízo',
    },
  }[status]

  const IconeStatus = tema.Icone
  const totalAlertas = canais.reduce((acc, canal) => acc + canal.produtos_com_alerta, 0)
  const totalPrejuizo = canais.reduce((acc, canal) => acc + canal.produtos_com_prejuizo, 0)
  const [expandido, setExpandido] = useState(status !== 'ok')
  const Chevron = expandido ? ChevronUp : ChevronDown

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
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpandido(v => !v)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpandido(v => !v)}
        style={{
          display: 'flex',
          gap: 11,
          alignItems: 'flex-start',
          padding: '14px 16px',
          background: tema.fundo,
          borderBottom: expandido ? '1px solid rgba(15,23,42,0.06)' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
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
            <div style={{ color: '#182233', fontSize: 14, fontWeight: 800 }}>{titulo}</div>
            <span style={{
              border: `1px solid ${tema.borda}`,
              background: '#fff',
              color: tema.cor,
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}>
              {tema.badge}
            </span>
          </div>
          <div style={{ color: '#586174', fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>{resumo}</div>
        </div>
        <Chevron size={16} strokeWidth={2.3} color="#697386" style={{ flexShrink: 0, marginTop: 2 }} />
      </div>

      {expandido && <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 8,
        padding: 12,
        borderBottom: '1px solid #e6edf6',
      }}>
        <div style={{ border: '1px solid #e6edf6', borderRadius: 12, padding: '9px 10px', background: '#fbfdff' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#697386', fontSize: 11, fontWeight: 800 }}>
            <DollarSign size={13} strokeWidth={2.4} />
            Canais
          </div>
          <div style={{ color: '#182233', fontSize: 15, fontWeight: 900, marginTop: 3 }}>{canais.length}</div>
        </div>
        <div style={{ border: '1px solid #e6edf6', borderRadius: 12, padding: '9px 10px', background: '#fbfdff' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#697386', fontSize: 11, fontWeight: 800 }}>
            <TrendingUp size={13} strokeWidth={2.4} />
            Alertas
          </div>
          <div style={{ color: totalAlertas > 0 ? tema.cor : '#182233', fontSize: 15, fontWeight: 900, marginTop: 3 }}>{totalAlertas}</div>
        </div>
        <div style={{ border: '1px solid #e6edf6', borderRadius: 12, padding: '9px 10px', background: '#fbfdff' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#697386', fontSize: 11, fontWeight: 800 }}>
            <AlertTriangle size={13} strokeWidth={2.4} />
            Prejuízo
          </div>
          <div style={{ color: totalPrejuizo > 0 ? '#b42318' : '#182233', fontSize: 15, fontWeight: 900, marginTop: 3 }}>{totalPrejuizo}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
        {canais.map(canal => {
          const ok = canal.status === 'ok'
          const risco = canal.status === 'risco'
          const cor = ok ? '#0f7b58' : risco ? '#b42318' : '#a16207'
          const Icone = ok ? CheckCircle2 : AlertTriangle

          return (
            <div key={canal.canal} style={{
              border: '1px solid #e6edf6',
              borderRadius: 12,
              background: '#fbfdff',
              padding: '10px 11px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icone size={15} color={cor} strokeWidth={2.4} />
                    <span style={{ color: '#182233', fontSize: 13, fontWeight: 850 }}>{canal.nome_canal_label}</span>
                  </div>
                  <div style={{ color: '#697386', fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>
                    Preço médio {formatarMoeda(canal.preco_medio)} · custo médio {formatarMoeda(canal.custo_medio)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: cor, fontSize: 13, fontWeight: 900 }}>{formatarPercentual(canal.margem_minima_percentual)}</div>
                  <div style={{ color: '#697386', fontSize: 10, fontWeight: 800, marginTop: 2 }}>menor margem</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{ border: '1px solid #dfe7f1', borderRadius: 999, padding: '3px 8px', fontSize: 11, color: '#586174', fontWeight: 800 }}>
                  {canal.produtos_analisados} produto{canal.produtos_analisados === 1 ? '' : 's'}
                </span>
                <span style={{ border: '1px solid #dfe7f1', borderRadius: 999, padding: '3px 8px', fontSize: 11, color: '#586174', fontWeight: 800 }}>
                  taxas ~{formatarPercentual(canal.taxas_percentual)}
                </span>
                <span style={{ border: '1px solid #dfe7f1', borderRadius: 999, padding: '3px 8px', fontSize: 11, color: '#586174', fontWeight: 800 }}>
                  fixo {formatarMoeda(canal.custo_fixo_estimado)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {riscos_preview.length > 0 && (
        <div style={{
          borderTop: '1px solid #e6edf6',
          padding: '10px 14px 12px',
          color: '#6b4e00',
          fontSize: 12,
          lineHeight: 1.45,
        }}>
          <div style={{ fontWeight: 850, marginBottom: 5 }}>Preços para revisar</div>
          {riscos_preview.slice(0, 4).map((risco, index) => (
            <div key={`${risco.canal}-${risco.sku}-${index}`} style={{ marginTop: index === 0 ? 0 : 4 }}>
              <strong>{risco.nome_canal_label} · {risco.sku}</strong>: {cortarTexto(risco.motivo)}
              {risco.margem_percentual !== null && ` (${formatarPercentual(risco.margem_percentual)})`}
            </div>
          ))}
        </div>
      )}

      <div style={{
        borderTop: '1px solid #e6edf6',
        padding: '10px 14px 12px',
        color: '#697386',
        fontSize: 11,
        lineHeight: 1.45,
      }}>
        {nota}
      </div>

      {onAjustarPrecos && (
        <div style={{
          borderTop: '1px solid #e6edf6',
          padding: '11px 14px 14px',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#fbfdff',
        }}>
          <button
            type="button"
            onClick={onAjustarPrecos}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(26,115,232,0.28)',
              background: '#fff',
              color: '#155bd5',
              borderRadius: 999,
              padding: '8px 13px',
              fontSize: 12,
              fontWeight: 850,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 8px 18px rgba(26,115,232,0.08)',
            }}
          >
            <SlidersHorizontal size={14} strokeWidth={2.4} />
            Ajustar preços no chat
          </button>
        </div>
      )}
      </>}
    </div>
  )
}
