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
    /*
     * `next-env.d.ts` est réécrit par Next à chaque build, avec une référence
     * triple-slash que la règle `triple-slash-reference` refuse. Le corriger
     * n'a aucun effet : le fichier revient tel quel au build suivant. Le
     * lint échouait donc sur une ligne que personne ne peut changer.
     */
    ignores: ['src/generated/**', '.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];
