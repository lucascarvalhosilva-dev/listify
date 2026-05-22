'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export type SectionId = 'cat' | 'hist' | 'plan'

interface NavbarProps {
  onNovaGeracao?: () => void
  activeSection?: SectionId
  onSectionChange?: (section: SectionId) => void
}

interface Tab {
  id: string
  label: string
  icon: string
  href: string
}

const TABS: Tab[] = [
  { id: 'nova', label: 'Nova Geração',    icon: '⚡', href: '/painel' },
  { id: 'cat',  label: 'Meus Catálogos', icon: '📁', href: '/painel' },
  { id: 'hist', label: 'Histórico',       icon: '🕐', href: '/painel' },
  { id: 'plan', label: 'Meu Plano',       icon: '👤', href: '/painel' },
]

const SECTION_IDS: SectionId[] = ['cat', 'hist', 'plan']

export default function Navbar({ onNovaGeracao, activeSection, onSectionChange }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? '')
    })
  }, [])

  const activeId: string = activeSection ?? 'nova'

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleTabClick(tab: Tab) {
    setMenuOpen(false)

    if (tab.id === 'nova') {
      onNovaGeracao ? onNovaGeracao() : router.push('/painel')
      return
    }

    if ((SECTION_IDS as string[]).includes(tab.id)) {
      if (pathname === '/painel' && onSectionChange) {
        onSectionChange(tab.id as SectionId)
      } else {
        router.push('/painel')
      }
      return
    }

    router.push(tab.href)
  }

  const displayName = userEmail ? userEmail.split('@')[0] : ''

  return (
    <>
      <style>{`
        .lf-tabs { display: flex; align-items: center; gap: 2px; justify-content: center; }
        .lf-user-name { display: inline; }
        .lf-hamburger { display: none !important; align-items: center; justify-content: center; }
        .lf-mobile-menu { display: none; flex-direction: column; }
        .lf-tab-btn:hover { background: #f1f3f4 !important; }
        .lf-signout:hover { background: #f1f3f4 !important; color: #202124 !important; }
        @media (max-width: 680px) {
          .lf-tabs { display: none !important; }
          .lf-hamburger { display: flex !important; }
          .lf-user-name { display: none; }
          .lf-mobile-menu.lf-open { display: flex; }
        }
      `}</style>

      <header style={{
        borderBottom: '1px solid #e8eaed',
        background: '#ffffff',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 20px',
          height: 56,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
        }}>
          {/* Logo */}
          <Link href="/painel" style={{
            display: 'flex', alignItems: 'center',
            textDecoration: 'none', paddingRight: 24,
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>Listify</span>
          </Link>

          {/* Tabs — desktop */}
          <nav className="lf-tabs">
            {TABS.map(tab => {
              const active = activeId === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="lf-tab-btn"
                  onClick={() => handleTabClick(tab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    background: active ? '#e8f0fe' : 'none',
                    border: 'none',
                    borderRadius: 8,
                    color: active ? '#1a73e8' : '#5f6368',
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20 }}>
            {displayName && (
              <span className="lf-user-name" style={{
                fontSize: 13, color: '#5f6368',
                maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName}
              </span>
            )}
            <button
              onClick={signOut}
              className="lf-signout"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#5f6368',
                padding: '6px 12px', borderRadius: 8,
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              Sair
            </button>

            {/* Hamburger */}
            <button
              type="button"
              className="lf-hamburger"
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: 'none', border: '1px solid #e8eaed', borderRadius: 8,
                width: 36, height: 36, cursor: 'pointer',
                color: '#5f6368', fontSize: 16,
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div className={`lf-mobile-menu${menuOpen ? ' lf-open' : ''}`} style={{
          borderTop: '1px solid #e8eaed',
          background: '#ffffff',
        }}>
          {TABS.map(tab => {
            const active = activeId === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 24px', width: '100%',
                  background: active ? '#e8f0fe' : 'none',
                  border: 'none',
                  borderLeft: active ? '3px solid #1a73e8' : '3px solid transparent',
                  color: active ? '#1a73e8' : '#5f6368',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left' as const,
                }}
              >
                <span style={{ fontSize: 15, width: 20 }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}

          {userEmail && (
            <div style={{
              padding: '10px 24px',
              borderTop: '1px solid #e8eaed',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail}
              </span>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
