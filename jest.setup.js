/* Component tests only — native modules that don't exist under jest. */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Without this SafeAreaProvider renders null until it measures insets, so the whole
// tree comes out empty and every assertion passes vacuously.
// Note the `.default` — that mock module exports one default object, not named exports.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
