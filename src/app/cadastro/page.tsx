'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--navy)' }}>
        <div className="w-full max-w-sm text-center">
          <div style={{ width: 56, height: 56, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>✉️</div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--white)', marginBottom: 10 }}>Verifique seu email</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            Enviamos um link de confirmação para <strong style={{ color: 'var(--white)' }}>{email}</strong>. Verifique sua caixa de entrada para confirmar o cadastro.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link href="/login" style={{ color: 'var(--blue-glow)', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
              ← Ir para o login
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--navy)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div style={{ width: 40, height: 40, background: 'var(--blue)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 16px' }}>⚡</div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--white)', marginBottom: 6 }}>Criar conta</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Já tem conta?{' '}
            <Link href="/login" style={{ color: 'var(--blue-glow)', textDecoration: 'none', fontWeight: 500 }}>
              Entrar
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                background: 'var(--navy-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 15,
                color: 'var(--white)',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Senha</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              style={{
                background: 'var(--navy-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 15,
                color: 'var(--white)',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="confirmPassword" style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Confirmar senha</label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              style={{
                background: 'var(--navy-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 15,
                color: 'var(--white)',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '10px 14px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>
      </div>
    </main>
  )
}
