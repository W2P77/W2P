/**
 * Exporte les faits que where2spin a vérifiés à la source.
 *
 * ── Pourquoi un fichier et pas une requête entre les deux bases ───────────
 *
 * where2spin et BetsRank vivent sur **deux projets Supabase distincts** : le
 * catalogue de l'un a été semé depuis l'autre, puis les deux ont divergé. Une
 * jointure directe supposerait un accès permanent de chaque site à la base de
 * l'autre — un couplage qu'on paierait à chaque migration de schéma.
 *
 * Un fichier est daté, relisible, versionnable, et se rejoue à froid. C'est
 * aussi ce qui permet à la confrontation côté BetsRank d'être **une lecture,
 * pas une écriture** : rien ne part en base sans qu'un humain ait vu l'écart.
 *
 * ── Ce qui sort, et ce qui ne sort pas ────────────────────────────────────
 *
 * Uniquement les fiches dont le RTP a été **lu dans le panneau de règles du
 * jeu**, capture à l'appui. Un RTP recoupé sur deux agrégateurs n'a rien à
 * faire ici : BetsRank en a déjà de cette qualité, et le seul intérêt du pont
 * est de faire circuler ce qu'on est allé chercher à la source.
 *
 * Usage : npx tsx --env-file=.env.local scripts/exporter-faits-verifies.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '@/lib/donnees/prisma';

const SORTIE = resolve(process.cwd(), '..', 'faits-verifies-w2s.json');

async function main() {
  const jeux = await prisma.jeu.findMany({
    where: { rtpConfiance: 'STUDIO' },
    select: {
      slug: true,
      nom: true,
      rtpStudio: true,
      rtpSource: true,
      rtpVerifieLe: true,
      volatilite: true,
      gainMaxMultiple: true,
      capturesLe: true,
      studio: { select: { slug: true, nom: true } },
    },
    orderBy: { slug: 'asc' },
  });

  const contenu = {
    // La date compte : un studio peut livrer une nouvelle version d'un jeu
    // avec d'autres valeurs. Un export sans date prétend valoir pour toujours.
    exporteLe: new Date().toISOString(),
    origine: 'where2spin — RTP lu dans le panneau de règles du jeu',
    jeux: jeux.map((j) => ({
      slug: j.slug,
      nom: j.nom,
      studio: j.studio.slug,
      rtp: j.rtpStudio == null ? null : Number(j.rtpStudio),
      source: j.rtpSource,
      verifieLe: j.rtpVerifieLe?.toISOString() ?? null,
      volatilite: j.volatilite,
      gainMaxMultiple: j.gainMaxMultiple,
      captureLe: j.capturesLe?.toISOString() ?? null,
    })),
  };

  writeFileSync(SORTIE, JSON.stringify(contenu, null, 2) + '\n');

  const parStudio = new Map<string, number>();
  for (const j of jeux) parStudio.set(j.studio.nom, (parStudio.get(j.studio.nom) ?? 0) + 1);

  console.log(`${jeux.length} faits vérifiés exportés vers ${SORTIE}`);
  for (const [studio, n] of [...parStudio.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${studio}`);
  }
}

main().finally(() => prisma.$disconnect());
