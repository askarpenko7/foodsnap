/**
 * ESM + ts-jest. The services are `"type": "module"` and import each other with
 * explicit `.js` specifiers (what Node wants at runtime), so the resolver has to
 * map those back onto the `.ts` sources.
 */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, tsconfig: { module: 'ESNext' } }],
  },
};
