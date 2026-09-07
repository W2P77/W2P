/**
 * Passe en anglais les faits repris de BetsRank : mécaniques, grille, lignes.
 *
 * ── Ce que le script écrit, et ce qu'il laisse ────────────────────────────
 *
 * Il n'écrit qu'une traduction **complète**. `versAnglais` renvoie `null` dès
 * qu'un mot français subsiste ou qu'un nombre a bougé, et le script laisse
 * alors la chaîne intacte en la signalant. Une phrase à moitié traduite a
 * l'air d'avoir été relue : elle est plus coûteuse que l'original resté
 * franchement français, parce que personne ne la corrigera.
 *
 * Usage : npx tsx scripts/traduire-faits-jeux.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { sembleFrancais, versAnglais } from '../src/lib/traduction/vers-anglais';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const jeux = await prisma.jeu.findMany({
    select: { id: true, slug: true, mecaniques: true, grille: true, lignesPaiement: true },
  });

  const maj: Array<{ id: string; data: Record<string, unknown> }> = [];
  const refuses = new Map<string, number>();
  let mecaTraduites = 0;
  let grillesTraduites = 0;
  let lignesTraduites = 0;

  for (const j of jeux) {
    const data: Record<string, unknown> = {};

    const mecas = j.mecaniques.map((m) => {
      const t = versAnglais(m);
      if (t) {
        mecaTraduites++;
        return t;
      }
      if (sembleFrancais(m)) refuses.set(m, (refuses.get(m) ?? 0) + 1);
      return m;
    });
    if (mecas.some((m, i) => m !== j.mecaniques[i])) data.mecaniques = mecas;

    if (j.grille) {
      const t = versAnglais(j.grille);
      if (t) {
        data.grille = t;
        grillesTraduites++;
      } else if (sembleFrancais(j.grille)) {
        refuses.set(j.grille, (refuses.get(j.grille) ?? 0) + 1);
      }
    }

    if (j.lignesPaiement) {
      const t = versAnglais(j.lignesPaiement);
      if (t) {
        data.lignesPaiement = t;
        lignesTraduites++;
      } else if (sembleFrancais(j.lignesPaiement)) {
        refuses.set(j.lignesPaiement, (refuses.get(j.lignesPaiement) ?? 0) + 1);
      }
    }

    if (Object.keys(data).length > 0) maj.push({ id: j.id, data });
  }

  const refusesTri = [...refuses.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`${jeux.length} jeux examinés.`);
  console.log(`  mécaniques traduites : ${mecaTraduites}`);
  console.log(`  grilles traduites    : ${grillesTraduites}`);
  console.log(`  lignes traduites     : ${lignesTraduites}`);
  console.log(`  fiches à écrire      : ${maj.length}`);
  console.log(`\nRefusées (laissées intactes, ${refusesTri.length} formes distinctes) :`);
  for (const [texte, n] of refusesTri.slice(0, 25)) {
    console.log(`  ${String(n).padStart(4)}  ${texte.slice(0, 90)}`);
  }

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  // Par lots de 25 : le pooler coupe les transactions longues.
  for (let i = 0; i < maj.length; i += 25) {
    await Promise.all(
      maj.slice(i, i + 25).map(({ id, data }) => prisma.jeu.update({ where: { id }, data })),
    );
  }

  const restants = await prisma.jeu.count({
    where: {
      OR: [
        { grille: { contains: 'rouleau' } },
        { lignesPaiement: { contains: 'ligne' } },
        { mecaniques: { has: 'Achat bonus 100x' } },
      ],
    },
  });
  console.log(`\n${maj.length} fiches mises à jour. Relecture : ${restants} portent encore un marqueur français.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
