module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // The RN preset skips node_modules, but react-navigation and the react-native-*
  // packages ship untranspiled ESM, so they have to go through Babel. Matching
  // the whole family rather than naming packages one by one — an allow-list only
  // ever gets discovered to be incomplete by a test failing after a new dep.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|@react-navigation|react-native)[^/]*/)',
  ],
  // @foodsnap/shared is TypeScript source in the workspace; let Babel handle it.
  moduleNameMapper: {
    '^@foodsnap/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/screens/dev/**'],
};
