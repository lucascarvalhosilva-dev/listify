'use client'

import { AlertTriangle, CheckCircle2, FileSpreadsheet, FolderCheck, PackageCheck, ShieldCheck } from 'lucide-react'

export type StatusConfianca = 'pronto' | 'atencao'

type Props = {
  status: StatusConfianca
  titulo: string
  resumo: string
  total_produtos: number
  produtos_processados: number
  arquivos_gerados: number
  canais_solicitados: number
  alertas_count: number
  campos_obrigatorios_ok: boolean
  precos_calculados: boolean
  drive_validado: boolean
  alertas_preview?: string[]
}

function plural(valor: number, singular: string, pluralTexto: string) {
  return `${valor} ${valor === 1 ? singular : pluralTexto}`
}

function cortarTexto(texto: string) {
  return texto.length > 96 ? `${texto.slice(0, 93)}...` : texto
}

export default function CardStatusConfianca({
  status,
  titulo,
  resumo,
  total_produtos,
  produtos_processados,
  arquivos_gerados,
  canais_solicitados,
  alertas_count,
  campos_obrigatorios_ok,
  precos_calculados,
  drive_validado,
  alertas_preview = [],
}: Props) {
  const pronto = status === 'pronto'
  const cor = pronto ? '#0f7b58' : '#a16207'
  const fundo = pronto ? '#ecfdf5' : '#fff8e6'
  const borda = pronto ? '#b7ead2' : '#f3d48b'
  const IconeStatus = pronto ? ShieldCheck : AlertTriangle

  const itens = [
    {
      icon: CheckCircle2,
      label: 'Campos',
      valor: campos_obrigatorios_ok ? 'obrigatórios ok' : 'revisar',
      ok: campos_obrigatorios_ok,
    },
    {
      icon: PackageCheck,
      label: 'Produtos',
      valor: `${produtos_processados}/${total_produtos}`,
      ok: produtos_processados === total_produtos && total_produtos > 0,
    },
    {
      icon: FileSpreadsheet,
      label: 'Arquivos',
      valor: `${arquivos_gerados}/${canais_solicitados}`,
      ok: arquivos_gerados === canais_solicitados && canais_solicitados > 0,
    },
    {
      icon: ShieldCheck,
      label: 'Preço',
      valor: precos_calculados ? 'calculado' : 'revisar',
      ok: precos_calculados,
    },
    {
      icon: FolderCheck,
      label: 'Fotos',
      valor: drive_validado ? 'acessível' : 'revisar',
      ok: drive_validado,
    },
    {
      icon: alertas_count > 0 ? AlertTriangle : CheckCircle2,
      label: 'Alertas',
      valor: alertas_count > 0 ? plural(alertas_count, 'ponto', 'pontos') : 'nenhum',
      ok: alertas_count === 0,
    },
  ]

  return (
    <div style={{
      maxWidth: 520,
      width: '100%',
      border: `1px solid ${borda}`,
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
        background: fundo,
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
          color: cor,
          flexShrink: 0,
          boxShadow: '0 6px 14px rgba(15,23,42,0.06)',
        }}>
          <IconeStatus size={18} strokeWidth={2.3} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#182233', fontSize: 14, fontWeight: 800 }}>{titulo}</div>
          <div style={{ color: '#586174', fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>{resumo}</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
        padding: 12,
      }}>
        {itens.map(item => {
          const Icone = item.icon
          return (
            <div key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #e6edf6',
              borderRadius: 12,
              padding: '9px 10px',
              background: '#fbfdff',
              minWidth: 0,
            }}>
              <Icone size={15} color={item.ok ? '#0f7b58' : '#a16207'} strokeWidth={2.3} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#697386', fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#182233', fontWeight: 800, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.valor}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {alertas_preview.length > 0 && (
        <div style={{
          borderTop: '1px solid #e6edf6',
          padding: '10px 14px 12px',
          color: '#6b4e00',
          fontSize: 12,
          lineHeight: 1.45,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 5 }}>Pontos para revisar</div>
          {alertas_preview.slice(0, 3).map((alerta, index) => (
            <div key={`${alerta}-${index}`} style={{ marginTop: index === 0 ? 0 : 4 }}>
              {cortarTexto(alerta)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
