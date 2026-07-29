import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  clean: true,
  // The food database is inlined into the bundle, so the runtime image is one
  // JS file with no data paths to resolve. It is ~40 KB of JSON — not worth a
  // volume mount or a second COPY layer.
  loader: { '.json': 'json' },
  // @foodsnap/shared ships TypeScript source and is workspace-only, so it has
  // to be bundled in rather than left as an import Node would try to resolve.
  noExternal: ['@foodsnap/shared'],
});
