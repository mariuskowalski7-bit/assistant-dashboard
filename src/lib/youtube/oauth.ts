/**
 * oauth.ts
 * Google OAuth 2.0 flow for YouTube Data API v3 + YouTube Analytics API.
 *
 * Required scopes:
 *   - youtube.readonly          → video metadata + statistics
 *   - yt-analytics.readonly     → Analytics API (views, CTR, watchtime)
 *
 * Setup in Google Cloud Console:
 *   1. Create project → Enable "YouTube Data API v3" + "YouTube Analytics API"
 *   2. OAuth consent screen → External → add your email as test user
 *   3. Credentials → OAuth 2.0 Client ID → Web application
 *   4. Authorized redirect URI: http://localhost:3000/api/youtube/callback
 *      (add your production URL too when deploying)
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ')

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set')
  }
  return { clientId, clientSecret, redirectUri }
}

// ── Step 1: Build the Google consent URL ─────────────────────

export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = getCredentials()

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',   // get refresh_token
    prompt:        'consent',   // always show consent (ensures refresh_token)
    state,                      // CSRF protection: we store user_id here
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

// ── Step 2: Exchange auth code for tokens ─────────────────────

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number          // seconds
  token_type: string
  scope: string
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getCredentials()

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Token exchange failed: ${data.error_description ?? data.error}`)
  return data as TokenResponse
}

// ── Step 3: Refresh access token when expired ─────────────────

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_at: string
}> {
  const { clientId, clientSecret } = getCredentials()

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error_description ?? data.error}`)

  const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString()
  return { access_token: data.access_token, expires_at }
}

// ── Token expiry helper ───────────────────────────────────────

export function isExpired(expiresAt: string): boolean {
  // Add 60s buffer so we refresh before the actual expiry
  return new Date(expiresAt).getTime() < Date.now() + 60_000
}
