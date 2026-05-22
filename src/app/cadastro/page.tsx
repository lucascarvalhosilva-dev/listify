'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      await supabase.from('profiles').update({ regime_tributario: regimeTributario }).eq('id', data.user.id)
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
      <main className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#e8eaed] shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-[#e8f0fe] rounded-xl flex items-center justify-center text-2xl mx-auto mb-4">✉️</div>
          <h2 className="font-semibold text-lg text-[#202124] mb-2">Verifique seu email</h2>
          <p className="text-sm text-[#5f6368] leading-relaxed">
            Enviamos um link de confirmação para{' '}
            <strong className="text-[#202124]">{email}</strong>.{' '}
            Verifique sua caixa de entrada para confirmar o cadastro.
          </p>
          <div className="mt-6">
            <Link href="/login" className="text-sm text-[#1a73e8] font-medium">
              ← Ir para o login
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#e8eaed] shadow-sm p-8">
        <div className="mb-6">
          <h1 className="font-bold text-xl text-[#202124]">Listify</h1>
          <p className="text-sm text-[#5f6368] mt-1">
            Criar conta ·{' '}
            <Link href="/login" className="text-[#1a73e8] font-medium">Entrar</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email" className="text-[#5f6368]">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-[#5f6368]">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-[#5f6368]">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[#5f6368]">Regime tributário</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(['MEI', 'Simples Nacional'] as const).map(r => {
                const active = regimeTributario === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegimeTributario(r)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-[#e8f0fe] border-[#1a73e8] text-[#1a73e8] font-semibold'
                        : 'bg-[#f8f9fa] border-[#e8eaed] text-[#5f6368]'
                    }`}
                  >
                    <div className="text-sm font-medium">{r}</div>
                    <div className="text-xs mt-0.5 opacity-70">
                      {r === 'MEI' ? 'Até R$81k/ano' : 'CNPJ com contabilidade'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl h-11 mt-2"
          >
            {loading ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </form>
      </div>
    </main>
  )
}
