import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Sans cette configuration, Vitest ne résout pas l'alias `@/` que Next lit
 * dans `tsconfig.json` — et **aucun test ne peut alors toucher au code qui
 * l'utilise**, c'est-à-dire presque tout. Le symptôme est trompeur : le test
 * n'échoue pas, il ne se charge simplement pas.
 */
export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
