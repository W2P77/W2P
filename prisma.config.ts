import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

/**
 * Next lit `.env.local`, le CLI Prisma ne connaît que `.env`.
 *
 * Sans ce chargement explicite, une migration lancée par quelqu'un qui suit la
 * convention Next partirait sur la mauvaise base. `.env.local` est chargé en
 * premier : dotenv n'écrase jamais une variable déjà posée, ce qui lui donne la
 * priorité.
 */
loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

/**
 * Deux points d'entrée Postgres, et la distinction compte.
 *
 * Le pooler (6543, mode transaction) sert l'application mais ne sait ni
 * exécuter du DDL ni tenir les verrous qu'une migration réclame. Les migrations
 * passent donc par le port direct (5432), d'où la préférence donnée à
 * `DIRECT_DATABASE_URL`.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
