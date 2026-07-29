module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // The RN preset skips node_modules, but react-navigation and the react-native-*
  // packages ship untranspiled ESM, so they have to go through Babel.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-image-picker|react-native-config|react-native-food-classifier)/)',
  ],
  // @foodsnap/shared is TypeScript source in the workspace; let Babel handle it.
  moduleNameMapper: {
    '^@foodsnap/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/screens/dev/**'],
};
