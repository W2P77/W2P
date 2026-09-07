import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  console.log('studios     :', await prisma.studio.count());
  console.log('jeux        :', await prisma.jeu.count());
  console.log('traductions :', await prisma.traduction.count());
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
