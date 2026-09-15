/* Combien de fiches publiees ont des champs vides que le panneau pourrait remplir ? */
import { prisma } from '@/lib/donnees/prisma';
import { slugsPubliables } from '@/lib/donnees/publiables';
async function main() {
  const slugs = await slugsPubliables();
  const jeux = await prisma.jeu.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, grille: true, lignesPaiement: true, gainMaxMultiple: true, volatilite: true, mecaniques: true, studio: { select: { slug: true } } },
  });
  const trous = { grille: 0, lignes: 0, plafond: 0, volatilite: 0, mecaniques: 0 };
  const parStudio = new Map<string, number>();
  for (const j of jeux) {
    let n = 0;
    if (!j.grille) { trous.grille++; n++; }
    if (!j.lignesPaiement) { trous.lignes++; n++; }
    if (j.gainMaxMultiple == null) { trous.plafond++; n++; }
    if (!j.volatilite) { trous.volatilite++; n++; }
    if (!j.mecaniques?.length) { trous.mecaniques++; n++; }
    if (n) parStudio.set(j.studio.slug, (parStudio.get(j.studio.slug) ?? 0) + n);
  }
  console.log(`${jeux.length} fiches publiees · champs vides :`);
  for (const [k, v] of Object.entries(trous)) console.log(`  ${k.padEnd(12)} ${v} (${Math.round(v / jeux.length * 100)} %)`);
  console.log('\nchamps vides par studio :');
  for (const [s, n] of [...parStudio.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${s.padEnd(20)} ${n}`);
  await prisma.$disconnect();
}
main();
