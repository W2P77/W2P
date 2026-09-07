import { config } from 'dotenv';
import { resolve, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
config({ path: resolve(process.cwd(), '.env.local'), quiet: true });
const SRC = '/Users/joris/Documents/GitHub/BetsRank/public/images/slots';
function largeurWebp(chemin: string): number {
  const d = readFileSync(chemin).subarray(0, 40);
  if (d.subarray(0, 4).toString() !== 'RIFF') return 0;
  const type = d.subarray(12, 16).toString();
  if (type === 'VP8X') return 1 + d.readUIntLE(24, 3);
  if (type === 'VP8 ') return d.readUInt16LE(26) & 0x3fff;
  if (type === 'VP8L') return (d.readUInt32LE(21) & 0x3fff) + 1;
  return 0;
}
async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const jeux = await p.jeu.findMany({ where: { visuelUrl: null }, select: { slug: true } });
  const dispo = readdirSync(SRC);
  const groupes = new Map<string, number>();
  const gros: string[] = [];
  let trouves = 0;
  for (const j of jeux) {
    const f = dispo.find((x) => x.startsWith(j.slug + '.'));
    if (!f) continue;
    trouves++;
    const l = largeurWebp(join(SRC, f));
    const tranche = l === 0 ? 'non-webp' : l < 340 ? '<340' : l < 400 ? '340-399' : l < 500 ? '400-499' : '500+';
    groupes.set(tranche, (groupes.get(tranche) ?? 0) + 1);
    if (l >= 400 && gros.length < 6) gros.push(`${f} (${l}px)`);
  }
  console.log(`${trouves} visuels disponibles chez BetsRank pour des jeux W2P sans image.\n`);
  for (const [t, n] of [...groupes.entries()].sort()) console.log(`  ${t.padEnd(10)} ${n}`);
  console.log('\nExemples ≥400px (à vérifier à l’œil) :'); gros.forEach(g => console.log('  ' + g));
  await p.$disconnect();
}
main();
