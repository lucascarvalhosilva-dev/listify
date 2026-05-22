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
        router.replace('/painel')
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
    router.push('/painel')
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
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              Bem-vindo à Guiamos
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 32 }}>
              Em poucos minutos você vai ter arquivos prontos para publicar seus produtos em qualquer marketplace. Deixa a gente te mostrar como funciona.
            </p>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Próximo →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M3 15h18M9 3v18"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              1. A planilha de produtos
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 16 }}>
              Para começar, você vai baixar nosso template Excel e preencher com as informações dos seus produtos — nome, custo e estoque. Depois é só fazer o upload aqui na plataforma.
            </p>
            <div style={{ background: '#e8f0fe', borderRadius: 10, padding: 12, marginBottom: 32 }}>
              <p style={{ fontSize: 13, color: '#1a73e8', margin: 0, lineHeight: 1.6 }}>
                Precisamos de: nome do produto, custo unitário, quantidade em estoque e regime tributário (MEI ou Simples Nacional).
              </p>
            </div>
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
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              2. Suas fotos no Google Drive
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 4 }}>
              As fotos precisam estar numa pasta do Google Drive com acesso público. Cada arquivo deve seguir o padrão de nomenclatura SKU_01.jpg (capa), SKU_02.jpg...
            </p>
            <button
              type="button"
              onClick={() => window.open('/guia-fotos', '_blank')}
              style={{ background: 'none', border: '1px solid #1a73e8', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#1a73e8', cursor: 'pointer', marginTop: 12, marginBottom: 32 }}
            >
              Ver guia completo de fotos →
            </button>
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
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div>
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              3. Geração e revisão
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 20 }}>
              Você escolhe os canais onde quer vender, a IA processa tudo e você revisa os preços e margens antes de baixar. Nenhum arquivo é gerado sem sua aprovação.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 32 }}>
              {[
                'Preços calculados com comissões e impostos por canal',
                'Revisão de dimensões e alertas de frete',
              ].map(text => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ fontSize: 13, color: '#5f6368', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
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
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div>
            <div style={{ width: 48, height: 48, background: '#e8f0fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#202124', marginBottom: 12 }}>
              Pronto para começar
            </h1>
            <p style={{ fontSize: 14, color: '#5f6368', lineHeight: 1.7, marginBottom: 32 }}>
              Se der algum erro no upload, nosso assistente te guia na correção e gera uma nova planilha automaticamente. Tudo que você gerar fica salvo no histórico para reutilizar quando quiser.
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
                {saving ? 'Carregando…' : 'Entendi, vamos começar →'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#9aa0a6', textAlign: 'center' as const, marginTop: 20 }}>
              Você pode revisar este guia a qualquer momento em Ajuda
            </p>
          </div>
        )}

      </div>
    </main>
  )
}
