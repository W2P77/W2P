import { config as loadEnv } from 'dotenv';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

/** Rattache à chaque studio son logo, s'il existe dans `public/images/studios`. */
async function main() {
  const dossier = 'public/images/studios';
  const fichiers = existsSync(dossier) ? readdirSync(dossier) : [];
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  let n = 0;
  for (const s of await prisma.studio.findMany({ select: { id: true, slug: true } })) {
    const f = fichiers.find((x) => x.startsWith(`${s.slug}.`));
    if (!f) continue;
    await prisma.studio.update({ where: { id: s.id }, data: { logoUrl: `/images/studios/${f}` } });
    n++;
  }
  console.log(`${n} logos rattachés.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
