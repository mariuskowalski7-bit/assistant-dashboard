'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard'     },
  { href: '/chat',      icon: '◎', label: 'Chat'          },
  { href: '/capture',   icon: '⊕', label: 'Quick Capture' },
]

export default function AppShell({ children, userEmail }: {
  children: React.ReactNode
  userEmail?: string
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={{
        width: 'var(--sidebar-w)',
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          paddingLeft: 8, marginBottom: 32,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>◎</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent2)' }}>
            Assistant
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <p style={{
            fontSize: 10, color: 'var(--text3)',
            fontFamily: 'var(--mono)', letterSpacing: '.07em',
            paddingLeft: 8, marginBottom: 8,
          }}>MENÜ</p>
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 9,
                  fontSize: 13.5, fontWeight: active ? 500 : 400,
                  color: active ? 'var(--text)' : 'var(--text3)',
                  background: active ? 'var(--bg3)' : 'transparent',
                  border: active ? '1px solid var(--border2)' : '1px solid transparent',
                  marginBottom: 3,
                  transition: 'all .15s',
                }}
              >
                <span style={{ color: active ? 'var(--accent2)' : 'var(--text3)', fontSize: 15 }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User / Sign out */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 16, paddingLeft: 8,
        }}>
          {userEmail && (
            <p style={{
              fontSize: 11, color: 'var(--text3)',
              fontFamily: 'var(--mono)', marginBottom: 10,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{userEmail}</p>
          )}
          <button
            onClick={signOut}
            style={{
              fontSize: 12, color: 'var(--text3)',
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', transition: 'color .15s',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseOut={e  => (e.currentTarget.style.color = 'var(--text3)')}
          >
            Abmelden →
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
