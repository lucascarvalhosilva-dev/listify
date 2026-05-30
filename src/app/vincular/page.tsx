'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/app/components/Navbar'

interface BlingOpcao {
  sku: string
  nome: string | null
  saldo: number | null
}

interface Linha {
  ml_item_id: string
  sku_base: string | null
  variation_id: number | null
  attrs: string
  sku_ml: string | null
}

interface Mapeamento {
  bling_sku: string
  ml_item_id: string
  ml_variation_id: number | null
}

function linhaKey(ml_item_id: string, variation_id: number | null): string {
  return `${ml_item_id}::${variation_id ?? 'null'}`
}

export default function MapeamentoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [carregando, setCarregando] = useState(true)
  const [blingOpcoes, setBlingOpcoes] = useState<BlingOpcao[]>([])
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [selecoes, setSelecoes] = useState<Map<string, string>>(new Map())
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/bling/mapping/candidatos')
      if (!res.ok) { setCarregando(false); return }

      const data = await res.json() as {
        bling: BlingOpcao[]
        ml: Array<{
          ml_item_id: string
          sku_base: string | null
          variations: Array<{ variation_id: number; sku: string | null; attrs: string }>
        }>
        mapeamentos: Mapeamento[]
      }

      setBlingOpcoes(data.bling)

      const novasLinhas: Linha[] = []
      for (const item of data.ml) {
        if (item.variations.length === 0) {
          novasLinhas.push({
            ml_item_id: item.ml_item_id,
            sku_base: item.sku_base,
            variation_id: null,
            attrs: item.sku_base ?? item.ml_item_id,
            sku_ml: null,
          })
        } else {
          for (const v of item.variations) {
            novasLinhas.push({
              ml_item_id: item.ml_item_id,
              sku_base: item.sku_base,
              variation_id: v.variation_id,
              attrs: v.attrs,
              sku_ml: v.sku,
            })
          }
        }
      }
      setLinhas(novasLinhas)

      const novasSelecoes = new Map<string, string>()
      for (const m of data.mapeamentos) {
        novasSelecoes.set(linhaKey(m.ml_item_id, m.ml_variation_id), m.bling_sku)
      }
      setSelecoes(novasSelecoes)
      setCarregando(false)
    }
    init()
  }, [])

  const handleSelect = (ml_item_id: string, variation_id: number | null, value: string) => {
    setSelecoes(prev => {
      const next = new Map(prev)
      next.set(linhaKey(ml_item_id, variation_id), value)
      return next
    })
  }

  const salvar = async () => {
    setSalvando(true)
    setMensagem(null)

    const mapeamentos: Mapeamento[] = []
    for (const [key, bling_sku] of selecoes) {
      if (!bling_sku) continue
      const [ml_item_id, varStr] = key.split('::')
      const ml_variation_id = varStr === 'null' ? null : Number(varStr)
      mapeamentos.push({ bling_sku, ml_item_id, ml_variation_id })
    }

    const res = await fetch('/api/bling/mapping/salvar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapeamentos }),
    })
    const body = await res.json() as { ok?: boolean; total?: number; error?: string }

    setSalvando(false)
    if (res.ok) {
      setMensagem({ tipo: 'success', texto: `${body.total ?? mapeamentos.length} relacionamento(s) salvo(s) com sucesso.` })
    } else {
      setMensagem({ tipo: 'error', texto: body.error ?? 'Erro ao salvar. Tente novamente.' })
    }
    setTimeout(() => setMensagem(null), 4000)
  }

  const contagemSku = new Map<string, number>()
  for (const val of selecoes.values()) {
    if (val) contagemSku.set(val, (contagemSku.get(val) ?? 0) + 1)
  }
  const duplicatas = new Set<string>(
    [...contagemSku.entries()].filter(([, n]) => n > 1).map(([sku]) => sku)
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(26,115,232,0.08), transparent 30%), linear-gradient(180deg, #f5f8fc 0%, #f8fafc 46%, #ffffff 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: 720, margin: '0 auto', padding: '44px 24px 96px', width: '100%' }}>

        {mensagem && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: mensagem.tipo === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${mensagem.tipo === 'success' ? '#6ee7b7' : '#fca5a5'}`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 24,
            fontSize: 14, fontWeight: 600,
            color: mensagem.tipo === 'success' ? '#065f46' : '#c5221f',
          }}>
            {mensagem.texto}
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182233', margin: 0 }}>Vincular produtos</h1>
          <p style={{ fontSize: 14, color: '#697386', margin: '8px 0 0', lineHeight: 1.6 }}>
            Vincule cada variação do Mercado Livre ao produto correspondente no Bling para sincronização automática de estoque.
          </p>
        </div>

        {carregando ? (
          <div style={{ fontSize: 14, color: '#697386', padding: '32px 0' }}>Carregando...</div>
        ) : linhas.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.92)', border: '1px solid #dfe7f1',
            borderRadius: 18, padding: '32px 24px', textAlign: 'center',
            color: '#697386', fontSize: 14,
          }}>
            Nenhum anúncio publicado no Mercado Livre encontrado. Publique produtos primeiro.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Cabeçalho */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 32px 1fr',
              gap: 12, padding: '0 20px',
              fontSize: 12, fontWeight: 700, color: '#697386',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              <span>Mercado Livre</span>
              <span />
              <span>Bling</span>
            </div>

            {linhas.map(linha => {
              const key = linhaKey(linha.ml_item_id, linha.variation_id)
              const selected = selecoes.get(key) ?? ''
              const isDuplicata = Boolean(selected && duplicatas.has(selected))
              return (
                <div key={key} style={{
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid #dfe7f1',
                  borderRadius: 14,
                  padding: '14px 20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 32px 1fr',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  {/* Lado ML */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: '#182233',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {linha.attrs}
                    </div>
                    {linha.sku_ml && (
                      <div style={{ fontSize: 12, color: '#697386', marginTop: 2 }}>
                        {linha.sku_ml}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>
                      {linha.ml_item_id}
                    </div>
                  </div>

                  {/* Seta */}
                  <div style={{ textAlign: 'center', color: '#cbd5e0', fontSize: 16, fontWeight: 700 }}>
                    →
                  </div>

                  {/* Dropdown Bling */}
                  <div>
                    <select
                      value={selected}
                      onChange={e => handleSelect(linha.ml_item_id, linha.variation_id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: `1px solid ${isDuplicata ? '#e53e3e' : selected ? '#6ee7b7' : '#dfe7f1'}`,
                        background: isDuplicata ? '#fff5f5' : selected ? '#f0fdf4' : '#f8fafc',
                        color: isDuplicata ? '#e53e3e' : selected ? '#065f46' : '#697386',
                        fontSize: 13,
                        fontWeight: selected ? 600 : 400,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="">— Não vincular —</option>
                      {blingOpcoes.map(b => (
                        <option key={b.sku} value={b.sku}>
                          {b.sku}{b.nome ? ` — ${b.nome}` : ''} (saldo {b.saldo ?? 0})
                        </option>
                      ))}
                    </select>
                    {isDuplicata && (
                      <div style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>
                        Este produto já está vinculado a outra variação
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Rodapé fixo */}
      {!carregando && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.96)',
          borderTop: '1px solid #dfe7f1',
          padding: '16px 24px',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
          backdropFilter: 'blur(8px)',
        }}>
          <a
            href="/conexoes"
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '10px 20px', borderRadius: 12,
              border: '1px solid #dfe7f1', background: '#ffffff',
              color: '#182233', fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Cancelar
          </a>
          <button
            onClick={salvar}
            disabled={salvando || duplicatas.size > 0}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '10px 24px', borderRadius: 12,
              background: (salvando || duplicatas.size > 0) ? '#94a3b8' : 'linear-gradient(135deg, #1a73e8 0%, #155bd5 100%)',
              border: '1px solid #1a73e8',
              color: '#ffffff', fontSize: 14, fontWeight: 700,
              cursor: (salvando || duplicatas.size > 0) ? 'not-allowed' : 'pointer',
            }}
          >
            {salvando ? 'Salvando...' : 'Salvar relacionamentos'}
          </button>
        </div>
      )}
    </div>
  )
}
