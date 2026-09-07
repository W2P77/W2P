/**
 * Verse un rapport de veille au catalogue.
 *
 * ── Ce que ce script ne fait pas ──────────────────────────────────────────
 *
 * Il n'écrase rien. Une fiche déjà présente ne reçoit que ce qui lui manque,
 * et un chiffre qui contredit celui déjà en base est **signalé, pas appliqué**.
 * La raison est simple : ce qui est en base a été arbitré, ce qui arrive vient
 * d'être lu. Laisser la lecture la plus récente gagner reviendrait à défaire
 * l'arbitrage à chaque passage de veille.
 *
 * Il ne crée pas non plus de studio. Un jeu dont le studio est inconnu est
 * refusé : ouvrir un studio, c'est ouvrir une page de listing, un logo, une
 * clé d'accord casino — une décision, pas une conséquence d'import.
 *
 * Usage :
 *   npx tsx scripts/importer-veille.ts rapport.txt [autre.txt] \
 *     [--studio "Pragmatic Play"] [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  analyserRapport,
  formeComparable,
  niveauDePreuve,
  type Confiance,
  type FicheVeille,
} from '../src/lib/veille/analyser-rapport';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const args = process.argv.slice(2);
const appliquer = args.includes('--appliquer');
const iStudio = args.indexOf('--studio');
const studioParDefaut = iStudio >= 0 ? args[iStudio + 1] : undefined;
const fichiers = args.filter((a, i) => !a.startsWith('--') && i !== iStudio + 1);

if (fichiers.length === 0) {
  console.error('Usage : npx tsx scripts/importer-veille.ts <rapport.txt> [--studio "Nom"] [--appliquer]');
  process.exit(1);
}

/** Les champs qu'une veille peut renseigner sur une fiche existante. */
const CHAMPS_COMPLETABLES = [
  'sortieLe', 'volatilite', 'gainMaxMultiple', 'grille',
  'lignesPaiement', 'achatBonus', 'demoUrl',
] as const;

async function main() {
  const fiches: FicheVeille[] = [];
  for (const f of fichiers) {
    fiches.push(...analyserRapport(readFileSync(resolve(f), 'utf8'), studioParDefaut));
  }
  console.log(`${fiches.length} fiches lues dans ${fichiers.length} rapport(s).\n`);

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const studios = await prisma.studio.findMany({
    select: { id: true, slug: true, nom: true, siteUrl: true },
  });
  /** Un studio se retrouve par son nom comme par son slug — l'agent écrit l'un ou l'autre. */
  const parCle = new Map<string, (typeof studios)[number]>();
  for (const s of studios) {
    parCle.set(formeComparable(s.nom), s);
    parCle.set(formeComparable(s.slug), s);
  }

  const existants = await prisma.jeu.findMany({
    select: {
      id: true, slug: true, nom: true, studioId: true,
      rtpStudio: true, rtpConfiance: true, rtpSource: true,
      sortieLe: true, volatilite: true, gainMaxMultiple: true,
      grille: true, lignesPaiement: true, achatBonus: true, demoUrl: true,
      mecaniques: true,
    },
  });
  const parSlug = new Map(existants.map((j) => [j.slug, j]));
  /** Pour repérer un jeu déjà présent sous une autre écriture, dans le même studio. */
  const parNom = new Map(existants.map((j) => [`${j.studioId}|${formeComparable(j.nom)}`, j]));

  const creations: Array<{ fiche: FicheVeille; studioId: string; preuve: Confiance }> = [];
  const completions: Array<{ fiche: FicheVeille; id: string; champs: Record<string, unknown> }> = [];
  const refus: string[] = [];
  const conflits: string[] = [];

  for (const f of fiches) {
    if (!f.nom) continue;
    const studio = f.studio ? parCle.get(formeComparable(f.studio)) : undefined;
    if (!studio) {
      refus.push(`${f.nom} — studio inconnu au catalogue : « ${f.studio ?? '—'} »`);
      continue;
    }

    const preuve = niveauDePreuve(f.rtpSource, studio.siteUrl);
    const dejaLa = parSlug.get(f.slug) ?? parNom.get(`${studio.id}|${formeComparable(f.nom)}`);

    if (dejaLa) {
      if (dejaLa.slug !== f.slug) {
        /*
         * Le même jeu, sous deux écritures. Créer la seconde fiche donnerait
         * deux pages indexables pour un seul jeu, qui se prendraient leur
         * propre trafic. Trois paires jumelles l'ont déjà montré sur BetsRank.
         */
        refus.push(`${f.nom} — déjà au catalogue sous « ${dejaLa.slug} », fiche jumelle refusée`);
        continue;
      }
      const aRemplir: Record<string, unknown> = {};
      for (const champ of CHAMPS_COMPLETABLES) {
        const actuel = dejaLa[champ];
        const propose = champ === 'sortieLe' && f.sortieLe ? new Date(f.sortieLe) : f[champ as keyof FicheVeille];
        if (propose == null || propose === '') continue;
        if (actuel == null) aRemplir[champ] = propose;
        else if (champ === 'gainMaxMultiple' && actuel !== propose) {
          conflits.push(`${f.slug} — gain max : base ${actuel}, veille ${String(propose)} (non appliqué)`);
        }
      }
      if (dejaLa.mecaniques.length === 0 && f.mecaniques.length > 0) aRemplir.mecaniques = f.mecaniques;

      /*
       * Le RTP n'est complété que s'il n'y en a aucun. Un RTP déjà arbitré ne
       * bouge pas depuis un import : il bouge depuis une décision.
       */
      if (dejaLa.rtpStudio == null && f.rtpStudio != null) {
        aRemplir.rtpStudio = f.rtpStudio;
        aRemplir.rtpPaliers = f.rtpPaliers;
        aRemplir.rtpAchatBonus = f.rtpAchatBonus;
        aRemplir.rtpSource = f.rtpSource;
        aRemplir.rtpConfiance = preuve;
        aRemplir.rtpVerifieLe = new Date();
      } else if (
        dejaLa.rtpStudio != null &&
        f.rtpStudio != null &&
        Number(dejaLa.rtpStudio) !== f.rtpStudio
      ) {
        conflits.push(
          `${f.slug} — RTP : base ${dejaLa.rtpStudio} (${dejaLa.rtpConfiance}), ` +
            `veille ${f.rtpStudio} (${preuve}) — à arbitrer à la main`,
        );
      }

      if (Object.keys(aRemplir).length > 0) completions.push({ fiche: f, id: dejaLa.id, champs: aRemplir });
      continue;
    }

    creations.push({ fiche: f, studioId: studio.id, preuve });
  }

  console.log(`À créer      : ${creations.length}`);
  console.log(`À compléter  : ${completions.length}`);
  console.log(`Refusées     : ${refus.length}`);
  console.log(`Conflits     : ${conflits.length}\n`);

  for (const c of creations) {
    const { fiche, preuve } = c;
    const rtp = fiche.rtpStudio != null ? `${fiche.rtpStudio} % (${preuve})` : 'RTP absent';
    console.log(`  + ${fiche.slug.padEnd(42)} ${rtp}`);
    for (const r of fiche.reserves) console.log(`      · ${r}`);
  }
  for (const c of completions) {
    console.log(`  ~ ${c.fiche.slug.padEnd(42)} ${Object.keys(c.champs).join(', ')}`);
  }
  if (refus.length) {
    console.log('\nRefusées :');
    for (const r of refus) console.log(`  ! ${r}`);
  }
  if (conflits.length) {
    console.log('\nÀ arbitrer (rien n’a été écrit sur ces champs) :');
    for (const c of conflits) console.log(`  ? ${c}`);
  }

  const sansRtp = creations.filter((c) => c.fiche.rtpStudio == null).length;
  if (sansRtp > 0) {
    console.log(
      `\n${sansRtp} création(s) sans RTP sourcé — elles entreront en « AUCUNE » ` +
        `et la fiche le dira au visiteur plutôt que d'afficher un chiffre emprunté.`,
    );
  }

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  // Par lots : le pooler Supavisor coupe les transactions longues, et une
  // transaction unique sur cent fiches expirerait sans rien écrire.
  let crees = 0;
  for (let i = 0; i < creations.length; i += 25) {
    await Promise.all(
      creations.slice(i, i + 25).map(({ fiche, studioId, preuve }) =>
        prisma.jeu.create({
          data: {
            slug: fiche.slug,
            nom: fiche.nom,
            studioId,
            rtpStudio: fiche.rtpStudio,
            rtpPaliers: fiche.rtpPaliers,
            rtpAchatBonus: fiche.rtpAchatBonus,
            rtpSource: fiche.rtpSource,
            rtpConfiance: preuve,
            rtpVerifieLe: fiche.rtpStudio != null ? new Date() : null,
            volatilite: fiche.volatilite,
            gainMaxMultiple: fiche.gainMaxMultiple,
            grille: fiche.grille,
            lignesPaiement: fiche.lignesPaiement,
            mecaniques: fiche.mecaniques,
            achatBonus: fiche.achatBonus,
            sortieLe: fiche.sortieLe ? new Date(fiche.sortieLe) : null,
            demoUrl: fiche.demoUrl,
            confiance: preuve,
          },
        }),
      ),
    );
    crees += Math.min(25, creations.length - i);
  }

  let completes = 0;
  for (let i = 0; i < completions.length; i += 25) {
    await Promise.all(
      completions.slice(i, i + 25).map(({ id, champs }) =>
        prisma.jeu.update({ where: { id }, data: champs }),
      ),
    );
    completes += Math.min(25, completions.length - i);
  }

  console.log(`\n${crees} fiches créées, ${completes} complétées.`);
  console.log('Relecture :');
  console.log('  jeux              :', await prisma.jeu.count());
  console.log('  dont source studio:', await prisma.jeu.count({ where: { rtpConfiance: 'STUDIO' } }));
  console.log('  sortis en 2026    :', await prisma.jeu.count({ where: { sortieLe: { gte: new Date('2026-01-01') } } }));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
