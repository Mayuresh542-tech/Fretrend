import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Module-level singleton: every component imports this same instance so they
// share one auth/session state. (Importing a fresh `createClient()` per render
// would give each its own in-memory session and break persistence.)
//
// persistSession / autoRefreshToken / detectSessionInUrl are all `true` by
// default in supabase-js; we set them explicitly so the intent — keep users
// logged in across reloads and browser restarts via localStorage — is obvious
// and can't be silently regressed. No custom `storageKey`: keeping the default
// avoids invalidating sessions that already exist under it.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})