'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

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
        .single()

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
    await supabase.from('profiles').update({ onboarding_completo: true }).eq('id', userId)
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
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e8eaed] shadow-sm p-8">
        <div className="mb-6">
          <div className="w-10 h-10 bg-[#e8f0fe] rounded-xl flex items-center justify-center text-xl mb-4">⚡</div>
          <h1 className="font-bold text-xl text-[#202124] mb-2">
            Antes de começar, uma coisa importante
          </h1>
          <p className="text-sm text-[#5f6368] leading-relaxed">
            A Listify usa suas fotos para montar os anúncios. Elas precisam estar organizadas de um jeito específico.
          </p>
        </div>

        <div className="mb-2">
          {[
            { icon: '📷', text: 'Nomear como SKU_01.jpg, SKU_02.jpg...' },
            { icon: '📁', text: 'Colocar numa pasta do Google Drive' },
            { icon: '🌐', text: "Compartilhar como 'Qualquer pessoa com o link'" },
          ].map(({ icon, text }, i, arr) => (
            <div
              key={text}
              className={`flex items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-[#e8eaed]' : ''}`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#e8f0fe] flex items-center justify-center text-[#1a73e8] flex-shrink-0 text-base">
                {icon}
              </div>
              <span className="text-sm text-[#202124]">{text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <button
            type="button"
            onClick={() => router.push('/guia-fotos')}
            className="btn-secondary w-full"
          >
            Preciso preparar — ver guia
          </button>
          <Button
            type="button"
            onClick={handleReady}
            disabled={saving}
            className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl h-11"
          >
            {saving ? 'Carregando…' : 'Já estou pronto →'}
          </Button>
        </div>
      </div>
    </main>
  )
}
