import Constants from 'expo-constants';

/**
 * Runtime config, sourced from app.config.js `extra` (which itself reads the
 * per-variant .env / eas.json env). The Supabase *anon* key is public by design
 * and fine to ship in the bundle. NEVER put the service_role key here.
 *
 * POC admin authentication is app-side only (environment-sourced admin password
 * + custom staff approval). The password is embedded in the APK and cannot be
 * treated as a secret; move authentication server-side before production use.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as {
  appVariant?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  adminPassword?: string;
};

export const APP_VARIANT = extra.appVariant ?? 'production';
export const SUPABASE_URL = extra.supabaseUrl ?? '';
export const SUPABASE_ANON_KEY = extra.supabaseAnonKey ?? '';

/** POC only — anyone who knows this client-bundled value becomes an admin. */
// TODO(track-b): move admin auth server-side (Edge Function/RPC) + RLS.
export const ADMIN_PASSWORD = extra.adminPassword ?? '';
