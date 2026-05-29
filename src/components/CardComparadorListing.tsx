'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, FileText, PackageCheck } from 'lucide-react'
import type { ComparadorListingData } from '@/lib/comparador-listing'

export type { ComparadorListingData } from '@/lib/comparador-listing'

function formatarMoeda(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function cortarTexto(texto: string, limite = 74) {
  return texto.length > limite ? `${texto.slice(0, limite - 3)}...` : texto
}

export default function CardComparadorListing({
  titulo,
  resumo,
  total_produtos,
  produtos_com_titulo,
  produtos_com_descricao,
  produtos_preview,
}: ComparadorListingData) {
  const [expandido, setExpandido] = useState(false)
  const Chevron = expandido ? ChevronUp : ChevronDown

  return (
    <div style={{
      maxWidth: 520,
      width: '100%',
      border: '1px solid #c9d9f3',
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
          background: '#eaf2ff',
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
          color: '#155bd5',
          flexShrink: 0,
          boxShadow: '0 6px 14px rgba(15,23,42,0.06)',
        }}>
          <PackageCheck size={18} strokeWidth={2.3} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ color: '#182233', fontSize: 14, fontWeight: 850 }}>{titulo}</div>
            <span style={{
              border: '1px solid #bfd4f5',
              background: '#fff',
              color: '#155bd5',
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 850,
              whiteSpace: 'nowrap',
            }}>
              Valor gerado
            </span>
          </div>
          {expandido
            ? <div style={{ color: '#586174', fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>{resumo}</div>
            : <div style={{ color: '#586174', fontSize: 12, marginTop: 3 }}>
                {produtos_com_titulo} de {total_produtos} produto{total_produtos === 1 ? '' : 's'} com título otimizado · clique para ver
              </div>
          }
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
        <Resumo label="Produtos" valor={total_produtos} />
        <Resumo label="Com título" valor={produtos_com_titulo} />
        <Resumo label="Com descrição" valor={produtos_com_descricao} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 12 }}>
        {produtos_preview.map(produto => (
          <div key={`${produto.canal}-${produto.sku}`} style={{
            border: '1px solid #e6edf6',
            borderRadius: 13,
            background: '#fbfdff',
            padding: '10px 11px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#182233', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {produto.sku} · {produto.nome_canal_label}
                </div>
                <div style={{ color: '#697386', fontSize: 11, marginTop: 3 }}>
                  {formatarMoeda(produto.preco)} · estoque {produto.estoque ?? '-'}
                </div>
              </div>
              <span style={{
                color: produto.status === 'melhorado' ? '#0f7b58' : '#a16207',
                background: '#fff',
                border: '1px solid #dfe7f1',
                borderRadius: 999,
                padding: '3px 7px',
                fontSize: 10,
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}>
                {produto.status === 'melhorado' ? 'Melhorado' : 'Revisar'}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              gap: 8,
              alignItems: 'center',
            }}>
              <TextoComparado label="Antes" valor={produto.nome_original} />
              <ArrowRight size={15} color="#8a94a6" strokeWidth={2.4} />
              <TextoComparado label="Depois" valor={produto.nome_otimizado} forte />
            </div>

            {produto.melhorias.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
                {produto.melhorias.map(melhoria => (
                  <span key={melhoria} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    border: '1px solid #dfe7f1',
                    borderRadius: 999,
                    padding: '3px 7px',
                    fontSize: 10,
                    color: '#586174',
                    fontWeight: 850,
                    background: '#fff',
                  }}>
                    <CheckCircle2 size={11} color="#0f7b58" strokeWidth={2.5} />
                    {melhoria}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        borderTop: '1px solid #e6edf6',
        padding: '10px 14px 12px',
        color: '#697386',
        fontSize: 11,
        lineHeight: 1.45,
        display: 'flex',
        gap: 7,
        alignItems: 'center',
      }}>
        <FileText size={14} strokeWidth={2.3} />
        Comparação resumida. O cadastro final continua sendo a fonte para revisar todos os campos.
      </div>
      </>}
    </div>
  )
}

function Resumo({ label, valor }: { label: string; valor: number }) {
  return (
    <div style={{ border: '1px solid #e6edf6', borderRadius: 12, padding: '9px 10px', background: '#fbfdff' }}>
      <div style={{ color: '#697386', fontSize: 11, fontWeight: 800 }}>{label}</div>
      <div style={{ color: '#182233', fontSize: 15, fontWeight: 900, marginTop: 3 }}>{valor}</div>
    </div>
  )
}

function TextoComparado({ label, valor, forte }: { label: string; valor: string; forte?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: '#697386', fontSize: 10, fontWeight: 850, marginBottom: 3 }}>{label}</div>
      <div style={{
        color: forte ? '#155bd5' : '#182233',
        fontSize: 12,
        fontWeight: forte ? 900 : 800,
        lineHeight: 1.35,
      }}>
        {cortarTexto(valor)}
      </div>
    </div>
  )
}
