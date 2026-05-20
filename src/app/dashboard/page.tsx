'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--navy)' }}>
      <div className="text-center">
        <div style={{ width: 64, height: 64, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 24px' }}>⚡</div>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, color: 'var(--white)', marginBottom: 12 }}>
          Bem-vindo à Listify
        </h1>
        <p style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 32 }}>
          Seu dashboard está sendo construído. Em breve você poderá gerenciar seus produtos aqui.
        </p>
        <button
          onClick={handleSignOut}
          className="btn-secondary"
          style={{ padding: '10px 24px', fontSize: 14 }}
        >
          Sair
        </button>
      </div>
    </main>
  )
}
