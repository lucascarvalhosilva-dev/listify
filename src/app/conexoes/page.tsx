'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Circle, Store, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/app/components/Navbar'

interface MlConta {
  nickname: string
  ml_user_id: string
}

function ConexoesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [conta, setConta] = useState<MlConta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [desconectando, setDesconectando] = useState(false)

  const [blingConectado, setBlingConectado] = useState(false)
  const [blingCarregando, setBlingCarregando] = useState(true)
  const [desconectandoBling, setDesconectandoBling] = useState(false)

  const bannerInicial =
    searchParams.get('ml') === 'conectado' ? 'Mercado Livre' :
    searchParams.get('bling') === 'conectado' ? 'Bling' : null
  const [banner, setBanner] = useState<string | null>(bannerInicial)

  useEffect(() => {
    if (banner) {
      const t = setTimeout(() => setBanner(null), 4000)
      return () => clearTimeout(t)
    }
  }, [banner])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const [mlResult, blingResult] = await Promise.all([
        supabase
          .from('ml_contas')
          .select('nickname, ml_user_id')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('bling_contas')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ])

      setConta(mlResult.data ?? null)
      setCarregando(false)
      setBlingConectado(!!blingResult.data)
      setBlingCarregando(false)
    }
    init()
  }, [])

  const handleDesconectar = async () => {
    setDesconectando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('ml_contas').delete().eq('user_id', session.user.id)
    }
    setConta(null)
    setDesconectando(false)
  }

  const handleDesconectarBling = async () => {
    setDesconectandoBling(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('bling_contas').delete().eq('user_id', session.user.id)
    }
    setBlingConectado(false)
    setDesconectandoBling(false)
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid #dfe7f1',
    borderRadius: 18,
    padding: 24,
    boxShadow: '0 10px 30px rgba(15,23,42,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(26,115,232,0.08), transparent 30%), linear-gradient(180deg, #f5f8fc 0%, #f8fafc 46%, #ffffff 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: 720, margin: '0 auto', padding: '44px 24px 72px', width: '100%' }}>

        {banner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#ecfdf5', border: '1px solid #6ee7b7',
            borderRadius: 12, padding: '12px 16px', marginBottom: 28,
            fontSize: 14, fontWeight: 600, color: '#065f46',
          }}>
            <CheckCircle2 size={18} strokeWidth={2.2} style={{ color: '#0f9f75', flexShrink: 0 }} />
            {banner} conectado com sucesso!
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182233', margin: 0 }}>Conexões</h1>
          <p style={{ fontSize: 14, color: '#697386', margin: '8px 0 0', lineHeight: 1.6 }}>
            Gerencie as contas de marketplace conectadas ao Guiamos.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Mercado Livre */}
          <div style={cardStyle}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: conta ? '#ecfdf5' : '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Store size={22} strokeWidth={2.1} style={{ color: conta ? '#0f9f75' : '#94a3b8' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#182233', marginBottom: 4 }}>
                Mercado Livre
              </div>
              {carregando ? (
                <div style={{ fontSize: 13, color: '#697386' }}>Carregando...</div>
              ) : conta ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <CheckCircle2 size={14} strokeWidth={2.3} style={{ color: '#0f9f75', flexShrink: 0 }} />
                  <span style={{ color: '#0f9f75', fontWeight: 600 }}>Conectado</span>
                  <span style={{ color: '#697386' }}>·</span>
                  <span style={{ color: '#697386', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conta.nickname}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#697386' }}>
                  <Circle size={14} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  Não conectado
                </div>
              )}
            </div>

            {!carregando && (
              conta ? (
                <button
                  onClick={handleDesconectar}
                  disabled={desconectando}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 14px', borderRadius: 12, flexShrink: 0,
                    border: '1px solid #fca5a5', background: '#fef2f2',
                    color: '#c5221f', fontSize: 13, fontWeight: 700,
                    cursor: desconectando ? 'not-allowed' : 'pointer',
                    opacity: desconectando ? 0.6 : 1,
                  }}
                >
                  <Unlink size={14} strokeWidth={2.2} />
                  {desconectando ? 'Desconectando...' : 'Desconectar'}
                </button>
              ) : (
                <a
                  href="/api/ml/auth"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #1a73e8 0%, #155bd5 100%)',
                    border: '1px solid #1a73e8',
                    color: '#ffffff', fontSize: 13, fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 10px 22px rgba(26,115,232,0.20)',
                  }}
                >
                  <Store size={14} strokeWidth={2.2} />
                  Conectar
                </a>
              )
            )}
          </div>

          {/* Bling */}
          <div style={cardStyle}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: blingConectado ? '#ecfdf5' : '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Store size={22} strokeWidth={2.1} style={{ color: blingConectado ? '#0f9f75' : '#94a3b8' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#182233', marginBottom: 4 }}>
                Bling
              </div>
              {blingCarregando ? (
                <div style={{ fontSize: 13, color: '#697386' }}>Carregando...</div>
              ) : blingConectado ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <CheckCircle2 size={14} strokeWidth={2.3} style={{ color: '#0f9f75', flexShrink: 0 }} />
                  <span style={{ color: '#0f9f75', fontWeight: 600 }}>Conectado</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#697386' }}>
                  <Circle size={14} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  Não conectado
                </div>
              )}
            </div>

            {!blingCarregando && (
              blingConectado ? (
                <button
                  onClick={handleDesconectarBling}
                  disabled={desconectandoBling}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 14px', borderRadius: 12, flexShrink: 0,
                    border: '1px solid #fca5a5', background: '#fef2f2',
                    color: '#c5221f', fontSize: 13, fontWeight: 700,
                    cursor: desconectandoBling ? 'not-allowed' : 'pointer',
                    opacity: desconectandoBling ? 0.6 : 1,
                  }}
                >
                  <Unlink size={14} strokeWidth={2.2} />
                  {desconectandoBling ? 'Desconectando...' : 'Desconectar'}
                </button>
              ) : (
                <a
                  href="/api/bling/auth"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #1a73e8 0%, #155bd5 100%)',
                    border: '1px solid #1a73e8',
                    color: '#ffffff', fontSize: 13, fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 10px 22px rgba(26,115,232,0.20)',
                  }}
                >
                  <Store size={14} strokeWidth={2.2} />
                  Conectar
                </a>
              )
            )}
          </div>

        </div>
      </main>
    </div>
  )
}

export default function ConexoesPage() {
  return (
    <Suspense>
      <ConexoesContent />
    </Suspense>
  )
}
