import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * We do NOT use Supabase Auth — identity/roles are handled app-side — so we
 * disable session persistence and token refresh entirely.
 */
/** False until the per-variant Supabase env (SUPABASE_URL / SUPABASE_ANON_KEY) is set. */
export const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// When unconfigured (tests, or a build missing its env) fall back to a harmless
// placeholder so createClient doesn't throw. Every real call is gated on
// `isConfigured`, so this client is never actually hit in that state.
export const supabase = createClient(
  isConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co',
  isConfigured ? SUPABASE_ANON_KEY : 'placeholder-anon-key',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
