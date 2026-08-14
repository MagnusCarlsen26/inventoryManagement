/**
 * Two projects: pure logic runs fast under ts-jest in node, component smoke tests
 * need the react-native runtime that jest-expo sets up. Split by extension —
 * `*.test.ts` is logic, `*.test.tsx` renders something.
 */
module.exports = {
  projects: [
    {
      displayName: 'logic',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts'],
      transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }] },
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      testMatch: ['**/*.test.tsx'],
      setupFiles: ['<rootDir>/jest.setup.js'],
    },
  ],
};
