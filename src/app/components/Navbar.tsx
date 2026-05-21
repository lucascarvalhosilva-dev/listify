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
  { id: 'nova', label: 'Nova Geração',       icon: '⚡', href: '/painel'             },
  { id: 'add',  label: 'Adicionar Produtos', icon: '➕', href: '/adicionar-produtos'  },
  { id: 'cat',  label: 'Meus Catálogos',    icon: '📁', href: '/painel'             },
  { id: 'hist', label: 'Histórico',          icon: '🕐', href: '/painel'             },
  { id: 'plan', label: 'Meu Plano',          icon: '👤', href: '/painel'             },
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

  const activeId: string =
    pathname === '/adicionar-produtos' ? 'add' : (activeSection ?? 'nova')

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
        .lf-tabs { display: flex; align-items: stretch; gap: 0; justify-content: center; }
        .lf-user-name { display: inline; }
        .lf-hamburger { display: none !important; align-items: center; justify-content: center; }
        .lf-mobile-menu { display: none; flex-direction: column; }
        @media (max-width: 680px) {
          .lf-tabs { display: none !important; }
          .lf-hamburger { display: flex !important; }
          .lf-user-name { display: none; }
          .lf-mobile-menu.lf-open { display: flex; }
        }
      `}</style>

      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,14,30,0.95)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 20px',
          height: 58,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'stretch',
        }}>
          {/* Logo */}
          <Link href="/painel" style={{
            display: 'flex', alignItems: 'center', gap: 9,
            textDecoration: 'none', paddingRight: 20,
          }}>
            <div style={{
              width: 30, height: 30, background: 'var(--blue)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              flexShrink: 0,
            }}>⚡</div>
            <span className="font-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--white)', whiteSpace: 'nowrap' }}>
              Listify
            </span>
          </Link>

          {/* Tabs — desktop */}
          <nav className="lf-tabs">
            {TABS.map(tab => {
              const active = activeId === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 13px',
                    background: 'none', border: 'none',
                    borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
                    borderTop: '2px solid transparent',
                    color: active ? 'var(--white)' : 'var(--muted)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 20 }}>
            {displayName && (
              <span className="lf-user-name" style={{
                fontSize: 13, color: 'var(--muted)',
                maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName}
              </span>
            )}
            <button
              onClick={signOut}
              className="btn-secondary"
              style={{ padding: '7px 16px', fontSize: 13, whiteSpace: 'nowrap' }}
            >
              Sair
            </button>

            {/* Hamburger */}
            <button
              type="button"
              className="lf-hamburger"
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                width: 36, height: 36, cursor: 'pointer',
                color: 'var(--white)', fontSize: 16,
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div className={`lf-mobile-menu${menuOpen ? ' lf-open' : ''}`} style={{
          borderTop: '1px solid var(--border)',
          background: 'rgba(6,10,24,0.98)',
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
                  background: active ? 'rgba(37,99,235,0.08)' : 'none',
                  border: 'none',
                  borderLeft: active ? '3px solid var(--blue)' : '3px solid transparent',
                  color: active ? 'var(--white)' : 'var(--muted)',
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
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail}
              </span>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
