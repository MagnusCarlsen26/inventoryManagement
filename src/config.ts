import Constants from 'expo-constants';

/**
 * Runtime config, sourced from app.config.js `extra` (which itself reads the
 * per-variant .env / eas.json env). The Supabase *anon* key is public by design
 * and fine to ship in the bundle. NEVER put the service_role key here.
 *
 * Auth is still app-side only (hardcoded admin password + custom staff approval)
 * — that is tracked to move server-side, since anything shipped in the APK is
 * extractable and cannot be treated as a secret.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as {
  appVariant?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export const APP_VARIANT = extra.appVariant ?? 'production';
export const SUPABASE_URL = extra.supabaseUrl ?? '';
export const SUPABASE_ANON_KEY = extra.supabaseAnonKey ?? '';

/** Anyone who types this on the onboarding screen becomes an admin. */
// TODO(track-b): move admin auth server-side (Edge Function/RPC) + RLS.
export const ADMIN_PASSWORD = 'letmein';
