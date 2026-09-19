import { basename } from 'node:path';
import { writeFileSync } from 'node:fs';

import { prisma } from '@/lib/donnees/prisma';
import { RACINE_CAPTURES } from '@/lib/site';

/**
 * Donner une vignette aux fiches qui n'en ont pas, avec leur propre capture.
 *
 * ── Pourquoi elles en manquent ────────────────────────────────────────────
 *
 * Les 1 855 jaquettes du dossier `public/images/slots` viennent du lot importé
 * de BetsRank. Tout studio ouvert depuis — Wazdan, Play'n GO, Red Tiger — n'en
 * a aucune : **264 fiches publiées** affichent donc le repli textuel, un nom
 * sur fond dégradé, alors que le site vient précisément de photographier leur
 * jeu.
 *
 * ── Pourquoi la capture « base », et pas une autre ────────────────────────
 *
 * C'est l'écran du jeu à l'ouverture de la démo, avant le moindre tour : la
 * seule qui montre le jeu lui-même et non son règlement. Les pages de règles
 * feraient une vignette illisible en 160 px.
 *
 * ── Pourquoi l'écrire en base plutôt qu'au rendu ──────────────────────────
 *
 * `visuelUrl` est déjà lu par les cartes, la vitrine, le sitemap et la carte
 * de partage. Un repli calculé à l'affichage devrait être répété dans chacun,
 * et le premier oubli passerait inaperçu. L'origine reste lisible dans le
 * chemin : `/images/slots/…` est une jaquette de studio, `…/captures/…` une
 * capture adoptée — de quoi les reprendre le jour où les vraies arrivent.
 */
async function main() {
  const appliquer = process.argv.includes('--appliquer');

  const jeux = await prisma.$queryRaw<Array<{ id: string; slug: string; captures: unknown }>>`
    SELECT id, slug, captures FROM jeux
    WHERE rtp_studio IS NOT NULL
      AND captures IS NOT NULL
      AND jsonb_array_length(captures) > 0
      AND visuel_url IS NULL
  `;

  const aPoser: Array<{ id: string; slug: string; url: string }> = [];
  const sansBase: string[] = [];

  for (const j of jeux) {
    const captures = (j.captures as Array<{ fichier?: string; titre?: string }> | null) ?? [];
    // Le titre du pipeline est en anglais ; le slug du fichier porte « -base ».
    const base =
      captures.find((c) => /base game/i.test(c.titre ?? '')) ??
      captures.find((c) => /-base\./i.test(c.fichier ?? ''));
    if (!base?.fichier) {
      sansBase.push(j.slug);
      continue;
    }
    aPoser.push({ id: j.id, slug: j.slug, url: `${RACINE_CAPTURES}/${basename(base.fichier)}` });
  }

  console.log(`${jeux.length} fiches publiées sans vignette.`);
  console.log(`  ${aPoser.length} ont une capture du jeu de base.`);
  if (sansBase.length) {
    console.log(`  ${sansBase.length} n'en ont pas : ${sansBase.slice(0, 5).join(', ')}`);
  }
  for (const x of aPoser.slice(0, 3)) console.log(`   ${x.slug.padEnd(28)} ${x.url}`);

  if (!appliquer) {
    console.log('\nSIMULATION — rien écrit. Ajouter --appliquer.');
    return;
  }

  writeFileSync(
    `/Users/joris/Documents/GitHub/sauvegardes-betsrank/w2s-visuels-adoptes-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ poseLe: new Date().toISOString(), fiches: aPoser }, null, 2),
  );
  for (let i = 0; i < aPoser.length; i += 25) {
    await Promise.all(
      aPoser.slice(i, i + 25).map((x) =>
        prisma.jeu.update({ where: { id: x.id }, data: { visuelUrl: x.url } }),
      ),
    );
  }
  console.log(`\n${aPoser.length} vignettes posées.`);
}

main().then(() => process.exit(0));
