// Shared ESLint flat config for the FoodSnap monorepo.
// Workspaces layer their own plugins (e.g. React Native) on top of this base.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/lib/**',
      '**/.gradle/**',
      '**/android/**/generated/**',
      '**/ios/Pods/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // App/library source runs on Hermes: React Native supplies the browser-ish
  // globals (console, fetch, timers) plus __DEV__.
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'apps/*/*.tsx', 'packages/*/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, __DEV__: 'readonly' },
    },
  },
  // Build tooling and scripts run on Node, mostly as CommonJS.
  {
    files: [
      '**/*.config.{js,mjs,cjs}',
      '**/scripts/**/*.{js,mjs,cjs}',
      '**/react-native.config.js',
      '**/jest.setup.{js,ts}',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
