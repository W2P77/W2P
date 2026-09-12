/**
 * Remplace l'URL de « démo » par la vraie démo jouable.
 *
 * ── Ce que le champ contenait, et pourquoi c'était faux ───────────────────
 *
 * `demoUrl` portait la **fiche produit** du studio — une page de présentation.
 * Le bouton « Play the free demo » de nos fiches y envoyait donc le visiteur,
 * qui devait ensuite chercher lui-même le jeu. Le champ tenait sa promesse à
 * l'inspection (une URL du bon domaine) et la trahissait à l'usage.
 *
 * La vraie démo est dans la page produit, en attribut `data-game-src` d'une
 * iframe, avec le `gameSymbol` du jeu. On l'extrait, on la stocke, et le
 * bouton mène enfin à un jeu.
 *
 * ── La cadence n'est pas une précaution de style ──────────────────────────
 *
 * Six cent dix-neuf requêtes vers un même hôte. Trop vite, l'IP se fait
 * bloquer — et on perd l'accès aux démos, qui est la matière première de tout
 * le chantier de captures. Quatre en parallèle, avec une pause : le lot passe
 * en quelques minutes, ce qui est sans importance pour une opération qu'on ne
 * refera pas.
 *
 * Usage : npx tsx scripts/extraire-demos-pragmatic.ts [--appliquer] [--limite N]
 */
import { config as loadEnv } from 'dotenv';
import { basename, resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PARALLELE = 4;
const PAUSE_MS = 250;

/** L'URL de démo et le symbole de jeu, lus dans la fiche produit. */
export function lireDemo(html: string): { demo: string; symbole: string } | null {
  const m = /data-game-src="([^"]+)"/.exec(html);
  if (!m) return null;
  const demo = m[1].replace(/&amp;/g, '&');
  const s = /gameSymbol=([A-Za-z0-9_]+)/.exec(demo);
  if (!s) return null;
  return { demo, symbole: s[1] };
}

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const iL = process.argv.indexOf('--limite');
  const limite = iL >= 0 ? Number(process.argv[iL + 1]) : Infinity;

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  /*
   * ── Deux cas, pas un ─────────────────────────────────────────────────────
   *
   * Le script ne traitait que les fiches dont `demoUrl` portait déjà la page
   * produit. Or **105 jeux Pragmatic n'ont aucune `demoUrl`** — dont Sweet
   * Bonanza 1000, Sugar Rush, Starlight Princess et Wolf Gold, c'est-à-dire
   * les titres que les gens cherchent par leur nom. Sans démo, le pipeline de
   * captures ne peut pas les prendre ; sans capture, la fiche n'est pas
   * publiable. Les plus demandés du catalogue étaient donc invisibles.
   *
   * Leur page produit existe et se déduit du slug. On la construit, on la lit
   * comme les autres, et les échecs sont rapportés nommément : un slug qui ne
   * correspond pas chez Pragmatic ne doit pas passer pour une absence de démo.
   */
  const jeux = (
    await prisma.jeu.findMany({
      where: {
        studio: { slug: 'pragmatic-play' },
        OR: [{ demoUrl: { contains: 'pragmaticplay.com' } }, { demoUrl: null }],
      },
      select: { id: true, slug: true, demoUrl: true },
      orderBy: { slug: 'asc' },
    })
  ).slice(0, limite);

  /** La page produit : celle déjà en base, ou celle que le slug désigne. */
  const pageProduit = (j: { slug: string; demoUrl: string | null }) =>
    j.demoUrl ?? `https://www.pragmaticplay.com/en/games/${j.slug}/`;

  const sansDemo = jeux.filter((j) => !j.demoUrl).length;
  console.log(
    `${jeux.length} fiches produit Pragmatic à lire` +
      (sansDemo ? ` — dont ${sansDemo} sans demoUrl, page déduite du slug.` : '.') +
      '\n',
  );

  const trouves: Array<{ id: string; slug: string; demo: string; symbole: string }> = [];
  const echecs: string[] = [];

  for (let i = 0; i < jeux.length; i += PARALLELE) {
    await Promise.all(
      jeux.slice(i, i + PARALLELE).map(async (j) => {
        try {
          const r = await fetch(pageProduit(j), { headers: { 'User-Agent': NAVIGATEUR } });
          if (!r.ok) return echecs.push(`${j.slug} (HTTP ${r.status})`);
          const lu = lireDemo(await r.text());
          if (!lu) return echecs.push(`${j.slug} (pas de data-game-src)`);
          trouves.push({ id: j.id, slug: j.slug, ...lu });
        } catch (e) {
          echecs.push(`${j.slug} (${e instanceof Error ? e.message.slice(0, 40) : 'erreur'})`);
        }
      }),
    );
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    if ((i / PARALLELE) % 20 === 0) process.stdout.write(`  ${i + PARALLELE}/${jeux.length}\r`);
  }

  /*
   * ── Deux fiches ne peuvent pas partager un lanceur ───────────────────────
   *
   * Le slug déduit mène parfois à la page d'un jeu déjà couvert : chez
   * Pragmatic, `wolf-gold-slot` et `wolf-gold` rendent le même `gameSymbol`,
   * parce que ce sont deux fiches pour un seul jeu. Écrire les deux donnait un
   * bouton « démo » identique sur deux pages indexables — et le nettoyage fait
   * à la main était défait au passage suivant.
   *
   * On garde la première rencontrée, par ordre de slug, et on rapporte
   * l'autre : c'est un doublon de catalogue à trancher, pas une démo perdue.
   */
  const dejaVues = new Map<string, string>();
  for (const j of jeux) if (j.demoUrl?.includes('openGame.do')) dejaVues.set(j.demoUrl, j.slug);
  const retenus: typeof trouves = [];
  for (const t of trouves) {
    const jumelle = dejaVues.get(t.demo);
    if (jumelle && jumelle !== t.slug) {
      echecs.push(`${t.slug} (même lanceur que ${jumelle} — doublon de catalogue)`);
      continue;
    }
    dejaVues.set(t.demo, t.slug);
    retenus.push(t);
  }
  trouves.length = 0;
  trouves.push(...retenus);

  console.log(`\n${trouves.length} démos trouvées, ${echecs.length} échecs.`);
  for (const t of trouves.slice(0, 4)) console.log(`  ${t.slug.padEnd(30)} ${t.symbole}`);
  for (const e of echecs.slice(0, 6)) console.log(`  ! ${e}`);

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  for (let i = 0; i < trouves.length; i += 25) {
    await Promise.all(
      trouves.slice(i, i + 25).map((t) =>
        prisma.jeu.update({ where: { id: t.id }, data: { demoUrl: t.demo } }),
      ),
    );
  }
  const jouables = await prisma.jeu.count({ where: { demoUrl: { contains: 'openGame.do' } } });
  console.log(`\n${trouves.length} URLs écrites. ${jouables} jeux ont une démo réellement jouable.`);
  await prisma.$disconnect();
}

/*
 * Le script ne s'exécute que lancé directement.
 *
 * `lireDemo` est exportée et réutilisable ; sans cette garde, l'importer
 * depuis un autre script déclenchait une campagne complète de 724 requêtes en
 * arrière-plan — constaté en voulant simplement tester sept jeux.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
