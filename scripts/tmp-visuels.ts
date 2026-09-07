import { config } from 'dotenv';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
config({ path: resolve(process.cwd(), '.env.local'), quiet: true });
const SRC = '/Users/joris/Documents/GitHub/BetsRank/public/images/slots';
async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const jeux = await p.jeu.findMany({ select: { slug: true, visuelUrl: true } });
  const dispoBR = new Set(readdirSync(SRC));
  const dejaW2P = new Set(readdirSync('public/images/slots'));
  let ok = 0, recuperables = 0, aucune = 0;
  const exemples: string[] = [];
  for (const j of jeux) {
    if (j.visuelUrl) { ok++; continue; }
    const f = [...dispoBR].find((x) => x.startsWith(j.slug + '.'));
    if (f && !dejaW2P.has(f)) { recuperables++; if (exemples.length < 10) exemples.push(`${j.slug} -> ${f}`); }
    else aucune++;
  }
  console.log(`${jeux.length} jeux`);
  console.log(`  avec visuel        : ${ok}`);
  console.log(`  récupérables de BR : ${recuperables}`);
  console.log(`  aucune image nulle part : ${aucune}`);
  console.log('\nexemples :'); exemples.forEach(e => console.log('  ' + e));
  await p.$disconnect();
}
main();
