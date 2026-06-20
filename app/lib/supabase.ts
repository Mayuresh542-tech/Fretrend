import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ---------------------------------------------------------------------------
// Cookie-backed session storage
//
// Why not localStorage (the supabase-js default)? Users on fretrend.vercel.app
// were signed out every time they fully closed and reopened the browser:
// getSession() returned null on reopen because the session was no longer in
// localStorage. Several real browser configurations drop DOM storage
// (localStorage/sessionStorage) on exit while keeping *persistent* cookies, so a
// dated cookie is the durable place to keep "remember me" state across restarts.
//
// Two non-obvious robustness details:
//  - Chunking. A Supabase session (access JWT + refresh token + user object)
//    serializes to ~2-4 KB and, once URI-encoded, can exceed the ~4 KB per-cookie
//    limit. Browsers silently DROP an over-limit cookie — which would reproduce
//    the exact "logged out on reopen" bug for some users. So the value is split
//    across `${key}.0`, `${key}.1`, … cookies and reassembled on read.
//  - Secure only over HTTPS. A `Secure` cookie is rejected on http://localhost,
//    which would break local dev. We set Secure only when actually on https
//    (production); Lax + host-only otherwise.
//
// The server never reads these cookies — API routes authorize via the
// `Authorization: Bearer <access_token>` header — so this is purely about where
// the browser persists the session between visits.
// ---------------------------------------------------------------------------

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, in seconds
// Encoded bytes per cookie. Kept well under the ~4096-byte cap to leave room for
// the cookie name and attributes; oversized sessions span multiple chunks.
const MAX_CHUNK_LEN = 3000

const secureFlag = () =>
  typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''

function readCookies(): Map<string, string> {
  const jar = new Map<string, string>()
  if (typeof document === 'undefined' || !document.cookie) return jar
  for (const pair of document.cookie.split('; ')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    jar.set(pair.slice(0, eq), pair.slice(eq + 1))
  }
  return jar
}

// Expire every cookie belonging to `key` (the bare name plus any `.N` chunks).
// Must run before every write so a now-shorter value can't leave stale trailing
// chunks behind that would corrupt reassembly on the next read.
function clearChunks(key: string): void {
  if (typeof document === 'undefined') return
  const expire = `; Path=/; Max-Age=0; SameSite=Lax${secureFlag()}`
  for (const name of readCookies().keys()) {
    if (name === key || name.startsWith(`${key}.`)) {
      document.cookie = `${name}=${expire}`
    }
  }
}

const cookieStorage = {
  getItem(key: string): string | null {
    const jar = readCookies()
    let encoded = ''
    let chunkCount = 0
    for (let i = 0; ; i++) {
      const chunk = jar.get(`${key}.${i}`)
      if (chunk === undefined) break
      encoded += chunk
      chunkCount++
    }

    if (chunkCount === 0) {
      // TEMP DEBUG — remove once the reopen cause is confirmed. If this fires on
      // reopen for 'fretrend-auth', the chunks didn't survive the restart at all.
      if (key === 'fretrend-auth') {
        console.log('[cookieStorage.getItem] no chunks for', key, '— cookie names present:', [...jar.keys()])
      }
      return null
    }

    let decoded: string | null = null
    let decodeError: unknown = null
    try {
      decoded = decodeURIComponent(encoded)
    } catch (e) {
      // A throw here means the reassembled value has a malformed %-sequence,
      // which in practice means a chunk is missing/truncated (e.g. trailing
      // chunk dropped) — i.e. a real dechunking problem, not just bad JSON.
      decodeError = e
    }

    // TEMP DEBUG — this is the line that distinguishes the three reopen failure
    // modes: (a) decodeOk=false → missing/truncated chunk; (b) decodeOk=true but
    // jsonParseOk=false → corrupted value (auth-js discards it WITHOUT clearing
    // the cookie, so it "persists but doesn't restore"); (c) both ok but
    // expired=true → the session is fine and the bounce is a failed token
    // refresh, not storage. Remove once confirmed.
    if (key === 'fretrend-auth') {
      let jsonParseOk = false
      let expiresInfo: string | null = null
      if (decoded !== null) {
        try {
          const s = JSON.parse(decoded)
          jsonParseOk = true
          if (s?.expires_at) {
            const secs = s.expires_at - Math.floor(Date.now() / 1000)
            expiresInfo = `${secs}s left (${secs < 0 ? 'EXPIRED' : 'valid'})`
          }
        } catch {
          /* jsonParseOk stays false */
        }
      }
      console.log('[cookieStorage.getItem]', key, {
        chunkCount,
        encodedLen: encoded.length,
        decodeOk: decodeError === null,
        decodeError: decodeError ? String(decodeError) : null,
        jsonParseOk,
        expiresInfo,
      })
    }

    return decoded
  },

  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return
    clearChunks(key)
    const encoded = encodeURIComponent(value)
    const attrs = `; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secureFlag()}`
    for (let i = 0, start = 0; start < encoded.length; i++, start += MAX_CHUNK_LEN) {
      document.cookie = `${key}.${i}=${encoded.slice(start, start + MAX_CHUNK_LEN)}${attrs}`
    }
  },

  removeItem(key: string): void {
    clearChunks(key)
  },
}

// Module-level singleton: every component imports this same instance so they
// share one auth/session state. (A fresh createClient() per render would give
// each its own in-memory session and break persistence.)
//
// Session persistence lives in cookies (see above) rather than the supabase-js
// default of localStorage, so logins survive a full browser close/reopen.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: cookieStorage,
    storageKey: 'fretrend-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
