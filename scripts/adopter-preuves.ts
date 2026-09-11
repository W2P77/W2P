/*
 * Donner une preuve aux faits qu'on a déjà.
 *
 * ── Ce qui existe, et pourquoi ça ne suffit pas ───────────────────────────
 *
 * Une fiche porte `rtpSource` : **une seule chaîne de texte pour tout le
 * jeu**. Elle peut dire d'où vient le RTP, jamais d'où viennent la volatilité,
 * le gain maximum ou la grille. Et elle ne dit pas *quand* ni *qui*.
 *
 * La table `Preuve` porte une ligne par champ prouvé. Ce script l'alimente à
 * partir de ce que les campagnes de capture ont déjà établi — sans rien
 * inventer, et surtout sans rien inventer là où il n'y a rien.
 *
 * ── La règle qui décide de tout ───────────────────────────────────────────
 *
 * **On n'adopte que ce qui porte une source identifiable.**
 *
 * 141 fiches sont marquées `RECOUPE` avec `rtpSource` à null : elles viennent
 * d'un import, personne n'est allé les vérifier. Leur fabriquer une ligne de
 * preuve sans URL transformerait « on ne sait pas d'où ça vient » en « c'est
 * sourcé » — l'inverse exact du but de cette table. Elles restent sans preuve,
 * et c'est l'information juste.
 *
 *   npx tsx --env-file=.env.local scripts/adopter-preuves.ts
 *   … --appliquer
 */

import { prisma } from '@/lib/donnees/prisma';
import type { TypeDeSource } from '@/generated/prisma/client';

const APPLIQUER = process.argv.includes('--appliquer');

/** Qui a établi ces preuves : la chaîne de capture, pas une personne. */
const AUTEUR = 'capture-automatique';

interface Capture {
  fichier: string;
  titre: string;
  legende: string;
}

/**
 * La source, telle que `rtpSource` la décrit.
 *
 * « …openGame.do?… — panneau de règles » est le jeu lui-même, ce qui fait
 * autorité au-dessus de tout le reste : c'est le logiciel qui paie qui
 * annonce son taux. Une URL nue de studio vaut moins — une fiche produit se
 * périme sans qu'on le voie.
 */
function typeDeLaSource(source: string): { type: TypeDeSource; url: string; libelle: string } {
  const panneau = source.endsWith('— panneau de règles');
  const url = panneau ? source.replace(/\s*—\s*panneau de règles$/, '').trim() : source.trim();
  return panneau
    ? { type: 'REGLES_DU_JEU', url, libelle: 'Panneau de règles du jeu' }
    : { type: 'STUDIO', url, libelle: 'Fiche produit du studio' };
}

/**
 * La capture qui montre le fait, s'il y en a une.
 *
 * `capturer-jeux.ts` ne pose une légende chiffrée que sur la page qui porte le
 * RTP : c'est la seule qui prouve quelque chose. Les autres captures
 * documentent le jeu sans rien établir, et les rattacher à une preuve
 * laisserait croire qu'elles montrent le chiffre.
 */
function captureQuiProuve(captures: unknown): string | null {
  if (!Array.isArray(captures)) return null;
  const porteuse = (captures as Capture[]).find((c) => /Stated by the game itself/i.test(c?.legende ?? ''));
  return porteuse?.fichier ?? null;
}

async function main() {
  const jeux = await prisma.jeu.findMany({
    where: { rtpSource: { not: null }, rtpStudio: { not: null } },
    select: {
      id: true,
      slug: true,
      rtpStudio: true,
      rtpSource: true,
      rtpConfiance: true,
      rtpVerifieLe: true,
      captures: true,
      volatilite: true,
      gainMaxMultiple: true,
    },
  });

  const sansSource = await prisma.jeu.count({
    where: { rtpStudio: { not: null }, rtpSource: null },
  });
  const dejaFaites = await prisma.preuve.count();

  console.log(`${jeux.length} fiches portent un RTP et une source.`);
  console.log(`${sansSource} portent un RTP sans source — laissées sans preuve, volontairement.`);
  console.log(`${dejaFaites} preuves déjà en base.\n`);

  let rtp = 0;
  let vola = 0;
  let gain = 0;
  let sautees = 0;

  for (const jeu of jeux) {
    const { type, url, libelle } = typeDeLaSource(jeu.rtpSource!);
    const capture = captureQuiProuve(jeu.captures);
    const quand = jeu.rtpVerifieLe ?? new Date();

    // Rejouable sans doublon : une preuve existante pour ce champ vaut accord.
    const existantes = await prisma.preuve.findMany({
      where: { jeuId: jeu.id },
      select: { champ: true },
    });
    const faits = new Set(existantes.map((p) => p.champ));

    const aEcrire: Array<{ champ: string; valeur: string }> = [];
    if (!faits.has('rtpStudio')) aEcrire.push({ champ: 'rtpStudio', valeur: String(jeu.rtpStudio) });

    /*
     * La volatilité et le gain maximum ne sont prouvés que si la capture le
     * montre. Sur une fiche sans capture porteuse, ces champs viennent de
     * l'import : les rattacher à l'URL du panneau affirmerait qu'on les y a
     * lus, ce qui serait faux.
     */
    if (capture) {
      if (jeu.volatilite && !faits.has('volatilite')) {
        aEcrire.push({ champ: 'volatilite', valeur: jeu.volatilite });
      }
      if (jeu.gainMaxMultiple != null && !faits.has('gainMaxMultiple')) {
        aEcrire.push({ champ: 'gainMaxMultiple', valeur: String(jeu.gainMaxMultiple) });
      }
    }

    if (!aEcrire.length) {
      sautees += 1;
      continue;
    }

    for (const { champ, valeur } of aEcrire) {
      if (champ === 'rtpStudio') rtp += 1;
      else if (champ === 'volatilite') vola += 1;
      else gain += 1;

      if (!APPLIQUER) continue;
      await prisma.preuve.create({
        data: {
          jeuId: jeu.id,
          champ,
          valeurBrute: valeur,
          type,
          url,
          libelle,
          capture,
          verifieeLe: quand,
          verifieePar: AUTEUR,
        },
      });
    }
  }

  console.log(`  rtpStudio       ${String(rtp).padStart(4)}`);
  console.log(`  volatilite      ${String(vola).padStart(4)}  (seulement là où une capture le montre)`);
  console.log(`  gainMaxMultiple ${String(gain).padStart(4)}  (idem)`);
  console.log(`  ${sautees} fiches déjà couvertes, rien à faire.`);
  console.log(
    APPLIQUER
      ? `\n${rtp + vola + gain} preuves écrites.\n`
      : `\nSIMULATION — ${rtp + vola + gain} preuves seraient écrites. Ajouter --appliquer.\n`,
  );
}

main().finally(() => prisma.$disconnect());
