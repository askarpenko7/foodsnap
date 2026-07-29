import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  clean: true,
  // @foodsnap/shared ships TypeScript source and is workspace-only, so it has
  // to be bundled in rather than left as an import Node would try to resolve.
  noExternal: ['@foodsnap/shared'],
});
