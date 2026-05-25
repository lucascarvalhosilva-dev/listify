'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CalendarDays, Download, FileSpreadsheet, Package, Plus, Send, ShieldCheck, Store, Trash2, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import ProductForm, { type CatalogoItem } from '../dashboard/components/ProductForm'
import HelpChat from '@/components/HelpChat'

interface GeracaoItem {
  id: string
  canais: string[]
  total_produtos: number
  criado_em: string
}

const CANAL_LABEL: Record<string, { label: string }> = {
  shopee:        { label: 'Shopee'        },
  ml:            { label: 'ML'            },
  mercado_livre: { label: 'Mercado Livre' },
  tiktok_shop:   { label: 'TikTok Shop'  },
  bling:         { label: 'Bling'        },
  magalu:        { label: 'Magalu'       },
  amazon:        { label: 'Amazon'       },
}

const CANAL_BADGE: Record<string, { label: string }> = {
  shopee:        { label: 'Shopee'          },
  ml:            { label: 'Mercado Livre'   },
  mercado_livre: { label: 'Mercado Livre'   },
  tiktok_shop:   { label: 'TikTok Shop'    },
  amazon:        { label: 'Amazon Brasil'  },
  bling:         { label: 'Bling (ERP)'    },
  magalu:        { label: 'Magazine Luiza' },
  todos:         { label: 'Todos os canais'},
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#182233', margin: 0, letterSpacing: 0 }}>
        {children}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 14, color: '#697386', lineHeight: 1.6, margin: '8px 0 0', maxWidth: 620 }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

const API_TO_FRONTEND: Record<string, string> = { ml: 'mercado_livre' }

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor))
}

function nomeArquivoCatalogo(cat: CatalogoItem) {
  return cat.arquivo_path?.split('/').pop() ?? 'Arquivo ainda não gerado'
}

function tituloCatalogo(cat: CatalogoItem) {
  const badge = cat.canal ? CANAL_BADGE[cat.canal] : null
  if (badge) return `Cadastro para ${badge.label.replace(' Brasil', '')}`

  return cat.nome
    .replace(/\s+-\s+\d{2}\/\d{2}\/\d{4}.*$/, '')
    .trim() || cat.nome
}

function textoProdutos(total: number) {
  return `${total} produto${total !== 1 ? 's' : ''} pronto${total !== 1 ? 's' : ''}`
}

function PainelContent() {
  const searchParams = useSearchParams()
  const aba = searchParams.get('aba') ?? ''
  const [showForm, setShowForm] = useState(true)
  const [catalogoInicial, setCatalogoInicial] = useState<CatalogoItem | undefined>(undefined)
  const [canaisParaRepetir, setCanaisParaRepetir] = useState<string[] | undefined>(undefined)
  const [catalogos, setCatalogos] = useState<CatalogoItem[]>([])
  const [geracoes, setGeracoes] = useState<GeracaoItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [baixandoCatalogoId, setBaixandoCatalogoId] = useState<string | null>(null)
  const [erroDownloadCatalogoId, setErroDownloadCatalogoId] = useState<string | null>(null)

  const carregarDados = useCallback(() => {
    setCarregando(true)
    Promise.all([
      fetch('/api/get-catalogs').then(r => r.ok ? r.json() : { catalogos: [] }),
      fetch('/api/get-history').then(r => r.ok ? r.json() : { geracoes: [] }),
    ])
      .then(([catData, histData]) => {
        setCatalogos((catData as { catalogos?: CatalogoItem[] }).catalogos ?? [])
        setGeracoes((histData as { geracoes?: GeracaoItem[] }).geracoes ?? [])
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  useEffect(() => {
    setShowForm(aba === '' || aba === 'nova')
  }, [aba])

  function handleUsarCatalogo(cat: CatalogoItem) {
    setCatalogoInicial(cat)
    setCanaisParaRepetir(undefined)
    setShowForm(true)
  }

  function handleRepetir(canaisApi: string[]) {
    setCatalogoInicial(undefined)
    setCanaisParaRepetir(canaisApi.map(c => API_TO_FRONTEND[c] ?? c))
    setShowForm(true)
  }

  function handleBack() {
    setShowForm(false)
    setCatalogoInicial(undefined)
    setCanaisParaRepetir(undefined)
    carregarDados()
  }

  async function handleDeleteCatalogo(id: string) {
    if (deletandoId !== id) {
      setDeletandoId(id)
      return
    }
    setDeletandoId(null)
    const res = await fetch(`/api/delete-catalog/${id}`, { method: 'DELETE' })
    if (res.ok) setCatalogos(prev => prev.filter(c => c.id !== id))
  }

  async function handleDownloadCatalogo(cat: CatalogoItem) {
    if (!cat.arquivo_path || baixandoCatalogoId) return
    setBaixandoCatalogoId(cat.id)
    setErroDownloadCatalogoId(null)
    try {
      const res = await fetch('/api/download-arquivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: cat.arquivo_path }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Erro ao gerar download')

      const nomeArquivo = cat.arquivo_path.split('/').pop() ?? `${cat.nome}.xlsx`
      const a = document.createElement('a')
      a.href = data.url
      a.download = nomeArquivo
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      setErroDownloadCatalogoId(cat.id)
    } finally {
      setBaixandoCatalogoId(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(26,115,232,0.08), transparent 30%), linear-gradient(180deg, #f5f8fc 0%, #f8fafc 46%, #ffffff 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar activeAba={aba} />

      <main style={{ flex: 1 }}>
        {/* ── Nova Geração: ProductForm ────────────────────────────────── */}
        {showForm && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            <ProductForm
              key={catalogoInicial?.id ?? canaisParaRepetir?.join(',') ?? 'new'}
              onBack={handleBack}
              catalogoInicial={catalogoInicial}
              canaisIniciais={canaisParaRepetir}
            />
          </div>
        )}

        {/* ── Meus Catálogos ──────────────────────────────────────────── */}
        {!showForm && aba === 'catalogos' && (
          <div style={{ maxWidth: 1040, margin: '0 auto', padding: '44px 24px 72px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <section>
              <SectionTitle subtitle="Arquivos prontos para baixar, atualizar ou publicar em outro canal. Cada cartão mostra o que já está salvo e o próximo melhor caminho.">
                Meus Catálogos
              </SectionTitle>

              {carregando ? (
                <p style={{ fontSize: 14, color: '#697386' }}>Carregando seus catálogos...</p>
              ) : catalogos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '56px 24px', background: 'rgba(255,255,255,0.86)', border: '1px solid #dfe7f1', borderRadius: 18, boxShadow: '0 10px 30px rgba(15,23,42,0.05)' }}>
                  <div style={{ width: 54, height: 54, background: '#eaf2ff', color: '#155bd5', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <FileSpreadsheet size={26} strokeWidth={2.1} />
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#182233', marginBottom: 6 }}>Nenhum catálogo salvo ainda</p>
                  <p style={{ fontSize: 14, color: '#697386', margin: '0 auto 22px', lineHeight: 1.6, maxWidth: 420 }}>Quando você gerar um cadastro pelo chat, a planilha final aparece aqui para baixar, atualizar ou publicar em outros canais.</p>
                  <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a73e8', color: 'white', border: 'none', borderRadius: 12, padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', boxShadow: '0 10px 22px rgba(26,115,232,0.20)' }}>
                    <Plus size={16} strokeWidth={2.3} />
                    Cadastrar produtos no chat →
                  </Link>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                  gap: 16,
                }}>
                  {catalogos.map(cat => {
                    const badge = cat.canal ? CANAL_BADGE[cat.canal] : null
                    const arquivoNome = nomeArquivoCatalogo(cat)
                    const totalProdutos = cat.produtos.length
                    return (
                      <div
                        key={cat.id}
                        style={{
                          background: 'rgba(255,255,255,0.92)',
                          border: '1px solid #dfe7f1',
                          borderRadius: 18,
                          padding: 18,
                          display: 'flex', flexDirection: 'column', gap: 12,
                          minHeight: 322,
                          boxShadow: '0 10px 30px rgba(15,23,42,0.05)',
                          transition: 'box-shadow 0.18s, transform 0.18s, border-color 0.18s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.boxShadow = '0 18px 44px rgba(15,23,42,0.10)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.borderColor = '#c9d7ea'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.boxShadow = '0 10px 30px rgba(15,23,42,0.05)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = '#dfe7f1'
                        }}
                      >
                        {/* Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                            <div>
                              {badge && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  fontSize: 12, fontWeight: 700,
                                  color: '#155bd5', background: '#eaf2ff',
                                  padding: '5px 10px', borderRadius: 999,
                                  marginBottom: 10,
                                }}>
                                  <Store size={13} strokeWidth={2.3} />
                                  {badge.label}
                                </span>
                              )}
                              <div style={{ fontSize: 17, fontWeight: 800, color: '#182233', lineHeight: 1.35, letterSpacing: 0 }}>
                                {tituloCatalogo(cat)}
                              </div>
                            </div>
                            <div style={{
                              width: 42, height: 42, borderRadius: 14,
                              background: 'linear-gradient(135deg, #eaf2ff 0%, #eefcf6 100%)',
                              color: '#155bd5',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <FileSpreadsheet size={21} strokeWidth={2.1} />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div style={{ border: '1px solid #edf2f7', background: '#f8fafc', borderRadius: 12, padding: '9px 10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#697386', marginBottom: 3 }}>
                                <Package size={14} strokeWidth={2.2} />
                                Produtos
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#182233' }}>{textoProdutos(totalProdutos)}</div>
                            </div>
                            <div style={{ border: '1px solid #edf2f7', background: '#f8fafc', borderRadius: 12, padding: '9px 10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#697386', marginBottom: 3 }}>
                                <ShieldCheck size={14} strokeWidth={2.2} />
                                Regime
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#182233' }}>{cat.regime_tributario || 'Não informado'}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#697386' }}>
                            <CalendarDays size={14} strokeWidth={2.2} />
                            Atualizado em {formatarDataHora(cat.atualizado_em)}
                          </div>

                          <div style={{
                            display: 'flex', gap: 9, alignItems: 'center',
                            border: '1px solid #edf2f7',
                            borderRadius: 12,
                            background: '#ffffff',
                            padding: '10px 11px',
                          }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: 10,
                              background: cat.arquivo_path ? '#ecfdf5' : '#fff7ed',
                              color: cat.arquivo_path ? '#0f9f75' : '#c2410c',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {cat.arquivo_path ? <FileSpreadsheet size={16} strokeWidth={2.2} /> : <AlertCircle size={16} strokeWidth={2.2} />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#263241' }}>
                                {cat.arquivo_path ? 'Planilha pronta para upload' : 'Planilha indisponível'}
                              </div>
                              <div style={{ fontSize: 11, color: '#697386', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                {arquivoNome}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                          {cat.arquivo_path && (
                            <>
                              <button
                                onClick={() => handleDownloadCatalogo(cat)}
                                disabled={baixandoCatalogoId === cat.id}
                                style={{
                                  width: '100%', minHeight: 42, padding: '10px 14px', textAlign: 'center' as const,
                                  borderRadius: 12, border: '1px solid #1a73e8',
                                  background: 'linear-gradient(135deg, #1a73e8 0%, #155bd5 100%)',
                                  color: '#ffffff', fontSize: 14, fontWeight: 700,
                                  cursor: baixandoCatalogoId === cat.id ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                  boxShadow: '0 10px 22px rgba(26,115,232,0.20)',
                                }}
                              >
                                <Download size={16} strokeWidth={2.3} />
                                {baixandoCatalogoId === cat.id ? 'Preparando...' : 'Baixar planilha pronta'}
                              </button>
                              {erroDownloadCatalogoId === cat.id && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#c5221f', lineHeight: 1.4 }}>
                                  <AlertCircle size={13} strokeWidth={2.2} />
                                  Não consegui gerar o download. Tente novamente.
                                </div>
                              )}
                            </>
                          )}
                          <Link
                            href={`/adicionar-produtos?cat=${cat.id}`}
                            style={{
                              width: '100%', minHeight: 40, padding: '9px 14px', textAlign: 'center' as const,
                              borderRadius: 12, border: '1px solid #c9d9f3',
                              background: '#f8fbff',
                              color: '#155bd5', fontSize: 13, fontWeight: 700,
                              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              transition: 'background 0.15s, border-color 0.15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#eaf2ff'
                              e.currentTarget.style.borderColor = '#9ec1ff'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = '#f8fbff'
                              e.currentTarget.style.borderColor = '#c9d9f3'
                            }}
                          >
                            <Plus size={15} strokeWidth={2.4} />
                            Adicionar mais produtos
                          </Link>
                          <button
                            onClick={() => handleUsarCatalogo(cat)}
                            className="btn-secondary"
                            style={{
                              width: '100%', minHeight: 40, padding: '9px 14px', fontSize: 13,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              borderRadius: 12, fontWeight: 700,
                            }}
                          >
                            <Send size={14} strokeWidth={2.3} />
                            Publicar em outro canal
                          </button>

                          <div style={{ display: 'flex', gap: 6 }}>
                            {deletandoId === cat.id ? (
                              <>
                                <button
                                  onClick={() => handleDeleteCatalogo(cat.id)}
                                  style={{
                                    flex: 1, padding: '7px 0',
                                    borderRadius: 8,
                                    border: '1px solid #fca5a5',
                                    background: '#fef2f2',
                                    color: '#ea4335', fontSize: 13, fontWeight: 500,
                                    cursor: 'pointer', whiteSpace: 'nowrap' as const,
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                  }}
                                >
                                  <Trash2 size={14} strokeWidth={2.2} />
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => setDeletandoId(null)}
                                  className="btn-secondary"
                                  style={{ padding: '7px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <X size={14} strokeWidth={2.4} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeletandoId(cat.id)}
                                className="btn-secondary"
                                style={{ padding: '7px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}
                              >
                                <Trash2 size={13} strokeWidth={2.2} />
                                Excluir catálogo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── Histórico ───────────────────────────────────────────────── */}
        {!showForm && aba === 'historico' && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
            <SectionTitle>Histórico de Gerações</SectionTitle>

            {carregando ? (
              <p style={{ fontSize: 14, color: '#5f6368' }}>Carregando...</p>
            ) : geracoes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ width: 48, height: 48, background: '#f1f3f4', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#202124', marginBottom: 6 }}>Nenhuma geração ainda</p>
                <p style={{ fontSize: 13, color: '#5f6368', lineHeight: 1.6 }}>Seu histórico de gerações aparecerá aqui após a primeira geração.</p>
              </div>
            ) : (
              <div style={{
                background: '#ffffff', border: '1px solid #e8eaed',
                borderRadius: 16, overflow: 'hidden',
              }}>
                {geracoes.map((g, i) => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '12px 18px',
                      borderBottom: i < geracoes.length - 1 ? '1px solid #e8eaed' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#5f6368', whiteSpace: 'nowrap' as const, minWidth: 80 }}>
                      {new Date(g.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                    <div style={{ fontSize: 13, color: '#202124', whiteSpace: 'nowrap' as const, minWidth: 90 }}>
                      {g.total_produtos} produto{g.total_produtos !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, flex: 1 }}>
                      {g.canais.map(canal => {
                        const info = CANAL_LABEL[canal]
                        if (!info) return null
                        return (
                          <span
                            key={canal}
                            style={{
                              fontSize: 11, fontWeight: 500,
                              color: '#1a73e8', background: '#e8f0fe',
                              padding: '2px 8px', borderRadius: 20,
                            }}
                          >
                            {info.label}
                          </span>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => handleRepetir(g.canais)}
                      className="btn-secondary"
                      style={{
                        padding: '5px 12px', fontSize: 12,
                        flexShrink: 0, whiteSpace: 'nowrap' as const,
                      }}
                    >
                      ↻ Repetir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Meu Plano legado ────────────────────────────────────────── */}
        {!showForm && aba === 'plano' && (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
            <section style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, padding: '24px 28px' }}>
              <SectionTitle>Meu Plano</SectionTitle>
              <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.6, margin: '0 0 18px' }}>
                A gestão de plano agora fica em uma página dedicada, com os limites e opções de upgrade em um só lugar.
              </p>
              <Link href="/upgrade" style={{ display: 'inline-block', background: '#1a73e8', color: '#ffffff', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Ver planos e upgrade →
              </Link>
            </section>
          </div>
        )}
      </main>
      <HelpChat />
    </div>
  )
}

export default function PainelPage() {
  return (
    <Suspense>
      <PainelContent />
    </Suspense>
  )
}
