/**
 * Liste ce qui reste en français dans les faits des fiches.
 *
 * ── Pourquoi un rapport plutôt qu'une règle de plus ───────────────────────
 *
 * La traduction par vocabulaire a fait ce qu'elle savait faire : 3 594
 * chaînes. Ce qui reste — environ 600 formes, 648 mots distincts — n'est plus
 * du vocabulaire mais des phrases rédigées : « 3 symboles bonus rouleaux
 * 1-2-3 déclenchent un mini-jeu penalty ». Chaque règle supplémentaire y
 * gagne trois chaînes et augmente le risque d'en abîmer d'autres.
 *
 * Le reste se traduit à la main, ou pas du tout. Ce script produit la liste
 * pour que ce soit un choix, et pas un oubli.
 *
 * Usage : npx tsx scripts/lister-restes-francais.ts > restes.txt
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { sembleFrancais } from '../src/lib/traduction/vers-anglais';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const jeux = await prisma.jeu.findMany({
    select: { slug: true, mecaniques: true, grille: true, lignesPaiement: true },
    orderBy: { slug: 'asc' },
  });

  const parChaine = new Map<string, { champ: string; jeux: string[] }>();
  const noter = (champ: string, valeur: string, slug: string) => {
    if (!sembleFrancais(valeur)) return;
    const clef = `${champ}\t${valeur}`;
    const e = parChaine.get(clef) ?? { champ, jeux: [] };
    e.jeux.push(slug);
    parChaine.set(clef, e);
  };

  for (const j of jeux) {
    for (const m of j.mecaniques) noter('mecanique', m, j.slug);
    if (j.grille) noter('grille', j.grille, j.slug);
    if (j.lignesPaiement) noter('lignes', j.lignesPaiement, j.slug);
  }

  const tri = [...parChaine.entries()].sort((a, b) => b[1].jeux.length - a[1].jeux.length);
  const total = tri.reduce((s, [, e]) => s + e.jeux.length, 0);

  console.log(`# ${tri.length} formes encore en français, ${total} occurrences`);
  console.log('# champ\tocc\ttexte\tjeux (3 premiers)\n');
  for (const [clef, e] of tri) {
    const [champ, texte] = clef.split('\t');
    console.log(`${champ}\t${e.jeux.length}\t${texte}\t${e.jeux.slice(0, 3).join(',')}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
