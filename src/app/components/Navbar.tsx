'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from './Logo'

export default function Navbar() {
  const [userEmail, setUserEmail] = useState('')
  const [nomeExibicao, setNomeExibicao] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setUserEmail(session.user.email)
        const perfilRes = await fetch('/api/get-profile')
        if (perfilRes.ok) {
          const perfil = await perfilRes.json()
          if (perfil.nome) setNomeExibicao(perfil.nome)
        }
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = nomeExibicao || (userEmail ? userEmail.split('@')[0] : '')
  const inicial = displayName ? displayName[0].toUpperCase() : '?'

  const tabs = [
    { label: 'Nova Geração', href: '/painel' },
    { label: 'Meus Catálogos', href: '/painel?aba=catalogos' },
    { label: 'Histórico', href: '/painel?aba=historico' },
    { label: 'Meu Plano', href: '/painel?aba=plano' },
  ]

  return (
    <>
      <style>{`
        .navbar { background: #fff; border-bottom: 1px solid #e8eaed; position: sticky; top: 0; z-index: 50; }
        .navbar-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .navbar-logo { font-size: 18px; font-weight: 700; color: #1a73e8; text-decoration: none; flex-shrink: 0; }
        .navbar-tabs { display: flex; align-items: center; gap: 2px; flex: 1; }
        .navbar-tab { font-size: 14px; font-weight: 500; color: #5f6368; text-decoration: none; padding: 6px 14px; border-radius: 8px; white-space: nowrap; transition: background .15s, color .15s; }
        .navbar-tab:hover { background: #f8f9fa; color: #202124; }
        .navbar-tab.active { background: #e8f0fe; color: #1a73e8; }
        .navbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; position: relative; }
        .navbar-user { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 10px; cursor: pointer; border: none; background: transparent; }
        .navbar-user:hover { background: #f8f9fa; }
        .navbar-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1a73e8; color: #fff; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .navbar-username { font-size: 14px; font-weight: 500; color: #202124; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .navbar-chevron { font-size: 10px; color: #5f6368; }
        .navbar-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border: 1px solid #e8eaed; border-radius: 14px; padding: 8px; min-width: 200px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); z-index: 100; }
        .dropdown-email { font-size: 12px; color: #5f6368; padding: 8px 12px 12px; border-bottom: 1px solid #e8eaed; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dropdown-link { display: block; font-size: 14px; color: #202124; text-decoration: none; padding: 9px 12px; border-radius: 8px; }
        .dropdown-link:hover { background: #f8f9fa; }
        .dropdown-divider { height: 1px; background: #e8eaed; margin: 8px 0; }
        .dropdown-logout { display: block; width: 100%; text-align: left; font-size: 14px; color: #ea4335; padding: 9px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; font-family: inherit; }
        .dropdown-logout:hover { background: #fce8e6; }
        @media (max-width: 768px) {
          .navbar-tabs { display: none; }
          .navbar-username { display: none; }
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/painel" className="navbar-logo"><Logo /></Link>

          <div className="navbar-tabs">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`navbar-tab ${pathname === tab.href || (tab.href === '/painel' && pathname === '/painel' && !tab.href.includes('?')) ? 'active' : ''}`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="navbar-right">
            <button
              className="navbar-user"
              onClick={() => setMenuAberto(!menuAberto)}
            >
              <div className="navbar-avatar">{inicial}</div>
              <span className="navbar-username">{displayName}</span>
              <span className="navbar-chevron">{menuAberto ? '▲' : '▼'}</span>
            </button>

            {menuAberto && (
              <div className="navbar-dropdown">
                <div className="dropdown-email">{userEmail}</div>
                <Link href="/configuracoes" className="dropdown-link" onClick={() => setMenuAberto(false)}>
                  Configurações
                </Link>
                <Link href="/upgrade" className="dropdown-link" onClick={() => setMenuAberto(false)}>
                  Fazer upgrade
                </Link>
                <div className="dropdown-divider" />
                <button className="dropdown-logout" onClick={handleLogout}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
