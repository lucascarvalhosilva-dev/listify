'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '../components/Logo'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #e8eaed',
  fontSize: 14,
  color: '#202124',
  marginBottom: 16,
  outline: 'none',
  background: '#ffffff',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#5f6368',
  marginBottom: 6,
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      setError('Email ou senha inválidos.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completo')
      .eq('id', data.user.id)
      .maybeSingle()

    if ((profile as { onboarding_completo?: boolean } | null)?.onboarding_completo) {
      router.push('/')
    } else {
      router.push('/onboarding')
    }
    router.refresh()
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#ffffff', borderRadius: 20, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '40px 48px' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 4 }}><span style={{fontWeight:800,fontSize:'26px',letterSpacing:'-0.5px',lineHeight:'1',fontStyle:'normal'}}><span style={{color:'#202124'}}>Gu</span><span style={{color:'#1a73e8'}}>ia</span><span style={{color:'#202124'}}>mos</span></span></div>
          <p style={{ fontSize: 14, color: '#5f6368' }}>Acesse sua conta</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="on" style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.12)')}
            onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
          />

          <label htmlFor="password" style={labelStyle}>Senha</label>
          <input
            id="password"
            name="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.12)')}
            onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
          />

          {error && (
            <p style={{ fontSize: 13, color: '#ea4335', marginBottom: 8 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 48, borderRadius: 12,
              background: '#1a73e8', color: '#ffffff', border: 'none',
              fontSize: 15, fontWeight: 600, marginTop: 8,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.75 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: '#9aa0a6', textAlign: 'center', marginTop: 20 }}>
          Não tem conta?{' '}
          <Link href="/cadastro" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500 }}>
            Cadastre-se
          </Link>
        </p>
      </div>
    </main>
  )
}
