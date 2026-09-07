/**
 * Rattache à chaque jeu le visuel présent dans `public/images/slots`.
 *
 * Le chemin est stocké en base plutôt que reconstruit à l'affichage : un jeu
 * sans image doit rendre un `null` explicite, pas une balise `<img>` cassée
 * pointant vers un fichier absent.
 */
import { config as loadEnv } from 'dotenv';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

async function main() {
  const dossier = 'public/images/slots';
  const fichiers = existsSync(dossier) ? readdirSync(dossier) : [];

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const jeux = await prisma.jeu.findMany({ select: { id: true, slug: true } });
  let poses = 0;
  let manquants = 0;

  for (const j of jeux) {
    const fichier = fichiers.find((f) => f.startsWith(`${j.slug}.`));
    if (!fichier) { manquants++; continue; }
    await prisma.jeu.update({
      where: { id: j.id },
      data: { visuelUrl: `/images/slots/${fichier}` },
    });
    poses++;
  }

  console.log(`${poses} visuels rattachés, ${manquants} jeux sans image.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
