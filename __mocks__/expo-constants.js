// Jest auto-uses this for the `expo-constants` node module (both test projects).
// Supplies a populated `extra` so config.ts resolves real-looking Supabase values
// and `isConfigured` is true, matching the old hardcoded-config behaviour.
module.exports = {
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        appVariant: 'dev',
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
};
