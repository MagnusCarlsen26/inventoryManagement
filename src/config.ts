/**
 * Pilot config. It is intentionally fine to ship the Supabase *anon* key in the
 * app bundle — it is designed to be public. NEVER put the service_role key here.
 *
 * Auth is app-side only (hardcoded admin password + custom staff approval).
 * With the permissive anon policies in supabase-setup.sql, anyone with the app
 * can read/write the DB — acceptable for a pilot, not for production.
 *
 * Fill these in after creating your Supabase project (Settings → API).
 */
export const SUPABASE_URL = 'https://sfgfxsprdleavleeuyax.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_c5BtG_FMH6sC4KBJEruwAg_VcR5Fbd0';

/** Anyone who types this on the onboarding screen becomes an admin. */
export const ADMIN_PASSWORD = 'letmein';
