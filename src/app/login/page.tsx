'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha inválidos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--navy)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div style={{ width: 40, height: 40, background: 'var(--blue)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 16px' }}>⚡</div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--white)', marginBottom: 6 }}>Entrar na Listify</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Não tem conta?{' '}
            <Link href="/cadastro" style={{ color: 'var(--blue-glow)', textDecoration: 'none', fontWeight: 500 }}>
              Criar conta
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
              placeholder="••••••••"
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
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
