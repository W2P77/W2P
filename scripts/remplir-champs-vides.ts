/*
 * Remplir les champs vides depuis les panneaux déjà photographiés.
 *
 * ── Pourquoi ce script ────────────────────────────────────────────────────
 *
 * Sur 2 484 fiches publiées, 57 % n'ont ni grille ni nombre de lignes. Ce ne
 * sont pas des jeux sans grille : ce sont des catalogues importés sans
 * données, et les mêmes qui n'ont aucune date de sortie — Spinomenal,
 * 1spin4win, Wazdan, Amusnet, Habanero. Or le panneau de règles de chacun de
 * ces jeux **écrit le chiffre en toutes lettres**, et on l'a déjà
 * photographié : 6 700 captures dorment en base avec la réponse dedans.
 *
 * Corriger une fiche fausse répare une page. Remplir une fiche vide en crée
 * une : sans grille ni lignes, la fiche n'a rien à dire que son RTP.
 *
 * ── Ce qu'il écrit, et ce qu'il refuse d'écrire ───────────────────────────
 *
 * Il n'écrit que dans un champ **vide**. Quand la fiche porte déjà une valeur,
 * il ne la touche pas — il compare et l'affiche. C'est la validation de la
 * formule à l'échelle : sur un studio dont cinquante fiches sont déjà
 * renseignées, cinquante accords de suite valent mieux qu'un raisonnement.
 * Un désaccord n'est pas tranché ici ; il est signalé et laissé à une double
 * lecture, comme les écarts de RTP.
 *
 *   npx tsx --env-file=.env.local scripts/remplir-champs-vides.ts --studio=habanero
 *   … --limite=20   … --appliquer
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

import { extraireLesFaits } from '@/lib/captures/lecture-regles';
import { prisma } from '@/lib/donnees/prisma';
import { urlPublique } from '@/lib/visuels/stockage';

const arg = (nom: string) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const APPLIQUER = process.argv.includes('--appliquer');
const STUDIO = arg('studio');
const LIMITE = Number(arg('limite') ?? Infinity);
/*
 * Le mode inverse : relire les fiches **déjà renseignées**, pour confronter la
 * formule à une valeur que quelqu'un est allé chercher. Rien n'y est écrit —
 * c'est la seule façon de savoir si une formule vaut avant de la lâcher sur
 * quatre cents fiches muettes.
 */
const VERIFIER = process.argv.includes('--verifier');
/** `/tmp` s'efface en cours de journée ; une sauvegarde qui disparaît n'en est pas une. */
const SAUVEGARDES = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank');

interface Capture { fichier: string; titre: string; legende: string }

/*
 * Deux écritures du même fait ne sont pas un désaccord.
 *
 * La base dit « 20 fixed paylines », le panneau « 20 fixed lines » ; elle dit
 * « 5x4 », il dit « 5 reels × 4 rows » ; elle dit « 243 ways to win, 3 125 en
 * 5x5 », il dit « 243 ways to win ». Comparer les textes rendait sept écarts
 * sur sept, dont **un seul** en était un — et noyer la vraie erreur sous six
 * fausses, c'est la rendre invisible. On compare donc les nombres, dans
 * l'ordre, sur ce que les deux écritures ont en commun.
 */
function memeCompte(a: string, b: string): boolean {
  const nombres = (x: string) => (x.match(/\d[\d,]*/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
  const [na, nb] = [nombres(a), nombres(b)];
  if (!na.length || !nb.length) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return nb.every((n, i) => na[i] === n);
}

async function main() {
  const jeux = await prisma.jeu.findMany({
    where: {
      rtpStudio: { not: null },
      capturesLe: { not: null },
      ...(STUDIO ? { studio: { slug: STUDIO } } : {}),
    },
    select: { id: true, slug: true, grille: true, lignesPaiement: true, captures: true },
    orderBy: { slug: 'asc' },
  });
  const aLire = jeux
    .filter((j) => ((j.captures as unknown as Capture[] | null) ?? []).some((c) => /regles/.test(c.fichier)))
    /*
     * En vérification on relit tout ce qui porte **au moins une** des deux
     * valeurs : exiger les deux écartait justement les fiches qu'on vient de
     * remplir, c'est-à-dire celles qu'on veut contrôler.
     */
    .filter((j) => (VERIFIER ? j.grille != null || j.lignesPaiement != null : j.grille == null || j.lignesPaiement == null))
    .slice(0, LIMITE);

  console.log(
    `${aLire.length} fiches à lire${STUDIO ? ` (${STUDIO})` : ''}` +
      `${APPLIQUER ? '' : ' — lecture seule, rien ne sera écrit'}\n`,
  );
  if (!aLire.length) return;

  const ouvrier = await createWorker('eng');
  const bilan = { remplis: 0, accords: 0, desaccords: 0, muets: 0 };
  const sauvegarde: Array<{ slug: string; grille: string | null; lignesPaiement: string | null }> = [];

  try {
    for (const j of aLire) {
      const caps = ((j.captures as unknown as Capture[] | null) ?? []).filter((c) => /regles/.test(c.fichier));
      const textes: string[] = [];
      for (const c of caps) {
        try {
          const r = await fetch(urlPublique(c.fichier), { signal: AbortSignal.timeout(25000) });
          if (!r.ok) continue;
          const png = await sharp(Buffer.from(await r.arrayBuffer()))
            .grayscale().normalise().resize({ width: 2560 }).png().toBuffer();
          textes.push((await ouvrier.recognize(png)).data.text);
        } catch {
          /* une capture illisible n'arrête pas la fiche */
        }
      }
      const faits = extraireLesFaits(textes.join(' '));
      const aEcrire: { grille?: string; lignesPaiement?: string } = {};

      for (const [champ, lu, enBase] of [
        ['grille', faits.grille, j.grille],
        ['lignesPaiement', faits.lignes, j.lignesPaiement],
      ] as const) {
        if (lu == null) continue;
        if (enBase == null) {
          aEcrire[champ] = lu;
        } else if (memeCompte(enBase, lu)) {
          bilan.accords += 1;
        } else {
          bilan.desaccords += 1;
          console.log(`  ⚠ écart   ${j.slug.padEnd(38)} ${champ} : base « ${enBase} » · panneau « ${lu} »`);
        }
      }

      if (Object.keys(aEcrire).length === 0) {
        bilan.muets += 1;
        continue;
      }
      bilan.remplis += 1;
      console.log(
        `  rempli    ${j.slug.padEnd(38)} ` +
          Object.entries(aEcrire).map(([c, v]) => `${c}=« ${v} »`).join(' · '),
      );
      if (APPLIQUER) {
        sauvegarde.push({ slug: j.slug, grille: j.grille, lignesPaiement: j.lignesPaiement });
        await prisma.jeu.update({ where: { id: j.id }, data: aEcrire });
      }
    }
  } finally {
    await ouvrier.terminate();
  }

  if (APPLIQUER && sauvegarde.length) {
    mkdirSync(SAUVEGARDES, { recursive: true });
    const jour = new Date().toISOString().slice(0, 10);
    writeFileSync(
      join(SAUVEGARDES, `w2p-champs-vides-${STUDIO ?? 'tous'}-avant-${jour}.json`),
      JSON.stringify(sauvegarde, null, 2),
    );
  }

  console.log(
    `\n${bilan.remplis} fiches remplies · ${bilan.accords} accords avec une valeur déjà en base` +
      ` · ${bilan.desaccords} écarts · ${bilan.muets} panneaux muets`,
  );
  await prisma.$disconnect();
}

main();
