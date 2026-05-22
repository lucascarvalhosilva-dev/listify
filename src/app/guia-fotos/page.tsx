'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const FAKE_FILES = ['80171_01.jpg', '80171_02.jpg', '80171_03.jpg']

const RESOLUTION_TABLE = [
  { canal: 'Shopee',        res: '500×500px' },
  { canal: 'Mercado Livre', res: '500×500px' },
  { canal: 'Amazon',        res: '1000×1000px' },
  { canal: 'TikTok Shop',   res: '300×300px' },
]

export default function GuiaFotosPage() {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
      setChecked(true)
    })
  }, [])

  return (
    <main className="bg-[#f8f9fa] min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#202124]">Como preparar suas fotos</h1>
          <p className="text-sm text-[#5f6368] mt-1 leading-relaxed">
            Siga este guia uma vez e a Listify vai usar suas fotos automaticamente em todas as gerações.
          </p>
        </div>

        {/* Section 1 */}
        <div className="bg-white rounded-2xl border border-[#e8eaed] p-6 mb-4">
          <h2 className="text-[15px] font-semibold text-[#202124] mb-3">1. Nomenclatura dos arquivos</h2>
          <p className="text-sm text-[#5f6368] leading-relaxed mb-4">
            Cada foto deve ser nomeada com o{' '}
            <strong className="text-[#202124]">SKU do produto</strong>{' '}
            seguido de um número sequencial. A foto principal deve ser{' '}
            <code className="font-mono text-[13px] bg-[#f1f3f4] rounded-lg px-2 py-0.5">SKU_01.jpg</code>,
            a segunda{' '}
            <code className="font-mono text-[13px] bg-[#f1f3f4] rounded-lg px-2 py-0.5">SKU_02.jpg</code>{' '}
            e assim por diante.
          </p>
          <div className="bg-[#f8f9fa] rounded-xl p-4 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider">Exemplo</span>
            {FAKE_FILES.map((name, i) => (
              <div key={name} className="flex items-center gap-2">
                <span>🖼️</span>
                <code className="font-mono text-[13px] bg-[#f1f3f4] rounded-lg px-3 py-1 inline-block text-[#202124]">
                  {name}
                </code>
                {i === 0 && (
                  <span className="text-[10px] font-semibold text-[#1a73e8] bg-[#e8f0fe] rounded px-1.5 py-0.5">
                    capa
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-white rounded-2xl border border-[#e8eaed] p-6 mb-4">
          <h2 className="text-[15px] font-semibold text-[#202124] mb-3">2. Organizando no Google Drive</h2>
          <div className="flex flex-col gap-3">
            {[
              'Crie uma pasta com o nome da sua loja',
              'Coloque todas as fotos na pasta — sem subpastas',
              'Clique com o botão direito → Compartilhar → Qualquer pessoa com o link → Visualizador',
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#e8f0fe] text-[#1a73e8] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <span className="text-sm text-[#5f6368] leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-white rounded-2xl border border-[#e8eaed] p-6 mb-4">
          <h2 className="text-[15px] font-semibold text-[#202124] mb-3">3. Testando seu link</h2>
          <div className="bg-[#fef7e0] border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800 leading-relaxed m-0">
              Abra o link em uma aba anônima. Se pedir login, o compartilhamento não está correto — refaça as permissões.
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="bg-white rounded-2xl border border-[#e8eaed] p-6 mb-6">
          <h2 className="text-[15px] font-semibold text-[#202124] mb-3">4. Resolução mínima por canal</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8f9fa]">
                <th className="text-[#5f6368] font-semibold text-xs uppercase tracking-wide py-2 px-3 text-left">Canal</th>
                <th className="text-[#5f6368] font-semibold text-xs uppercase tracking-wide py-2 px-3 text-left">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {RESOLUTION_TABLE.map((row, i) => (
                <tr key={row.canal} className={i % 2 !== 0 ? 'bg-[#f8f9fa]/60' : ''}>
                  <td className="py-2 px-3 text-[#202124]">{row.canal}</td>
                  <td className="py-2 px-3 text-[#5f6368] tabular-nums">{row.res}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          type="button"
          onClick={() => checked && router.push(loggedIn ? '/onboarding' : '/cadastro')}
          className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl h-11"
        >
          Estou pronto →
        </Button>

      </div>
    </main>
  )
}
