/**
 * Combien de légendes se répètent à l'intérieur d'une même fiche ?
 *
 * ── Pourquoi mesurer avant de corriger ───────────────────────────────────
 *
 * Les légendes sont dérivées du **type** de la capture, pas de son contenu :
 * dix pages de règles différentes reçoivent donc la même phrase. Sur une même
 * page, c'est du contenu dupliqué — et ça n'apprend rien au lecteur.
 *
 * On ne corrige pas un défaut qu'on n'a pas chiffré : ce script compte les
 * répétitions telles que le visiteur les lit, c'est-à-dire en rejouant
 * exactement `legendeDeCapture` sur les captures de la base, dans les trois
 * langues.
 *
 * Lecture seule : aucune écriture, aucun `--appliquer`.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

import { legendesDeCaptures, typeDeCapture } from '../src/lib/legendes';
import { estPublieable } from '../src/lib/publication';

const LANGUES = ['en', 'fr', 'de'] as const;

interface CaptureLue {
  fichier?: unknown;
  titre?: unknown;
  legende?: unknown;
  /** Ce que la page de règles explique, reconnu à la capture. Voir `legendes.ts`. */
  lecture?: unknown;
}

/*
 * La mesure passe par `legendesDeCaptures`, pas par `legendeDeCapture`.
 *
 * C'est la fiche entière que le visiteur lit, et c'est à ce niveau que les
 * suites d'une même page sont signalées au lieu d'être répétées. Mesurer
 * capture par capture comptait en doublon des phrases que le site ne montre
 * plus telles quelles.
 */
const legendesDe = (captures: CaptureLue[], faits: Parameters<typeof legendesDeCaptures>[1], langue: (typeof LANGUES)[number]) =>
  legendesDeCaptures(
    captures.map((c) => ({
      titre: String(c.titre),
      legende: typeof c.legende === 'string' ? c.legende : null,
      lecture: c.lecture,
    })),
    faits,
    langue,
  );

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const jeux = await prisma.jeu.findMany({
    where: { capturesLe: { not: null } },
    select: {
      slug: true,
      nom: true,
      rtpStudio: true,
      gainMaxMultiple: true,
      volatilite: true,
      captures: true,
    },
  });

  let fichesAvecCaptures = 0;
  let fichesPubliables = 0;
  let capturesTotal = 0;
  let legendesTotal = 0;
  // Une légende est « dupliquée » dès qu'elle apparaît au moins deux fois dans
  // la même fiche et la même langue : on compte les exemplaires en trop, pas
  // les groupes, parce que c'est le nombre de phrases que le lecteur relit.
  let legendesDupliquees = 0;
  let fichesTouchees = 0;
  /*
   * Le rattrapage OCR avance fiche par fiche : sans cette coupe, la mesure
   * globale mélange ce qui est relu et ce qui ne l'est pas encore, et on ne
   * sait pas si le chiffre baisse parce que la méthode marche ou parce que la
   * passe progresse. Les deux colonnes répondent séparément.
   */
  const relues = { fiches: 0, legendes: 0, dupliquees: 0 };
  const enAttente = { fiches: 0, legendes: 0, dupliquees: 0 };
  const parType = new Map<string, { captures: number; dupliquees: number }>();
  const pires: Array<{ slug: string; repetitions: number; phrase: string }> = [];

  for (const jeu of jeux) {
    const lot = Array.isArray(jeu.captures) ? (jeu.captures as CaptureLue[]) : [];
    const captures = lot.filter((c) => !!c && typeof c === 'object' && typeof c.titre === 'string');
    if (captures.length === 0) continue;
    fichesAvecCaptures += 1;
    if (estPublieable({ rtpStudio: jeu.rtpStudio, captures })) fichesPubliables += 1;
    capturesTotal += captures.length;

    const faits = {
      slug: jeu.slug,
      nom: jeu.nom,
      rtp: jeu.rtpStudio == null ? null : Number(jeu.rtpStudio),
      gainMax: jeu.gainMaxMultiple == null ? null : Number(jeu.gainMaxMultiple),
      volatilite: jeu.volatilite ?? null,
    };

    const estRelue = captures.some((c) => c && typeof c === 'object' && 'lecture' in c);
    const colonne = estRelue ? relues : enAttente;
    colonne.fiches += 1;

    let ficheTouchee = false;
    for (const langue of LANGUES) {
      const comptes = new Map<string, number>();
      for (const legende of legendesDe(captures, faits, langue)) {
        comptes.set(legende, (comptes.get(legende) ?? 0) + 1);
        legendesTotal += 1;
        colonne.legendes += 1;
      }
      for (const [phrase, n] of comptes) {
        if (n < 2) continue;
        legendesDupliquees += n - 1;
        colonne.dupliquees += n - 1;
        ficheTouchee = true;
        if (langue === 'fr') pires.push({ slug: jeu.slug, repetitions: n, phrase });
      }
    }
    if (ficheTouchee) fichesTouchees += 1;

    // Quel type de capture produit les répétitions ? C'est lui qu'il faudra
    // affiner en premier — inutile de traiter les neuf autres pour rien.
    const comptesFr = new Map<string, string[]>();
    const legendesFr = legendesDe(captures, faits, 'fr');
    captures.forEach((c, i) => {
      const type = typeDeCapture(String(c.titre));
      const legende = legendesFr[i];
      const entree = parType.get(type) ?? { captures: 0, dupliquees: 0 };
      entree.captures += 1;
      parType.set(type, entree);
      comptesFr.set(legende, [...(comptesFr.get(legende) ?? []), type]);
    });
    for (const types of comptesFr.values()) {
      if (types.length < 2) continue;
      for (const type of types.slice(1)) {
        const entree = parType.get(type)!;
        entree.dupliquees += 1;
      }
    }
  }

  const pourcent = (n: number, total: number) => (total === 0 ? '0' : ((n * 100) / total).toFixed(1));

  console.log('── Légendes dupliquées à l’intérieur d’une même fiche ──────────────');
  console.log(`fiches avec captures    : ${fichesAvecCaptures} (dont publiables : ${fichesPubliables})`);
  console.log(`captures                : ${capturesTotal}`);
  console.log(`légendes affichées      : ${legendesTotal} (3 langues)`);
  console.log(
    `légendes en double      : ${legendesDupliquees} — ${pourcent(legendesDupliquees, legendesTotal)} %`,
  );
  console.log(
    `fiches concernées       : ${fichesTouchees} — ${pourcent(fichesTouchees, fichesAvecCaptures)} % des fiches à captures`,
  );

  console.log('\n── Avancement du rattrapage OCR ───────────────────────────────────');
  for (const [nom, c] of [['relues', relues], ['en attente', enAttente]] as const) {
    console.log(
      `${nom.padEnd(12)} fiches ${String(c.fiches).padStart(5)}   légendes ${String(c.legendes).padStart(6)}` +
        `   en double ${String(c.dupliquees).padStart(6)}   ${pourcent(c.dupliquees, c.legendes)} %`,
    );
  }

  console.log('\n── Par type de capture (français, un tiers du total) ──────────────');
  const lignes = [...parType.entries()].sort((a, b) => b[1].dupliquees - a[1].dupliquees);
  for (const [type, { captures, dupliquees }] of lignes) {
    console.log(
      `${type.padEnd(12)} captures ${String(captures).padStart(5)}   en double ${String(dupliquees).padStart(5)}   ${pourcent(dupliquees, captures)} %`,
    );
  }

  console.log('\n── Les fiches où une même phrase revient le plus (français) ───────');
  for (const p of pires.sort((a, b) => b.repetitions - a.repetitions).slice(0, 15)) {
    console.log(`${String(p.repetitions).padStart(2)}× ${p.slug.padEnd(34)} « ${p.phrase.slice(0, 60)}… »`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
