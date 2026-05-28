'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import type { CSSProperties, DragEvent, ChangeEvent } from 'react'
import { CheckCircle2, ImagePlus, Loader2, Upload, X } from 'lucide-react'

const FORMATOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024
const MAX_POR_PRODUTO = 10
const SKU_PATTERN = /^(.+?)_\d+\.(jpg|jpeg|png|webp)$/i

interface ProdutoUpload {
  sku: string
  sku_base: string
  nome: string
  cor?: string
  tamanho?: string
}

interface GrupoFotos {
  key: string
  label: string
  skus: string[]
}

interface CardUploadFotosMLProps {
  produtos: ProdutoUpload[]
  onFotosUploaded: (fotos: Record<string, string[]>) => void
}

function validarArquivo(file: File): string | null {
  if (!FORMATOS.includes(file.type)) return 'Formato não aceito. Use JPG, PNG ou WEBP.'
  if (file.size > MAX_BYTES) return 'Arquivo maior que 5 MB.'
  return null
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
}

// Retorna lista de SKUs que uma foto deve receber, por ordem de prioridade:
// a. match exato de SKU  b. match por cor dentro do sku_base  c. match pelo sku_base inteiro
function resolverSkusDoNome(filename: string, produtos: ProdutoUpload[]): string[] {
  const m = filename.match(SKU_PATTERN)
  if (!m) return []
  const candidato = m[1]
  const candidatoNorm = normalizar(candidato)

  // a. Match exato de SKU (case-insensitive, sem acentos)
  const exato = produtos.find(p => normalizar(p.sku) === candidatoNorm)
  if (exato) return [exato.sku]

  // b. Match por cor: "BASE-COR_01.jpg" → todas variações dessa cor no grupo
  const dashIdx = candidato.indexOf('-')
  if (dashIdx !== -1) {
    const baseNorm = normalizar(candidato.slice(0, dashIdx))
    const sufixoNorm = normalizar(candidato.slice(dashIdx + 1))
    const matchCor = produtos.filter(
      p => normalizar(p.sku_base) === baseNorm && p.cor && normalizar(p.cor) === sufixoNorm
    )
    if (matchCor.length > 0) return matchCor.map(p => p.sku)
  }

  // c. Match por sku_base → todas variações do grupo
  const matchBase = produtos.filter(p => normalizar(p.sku_base) === candidatoNorm)
  if (matchBase.length > 0) return matchBase.map(p => p.sku)

  return []
}

function computarGrupos(produtos: ProdutoUpload[]): GrupoFotos[] {
  const byBase = new Map<string, ProdutoUpload[]>()
  for (const p of produtos) {
    const g = byBase.get(p.sku_base) ?? []
    g.push(p)
    byBase.set(p.sku_base, g)
  }

  const grupos: GrupoFotos[] = []

  for (const [skuBase, prods] of byBase.entries()) {
    if (prods.length === 1) {
      grupos.push({ key: prods[0].sku, label: prods[0].nome, skus: [prods[0].sku] })
      continue
    }

    const coresUnicas = [...new Set(prods.map(p => p.cor).filter((c): c is string => Boolean(c)))]

    if (coresUnicas.length <= 1) {
      // Uma cor (ou sem cor) — uma zona para todas as variações
      const tamanhos = prods.map(p => p.tamanho).filter(Boolean)
      const sufixo = tamanhos.length ? ` (${tamanhos.join(', ')})` : ''
      grupos.push({ key: skuBase, label: `${prods[0].nome}${sufixo}`, skus: prods.map(p => p.sku) })
    } else {
      // Múltiplas cores — uma zona por cor
      for (const cor of coresUnicas) {
        const prodsNaCor = prods.filter(p => p.cor === cor)
        const tamanhos = prodsNaCor.map(p => p.tamanho).filter(Boolean)
        const sufixo = tamanhos.length ? ` (${tamanhos.join(', ')})` : ''
        grupos.push({
          key: `${skuBase}|${cor}`,
          label: `${prods[0].nome} — ${cor}${sufixo}`,
          skus: prodsNaCor.map(p => p.sku),
        })
      }
      // Variações sem cor no mesmo grupo
      const semCor = prods.filter(p => !p.cor)
      if (semCor.length > 0) {
        const tamanhos = semCor.map(p => p.tamanho).filter(Boolean)
        const sufixo = tamanhos.length ? ` (${tamanhos.join(', ')})` : ''
        grupos.push({
          key: `${skuBase}|_sem_cor`,
          label: `${prods[0].nome}${sufixo}`,
          skus: semCor.map(p => p.sku),
        })
      }
    }
  }

  return grupos
}

export default function CardUploadFotosML({ produtos, onFotosUploaded }: CardUploadFotosMLProps) {
  const [modo, setModo] = useState<'a' | 'b' | null>(null)
  const [fotosPorSku, setFotosPorSku] = useState<Record<string, File[]>>({})
  const [fotosNaoAssociadas, setFotosNaoAssociadas] = useState<File[]>([])
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [erros, setErros] = useState<string[]>([])
  const [uploadando, setUploadando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const batchInputRef = useRef<HTMLInputElement>(null)

  const grupos = useMemo(() => computarGrupos(produtos), [produtos])

  // Adiciona arquivos a múltiplos SKUs de uma vez (modo por produto)
  const adicionarFotosGrupo = useCallback((skus: string[], files: File[]) => {
    const novosErros: string[] = []
    const validos: File[] = []
    for (const f of files) {
      const erro = validarArquivo(f)
      if (erro) { novosErros.push(`${f.name}: ${erro}`); continue }
      validos.push(f)
    }
    setErros(prev => [...prev, ...novosErros])
    if (validos.length === 0) return
    setFotosPorSku(prev => {
      const next = { ...prev }
      for (const sku of skus) {
        const existentes = next[sku] ?? []
        next[sku] = [...existentes, ...validos].slice(0, MAX_POR_PRODUTO)
      }
      return next
    })
  }, [])

  // Adiciona arquivos em lote com resolução automática de SKU/cor/sku_base
  const adicionarFotosLote = useCallback((files: File[]) => {
    const novosErros: string[] = []
    const porSku: Record<string, File[]> = {}
    const naoAssociadas: File[] = []

    for (const f of files) {
      const erro = validarArquivo(f)
      if (erro) { novosErros.push(`${f.name}: ${erro}`); continue }
      const skus = resolverSkusDoNome(f.name, produtos)
      if (skus.length > 0) {
        for (const sku of skus) {
          if (!porSku[sku]) porSku[sku] = []
          porSku[sku].push(f)
        }
      } else {
        naoAssociadas.push(f)
      }
    }

    setErros(prev => [...prev, ...novosErros])
    setFotosPorSku(prev => {
      const next = { ...prev }
      for (const [sku, fs] of Object.entries(porSku)) {
        const existentes = next[sku] ?? []
        next[sku] = [...existentes, ...fs].slice(0, MAX_POR_PRODUTO)
      }
      return next
    })
    setFotosNaoAssociadas(prev => [...prev, ...naoAssociadas])
  }, [produtos])

  const handleDrop = (e: DragEvent<HTMLDivElement>, skus?: string[]) => {
    e.preventDefault()
    setDragOver(null)
    const files = Array.from(e.dataTransfer.files)
    if (skus) adicionarFotosGrupo(skus, files)
    else adicionarFotosLote(files)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, skus?: string[]) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (skus) adicionarFotosGrupo(skus, files)
    else adicionarFotosLote(files)
  }

  const removerFoto = (skus: string[], idx: number) => {
    setFotosPorSku(prev => {
      const next = { ...prev }
      for (const sku of skus) {
        const lista = [...(next[sku] ?? [])]
        lista.splice(idx, 1)
        next[sku] = lista
      }
      return next
    })
  }

  const totalFotos = Object.values(fotosPorSku).reduce((s, v) => s + v.length, 0)

  const handleUpload = async () => {
    if (totalFotos === 0 || uploadando) return
    setUploadando(true)
    setErros([])

    try {
      const formData = new FormData()
      const skusOrdem: string[] = []
      for (const [sku, files] of Object.entries(fotosPorSku)) {
        for (const f of files) {
          formData.append('files', f)
          skusOrdem.push(sku)
        }
      }
      formData.append('skus', JSON.stringify(skusOrdem))

      const res = await fetch('/api/ml/upload-fotos', { method: 'POST', body: formData })
      const body = await res.json() as { fotos?: Record<string, string[]>; error?: string }
      if (!res.ok || !body.fotos) {
        setErros([body.error ?? 'Erro ao fazer upload das fotos.'])
        return
      }
      setConcluido(true)
      onFotosUploaded(body.fotos)
    } catch {
      setErros(['Erro de rede ao enviar fotos. Tente novamente.'])
    } finally {
      setUploadando(false)
    }
  }

  // Exemplos de nomenclatura para o hint do modo lote
  const exemploBase = produtos[0]?.sku_base ?? 'SKU'
  const primeiraProdutoCor = produtos.find(p => p.cor)
  const exemploCorNorm = primeiraProdutoCor ? normalizar(primeiraProdutoCor.cor!) : null
  const primeiroSku = produtos[0]?.sku ?? 'SKU'

  if (concluido) {
    return (
      <div style={cardStyle}>
        <div style={{ ...headerStyle, background: '#ecfdf5', borderBottomColor: '#b7ead2' }}>
          <CheckCircle2 size={18} strokeWidth={2.3} style={{ color: '#0f9f75', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f7b58' }}>Fotos enviadas com sucesso!</div>
            <div style={{ fontSize: 12, color: '#697386', marginTop: 3 }}>O card de publicação foi atualizado. Revise e publique.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <ImagePlus size={18} strokeWidth={2.2} style={{ color: '#155bd5', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#182233' }}>Enviar fotos dos produtos</div>
          <div style={{ fontSize: 12, color: '#697386', marginTop: 3 }}>
            Fotos melhoram a qualidade do cadastro em qualquer marketplace. Aceita JPG, PNG e WEBP · máx. 5 MB por foto · 10 por produto.
          </div>
        </div>
      </div>

      {modo === null && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={modeButtonStyle} onClick={() => setModo('a')}>
            <strong>Enviar por produto</strong>
            <span style={{ color: '#697386', fontSize: 12 }}>Selecione fotos para cada produto ou grupo de variações</span>
          </button>
          <button style={modeButtonStyle} onClick={() => setModo('b')}>
            <strong>Enviar todas de uma vez</strong>
            <span style={{ color: '#697386', fontSize: 12 }}>Associa automaticamente por SKU, cor ou grupo de variações</span>
          </button>
        </div>
      )}

      {modo === 'a' && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {grupos.map(grupo => {
            const fotos = fotosPorSku[grupo.skus[0]] ?? []
            return (
              <div key={grupo.key}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#263241', marginBottom: 6 }}>
                  {grupo.label}
                  <span style={{ color: '#697386', fontWeight: 400, marginLeft: 6 }}>{fotos.length}/{MAX_POR_PRODUTO}</span>
                </div>
                <div
                  style={dropZoneStyle(dragOver === grupo.key)}
                  onDragOver={e => { e.preventDefault(); setDragOver(grupo.key) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => handleDrop(e, grupo.skus)}
                  onClick={() => fileInputRefs.current[grupo.key]?.click()}
                >
                  {fotos.length === 0
                    ? <span style={{ fontSize: 12, color: '#697386' }}>Arraste fotos aqui ou clique para selecionar</span>
                    : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {fotos.map((f, idx) => (
                          <ThumbPreview key={idx} file={f} onRemove={() => removerFoto(grupo.skus, idx)} />
                        ))}
                      </div>
                  }
                  <input
                    ref={el => { fileInputRefs.current[grupo.key] = el }}
                    type="file" multiple accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => handleFileChange(e, grupo.skus)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modo === 'b' && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={dropZoneStyle(dragOver === 'lote')}
            onDragOver={e => { e.preventDefault(); setDragOver('lote') }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e)}
            onClick={() => batchInputRef.current?.click()}
          >
            <Upload size={20} strokeWidth={2} style={{ color: '#697386' }} />
            <span style={{ fontSize: 13, color: '#697386' }}>
              Arraste todos os arquivos ou clique para selecionar
            </span>
            <div style={{ fontSize: 11, color: '#9aa0a6', textAlign: 'center', lineHeight: 1.8 }}>
              <span>{exemploBase}_01.jpg → todas as variações</span>
              {exemploCorNorm && <><br /><span>{exemploBase}-{exemploCorNorm}_01.jpg → por cor</span></>}
              <br /><span>{primeiroSku}_01.jpg → variação específica</span>
            </div>
            <input
              ref={batchInputRef}
              type="file" multiple accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={e => handleFileChange(e)}
            />
          </div>

          {grupos.filter(g => (fotosPorSku[g.skus[0]] ?? []).length > 0).map(grupo => {
            const fotos = fotosPorSku[grupo.skus[0]] ?? []
            return (
              <div key={grupo.key}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#263241', marginBottom: 6 }}>
                  {grupo.label}
                  <span style={{ color: '#0f9f75', fontWeight: 400, marginLeft: 8, fontSize: 11 }}>✓ {fotos.length} foto{fotos.length !== 1 ? 's' : ''} associada{fotos.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {fotos.map((f, idx) => <ThumbPreview key={idx} file={f} onRemove={() => removerFoto(grupo.skus, idx)} />)}
                </div>
              </div>
            )
          })}

          {fotosNaoAssociadas.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a16207', marginBottom: 6 }}>
                Não associadas ({fotosNaoAssociadas.length}) — nome não segue o padrão esperado
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {fotosNaoAssociadas.map((f, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{ ...thumbStyle, background: '#fff8e6', border: '1px solid #f3d48b' }}>
                      <span style={{ fontSize: 10, color: '#a16207', wordBreak: 'break-all', padding: '0 2px' }}>{f.name}</span>
                    </div>
                    <button
                      style={removeButtonStyle}
                      onClick={() => setFotosNaoAssociadas(prev => prev.filter((_, i) => i !== idx))}
                    ><X size={9} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {erros.length > 0 && (
        <div style={{ padding: '8px 16px', color: '#c5221f', fontSize: 12, lineHeight: 1.5 }}>
          {erros.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {modo !== null && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e6edf6', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={secondaryBtn} onClick={() => { setModo(null); setFotosPorSku({}); setFotosNaoAssociadas([]); setErros([]) }}>
            Trocar modo
          </button>
          <button
            style={primaryBtn(totalFotos === 0 || uploadando)}
            disabled={totalFotos === 0 || uploadando}
            onClick={handleUpload}
          >
            {uploadando
              ? <><Loader2 size={14} className="spin" /> Enviando…</>
              : <><Upload size={14} strokeWidth={2.3} /> Enviar {totalFotos > 0 ? `${totalFotos} foto${totalFotos !== 1 ? 's' : ''}` : 'fotos'}</>
            }
          </button>
        </div>
      )}
      <style>{`.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ThumbPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = URL.createObjectURL(file)
  return (
    <div style={{ position: 'relative' }}>
      <div style={thumbStyle}>
        <img src={url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} onLoad={() => URL.revokeObjectURL(url)} />
      </div>
      <button style={removeButtonStyle} onClick={onRemove}><X size={9} /></button>
    </div>
  )
}

const cardStyle: CSSProperties = {
  maxWidth: 520,
  width: '100%',
  border: '1px solid #dfe7f1',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.96)',
  boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
  overflow: 'hidden',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  gap: 11,
  alignItems: 'flex-start',
  padding: '14px 16px',
  background: '#f5f8fc',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
}

const modeButtonStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  padding: '12px 14px',
  border: '1px solid #dfe7f1',
  borderRadius: 12,
  background: '#ffffff',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  fontSize: 13,
  color: '#182233',
  transition: 'border-color 0.15s, background 0.15s',
}

function dropZoneStyle(active: boolean): CSSProperties {
  return {
    border: `1.5px dashed ${active ? '#155bd5' : '#c9d7ea'}`,
    borderRadius: 12,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    background: active ? '#eaf2ff' : '#f8fafc',
    minHeight: 70,
    transition: 'border-color 0.15s, background 0.15s',
  }
}

const thumbStyle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 7,
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  background: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const removeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: -5,
  right: -5,
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: '#334155',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}

const secondaryBtn: CSSProperties = {
  padding: '8px 13px',
  borderRadius: 999,
  border: '1px solid #d8e4f2',
  background: '#fff',
  color: '#334155',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

function primaryBtn(disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 15px',
    borderRadius: 999,
    background: disabled ? '#9aa0a6' : '#155bd5',
    color: '#fff',
    border: disabled ? '1px solid #9aa0a6' : '1px solid #155bd5',
    fontSize: 13,
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  }
}
