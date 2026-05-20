'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProductForm from './components/ProductForm'

export default function DashboardPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,14,30,0.8)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--blue)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>⚡</div>
            <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--white)' }}>
              Listify
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="btn-secondary"
            style={{ padding: '8px 18px', fontSize: 13 }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        {showForm ? (
          <ProductForm onBack={() => setShowForm(false)} />
        ) : (
          <WelcomeCard onStart={() => setShowForm(true)} />
        )}
      </main>
    </div>
  )
}

function WelcomeCard({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
      <div style={{
        background: 'var(--navy-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '48px 40px',
      }}>
        <div style={{
          width: 56, height: 56,
          background: 'rgba(37,99,235,0.15)',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
          margin: '0 auto 24px',
        }}>📦</div>

        <h1 className="font-display" style={{
          fontSize: 24, fontWeight: 800,
          color: 'var(--white)',
          marginBottom: 10,
          letterSpacing: '-0.02em',
        }}>
          Cadastrar produtos em massa
        </h1>

        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
          Envie sua planilha de produtos, configure os canais e a IA gera tudo automaticamente.
        </p>

        <button onClick={onStart} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Iniciar cadastro
        </button>
      </div>
    </div>
  )
}
