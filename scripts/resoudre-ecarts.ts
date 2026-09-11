/*
 * Trancher les fiches où la capture contredit le RTP affiché.
 *
 * ── D'où viennent ces écarts ──────────────────────────────────────────────
 *
 * Quand le panneau d'un jeu annonce un autre RTP que la base, `capturer-jeux`
 * n'écrase pas : une lecture OCR peut prendre un 6 pour un 7, et publier une
 * faute en « source studio » est le pire cas possible. Mais il publie les
 * captures quand même — la fiche montre alors le jeu annonçant 97,1 % à côté
 * d'un chiffre qui dit 96,1 %. Et l'écart n'était consigné nulle part : une
 * ligne de console, perdue avec le journal.
 *
 * Il n'est pas perdu pour autant. La capture qui porte le RTP garde sa légende
 * (« Stated by the game itself: RTP 97.1% … ») : comparer ce chiffre à la base
 * retrouve tous les écarts de toutes les campagnes, passées et futures.
 *
 * ── La règle ──────────────────────────────────────────────────────────────
 *
 * **Le panneau ne remplace la base qu'après une seconde lecture indépendante**
 * de la même image : plein cadre et non recadrée, à double résolution. Si elle
 * retombe exactement sur le chiffre de la première, deux lectures faites
 * autrement s'accordent contre une valeur d'import que personne n'a vérifiée.
 * Sinon, rien ne bouge et la fiche reste à relire à la main.
 *
 * Le motif des écarts trouvés le 11/09/2026 plaide pour cette règle : sur 73,
 * la plupart sont des `96,5 → 96,0x` — le chiffre rond de l'import, que
 * CLAUDE.md désigne déjà comme une supposition.
 *
 *   npx tsx --env-file=.env.local scripts/resoudre-ecarts.ts
 *   … --appliquer
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

import { extraireLesFaits } from '@/lib/captures/lecture-regles';
import { prisma } from '@/lib/donnees/prisma';
import { urlPublique } from '@/lib/visuels/stockage';

const APPLIQUER = process.argv.includes('--appliquer');

interface Capture {
  fichier: string;
  legende: string;
}

type Verdict = 'confirme' | 'infirme' | 'illisible' | 'autre';

async function main() {
  const jeux = await prisma.jeu.findMany({
    where: { captures: { not: undefined }, capturesLe: { not: null } },
    select: { id: true, slug: true, rtpStudio: true, demoUrl: true, captures: true, studio: { select: { slug: true } } },
  });

  const ecarts = jeux.flatMap((j) => {
    const porteuse = ((j.captures as Capture[] | null) ?? []).find((c) =>
      /Stated by the game itself/i.test(c?.legende ?? ''),
    );
    const lu = porteuse?.legende.match(/RTP\s+([\d.]+)%/);
    if (!porteuse || !lu || j.rtpStudio == null) return [];
    const panneau = Number(lu[1]);
    const base = Number(j.rtpStudio);
    return Math.abs(panneau - base) > 0.01 ? [{ ...j, panneau, base, fichier: porteuse.fichier }] : [];
  });

  console.log(`${jeux.length} fiches capturées, ${ecarts.length} où la capture contredit la base.\n`);
  if (!ecarts.length) return;

  const dossier = join(tmpdir(), 'resoudre-ecarts');
  mkdirSync(dossier, { recursive: true });
  const ouvrier = await createWorker('eng');
  const bilan: Record<Verdict, number> = { confirme: 0, infirme: 0, illisible: 0, autre: 0 };

  try {
    for (const e of ecarts) {
      let seconde: number | null = null;
      try {
        const r = await fetch(urlPublique(e.fichier), { signal: AbortSignal.timeout(25000) });
        if (!r.ok) throw new Error(`${r.status}`);
        const brut = Buffer.from(await r.arrayBuffer());
        // Autrement que la première lecture : plein cadre, sans recadrage,
        // à double résolution. Deux méthodes qui s'accordent valent mieux
        // qu'une méthode répétée.
        const png = await sharp(brut).grayscale().normalise().resize({ width: 2560 }).png().toBuffer();
        writeFileSync(join(dossier, `${e.slug}.png`), png);
        const { data } = await ouvrier.recognize(png);
        seconde = extraireLesFaits(data.text).rtp;
      } catch {
        seconde = null;
      }

      const verdict: Verdict =
        seconde == null ? 'illisible'
        : Math.abs(seconde - e.panneau) <= 0.001 ? 'confirme'
        : Math.abs(seconde - e.base) <= 0.001 ? 'infirme'
        : 'autre';
      bilan[verdict] += 1;

      const signe = e.panneau > e.base ? '+' : '';
      console.log(
        `  ${verdict.padEnd(9)} ${e.studio.slug.padEnd(15)} ${e.slug.padEnd(34)} ` +
          `base ${String(e.base).padEnd(6)} panneau ${String(e.panneau).padEnd(6)} ` +
          `2e lecture ${seconde ?? '—'}  (${signe}${(e.panneau - e.base).toFixed(2)})`,
      );

      if (!APPLIQUER || verdict !== 'confirme') continue;

      await prisma.jeu.update({
        where: { id: e.id },
        data: {
          rtpStudio: e.panneau,
          rtpSource: `${e.demoUrl} — panneau de règles`,
          rtpConfiance: 'STUDIO',
          rtpVerifieLe: new Date(),
          confiance: 'STUDIO',
        },
      });
      const deja = await prisma.preuve.findFirst({ where: { jeuId: e.id, champ: 'rtpStudio' } });
      if (!deja) {
        await prisma.preuve.create({
          data: {
            jeuId: e.id,
            champ: 'rtpStudio',
            valeurBrute: String(e.panneau),
            type: 'REGLES_DU_JEU',
            url: e.demoUrl,
            libelle: 'Panneau de règles du jeu',
            capture: e.fichier,
            verifieePar: 'double-lecture',
            note: `Remplace ${e.base} issu de l'import ; confirmé par une seconde lecture plein cadre.`,
          },
        });
      }
    }
  } finally {
    await ouvrier.terminate();
  }

  console.log(
    `\nconfirmés ${bilan.confirme} · infirmés ${bilan.infirme} · illisibles ${bilan.illisible} · autres ${bilan.autre}`,
  );
  console.log(
    APPLIQUER
      ? `${bilan.confirme} fiches alignées sur leur panneau. Le reste est à relire à la main.\n`
      : `SIMULATION — ${bilan.confirme} fiches seraient alignées. Ajouter --appliquer.\n`,
  );
}

main().finally(() => prisma.$disconnect());
