/**
 * Retire les jaquettes filigranées déjà présentes.
 *
 * Les 692 visuels d'amorçage avaient été triés par la taille — un critère qui
 * ne prédit rien — et un lot plus récent par un détecteur calé sur une seule
 * échelle de filigrane. Ce script repasse **tout** ce qui est publié avec la
 * détection par signature, la seule qui ne dépende ni de la dimension de
 * l'image ni de celle du calque.
 *
 * Supprimer plutôt que masquer : recadrer marcherait un temps, puis quelqu'un
 * réutiliserait le fichier ailleurs — vignette, partage social, flux. Un
 * fichier absent ne se réintroduit pas par distraction.
 *
 * Usage : npx tsx scripts/purger-visuels-filigranes.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { porteFiligrane } from '../src/lib/visuels/filigrane';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const DOSSIER = resolve(process.cwd(), 'public/images/slots');

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const fichiers = readdirSync(DOSSIER);
  const coupables: Array<{ fichier: string; score: number }> = [];

  for (const f of fichiers) {
    const score = (await porteFiligrane(join(DOSSIER, f))) ? 1 : 0;
    if (score) coupables.push({ fichier: f, score });
  }

  coupables.sort((a, b) => b.score - a.score);
  console.log(`${fichiers.length} jaquettes publiées, ${coupables.length} portent le filigrane.`);
  for (const c of coupables.slice(0, 20)) console.log(`  ${c.score.toFixed(2).padStart(6)}  ${c.fichier}`);
  if (coupables.length > 20) console.log(`  … et ${coupables.length - 20} autres`);

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été supprimé. Ajouter --appliquer.');
    return;
  }

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const slugs = coupables.map((c) => c.fichier.replace(/\.[a-z]+$/i, ''));
  for (let i = 0; i < slugs.length; i += 25) {
    await Promise.all(
      slugs.slice(i, i + 25).map((slug) =>
        prisma.jeu.updateMany({ where: { slug }, data: { visuelUrl: null } }),
      ),
    );
  }
  for (const c of coupables) unlinkSync(join(DOSSIER, c.fichier));

  const restants = await prisma.jeu.count({ where: { visuelUrl: { not: null } } });
  const total = await prisma.jeu.count();
  console.log(`\n${coupables.length} fichiers supprimés. ${restants}/${total} jeux gardent une jaquette propre.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
