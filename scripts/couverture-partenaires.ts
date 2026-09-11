/*
 * Combien de ce que nos casinos partenaires distribuent sommes-nous capables
 * de documenter ?
 *
 * ── Pourquoi cette mesure plutôt que le nombre de fiches ──────────────────
 *
 * SlotCatalog annonce 52 513 jeux de 1 280 fournisseurs. Courir après ce
 * chiffre reviendrait à publier des milliers de pages sur des studios
 * disparus : 41 jeux par fournisseur chez eux, c'est une longue traîne de
 * catalogues éteints.
 *
 * La mesure qui décide du revenu est autre : **un joueur qui ouvre un casino
 * qu'on recommande y trouve-t-il des jeux qu'on documente ?** Elle se lit dans
 * la colonne `providers` de nos propres casinos, pondérée par le nombre de
 * casinos qui portent chaque studio — un fournisseur présent chez trente
 * partenaires pèse trente fois celui qu'un seul distribue.
 *
 *   npx tsx --env-file=.env.local scripts/couverture-partenaires.ts
 *   … --seuil=3    ne liste que les manquants portés par 3 casinos ou plus
 */

import { prisma } from '@/lib/donnees/prisma';

const arg = (nom: string) =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=');
const SEUIL = Number(arg('seuil') ?? 2);

/*
 * « pragmatic » chez un casino, « pragmatic-play » chez nous : le même studio.
 * On colle le nom, puis on coupe les suffixes de raison sociale par la fin —
 * en boucle, parce que « bragg-gaming-group » en porte deux.
 *
 * Le garde-fou `v.length > suf.length + 2` évite de réduire un nom à rien :
 * sans lui, le studio « Play » deviendrait la chaîne vide et se confondrait
 * avec tous les autres.
 */
const SUFFIXES = [
  'gaminggroup', 'gaming', 'games', 'game', 'studios', 'studio', 'group',
  'entertainment', 'interactive', 'igaming', 'technology', 'tech', 'labs',
  'limited', 'ltd', 'play', 'city', 'global',
];

export function noyauDuNom(nom: string): string {
  let v = nom.toLowerCase().replace(/[^a-z0-9]/g, '');
  let coupe = true;
  while (coupe) {
    coupe = false;
    for (const suf of SUFFIXES) {
      if (v.length > suf.length + 2 && v.endsWith(suf)) {
        v = v.slice(0, -suf.length);
        coupe = true;
        break;
      }
    }
  }
  return v;
}

async function main() {
  const casinos = await prisma.casino.findMany({
    where: { actif: true },
    select: { nom: true, providers: true },
  });
  const studios = await prisma.studio.findMany({
    select: { slug: true, nom: true, _count: { select: { jeux: true } } },
  });

  const mentions = new Map<string, number>();
  for (const c of casinos) {
    for (const p of c.providers) {
      const cle = p.trim();
      if (cle) mentions.set(cle, (mentions.get(cle) ?? 0) + 1);
    }
  }

  const parNoyau = new Map<string, { slug: string; jeux: number }>();
  for (const s of studios) parNoyau.set(noyauDuNom(s.slug), { slug: s.slug, jeux: s._count.jeux });

  const tries = [...mentions.entries()].sort((a, b) => b[1] - a[1]);
  const total = tries.reduce((s, [, n]) => s + n, 0);

  const couverts = tries.filter(([p]) => parNoyau.has(noyauDuNom(p)));
  const documentes = couverts.filter(([p]) => (parNoyau.get(noyauDuNom(p))?.jeux ?? 0) > 0);
  const manquants = tries.filter(([p]) => !parNoyau.has(noyauDuNom(p)));

  const part = (n: number) => `${Math.round((n / total) * 100)}%`;
  const poids = (l: Array<[string, number]>) => l.reduce((s, [, n]) => s + n, 0);

  console.log(`\nCOUVERTURE DES PARTENAIRES\n`);
  console.log(`${casinos.length} casinos actifs citent ${tries.length} fournisseurs (${total} mentions).`);
  console.log(`${studios.length} studios en base, ${studios.reduce((s, x) => s + x._count.jeux, 0)} fiches.\n`);
  console.log(`  connus en base      ${String(couverts.length).padStart(4)} fournisseurs   ${part(poids(couverts)).padStart(4)} des mentions`);
  console.log(`  avec au moins 1 jeu ${String(documentes.length).padStart(4)} fournisseurs   ${part(poids(documentes)).padStart(4)} des mentions`);
  console.log(`  absents             ${String(manquants.length).padStart(4)} fournisseurs   ${part(poids(manquants)).padStart(4)} des mentions`);

  const aTraiter = manquants.filter(([, n]) => n >= SEUIL);
  const traine = manquants.filter(([, n]) => n < SEUIL);
  console.log(`\nAbsents portés par ${SEUIL} casinos ou plus (${aTraiter.length}) :`);
  for (const [p, n] of aTraiter.slice(0, 30)) {
    console.log(`  ${String(n).padStart(3)} casinos   ${p}`);
  }
  if (aTraiter.length > 30) console.log(`  … et ${aTraiter.length - 30} autres.`);
  console.log(
    `\n${traine.length} fournisseurs sous le seuil pèsent ${part(poids(traine))} des mentions : ` +
      `la longue traîne, à ne traiter qu'après le reste.\n`,
  );
}

main().finally(() => prisma.$disconnect());
