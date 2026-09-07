import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/*
 * ── Pourquoi ce fichier a manqué si longtemps ─────────────────────────────
 *
 * `npm run verify` enchaîne typecheck, lint et tests. Sans configuration,
 * `next lint` ne tombait pas en erreur : il ouvrait une **invite
 * interactive**. La commande restait donc suspendue au lieu d'échouer, et une
 * garde qui ne rend jamais la main n'est pas une garde — elle laisse passer
 * tout ce qu'elle était censée arrêter.
 */
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['src/generated/**', '.next/**', 'node_modules/**'],
  },
];
