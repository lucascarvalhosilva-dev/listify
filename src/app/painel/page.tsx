'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Navbar, { type SectionId } from '../components/Navbar'
import ProductForm, { type CatalogoItem } from '../dashboard/components/ProductForm'

interface GeracaoItem {
  id: string
  canais: string[]
  total_produtos: number
  criado_em: string
}

const CANAL_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  shopee:        { label: 'Shopee',  color: '#fb923c', bg: 'rgba(249,115,22,0.12)'  },
  ml:            { label: 'ML',      color: '#60a5fa', bg: 'rgba(37,99,235,0.12)'   },
  mercado_livre: { label: 'ML',      color: '#60a5fa', bg: 'rgba(37,99,235,0.12)'   },
  tiktok_shop:   { label: 'TikTok',  color: '#fb7185', bg: 'rgba(244,63,94,0.12)'   },
  bling:         { label: 'Bling',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  magalu:        { label: 'Magalu',  color: '#38bdf8', bg: 'rgba(14,165,233,0.12)'  },
  amazon:        { label: 'Amazon',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-display"
      style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', letterSpacing: '-0.01em', margin: '0 0 16px' }}
    >
      {children}
    </h2>
  )
}

export default function PainelPage() {
  const [showForm, setShowForm] = useState(false)
  const [catalogoInicial, setCatalogoInicial] = useState<CatalogoItem | undefined>(undefined)
  const [activeSection, setActiveSection] = useState<SectionId>('cat')
  const [catalogos, setCatalogos] = useState<CatalogoItem[]>([])
  const [geracoes, setGeracoes] = useState<GeracaoItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

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

  function handleNovaGeracao() {
    setCatalogoInicial(undefined)
    setShowForm(true)
  }

  function handleSectionChange(section: SectionId) {
    setShowForm(false)
    setCatalogoInicial(undefined)
    setActiveSection(section)
  }

  function handleUsarCatalogo(cat: CatalogoItem) {
    setCatalogoInicial(cat)
    setShowForm(true)
  }

  function handleBack() {
    setShowForm(false)
    setCatalogoInicial(undefined)
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

  const totalProdutosProcessados = geracoes.reduce((sum, g) => sum + g.total_produtos, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onNovaGeracao={handleNovaGeracao}
        activeSection={showForm ? undefined : activeSection}
        onSectionChange={handleSectionChange}
      />

      <main style={{ flex: 1 }}>
        {/* ── Nova Geração: ProductForm ────────────────────────────────── */}
        {showForm && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            <ProductForm
              key={catalogoInicial?.id ?? 'new'}
              onBack={handleBack}
              catalogoInicial={catalogoInicial}
            />
          </div>
        )}

        {/* ── Meus Catálogos ──────────────────────────────────────────── */}
        {!showForm && activeSection === 'cat' && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>
            <section>
              <SectionTitle>Meus Catálogos</SectionTitle>

              {carregando ? (
                <p style={{ fontSize: 14, color: 'var(--muted)' }}>Carregando...</p>
              ) : catalogos.length === 0 ? (
                <div style={{
                  background: 'var(--navy-2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '32px 24px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                    Nenhum catálogo salvo ainda.{' '}
                    <button
                      onClick={handleNovaGeracao}
                      style={{ background: 'none', border: 'none', color: 'var(--blue-glow)', cursor: 'pointer', fontSize: 14, padding: 0 }}
                    >
                      Crie sua primeira geração →
                    </button>
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 12,
                }}>
                  {catalogos.map(cat => (
                    <div
                      key={cat.id}
                      style={{
                        background: 'var(--navy-2)', border: '1px solid var(--border)',
                        borderRadius: 12, padding: '16px 18px',
                        display: 'flex', flexDirection: 'column', gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>
                          {cat.nome}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {cat.produtos.length} produto{cat.produtos.length !== 1 ? 's' : ''}{' '}
                          · {cat.regime_tributario}{' '}
                          · {new Date(cat.atualizado_em).toLocaleDateString('pt-BR')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleUsarCatalogo(cat)}
                          style={{
                            flex: 1, padding: '8px 0',
                            borderRadius: 8, border: '1px solid rgba(37,99,235,0.35)',
                            background: 'rgba(37,99,235,0.1)',
                            color: 'var(--blue-glow)', fontSize: 13, fontWeight: 500,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          Usar →
                        </button>

                        {deletandoId === cat.id ? (
                          <>
                            <button
                              onClick={() => handleDeleteCatalogo(cat.id)}
                              style={{
                                padding: '8px 12px', borderRadius: 8,
                                border: '1px solid rgba(248,113,113,0.45)',
                                background: 'rgba(248,113,113,0.1)',
                                color: '#f87171', fontSize: 13, fontWeight: 500,
                                cursor: 'pointer', whiteSpace: 'nowrap' as const,
                              }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeletandoId(null)}
                              style={{
                                padding: '8px 10px', borderRadius: 8,
                                border: '1px solid var(--border)', background: 'transparent',
                                color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeletandoId(cat.id)}
                            style={{
                              padding: '8px 12px', borderRadius: 8,
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Adicionar produtos novos */}
            <section>
              <div style={{
                background: 'var(--navy-2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '20px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>➕</span>
                    <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>
                      Adicionar produtos novos
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                    Adicione novos produtos a um canal onde você já tem produtos cadastrados
                  </p>
                </div>
                <Link
                  href="/adicionar-produtos"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 18px', borderRadius: 10,
                    background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)',
                    color: 'var(--blue-glow)', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', whiteSpace: 'nowrap' as const, flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  Começar →
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* ── Histórico ───────────────────────────────────────────────── */}
        {!showForm && activeSection === 'hist' && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
            <SectionTitle>Histórico de Gerações</SectionTitle>

            {carregando ? (
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>Carregando...</p>
            ) : geracoes.length === 0 ? (
              <div style={{
                background: 'var(--navy-2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '24px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                  Nenhuma geração registrada ainda.
                </p>
              </div>
            ) : (
              <div style={{
                background: 'var(--navy-2)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                {geracoes.map((g, i) => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '12px 18px',
                      borderBottom: i < geracoes.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' as const, minWidth: 80 }}>
                      {new Date(g.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--white)', whiteSpace: 'nowrap' as const, minWidth: 90 }}>
                      {g.total_produtos} produto{g.total_produtos !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                      {g.canais.map(canal => {
                        const info = CANAL_LABEL[canal]
                        if (!info) return null
                        return (
                          <span
                            key={canal}
                            style={{
                              fontSize: 11, fontWeight: 600,
                              color: info.color, background: info.bg,
                              padding: '2px 8px', borderRadius: 20,
                            }}
                          >
                            {info.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Meu Plano ───────────────────────────────────────────────── */}
        {!showForm && activeSection === 'plan' && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
            <SectionTitle>Meu Plano</SectionTitle>

            <div style={{
              background: 'var(--navy-2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
                  borderRadius: 8, padding: '4px 14px',
                  fontSize: 12, fontWeight: 700, color: 'var(--blue-glow)',
                }}>
                  Free
                </span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Plano atual</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 10,
              }}>
                {[
                  { valor: catalogos.length,        label: 'catálogos salvos'     },
                  { valor: geracoes.length,          label: 'gerações realizadas'  },
                  { valor: totalProdutosProcessados, label: 'produtos processados' },
                ].map(({ valor, label }) => (
                  <div
                    key={label}
                    style={{
                      background: 'var(--navy)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '14px 16px', textAlign: 'center' as const,
                    }}
                  >
                    <div className="font-display" style={{ fontSize: 26, fontWeight: 800, color: 'var(--white)' }}>
                      {valor}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
