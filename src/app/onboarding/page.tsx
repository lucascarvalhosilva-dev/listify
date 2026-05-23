'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completo')
        .eq('id', user.id)
        .maybeSingle()

      if ((profile as { onboarding_completo?: boolean } | null)?.onboarding_completo) {
        router.replace('/chat')
        return
      }

      setLoading(false)
    }
    check()
  }, [router])

  async function handleReady() {
    if (!userId) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .upsert({
        id: userId,
        onboarding_completo: true,
        fotos_prontas: true,
      })
    router.push('/chat')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <style>{`@keyframes ob-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 28, height: 28,
          border: '3px solid #e8eaed', borderTop: '3px solid #1a73e8',
          borderRadius: '50%', animation: 'ob-spin 0.8s linear infinite',
        }} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div style={{ width: '100%', maxWidth: 420, background: '#ffffff', borderRadius: 20, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '40px 48px' }}>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: n === step ? '#1a73e8' : '#e8eaed',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 20 }}>👋</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              Bem-vindo ao Guiamos!
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 32 }}>
              Sou a IA que vai te ajudar a cadastrar seus produtos em marketplaces como Shopee, Mercado Livre, Amazon e mais — em minutos, não em horas.
            </p>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Como funciona?
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              Tudo começa com uma conversa
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 32 }}>
              Diferente de outras ferramentas, no Guiamos você não precisa preencher formulários complicados. Basta conversar comigo no chat e eu te guio em cada etapa do processo.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: '#5f6368', fontSize: 14, cursor: 'pointer', padding: '10px 4px', whiteSpace: 'nowrap' as const }}
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                E o que mais?
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              A IA cuida do trabalho pesado
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 32 }}>
              Eu pesquiso dimensões, calculo preços com sua margem, gero títulos SEO, descrições e tudo que cada marketplace exige — automaticamente. Você só revisa e baixa o arquivo pronto.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{ background: 'none', border: 'none', color: '#5f6368', fontSize: 14, cursor: 'pointer', padding: '10px 4px', whiteSpace: 'nowrap' as const }}
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Quais canais?
              </button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div>
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              Todos os principais marketplaces
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 32 }}>
              Geramos arquivos prontos para upload em Shopee, Mercado Livre, Amazon, TikTok Shop, Magalu e Bling. Você escolhe onde quer vender.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{ background: 'none', border: 'none', color: '#5f6368', fontSize: 14, cursor: 'pointer', padding: '10px 4px', whiteSpace: 'nowrap' as const }}
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                E o que eu preciso?
              </button>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div>
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              Só preciso do mínimo de você
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 32 }}>
              Nome do produto, fotos, custo e regime tributário. O resto eu descubro sozinha. Pronto para começar?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep(4)}
                style={{ background: 'none', border: 'none', color: '#5f6368', fontSize: 14, cursor: 'pointer', padding: '10px 4px', whiteSpace: 'nowrap' as const }}
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={handleReady}
                disabled={saving}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {saving ? 'Carregando…' : 'Começar a conversar →'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
