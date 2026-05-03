import { createBrowserClient } from '@supabase/ssr'

// Used in Client Components ('use client') and client-side hooks.
// Must NOT import next/headers – this file runs in the browser.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
