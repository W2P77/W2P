/*
 * Relire les captures déjà publiées avec les formules d'aujourd'hui.
 *
 * ── Pourquoi ──────────────────────────────────────────────────────────────
 *
 * Une campagne photographie le panneau de règles, puis l'interprète. Quand
 * l'interprétation ignore une formule, la fiche repart avec ses captures et
 * **sans chiffre** — et `capturesLe` étant posé, aucune campagne ne la
 * reprendra. Le 11/09/2026, 28 jeux BGaming sont sortis ainsi : Snoop Dogg
 * Dollars écrit « Return to Player (RTP) is 96% », un entier, qu'aucune
 * formule n'acceptait. Le panneau était photographié ; il suffisait de le
 * relire.
 *
 * ── Ce que le script écrit, et ce qu'il laisse à un autre ─────────────────
 *
 * Il pose la légende « Stated by the game itself » sur la page qui porte le
 * RTP, comme le fait le runner. Il n'écrit le RTP en base **que s'il ne
 * contredit pas** la valeur existante. Une contradiction reste une affaire de
 * double lecture : la légende posée, `resoudre-ecarts.ts` la trouvera et
 * tranchera, avec la même règle que pour les autres.
 *
 *   npx tsx --env-file=.env.local scripts/relire-captures.ts --studio=bgaming
 *   … --limite=5   … --appliquer
 */

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

import { extraireLesFaits } from '@/lib/captures/lecture-regles';
import { prisma } from '@/lib/donnees/prisma';
import { urlPublique } from '@/lib/visuels/stockage';

const arg = (nom: string) =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const APPLIQUER = process.argv.includes('--appliquer');
const STUDIO = arg('studio');
const LIMITE = Number(arg('limite') ?? Infinity);

interface Capture {
  fichier: string;
  titre: string;
  legende: string;
}

/** La phrase du runner, à l'identique : `resoudre-ecarts` la relit. */
function phrase(f: ReturnType<typeof extraireLesFaits>): string {
  return [
    f.rtp != null ? `RTP ${f.rtp}%` : null,
    f.rtpMin != null ? `down to ${f.rtpMin}% at the lower tier` : null,
    f.volatilite ? `volatility stated as ${f.volatilite.toLowerCase().replace('_', ' ')}` : null,
    f.gainMax != null ? `max win ${f.gainMax.toLocaleString('en-GB')}×` : null,
    f.miseMin != null && f.miseMax != null ? `bets from ${f.miseMin} to ${f.miseMax}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

async function main() {
  const jeux = await prisma.jeu.findMany({
    where: {
      capturesLe: { not: null },
      rtpConfiance: { not: 'STUDIO' },
      ...(STUDIO ? { studio: { slug: STUDIO } } : {}),
    },
    select: { id: true, slug: true, rtpStudio: true, demoUrl: true, captures: true },
    orderBy: { slug: 'asc' },
  });
  const aRelire = jeux
    .filter((j) => {
      const caps = (j.captures as unknown as Capture[] | null) ?? [];
      return caps.length && !caps.some((c) => /Stated by the game itself/i.test(c?.legende ?? ''));
    })
    .slice(0, LIMITE);

  console.log(`${aRelire.length} fiches capturées sans chiffre à relire${STUDIO ? ` (${STUDIO})` : ''}.\n`);
  if (!aRelire.length) return;

  const ouvrier = await createWorker('eng');
  let lus = 0;
  let ecarts = 0;
  let rien = 0;

  try {
    for (const j of aRelire) {
      const caps = [...((j.captures as unknown as Capture[] | null) ?? [])];
      const textes: string[] = [];
      let porteuse = -1;

      for (let i = 0; i < caps.length; i++) {
        if (!/regles/.test(caps[i].fichier)) continue;
        try {
          const r = await fetch(urlPublique(caps[i].fichier), { signal: AbortSignal.timeout(25000) });
          if (!r.ok) continue;
          const png = await sharp(Buffer.from(await r.arrayBuffer()))
            .grayscale()
            .normalise()
            .resize({ width: 2560 })
            .png()
            .toBuffer();
          const texte = (await ouvrier.recognize(png)).data.text;
          textes.push(texte);
          if (porteuse < 0 && extraireLesFaits(texte).rtp != null) porteuse = i;
        } catch {
          /* une capture illisible n'arrête pas la fiche */
        }
      }

      const faits = extraireLesFaits(textes.join(' '));
      if (faits.rtp == null || porteuse < 0) {
        rien += 1;
        console.log(`  rien     ${j.slug}`);
        continue;
      }

      const base = j.rtpStudio == null ? null : Number(j.rtpStudio);
      const ecart = base != null && Math.abs(faits.rtp - base) > 0.01;
      if (ecart) ecarts += 1;
      else lus += 1;
      console.log(
        `  ${ecart ? 'écart  ' : 'lu     '}  ${j.slug.padEnd(34)} RTP ${faits.rtp}` +
          (ecart ? `  (base ${base} — à trancher par resoudre-ecarts)` : ''),
      );

      if (!APPLIQUER) continue;
      caps[porteuse] = { ...caps[porteuse], legende: `Stated by the game itself: ${phrase(faits)}.` };
      await prisma.jeu.update({
        where: { id: j.id },
        data: {
          captures: caps as never,
          ...(!ecart
            ? {
                rtpStudio: faits.rtp,
                ...(faits.rtpMin != null ? { rtpPaliers: [faits.rtp, faits.rtpMin] } : {}),
                rtpSource: `${j.demoUrl} — panneau de règles`,
                rtpConfiance: 'STUDIO' as const,
                rtpVerifieLe: new Date(),
                confiance: 'STUDIO' as const,
                ...(faits.volatilite ? { volatilite: faits.volatilite as never } : {}),
                ...(faits.gainMax != null ? { gainMaxMultiple: Math.round(faits.gainMax) } : {}),
              }
            : {}),
        },
      });
    }
  } finally {
    await ouvrier.terminate();
  }

  console.log(`\nlus ${lus} · écarts ${ecarts} · toujours rien ${rien}`);
  console.log(
    APPLIQUER
      ? `${lus} fiches ont leur RTP. Passer resoudre-ecarts pour les ${ecarts} écarts, puis adopter-preuves.\n`
      : 'SIMULATION — ajouter --appliquer.\n',
  );
}

main().finally(() => prisma.$disconnect());
