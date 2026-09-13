/*
 * Combien de légendes génériques le site sert-il encore, et où ?
 *
 * ── Pourquoi mesurer la légende et pas la lecture ─────────────────────────
 *
 * Une page peut porter une lecture et rester générique à l'écran : c'est le
 * cas quand son sujet est reconnu mais qu'aucun énoncé n'a de phrase à dire.
 * Compter les `lecture` nulles sous-estimait donc le chantier. Ce qui compte
 * est ce que le visiteur lit — et ce que Google indexe.
 *
 * Le compte se fait sur le **français** : les trois langues suivent le même
 * chemin, une page générique l'est dans les trois.
 */
import { prisma } from '@/lib/donnees/prisma';
import { legendesDeCaptures, type CaptureALegender } from '@/lib/legendes';

const MODELES_GENERIQUES = [
  "Une page du panneau de règles, telle que le jeu l'affiche.",
  'La mécanique expliquée par le jeu lui-même, dans ses propres termes.',
  'Le menu des réglages tel que le jeu le propose.',
  'Le menu de jeu automatique et ses limites, tels que le jeu les propose.',
];

async function main() {
  const jeux = await prisma.jeu.findMany({
    where: { capturesLe: { not: null } },
    select: {
      slug: true, nom: true, rtpStudio: true, gainMaxMultiple: true, volatilite: true,
      captures: true, studio: { select: { slug: true } },
    },
    orderBy: { slug: 'asc' },
  });

  const parStudio = new Map<string, { total: number; generiques: number; fiches: number; pires: Array<[string, number]> }>();
  for (const j of jeux) {
    const captures = ((j.captures as unknown as CaptureALegender[]) ?? []);
    if (!captures.length) continue;
    const legendes = legendesDeCaptures(
      captures,
      { slug: j.slug, nom: j.nom, rtp: j.rtpStudio == null ? null : Number(j.rtpStudio),
        gainMax: j.gainMaxMultiple, volatilite: j.volatilite as never },
      'fr',
    );
    const e = parStudio.get(j.studio.slug) ?? { total: 0, generiques: 0, fiches: 0, pires: [] };
    const g = legendes.filter((l) => MODELES_GENERIQUES.some((m) => l.startsWith(m))).length;
    e.total += legendes.length;
    e.generiques += g;
    e.fiches++;
    if (g > 0) e.pires.push([j.slug, g]);
    parStudio.set(j.studio.slug, e);
  }

  console.log('studio                 fiches  legendes  generiques   part');
  let t = 0, tg = 0;
  for (const [s, e] of [...parStudio.entries()].sort((a, b) => b[1].generiques - a[1].generiques)) {
    const part = e.total ? Math.round((e.generiques / e.total) * 100) : 0;
    console.log(`${s.padEnd(22)} ${String(e.fiches).padStart(5)} ${String(e.total).padStart(9)} ${String(e.generiques).padStart(11)} ${String(part).padStart(5)} %`);
    t += e.total; tg += e.generiques;
  }
  console.log(`\nTOTAL ${t} legendes servies · ${tg} generiques · ${Math.round((tg / t) * 100)} %`);

  const pires = [...parStudio.entries()].flatMap(([s, e]) => e.pires.map(([slug, n]) => [`${s}/${slug}`, n] as const))
    .sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('\nles fiches les plus pauvres :');
  for (const [f, n] of pires) console.log(`  ${n} legendes generiques  ${f}`);
  await prisma.$disconnect();
}
main();
