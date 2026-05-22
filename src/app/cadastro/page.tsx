'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: '#ffffff',
  borderRadius: 20,
  border: '1px solid #e8eaed',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  padding: '40px 48px',
}

export default function CadastroPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [regimeTributario, setRegimeTributario] = useState('MEI')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, regime_tributario: regimeTributario })
    }

    if (data.session) {
      router.push('/onboarding')
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>✉️</div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#202124', marginBottom: 8 }}>Verifique seu email</h2>
          <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.6 }}>
            Enviamos um link de confirmação para{' '}
            <strong style={{ color: '#202124' }}>{email}</strong>.{' '}
            Verifique sua caixa de entrada para confirmar o cadastro.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link href="/login" style={{ fontSize: 13, color: '#1a73e8', fontWeight: 500, textDecoration: 'none' }}>
              ← Ir para o login
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={cardStyle}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 4 }}><span style={{fontWeight:800,fontSize:'26px',letterSpacing:'-0.5px',lineHeight:'1',fontStyle:'normal'}}><span style={{color:'#202124'}}>Gu</span><span style={{color:'#1a73e8'}}>ia</span><span style={{color:'#202124'}}>mos</span></span></div>
          <p style={{ fontSize: 14, color: '#5f6368' }}>
            Criar conta ·{' '}
            <Link href="/login" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500 }}>Entrar</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            type="email"
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
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.12)')}
            onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
          />

          <label htmlFor="confirmPassword" style={labelStyle}>Confirmar senha</label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.12)')}
            onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
          />

          <label style={{ ...labelStyle, marginBottom: 8 }}>Regime tributário</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {(['MEI', 'Simples Nacional'] as const).map(r => {
              const active = regimeTributario === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegimeTributario(r)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: active ? '1.5px solid #1a73e8' : '1px solid #e8eaed',
                    background: active ? '#e8f0fe' : '#f8f9fa',
                    color: active ? '#1a73e8' : '#5f6368',
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    textAlign: 'left' as const,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: active ? 600 : 500 }}>{r}</div>
                  <div style={{ fontSize: 11, marginTop: 3, opacity: 0.75 }}>
                    {r === 'MEI' ? 'Até R$81k/ano' : 'CNPJ com contabilidade'}
                  </div>
                </button>
              )
            })}
          </div>

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
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: '#9aa0a6', textAlign: 'center', marginTop: 20 }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500 }}>
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
