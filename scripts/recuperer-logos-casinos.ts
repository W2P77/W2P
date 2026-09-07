/**
 * Récupère chez BetsRank les logos des casinos partenaires.
 *
 * ── Pourquoi ce script existe ─────────────────────────────────────────────
 *
 * Les 44 casinos portaient tous un chemin de logo en base, et **aucun des 44
 * fichiers n'existait**. Le composant testait `if (c.logo)` : le chemin étant
 * renseigné, il rendait une `<img>` cassée — soit exactement le cas que le
 * repli était censé couvrir. Un champ rempli qui ment est plus coûteux qu'un
 * champ vide : le repli ne se déclenche jamais.
 *
 * Les accords sont les mêmes des deux côtés — les managers l'ont autorisé —
 * donc les logos sont les mêmes fichiers. On les copie plutôt que de les
 * re-télécharger : ils sont déjà dimensionnés et compressés.
 *
 * Usage : npx tsx scripts/recuperer-logos-casinos.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const SOURCE = '/Users/joris/Documents/GitHub/BetsRank/public/images';
const CIBLE = resolve(process.cwd(), 'public/images');

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const casinos = await prisma.casino.findMany({
    where: { logo: { not: null } },
    select: { slug: true, nom: true, logo: true },
    orderBy: { nom: 'asc' },
  });

  const aCopier: Array<{ de: string; vers: string; slug: string }> = [];
  const introuvables: string[] = [];

  for (const c of casinos) {
    const nomFichier = basename(c.logo!);
    const de = resolve(SOURCE, nomFichier);
    const vers = resolve(CIBLE, nomFichier);
    if (existsSync(vers)) continue;
    if (!existsSync(de)) {
      introuvables.push(`${c.slug} → ${nomFichier}`);
      continue;
    }
    aCopier.push({ de, vers, slug: c.slug });
  }

  console.log(`${casinos.length} casinos avec un chemin de logo.`);
  console.log(`  déjà présents : ${casinos.length - aCopier.length - introuvables.length}`);
  console.log(`  à copier      : ${aCopier.length}`);
  console.log(`  introuvables  : ${introuvables.length}`);
  for (const i of introuvables) console.log(`    ! ${i}`);

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été copié. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  mkdirSync(CIBLE, { recursive: true });
  for (const { de, vers } of aCopier) copyFileSync(de, vers);
  console.log(`\n${aCopier.length} logos copiés.`);

  /*
   * Un chemin qui ne mène à rien vaut moins que rien : il désactive le repli.
   * Les casinos dont le fichier reste introuvable perdent donc leur chemin,
   * et retrouvent la pastille au nom — lisible, à défaut d'être belle.
   */
  if (introuvables.length > 0) {
    const slugs = introuvables.map((i) => i.split(' → ')[0]);
    await prisma.casino.updateMany({ where: { slug: { in: slugs } }, data: { logo: null } });
    console.log(`${slugs.length} chemins de logo vidés (fichier introuvable) — le repli reprend la main.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
