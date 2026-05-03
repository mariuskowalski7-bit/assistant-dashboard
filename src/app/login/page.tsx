'use client'
import { useState, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const sb = createClient()
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:380, animation:'fade-in .3s ease both' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:36 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent) 0%,var(--teal) 100%)', boxShadow:'0 0 16px var(--accent-glow)' }} />
          <span style={{ fontSize:16, fontWeight:500 }}>Assistant</span>
        </div>
        {!sent ? (
          <>
            <h1 style={{ fontSize:22, fontWeight:600, marginBottom:8 }}>Willkommen zurück</h1>
            <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:28 }}>Gib deine E-Mail ein – wir schicken dir einen Magic Link.</p>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="du@beispiel.de" required
                style={{ background:'var(--bg-3)', border:'1px solid var(--border-2)', borderRadius:'var(--r-lg)', padding:'12px 16px', fontSize:14, color:'var(--text)', fontFamily:'var(--font-sans)', outline:'none' }} />
              {error && <div style={{ fontSize:12.5, color:'var(--coral)', background:'var(--coral-dim)', padding:'8px 12px', borderRadius:'var(--r-md)' }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-lg)', padding:'12px 16px', fontSize:14, fontWeight:500, fontFamily:'var(--font-sans)', cursor:loading?'not-allowed':'pointer', opacity:loading?.7:1 }}>
                {loading ? 'Sende…' : 'Magic Link senden'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:16 }}>✉️</div>
            <h2 style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Link gesendet</h2>
            <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6 }}>Prüf dein Postfach für <strong>{email}</strong>.<br/>Klick den Link, um dich anzumelden.</p>
          </div>
        )}
      </div>
    </div>
  )
}
