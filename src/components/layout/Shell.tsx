'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/',         icon: '⊞', label: 'Heute' },
  { href: '/chat',     icon: '◎', label: 'Chat' },
  { href: '/capture',  icon: '⊕', label: 'Capture' },
  { href: '/youtube',  icon: '▶', label: 'YouTube' },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()

  async function signOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: 56,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBlock: 14,
        gap: 4,
        borderRight: `1px solid var(--border)`,
        background: 'var(--bg)',
      }}>
        {/* Logo dot */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
          marginBottom: 12, flexShrink: 0,
          boxShadow: '0 0 12px var(--accent-glow)',
        }} />

        {NAV.map(({ href, icon, label }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              style={{
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--r-md)',
                fontSize: 16,
                background: active ? 'var(--accent-dim)' : 'transparent',
                color: active ? 'var(--accent-2)' : 'var(--text-3)',
                border: active ? '1px solid var(--accent-glow)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all .15s',
              }}
            >
              {icon}
            </Link>
          )
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Sign out */}
        <button
          onClick={signOut}
          title="Abmelden"
          style={{
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--r-md)',
            fontSize: 14,
            background: 'transparent',
            color: 'var(--text-4)',
            border: '1px solid transparent',
            cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          ↩
        </button>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
