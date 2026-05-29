'use client'

import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { AlertTriangle, CheckCircle2, Download, ExternalLink, Loader2, Rocket, Store } from 'lucide-react'
import type { PublicacaoMLCardData } from '@/lib/ml/publicacao-card'

type ResultadoPublicacao = {
  id?: string
  permalink?: string
  status?: string
}

function formatarMoeda(valor: number | null): string {
  if (valor === null) return 'pendente'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function traduzirErroML(erro: string): string {
  const normalizado = erro.toLowerCase()
  if (normalizado.includes('ml não conectado') || normalizado.includes('unauthorized')) {
    return 'Sua conexão com Mercado Livre expirou. Conecte a conta novamente e tente publicar outra vez.'
  }
  if (normalizado.includes('category') || normalizado.includes('categoria')) {
    return 'O Mercado Livre recusou a categoria. Revise a categoria oficial do produto antes de publicar.'
  }
  if (normalizado.includes('picture') || normalizado.includes('image') || normalizado.includes('foto')) {
    return 'O Mercado Livre não conseguiu acessar as fotos. Use links públicos e diretos para as imagens do produto.'
  }
  if (normalizado.includes('attribute') || normalizado.includes('atributo')) {
    return 'Faltam atributos obrigatórios para essa categoria no Mercado Livre.'
  }
  if (normalizado.includes('price') || normalizado.includes('preço') || normalizado.includes('preco')) {
    return 'O preço informado não passou nas regras do Mercado Livre. Revise margem, valor mínimo e moeda.'
  }
  return erro || 'O Mercado Livre recusou a publicação. Revise os dados e tente novamente.'
}

interface CardPublicacaoMLProps extends PublicacaoMLCardData {
  fotosInjetadas?: Record<string, string[]>
}

export default function CardPublicacaoML({ fotosInjetadas, ...data }: CardPublicacaoMLProps) {
  const [publicando, setPublicando] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultados, setResultados] = useState<ResultadoPublicacao[]>([])
  const [erroDownload, setErroDownload] = useState('')
  const [confirmandoPrejuizo, setConfirmandoPrejuizo] = useState(false)

  useEffect(() => {
    const todosPayloads = [
      ...(data.payloads ?? []),
      ...(data.payloads_pendentes ?? []),
    ]
    const skuBases = [...new Set(
      todosPayloads.map(p => p.sku_base).filter((s): s is string => Boolean(s))
    )]
    if (!skuBases.length) return

    const hidratar = async () => {
      try {
        const res = await fetch(`/api/ml/publicacoes?sku_base=${skuBases.join(',')}`)
        if (!res.ok) return
        const body = await res.json() as { publicacoes?: Array<{ ml_item_id: string; permalink?: string; status?: string }> }
        const publicacoes = body.publicacoes ?? []
        if (!publicacoes.length) return
        setResultados(prev => prev.length > 0 ? prev : publicacoes.map(p => ({
          id: p.ml_item_id,
          permalink: p.permalink,
          status: p.status,
        })))
      } catch {
        // hidratação silenciosa — falha não quebra o card
      }
    }
    void hidratar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const temFotosInjetadas = fotosInjetadas && Object.keys(fotosInjetadas).length > 0
  const payloadsEfetivos = temFotosInjetadas && data.payloads_pendentes?.length
    ? data.payloads_pendentes.map(p => ({ ...p, fotos: fotosInjetadas[p.sku] ?? p.fotos }))
    : data.payloads

  const prontoEfetivo = data.status === 'pronto' ||
    (temFotosInjetadas && Boolean(payloadsEfetivos?.length) && payloadsEfetivos!.every(p => p.fotos.length > 0))
  const pronto = prontoEfetivo
  const desconectado = data.status === 'desconectado'
  const cor = pronto ? '#0f7b58' : desconectado ? '#155bd5' : '#a16207'
  const fundo = pronto ? '#ecfdf5' : desconectado ? '#eaf2ff' : '#fff8e6'
  const borda = pronto ? '#b7ead2' : desconectado ? '#bfd7ff' : '#f3d48b'
  const Icone = pronto ? Rocket : desconectado ? Store : AlertTriangle

  const publicar = async () => {
    if (!payloadsEfetivos?.length || publicando) return
    if ((data.skus_com_prejuizo?.length ?? 0) > 0 && !confirmandoPrejuizo) {
      setConfirmandoPrejuizo(true)
      return
    }
    setConfirmandoPrejuizo(false)
    setPublicando(true)
    setErro('')
    setResultados([])

    try {
      const publicados: ResultadoPublicacao[] = []
      for (const payload of payloadsEfetivos) {
        const res = await fetch('/api/ml/publicar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await res.json() as ResultadoPublicacao & { error?: string }
        if (!res.ok) {
          setErro(traduzirErroML(body.error ?? 'Erro ao publicar no Mercado Livre'))
          setResultados(publicados)
          return
        }
        publicados.push(body)
      }
      setResultados(publicados)
    } catch {
      setErro('Não consegui falar com o Mercado Livre agora. Tente novamente em alguns instantes.')
    } finally {
      setPublicando(false)
    }
  }

  const baixarFallback = async () => {
    if (!data.fallback_download?.path || baixando) return
    setBaixando(true)
    setErroDownload('')
    try {
      const res = await fetch('/api/download-arquivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: data.fallback_download.path }),
      })
      const body = await res.json() as { url?: string; error?: string }
      if (!res.ok || !body.url) {
        setErroDownload(body.error ?? 'Não consegui preparar a exportação.')
        return
      }
      const a = document.createElement('a')
      a.href = body.url
      a.download = data.fallback_download.path.split('/').pop() ?? 'cadastro-mercado-livre'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      setErroDownload('Erro de rede ao exportar o cadastro.')
    } finally {
      setBaixando(false)
    }
  }

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
          <Icone size={18} strokeWidth={2.3} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ color: '#182233', fontSize: 14, fontWeight: 850 }}>{data.titulo}</div>
            <span style={{
              border: `1px solid ${borda}`,
              background: '#fff',
              color: cor,
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 850,
              whiteSpace: 'nowrap',
            }}>
              {data.badge}
            </span>
          </div>
          <div style={{ color: '#586174', fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>{data.resumo}</div>
          {data.nickname && (
            <div style={{ color: '#697386', fontSize: 11, marginTop: 5 }}>
              Conta conectada: <strong>{data.nickname}</strong>
            </div>
          )}
        </div>
      </div>

      {data.produto_preview && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
          padding: 12,
        }}>
          <div style={infoBoxStyle}>
            <span style={labelStyle}>Produto</span>
            <strong style={valorStyle}>{data.produto_preview.titulo}</strong>
          </div>
          <div style={infoBoxStyle}>
            <span style={labelStyle}>Preço</span>
            <strong style={valorStyle}>{formatarMoeda(data.produto_preview.preco)}</strong>
          </div>
          <div style={infoBoxStyle}>
            <span style={labelStyle}>Categoria</span>
            <strong style={valorStyle}>{data.produto_preview.categoria ?? 'pendente'}</strong>
          </div>
          <div style={infoBoxStyle}>
            <span style={labelStyle}>Fotos</span>
            <strong style={valorStyle}>{data.produto_preview.quantidade_fotos}</strong>
          </div>
        </div>
      )}

      {data.bloqueios.length > 0 && (
        <div style={{
          borderTop: '1px solid #e6edf6',
          padding: '10px 14px 12px',
          color: '#6b4e00',
          fontSize: 12,
          lineHeight: 1.45,
        }}>
          <div style={{ fontWeight: 850, marginBottom: 6 }}>Antes de publicar pela API</div>
          {data.bloqueios.map((bloqueio, index) => (
            <div key={`${bloqueio}-${index}`} style={{ marginTop: index === 0 ? 0 : 4 }}>{bloqueio}</div>
          ))}
          {data.bloqueios.some(b => b.includes('atributo obrigatório')) && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: '#fffbeb', border: '1px solid #f3d48b', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>Preencha os atributos faltantes no chat para publicar</div>
              <div style={{ color: '#92640a', fontStyle: 'italic' }}>Ex.: &quot;marca Hering, cor preta, tamanho M&quot;</div>
            </div>
          )}
        </div>
      )}

      {confirmandoPrejuizo && (data.skus_com_prejuizo?.length ?? 0) > 0 && (
        <div style={{
          borderTop: '1px solid #f3d48b',
          padding: '10px 14px 12px',
          background: '#fff8e6',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 850, color: '#92640a', marginBottom: 6 }}>
            <AlertTriangle size={14} strokeWidth={2.4} />
            {data.skus_com_prejuizo!.length === 1
              ? '1 produto com lucro estimado negativo'
              : `${data.skus_com_prejuizo!.length} produtos com lucro estimado negativo`}
          </div>
          <div style={{ color: '#6b4e00', marginBottom: 8 }}>
            {data.skus_com_prejuizo!.join(', ')} — o preço atual pode não cobrir custos e taxas do Mercado Livre. Deseja publicar mesmo assim?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={publicar} style={{
              padding: '7px 13px', borderRadius: 999, background: '#a16207', color: '#fff',
              border: '1px solid #a16207', fontSize: 12, fontWeight: 850, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Publicar mesmo assim
            </button>
            <button type="button" onClick={() => setConfirmandoPrejuizo(false)} style={{
              padding: '7px 13px', borderRadius: 999, background: '#fff', color: '#334155',
              border: '1px solid #d8e4f2', fontSize: 12, fontWeight: 850, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {resultados.length > 0 && (
        <div style={{
          borderTop: '1px solid #b7ead2',
          padding: '10px 14px 12px',
          color: '#0f7b58',
          background: '#ecfdf5',
          fontSize: 12,
          lineHeight: 1.45,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 850, marginBottom: 6 }}>
            <CheckCircle2 size={15} strokeWidth={2.4} />
            {resultados.length === 1 ? 'Anúncio publicado' : `${resultados.length} anúncios publicados`}
          </div>
          {resultados.map((resultado, index) => (
            <div key={`${resultado.id ?? index}`} style={{ marginTop: index === 0 ? 0 : 5 }}>
              {resultado.permalink ? (
                <a href={resultado.permalink} target="_blank" rel="noreferrer" style={{ color: '#0b6b4f', fontWeight: 800, textDecoration: 'none' }}>
                  Ver anúncio <ExternalLink size={12} style={{ verticalAlign: '-2px' }} />
                </a>
              ) : (
                <span>Status: {resultado.status ?? 'publicado'}</span>
              )}
              {resultado.status === 'paused' && (
                <div style={{ marginTop: 6, color: '#3d6b58', fontSize: 11, lineHeight: 1.5 }}>
                  Seu anúncio foi criado e está sendo processado pelo Mercado Livre. As fotos podem levar alguns minutos para aparecer e o anúncio é ativado automaticamente em seguida.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {erro && (
        <div style={{
          borderTop: '1px solid #f7b4ad',
          padding: '10px 14px 12px',
          color: '#b42318',
          background: '#fff1f0',
          fontSize: 12,
          lineHeight: 1.45,
          fontWeight: 750,
        }}>
          {erro}
        </div>
      )}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'flex-end',
        borderTop: '1px solid #e6edf6',
        padding: '12px 14px',
      }}>
        {desconectado ? (
          <a href="/api/ml/auth" style={primaryLinkStyle}>
            <Store size={14} strokeWidth={2.4} />
            Conectar Mercado Livre
          </a>
        ) : (
          <button type="button" onClick={publicar} disabled={!prontoEfetivo || publicando || data.bloqueios.length > 0 || resultados.length > 0} style={primaryButtonStyle(!prontoEfetivo || publicando || data.bloqueios.length > 0 || resultados.length > 0)}>
            {publicando ? <Loader2 size={14} className="spin" /> : resultados.length > 0 ? <CheckCircle2 size={14} strokeWidth={2.4} /> : <Rocket size={14} strokeWidth={2.4} />}
            {publicando ? 'Publicando' : resultados.length > 0 ? 'Publicado' : 'Publicar no Mercado Livre'}
          </button>
        )}
        {data.fallback_download && (
          <button type="button" onClick={baixarFallback} disabled={baixando} style={secondaryButtonStyle}>
            {baixando ? <Loader2 size={14} className="spin" /> : <Download size={14} strokeWidth={2.4} />}
            {baixando ? 'Preparando' : 'Exportar cadastro'}
          </button>
        )}
      </div>
      {erroDownload && <div style={{ color: '#b42318', fontSize: 11, padding: '0 14px 12px', textAlign: 'right' }}>{erroDownload}</div>}
      <style>{`.spin { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const infoBoxStyle: CSSProperties = {
  border: '1px solid #e6edf6',
  borderRadius: 12,
  padding: '9px 10px',
  background: '#fbfdff',
  minWidth: 0,
}

const labelStyle: CSSProperties = {
  display: 'block',
  color: '#697386',
  fontSize: 11,
  fontWeight: 800,
  marginBottom: 3,
}

const valorStyle: CSSProperties = {
  display: 'block',
  color: '#182233',
  fontSize: 12,
  fontWeight: 850,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const primaryLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 15px',
  borderRadius: 999,
  background: '#155bd5',
  color: '#fff',
  border: '1px solid #155bd5',
  fontSize: 13,
  fontWeight: 850,
  textDecoration: 'none',
  fontFamily: 'inherit',
}

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '9px 15px',
    borderRadius: 999,
    background: disabled ? '#9aa0a6' : '#155bd5',
    color: '#fff',
    border: disabled ? '1px solid #9aa0a6' : '1px solid #155bd5',
    fontSize: 13,
    fontWeight: 850,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  }
}

const secondaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 15px',
  borderRadius: 999,
  background: '#fff',
  color: '#334155',
  border: '1px solid #d8e4f2',
  fontSize: 13,
  fontWeight: 850,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
