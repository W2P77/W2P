/*
 * Rattraper les captures déjà publiées : ce que chaque page de règles explique.
 *
 * ── Pourquoi ce rattrapage ────────────────────────────────────────────────
 *
 * 53,9 % des légendes du site sont des doublons à l'intérieur de leur propre
 * fiche, et 99,3 % des fiches à captures en portent au moins un. La cause est
 * toujours la même : sept pages de panneau différentes reçoivent la phrase
 * « Une page du panneau de règles, telle que le jeu l'affiche », parce que la
 * légende est dérivée du **type** de la capture et que le type ne sait rien
 * dire d'autre.
 *
 * Le pipeline de capture sait désormais reconnaître de quoi une page parle et
 * range son verdict dans la capture (`lecture`). Mais il ne le fait qu'au
 * moment de photographier, et les 10 000 captures déjà en ligne n'y repasseront
 * jamais : `capturesLe` est posé, aucune campagne ne les reprend. Les images
 * sont pourtant là, et le panneau y est lisible. Il suffit de les relire.
 *
 * ── Ce qui est écrit, et ce qui ne l'est pas ──────────────────────────────
 *
 * Le texte OCR ne part **pas** en base : seul son verdict le fait — le sujet de
 * la page, les codes des formulations reconnues, et au plus deux chiffres de
 * déclenchement. Une centaine d'octets. Publier l'OCR brut coûterait une
 * dizaine de kilooctets par fiche expédiés au navigateur, pour un texte que
 * personne n'a relu et qui n'est affiché dans aucune des trois langues.
 *
 * Rien d'autre n'est touché : ni le RTP, ni la volatilité, ni les légendes
 * déjà écrites. Une page dont l'OCR ne permet rien d'affirmer reçoit `null` —
 * qui veut dire « lue, rien de sûr », et non « pas encore lue ». C'est la
 * différence qui rend ce script relançable sans refaire quatre heures d'OCR.
 *
 *   npx tsx --env-file=.env.local scripts/relire-legendes-captures.ts --limite=5
 *   … --studio=wazdan   … --slugs=bell-wizard   … --montrer   … --appliquer
 *   … --muettes   reprend aussi les pages déjà lues qui n'avaient rien donné,
 *                 à n'ouvrir qu'après avoir enrichi le vocabulaire des panneaux.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { createWorker, type Worker } from 'tesseract.js';

import { prisma } from '@/lib/donnees/prisma';
import { legendesDeCaptures, lireCapture, type LectureDeCapture } from '@/lib/legendes';
import { urlPublique } from '@/lib/visuels/stockage';

const arg = (nom: string) =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const APPLIQUER = process.argv.includes('--appliquer');
const STUDIO = arg('studio');
const SLUGS = arg('slugs')?.split(',');
const LIMITE = Number(arg('limite') ?? Infinity);
/*
 * Deux lecteurs, pas plus.
 *
 * Le poste a déjà été mis à genoux par trois campagnes de captures en
 * parallèle : les jeux ne chargeaient plus à temps et le journal accusait les
 * adaptateurs. Ici le travail est du calcul pur, mais Tesseract garde chacune
 * de ses images entière en mémoire et l'OCR est déjà ce qui coûte. Deux
 * lecteurs divisent l'attente par deux sans rien risquer ; au-delà, on ne
 * gagne plus que du risque.
 */
const LECTEURS = Number(arg('lecteurs') ?? 2);
/*
 * Reprendre aussi les pages déjà lues qui n'avaient rien donné.
 *
 * Le vocabulaire des panneaux grandit : chaque formulation ajoutée rend
 * lisibles des pages que la passe précédente a laissées muettes. Sans cette
 * porte, le marque-page les scellerait pour toujours — il dit « déjà lue », pas
 * « lue avec le vocabulaire d'aujourd'hui ». À n'ouvrir qu'après un ajout
 * d'énoncés : sinon c'est trois heures d'OCR pour le même verdict.
 */
const MUETTES = process.argv.includes('--muettes');
/*
 * Afficher les légendes telles que le visiteur les lira, dans les trois
 * langues. Le sujet d'une page ne dit pas si la phrase qui en sort est bonne :
 * c'est la phrase qu'il faut relire avant une passe de dix mille captures.
 */
const MONTRER = process.argv.includes('--montrer');
const LANGUES = ['fr', 'en', 'de'] as const;

/** Là où l'on garde ce qu'on s'apprête à écraser — `/tmp` s'efface en cours de journée. */
const SAUVEGARDES = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank');

interface Capture {
  fichier: string;
  titre: string;
  legende?: string;
  lecture?: LectureDeCapture | null;
}

/** Une capture de panneau, seule à valoir une relecture : les autres n'ont rien à lire. */
const EST_UNE_PAGE_DE_REGLES = /regles/;

/**
 * Le texte d'une capture, lu là où elle est publiée.
 *
 * Le prétraitement est celui du pipeline, au détail près : gris, contraste
 * normalisé, largeur portée à 2560. Sans lui, le texte d'un panneau réduit à
 * la taille d'une vignette ne se lit pas — et l'OCR rend alors de la bouillie,
 * qu'on prendrait pour une page illisible.
 */
async function lireLImage(lecteur: Worker, fichier: string): Promise<string | null> {
  const r = await fetch(urlPublique(fichier), { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) return null;
  const png = await sharp(Buffer.from(await r.arrayBuffer()))
    .grayscale()
    .normalise()
    .resize({ width: 2560 })
    .png()
    .toBuffer();
  return (await lecteur.recognize(png)).data.text;
}

async function main() {
  const jeux = await prisma.jeu.findMany({
    where: {
      capturesLe: { not: null },
      ...(STUDIO ? { studio: { slug: STUDIO } } : {}),
      ...(SLUGS ? { slug: { in: SLUGS } } : {}),
    },
    select: {
      id: true,
      slug: true,
      nom: true,
      rtpStudio: true,
      gainMaxMultiple: true,
      volatilite: true,
      captures: true,
    },
    orderBy: { slug: 'asc' },
  });

  /*
   * Le marque-page : une fiche dont toutes les pages de règles portent déjà le
   * champ est passée. `null` compte comme passé — il dit « lue, rien de sûr ».
   * C'est ce qui permet d'arrêter la passe pour autre chose et de la reprendre
   * sans relire ce qui l'a déjà été.
   */
  const aLire = (c: Capture) =>
    !!c && EST_UNE_PAGE_DE_REGLES.test(c.fichier) && (!('lecture' in c) || (MUETTES && !c.lecture));

  const aRelire = jeux
    .map((j) => ({ ...j, caps: (j.captures as unknown as Capture[] | null) ?? [] }))
    .filter((j) => j.caps.some(aLire))
    .slice(0, LIMITE);

  const pages = aRelire.reduce((n, j) => n + j.caps.filter(aLire).length, 0);
  console.log(
    `${aRelire.length} fiches à relire, ${pages} pages de panneau` +
      (STUDIO ? ` (studio ${STUDIO})` : '') +
      ` — environ ${Math.round((pages * 1.7) / 60 / LECTEURS)} min à ${LECTEURS} lecteurs.\n`,
  );
  if (!aRelire.length) return;

  /*
   * Sauvegarder avant, et seulement en mode réel.
   *
   * L'écriture remplace la colonne `captures` entière : une erreur de forme y
   * effacerait les fichiers et les titres, c'est-à-dire les captures
   * elles-mêmes, dont les images resteraient chez Supabase sans que rien ne
   * les désigne.
   */
  if (APPLIQUER) {
    mkdirSync(SAUVEGARDES, { recursive: true });
    const horodatage = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const chemin = join(SAUVEGARDES, `w2p-captures-avant-lecture-${horodatage}.jsonl`);
    writeFileSync(
      chemin,
      aRelire.map((j) => JSON.stringify({ id: j.id, slug: j.slug, captures: j.caps })).join('\n'),
    );
    console.log(`Sauvegarde : ${chemin}\n`);
  }

  const lecteurs = await Promise.all(
    Array.from({ length: LECTEURS }, () => createWorker('eng')),
  );
  const compte = new Map<string, number>();
  let lues = 0;
  let muettes = 0;

  /*
   * Une file, pas des lots.
   *
   * La première version traitait les fiches par paquets de `LECTEURS` et
   * attendait le plus lent : une fiche Pragmatic de 2 pages voisinant une fiche
   * Wazdan de 18 laissait un lecteur inoccupé les trois quarts du temps. Sur
   * 1 184 fiches dont le nombre de pages va de 2 à 18, c'est la moitié de la
   * passe perdue à attendre. Chaque lecteur tire donc la fiche suivante dès
   * qu'il a fini la sienne.
   */
  let prochaine = 0;
  let faites = 0;

  const servir = async (lecteur: Worker) => {
    for (;;) {
      const jeu = aRelire[prochaine++];
      if (!jeu) return;

      const caps = jeu.caps.map((c) => ({ ...c }));
      for (const c of caps) {
        if (!aLire(c)) continue;
        let lecture: LectureDeCapture | null = null;
        try {
          lecture = lireCapture(await lireLImage(lecteur, c.fichier));
        } catch {
          /*
           * Une image qu'on n'a pas pu chercher n'est pas une page illisible :
           * la laisser sans champ, c'est la reprendre à la prochaine passe au
           * lieu de la déclarer muette pour toujours.
           */
          continue;
        }
        c.lecture = lecture;
        if (lecture) {
          lues += 1;
          compte.set(lecture.sujet, (compte.get(lecture.sujet) ?? 0) + 1);
        } else {
          muettes += 1;
        }
      }

      const sujets = caps
        .filter((c) => EST_UNE_PAGE_DE_REGLES.test(c.fichier))
        .map((c) => c.lecture?.sujet ?? '—');
      console.log(`  ${jeu.slug.padEnd(34)} ${sujets.join(' · ')}`);

      if (MONTRER) {
        const faits = {
          slug: jeu.slug,
          nom: jeu.nom,
          rtp: jeu.rtpStudio == null ? null : Number(jeu.rtpStudio),
          gainMax: jeu.gainMaxMultiple == null ? null : Number(jeu.gainMaxMultiple),
          volatilite: jeu.volatilite ?? null,
        };
        const parLangue = Object.fromEntries(
          LANGUES.map((l) => [l, legendesDeCaptures(caps, faits, l)]),
        ) as Record<(typeof LANGUES)[number], string[]>;
        caps.forEach((c, k) => {
          console.log(`\n    ━━ ${c.titre}`);
          for (const l of LANGUES) console.log(`    ${l} : ${parLangue[l][k]}`);
        });
        console.log('');
      }

      // Une fiche est écrite dès qu'elle est prête : une passe de plusieurs
      // heures doit être interruptible sans perte.
      if (APPLIQUER) {
        await prisma.jeu.update({ where: { id: jeu.id }, data: { captures: caps as never } });
      }
      faites += 1;
      if (faites % 25 === 0) console.log(`  — ${faites}/${aRelire.length} —`);
    }
  };

  try {
    await Promise.all(lecteurs.map(servir));
  } finally {
    for (const l of lecteurs) await l.terminate();
  }

  console.log(`\npages identifiées ${lues} · pages muettes ${muettes}`);
  for (const [sujet, n] of [...compte].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sujet.padEnd(20)} ${n}`);
  }
  console.log(
    APPLIQUER
      ? '\nÉcrit. Les fiches changent à la revalidation ISR suivante, sans build.\n'
      : '\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.\n',
  );
}

main().finally(() => prisma.$disconnect());
