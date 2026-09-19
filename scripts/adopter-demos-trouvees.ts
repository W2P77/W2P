/*
 * Poser les URL de démo trouvées chez les studios sur les fiches qui n'en ont pas.
 *
 * ── D'où elles viennent ───────────────────────────────────────────────────
 *
 * 2 017 fiches publiées n'avaient aucune démo — donc aucune capture possible,
 * donc pas de jaquette, pas de légende : toute la chaîne bloquée à la source.
 * Une recherche studio par studio a retrouvé le lanceur officiel de 1 495
 * d'entre elles, en LISANT le bouton de démo sur la fiche produit du studio,
 * jamais en fabriquant une URL. Aucun agrégateur : un lien vers un concurrent
 * est proscrit.
 *
 * ── Ce que le script s'interdit ───────────────────────────────────────────
 *
 * Il ne remplit QUE les fiches sans démo. Une démo déjà en base n'est jamais
 * remplacée : le paramètre porteur du jeu change d'un lanceur à l'autre, et
 * un échange silencieux casserait des captures qui marchent.
 *
 * ── Ce qu'on sait des limites ─────────────────────────────────────────────
 *
 * - Endorphina (218 jeux) répond « 403 Forbidden For Your Region » depuis la
 *   France : l'URL est bonne, la capture depuis ce poste ne l'est pas.
 * - Certains studios ne publient leur démo que sur un hôte de recette
 *   (staging.the-rgs.com chez Caleta, stage.clutchgamingcdn.com chez Backseat,
 *   preprod.elaapi.com chez Ela). C'est le lien que le studio lui-même affiche.
 * - Fugaso coupe si deux pages sont demandées à moins de 3,5 s d'intervalle.
 *
 *   npx tsx --env-file=.env.local scripts/adopter-demos-trouvees.ts [--appliquer]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { prisma } from '@/lib/donnees/prisma';

const APPLIQUER = process.argv.includes('--appliquer');
const SAUVEGARDES = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank');
const SOURCE = join(SAUVEGARDES, 'demos-trouvees-2026-09-19.json');

interface Studio { regle: string | null; demos?: Record<string, string>; doutes?: string[]; geo?: string }

async function main() {
  const trouvees = JSON.parse(readFileSync(SOURCE, 'utf-8')) as Record<string, Studio>;
  const parSlug = new Map<string, { url: string; studio: string }>();
  for (const [studio, s] of Object.entries(trouvees)) {
    for (const [slug, url] of Object.entries(s.demos ?? {})) parSlug.set(slug, { url, studio });
  }

  const jeux = await prisma.jeu.findMany({
    where: { slug: { in: [...parSlug.keys()] } },
    select: { id: true, slug: true, nom: true, demoUrl: true, rtpStudio: true, studio: { select: { slug: true } } },
  });

  if (APPLIQUER) {
    writeFileSync(join(SAUVEGARDES, 'w2s-demos-avant-2026-09-20.json'), JSON.stringify(jeux, null, 1));
  }

  const bilan = { poses: 0, dejaLa: 0, absents: parSlug.size - jeux.length, autreStudio: 0 };
  const parStudio = new Map<string, number>();

  for (const jeu of jeux) {
    const t = parSlug.get(jeu.slug)!;
    if (jeu.studio.slug !== t.studio) { bilan.autreStudio++; console.log(`  ! ${jeu.slug} — studio ${jeu.studio.slug} en base, ${t.studio} dans le relevé : laissé`); continue; }
    if (jeu.demoUrl) { bilan.dejaLa++; continue; }
    bilan.poses++;
    parStudio.set(t.studio, (parStudio.get(t.studio) ?? 0) + 1);
    if (APPLIQUER) await prisma.jeu.update({ where: { id: jeu.id }, data: { demoUrl: t.url } });
  }

  console.log(`\n${parSlug.size} démos trouvées · ${jeux.length} fiches présentes en base`);
  console.log(`  posées : ${bilan.poses} | déjà une démo : ${bilan.dejaLa} | slug absent : ${bilan.absents} | studio discordant : ${bilan.autreStudio}`);
  console.log('\npar studio :\n  ' + [...parStudio.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${String(n).padStart(4)}  ${s}`).join('\n  '));
  console.log(APPLIQUER ? '\nAPPLIQUÉ' : '\nSIMULATION — relancer avec --appliquer');
  await prisma.$disconnect();
}
main();
