# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## SDK version note (2026-08-12)

The project was intentionally **downgraded from SDK 57 to SDK 54** so it can run in the
Play Store **Expo Go** app. Store Expo Go only bundles released SDKs and could not run
SDK 57 ("Project is incompatible with this version of Expo Go. This project requires a
newer version of Expo Go"), and there is no newer Expo Go to install. The dev machine has
no local Android SDK/adb/emulator, so a local dev build was not an option at the time.

Current: `expo ^54`, `react-native 0.81.x`, `react 19.1.x`. To move back to SDK 57, use a
**development build** or **EAS cloud build** (both bypass the Expo Go version limit) rather
than relying on Expo Go. When targeting SDK 57 again, read the v57 docs linked above.
