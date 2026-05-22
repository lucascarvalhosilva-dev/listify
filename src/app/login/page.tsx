'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

    router.push('/painel')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#e8eaed] shadow-sm p-8">
        <div className="mb-6">
          <h1 className="font-bold text-xl text-[#202124]">Listify</h1>
          <p className="text-sm text-[#5f6368] mt-1">Acesse sua conta</p>
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
              placeholder="••••••••"
              className="mt-1"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl h-11 mt-2"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-sm text-[#5f6368] text-center mt-4">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-[#1a73e8]">
            Cadastre-se
          </Link>
        </p>
      </div>
    </main>
  )
}
