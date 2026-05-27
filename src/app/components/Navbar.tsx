'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, CircleDollarSign, CreditCard, FolderOpen, LogOut, MessageCircle, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type NavbarProps = {
  activeAba?: string
}

export default function Navbar({ activeAba = '' }: NavbarProps) {
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
    { label: 'Chat', href: '/', icon: MessageCircle },
    { label: 'Meus Catálogos', href: '/painel?aba=catalogos', aba: 'catalogos', icon: FolderOpen },
    { label: 'Preços', href: '/precos', icon: CircleDollarSign },
    { label: 'Meu Plano', href: '/upgrade', icon: CreditCard },
  ]

  const isTabActive = (tab: (typeof tabs)[number]) => {
    if (tab.href === '/') return pathname === '/'
    if ('aba' in tab) return pathname === '/painel' && activeAba === tab.aba
    return pathname === tab.href
  }

  return (
    <>
      <style>{`
        .navbar { background: rgba(255,255,255,0.88); backdrop-filter: blur(18px); border-bottom: 1px solid rgba(207,216,228,0.75); position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 0 rgba(15,23,42,0.03); }
        .navbar-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .navbar-logo { font-size: 26px; font-weight: 800; text-decoration: none; flex-shrink: 0; display: flex; align-items: baseline; gap: 0; }
        .navbar-tabs { display: flex; align-items: center; gap: 6px; flex: 1; }
        .navbar-tab { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600; color: #586174; text-decoration: none; padding: 8px 12px; border-radius: 12px; white-space: nowrap; transition: background .18s, color .18s, box-shadow .18s, transform .18s; }
        .navbar-tab:hover { background: #f3f6fb; color: #182233; transform: translateY(-1px); }
        .navbar-tab.active { background: #eaf2ff; color: #155bd5; box-shadow: inset 0 0 0 1px rgba(26,115,232,0.12), 0 6px 18px rgba(26,115,232,0.10); }
        .navbar-tab-icon { width: 16px; height: 16px; }
        .navbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; position: relative; }
        .navbar-user { display: flex; align-items: center; gap: 10px; padding: 6px 8px 6px 6px; border-radius: 14px; cursor: pointer; border: 1px solid transparent; background: transparent; transition: background .18s, border-color .18s, box-shadow .18s; }
        .navbar-user:hover { background: #ffffff; border-color: #e2e8f0; box-shadow: 0 8px 22px rgba(15,23,42,0.07); }
        .navbar-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #1a73e8 0%, #0f9f75 100%); color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 8px 18px rgba(26,115,232,0.22); }
        .navbar-username { font-size: 14px; font-weight: 600; color: #182233; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .navbar-chevron { color: #697386; display: inline-flex; transition: transform .18s; }
        .navbar-chevron.open { transform: rotate(180deg); }
        .navbar-dropdown { position: absolute; top: calc(100% + 10px); right: 0; background: rgba(255,255,255,0.96); backdrop-filter: blur(18px); border: 1px solid #e2e8f0; border-radius: 16px; padding: 8px; min-width: 224px; box-shadow: 0 18px 42px rgba(15,23,42,0.13); z-index: 100; }
        .dropdown-email { font-size: 12px; color: #697386; padding: 8px 12px 12px; border-bottom: 1px solid #e8edf4; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dropdown-main-links { display: none; }
        .dropdown-link { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; color: #263241; text-decoration: none; padding: 10px 12px; border-radius: 10px; transition: background .15s, color .15s; }
        .dropdown-link:hover { background: #f4f7fb; color: #155bd5; }
        .dropdown-icon { width: 16px; height: 16px; color: currentColor; }
        .dropdown-divider { height: 1px; background: #e8edf4; margin: 8px 0; }
        .dropdown-logout { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; font-size: 14px; font-weight: 600; color: #c5221f; padding: 10px 12px; border-radius: 10px; border: none; background: transparent; cursor: pointer; font-family: inherit; }
        .dropdown-logout:hover { background: #fef2f2; }
        @media (max-width: 768px) {
          .navbar-tabs { display: none; }
          .navbar-username { display: none; }
          .dropdown-main-links { display: block; }
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/" className="navbar-logo"><span style={{letterSpacing:'-0.5px'}}><span style={{color:'#202124'}}>Gu</span><span style={{color:'#1a73e8'}}>ia</span><span style={{color:'#202124'}}>mos</span></span></Link>

          <div className="navbar-tabs">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`navbar-tab ${isTabActive(tab) ? 'active' : ''}`}
              >
                <tab.icon className="navbar-tab-icon" strokeWidth={2.2} />
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
              <span className={`navbar-chevron ${menuAberto ? 'open' : ''}`}>
                <ChevronDown size={15} strokeWidth={2.4} />
              </span>
            </button>

            {menuAberto && (
              <div className="navbar-dropdown">
                <div className="dropdown-email">{userEmail}</div>
                <div className="dropdown-main-links">
                  {tabs.map(tab => (
                    <Link key={tab.href} href={tab.href} className="dropdown-link" onClick={() => setMenuAberto(false)}>
                      <tab.icon className="dropdown-icon" strokeWidth={2.2} />
                      {tab.label}
                    </Link>
                  ))}
                  <div className="dropdown-divider" />
                </div>
                <Link href="/configuracoes" className="dropdown-link" onClick={() => setMenuAberto(false)}>
                  <Settings className="dropdown-icon" strokeWidth={2.2} />
                  Configurações
                </Link>
                <Link href="/upgrade" className="dropdown-link" onClick={() => setMenuAberto(false)}>
                  <CreditCard className="dropdown-icon" strokeWidth={2.2} />
                  Fazer upgrade
                </Link>
                <div className="dropdown-divider" />
                <button className="dropdown-logout" onClick={handleLogout}>
                  <LogOut className="dropdown-icon" strokeWidth={2.2} />
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
