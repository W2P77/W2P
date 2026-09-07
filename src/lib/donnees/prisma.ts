import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Client Prisma unique.
 *
 * En développement, Next recharge les modules à chaque édition : sans ce cache
 * global, chaque rechargement ouvrirait une nouvelle connexion jusqu'à épuiser
 * le pool de Postgres.
 */
const global_ = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  global_.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== 'production') global_.prisma = prisma;
