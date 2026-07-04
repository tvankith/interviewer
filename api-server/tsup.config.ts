import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'es2020',
  shims: true,
  sourcemap: true,
  clean: true,
  splitting: false,
});
