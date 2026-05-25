'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  mercado_livre: { label: 'Mercado Livre'   },
  tiktok_shop:   { label: 'TikTok Shop'    },
  amazon:        { label: 'Amazon Brasil'  },
  bling:         { label: 'Bling (ERP)'    },
  magalu:        { label: 'Magazine Luiza' },
  todos:         { label: 'Todos os canais'},
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 18, fontWeight: 600, color: '#202124', margin: '0 0 16px' }}>
      {children}
    </h2>
  )
}

const API_TO_FRONTEND: Record<string, string> = { ml: 'mercado_livre' }

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
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
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
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <section>
              <SectionTitle>Meus Catálogos</SectionTitle>

              {carregando ? (
                <p style={{ fontSize: 14, color: '#5f6368' }}>Carregando...</p>
              ) : catalogos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#202124', marginBottom: 6 }}>Nenhum catálogo ainda</p>
                  <p style={{ fontSize: 13, color: '#5f6368', marginBottom: 20, lineHeight: 1.6 }}>Faça sua primeira geração para salvar um catálogo e reutilizá-lo em outros canais.</p>
                  <Link href="/" style={{ display: 'inline-block', background: '#1a73e8', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                    Cadastrar produtos no chat →
                  </Link>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                  gap: 12,
                }}>
                  {catalogos.map(cat => {
                    const badge = cat.canal ? CANAL_BADGE[cat.canal] : null
                    return (
                      <div
                        key={cat.id}
                        style={{
                          background: '#ffffff', border: '1px solid #e8eaed',
                          borderRadius: 16, padding: '16px 18px',
                          display: 'flex', flexDirection: 'column', gap: 12,
                          transition: 'box-shadow 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                      >
                        {/* Info */}
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#202124', marginBottom: 4 }}>
                            {cat.nome}
                          </div>
                          <div style={{ fontSize: 13, color: '#5f6368', marginBottom: 8 }}>
                            {cat.produtos.length} produto{cat.produtos.length !== 1 ? 's' : ''}{' '}
                            · {cat.regime_tributario}{' '}
                            · {new Date(cat.atualizado_em).toLocaleDateString('pt-BR')}
                          </div>
                          {badge && (
                            <span style={{
                              display: 'inline-block',
                              fontSize: 11, fontWeight: 500,
                              color: '#1a73e8', background: '#e8f0fe',
                              padding: '2px 8px', borderRadius: 20,
                            }}>
                              {badge.label}
                            </span>
                          )}
                        </div>

                        {/* Ações */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {cat.arquivo_path && (
                            <>
                              <button
                                onClick={() => handleDownloadCatalogo(cat)}
                                disabled={baixandoCatalogoId === cat.id}
                                style={{
                                  width: '100%', padding: '9px 0', textAlign: 'center' as const,
                                  borderRadius: 8, border: '1px solid #1a73e8',
                                  background: '#1a73e8',
                                  color: '#ffffff', fontSize: 13, fontWeight: 600,
                                  cursor: baixandoCatalogoId === cat.id ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {baixandoCatalogoId === cat.id ? 'Preparando...' : 'Baixar planilha'}
                              </button>
                              {erroDownloadCatalogoId === cat.id && (
                                <div style={{ fontSize: 11, color: '#ea4335', lineHeight: 1.4 }}>
                                  Não consegui gerar o download. Tente novamente.
                                </div>
                              )}
                            </>
                          )}
                          <Link
                            href={`/adicionar-produtos?cat=${cat.id}`}
                            style={{
                              width: '100%', padding: '8px 0', textAlign: 'center' as const,
                              borderRadius: 8, border: '1px solid #1a73e8',
                              background: 'transparent',
                              color: '#1a73e8', fontSize: 13, fontWeight: 500,
                              textDecoration: 'none', display: 'block', transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#e8f0fe')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            Adicionar produtos →
                          </Link>
                          <button
                            onClick={() => handleUsarCatalogo(cat)}
                            className="btn-secondary"
                            style={{ width: '100%', padding: '8px 0', fontSize: 13 }}
                          >
                            Publicar em novo canal →
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
                                  }}
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => setDeletandoId(null)}
                                  className="btn-secondary"
                                  style={{ padding: '7px 10px', fontSize: 13 }}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeletandoId(cat.id)}
                                className="btn-secondary"
                                style={{ padding: '7px 12px', fontSize: 13 }}
                              >
                                Excluir
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
