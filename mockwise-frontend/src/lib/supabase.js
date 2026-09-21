import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True when both required Vite env vars are present.
 * Missing config must not crash the SPA module graph (home/marketing still needs to render).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // Do not throw: a top-level throw blanks the entire SPA (including /home).
  // Auth APIs return errors until env is configured (see SupabaseAuthContext).
  logger.error(
    '[MockWise] Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Copy .env.example to .env and fill in real values. Auth will be unavailable until then.'
  )
}

/**
 * Supabase browser client, or null when env is missing.
 * Callers must null-check (or use isSupabaseConfigured) before invoking auth APIs.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null
