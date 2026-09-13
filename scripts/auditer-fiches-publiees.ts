/*
 * Auditer chaque fiche publiée : ce que les garde-fous ne voient pas.
 *
 * ── Pourquoi ─────────────────────────────────────────────────────────────
 *
 * La publication est décidée par une règle (un RTP et une capture), la
 * capture est validée par un témoin OCR et une comparaison d'images. Ce sont
 * des heuristiques : elles laissent passer un jeu de base qui est un écran
 * noir, une page d'erreur photographiée en « base game », une fiche dont le
 * taux est hors de toute plausibilité. Depuis que Google crawle, une fiche
 * douteuse en ligne coûte plus qu'une fiche absente. Ce script regarde
 * chaque capture publiée avec un œil de robot — statistiques d'image, pas de
 * jugement — et rend la liste de ce qu'un humain doit regarder.
 *
 * Il n'écrit rien. Sortie : un JSON des fiches suspectes dans le scratchpad
 * et un résumé au terminal.
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { prisma } from '@/lib/donnees/prisma';
import { slugsPubliables } from '@/lib/donnees/publiables';
import { legendesDeCaptures, type CaptureALegender } from '@/lib/legendes';
import { urlPublique } from '@/lib/visuels/stockage';

const SORTIE = process.argv[2] ?? '/tmp/audit-fiches.json';
const LECTEURS = 6;

interface Suspecte { studio: string; slug: string; raisons: string[] }

/** La forme d'une capture en base : le fichier au stockage, son titre, sa légende. */
interface CaptureEnBase { fichier: string; titre: string; legende?: string; lecture?: unknown }

/** Écart-type de luminance : un écran noir ou uni tombe sous 8, un jeu dépasse 30. */
async function statsImage(fichier: string): Promise<{ ecart: number; largeur: number; poids: number } | null> {
  const r = await fetch(urlPublique(fichier), { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  const img = sharp(buf).grayscale();
  const [{ width }, { channels }] = await Promise.all([img.metadata(), img.stats()]);
  return { ecart: channels[0].stdev, largeur: width ?? 0, poids: buf.length };
}

async function main() {
  const slugs = await slugsPubliables();
  const jeux = await prisma.jeu.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, nom: true, rtpStudio: true, gainMaxMultiple: true, volatilite: true, captures: true, studio: { select: { slug: true } } },
    orderBy: { slug: 'asc' },
  });
  console.log(`${jeux.length} fiches publiées à auditer`);

  const suspectes: Suspecte[] = [];
  let faites = 0;
  const file = [...jeux];
  const lecteur = async () => {
    for (let j = file.shift(); j; j = file.shift()) {
      const raisons: string[] = [];
      const captures = (j.captures as unknown as CaptureEnBase[]) ?? [];
      const base = captures.find((c) => /base/.test(c.fichier));
      const regles = captures.filter((c) => /regles/.test(c.fichier));
      const rtp = j.rtpStudio == null ? null : Number(j.rtpStudio);

      if (!base) raisons.push('pas de capture du jeu de base');
      if (regles.length === 0) raisons.push('aucune page de règles');
      if (rtp != null && (rtp < 80 || rtp > 99.5)) raisons.push(`RTP hors plage : ${rtp}`);
      if (j.gainMaxMultiple != null && (j.gainMaxMultiple < 2 || j.gainMaxMultiple > 1_000_000)) raisons.push(`gain max hors plage : ${j.gainMaxMultiple}`);

      if (base) {
        const s = await statsImage(base.fichier).catch(() => null);
        if (!s) raisons.push('capture de base introuvable au stockage');
        else {
          if (s.ecart < 12) raisons.push(`jeu de base quasi uniforme (écart ${s.ecart.toFixed(1)})`);
          if (s.largeur < 600) raisons.push(`jeu de base trop petit (${s.largeur} px)`);
          if (s.poids < 8_000) raisons.push(`jeu de base trop léger (${s.poids} o)`);
        }
      }
      // Une page de règles uniforme est un clic dans le vide qui a passé la comparaison.
      for (const c of regles.slice(0, 2)) {
        const s = await statsImage(c.fichier).catch(() => null);
        if (s && s.ecart < 12) raisons.push(`page de règles quasi uniforme (${c.fichier})`);
      }

      const legendes = legendesDeCaptures(
        captures as unknown as CaptureALegender[],
        { slug: j.slug, nom: j.nom, rtp, gainMax: j.gainMaxMultiple, volatilite: j.volatilite as never },
        'fr',
      );
      const doublons = legendes.length - new Set(legendes).size;
      if (doublons > 0) raisons.push(`${doublons} légende(s) en double`);

      if (raisons.length) suspectes.push({ studio: j.studio.slug, slug: j.slug, raisons });
      faites++;
      if (faites % 200 === 0) console.log(`  … ${faites}/${jeux.length}, ${suspectes.length} suspectes`);
    }
  };
  await Promise.all(Array.from({ length: LECTEURS }, lecteur));

  writeFileSync(SORTIE, JSON.stringify(suspectes, null, 2));
  const parRaison = new Map<string, number>();
  for (const s of suspectes) for (const r of s.raisons) parRaison.set(r.replace(/[:(].*$/, '').trim(), (parRaison.get(r.replace(/[:(].*$/, '').trim()) ?? 0) + 1);
  console.log(`\n${suspectes.length} fiches suspectes sur ${jeux.length} :`);
  for (const [r, n] of [...parRaison.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${r}`);
  console.log(`\nDétail : ${SORTIE}`);
  await prisma.$disconnect();
}
main();
