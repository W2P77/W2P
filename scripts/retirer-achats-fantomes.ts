/*
 * Retirer les captures d'achat qui ne montrent pas un achat.
 *
 * ── Ce qu'on a trouvé ─────────────────────────────────────────────────────
 *
 * L'adaptateur Pragmatic ouvre la boîte d'achat en cliquant « BUY FREE SPINS »
 * — un bouton **peint en permanence** dans l'habillage du studio, même sur les
 * jeux qui ne vendent rien. Quand le clic n'ouvre rien, le runner photographie
 * le jeu de base une seconde fois et la publie sous le titre « Buying the
 * feature ». La comparaison d'images sur les 556 fiches publiées qui ont une
 * capture d'achat en a trouvé **29 identiques au jeu de base** (écart < 3 sur
 * 255 en luminance), toutes chez Pragmatic.
 *
 * C'est deux fois faux pour le visiteur : la même image apparaît deux fois sur
 * la page, et la seconde est légendée « la confirmation d'achat telle que le
 * jeu la présente ». Sur 22 de ces fiches, le jeu **n'a même pas d'achat de
 * bonus**.
 *
 * ── Retirer plutôt que relégender ─────────────────────────────────────────
 *
 * Une légende honnête sur cette capture dirait « le jeu de base, à nouveau » :
 * autant l'enlever. La fiche garde ses autres captures — aucune ne tombe sous
 * le seuil de publication, qui demande une capture et un RTP.
 *
 * Le correctif de fond est dans l'adaptateur : `capturerLAchat` doit vérifier
 * que l'écran a **changé** après le clic, pas qu'un bouton porte le mot BUY.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { prisma } from '@/lib/donnees/prisma';

const APPLIQUER = process.argv.includes('--appliquer');
const LISTE = process.argv.find((a) => a.startsWith('--slugs='))?.slice(8);

async function main() {
  const slugs = (LISTE ?? readFileSync(0, 'utf-8')).trim().split(',').map((s) => s.trim()).filter(Boolean);
  const jeux = await prisma.jeu.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, captures: true },
    orderBy: { slug: 'asc' },
  });
  const sauvegarde = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank',
    `w2p-captures-achat-fantome-avant-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(sauvegarde, JSON.stringify(jeux, null, 2));

  let retirees = 0;
  for (const j of jeux) {
    const caps = (j.captures as Array<{ fichier: string }>) ?? [];
    const gardees = caps.filter((c) => !/-achat\./.test(c.fichier));
    if (gardees.length === caps.length) { console.log(`  ${j.slug} : pas de capture d'achat`); continue; }
    if (gardees.length === 0) { console.log(`  ! ${j.slug} : ce serait sa seule capture, laissée`); continue; }
    retirees++;
    if (APPLIQUER) await prisma.jeu.update({ where: { id: j.id }, data: { captures: gardees as never } });
  }
  console.log(`\n${retirees} captures d'achat retirées sur ${jeux.length} fiches.`);
  console.log(APPLIQUER ? `Sauvegarde : ${sauvegarde}` : 'SIMULATION — ajouter --appliquer.');
  await prisma.$disconnect();
}
main();
