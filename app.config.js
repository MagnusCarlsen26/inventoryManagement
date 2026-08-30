// Dynamic Expo config. Everything that differs between the dev and prod builds
// is driven off APP_VARIANT so we can ship two coexisting APKs (different package
// ids) that each talk to their own Supabase project.
//
// Where the values come from:
//   - Local runs: `.env.<variant>` is loaded here via dotenv.
//   - EAS builds: eas.json sets APP_VARIANT + the SUPABASE_* vars per profile.
//
// Only PUBLIC values belong here (Supabase URL + anon key). Never the
// service_role key or any real secret — anything in the bundle is extractable.

const variant = process.env.APP_VARIANT === 'dev' ? 'dev' : 'production';

// Best-effort local env loading. In CI the vars are already in process.env, so a
// missing .env file is fine.
try {
  require('dotenv').config({ path: `.env.${variant}` });
} catch {
  // dotenv not available (e.g. some CI paths) — rely on process.env as-is.
}

const isDev = variant === 'dev';

module.exports = () => ({
  expo: {
    name: isDev ? 'inventoryManagement (dev)' : 'inventoryManagement',
    slug: 'inventoryManagement',
    version: '1.2.0',
    orientation: 'portrait',
    updates: {
      url: 'https://u.expo.dev/59553f25-7d96-4f01-93ea-019c962354c6',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: 'fingerprint',
    },
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: isDev ? 'com.bhai.inventorymanagement.dev' : 'com.bhai.inventorymanagement',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '59553f25-7d96-4f01-93ea-019c962354c6',
      },
      appVariant: variant,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
    owner: 'khushalsindhav',
    plugins: ['expo-asset'],
  },
});
