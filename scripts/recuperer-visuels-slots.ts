/**
 * Récupère chez BetsRank les jaquettes manquantes, filigrane recadré.
 *
 * ── Pourquoi on ne trie plus ──────────────────────────────────────────────
 *
 * Les versions précédentes écartaient les images filigranées. Cinq détecteurs
 * successifs y ont échoué — le calque « SlotCatalog.com » existe à plusieurs
 * échelles, sur des fonds clairs comme sombres, et l'artwork contient
 * lui-même du vert. Le dernier atteignait quinze détections sur quinze et
 * laissait encore passer deux images sur douze prises au hasard.
 *
 * Le calque est en revanche toujours **ancré en haut à gauche** et ne descend
 * jamais au-delà de 15 % de la hauteur. On le supprime donc en recadrant, ce
 * qui ne demande de reconnaître rien du tout — et rend utilisables les six
 * cent cinquante images qu'on écartait par précaution.
 *
 * Usage : npx tsx scripts/recuperer-visuels-slots.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { copyFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { couperLeBandeau } from './retirer-bandeau-filigrane';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const SOURCE = '/Users/joris/Documents/GitHub/BetsRank/public/images/slots';
const CIBLE = resolve(process.cwd(), 'public/images/slots');

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const sansVisuel = await prisma.jeu.findMany({
    where: { visuelUrl: null },
    select: { id: true, slug: true },
  });
  const dispo = readdirSync(SOURCE);
  const dejaLa = new Set(readdirSync(CIBLE));

  const aFaire: Array<{ id: string; slug: string; fichier: string }> = [];
  let introuvables = 0;
  for (const jeu of sansVisuel) {
    const fichier = dispo.find((f) => f.startsWith(`${jeu.slug}.`));
    if (!fichier || dejaLa.has(fichier)) {
      introuvables++;
      continue;
    }
    aFaire.push({ id: jeu.id, slug: jeu.slug, fichier });
  }

  const avant = await prisma.jeu.count({ where: { visuelUrl: { not: null } } });
  const total = await prisma.jeu.count();
  console.log(`${sansVisuel.length} jeux sans jaquette.`);
  console.log(`  récupérables            : ${aFaire.length}`);
  console.log(`  aucune image disponible : ${introuvables}`);
  console.log(`\nCouverture : ${avant}/${total} → ${avant + aFaire.length}/${total}`);

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été copié. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  let recadrees = 0;
  for (const p of aFaire) {
    const entree = resolve(SOURCE, p.fichier);
    const sortie = resolve(CIBLE, p.fichier);
    // Les images de 400 px et plus viennent de la source filigranée : elles
    // sont recadrées. Les petites viennent d'ailleurs et sont copiées telles
    // quelles — les amputer serait une perte sans contrepartie.
    if (await couperLeBandeau(entree, sortie)) recadrees++;
    else copyFileSync(entree, sortie);
  }

  for (let i = 0; i < aFaire.length; i += 25) {
    await Promise.all(
      aFaire.slice(i, i + 25).map((p) =>
        prisma.jeu.update({ where: { id: p.id }, data: { visuelUrl: `/images/slots/${p.fichier}` } }),
      ),
    );
  }

  const apres = await prisma.jeu.count({ where: { visuelUrl: { not: null } } });
  console.log(`\n${aFaire.length} jaquettes ajoutées, dont ${recadrees} recadrées.`);
  console.log(`Relecture : ${apres}/${total} jeux en portent une.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
