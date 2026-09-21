/**
 * Releve la configuration que le moteur GATI recent recoit du serveur.
 *
 * ── Pourquoi cette route plutot que le panneau de regles ─────────────────
 *
 * Yggdrasil distribue sous sa marque les jeux d'une trentaine de partenaires,
 * chacun avec son moteur. `adaptateur-yggdrasil.ts` n'en prend en charge que
 * deux — ceux dont le reglement est du HTML lisible dans le DOM, donc dont le
 * RTP se lit au chiffre pres sans OCR. Les autres sont nommes dans le journal
 * plutot que captures.
 *
 * La sonde du 21/09 sur `2-fast-2-fruity` a montre que la famille GATI
 * recente (`PlatformGati.js`, ~55 jeux avec Bulletproof) est du **canvas
 * pur** : aucun texte dans le DOM, donc cette voie-la est fermee. Mais la
 * page expose `gameData`, et la configuration recue du serveur y porte
 * `slotConfig.rtp`, `paylines`, `defaultNumLines`, `startingSymbols`.
 *
 * Lire la configuration vaut mieux qu'OCR-iser un panneau : c'est la valeur
 * que le moteur applique, pas une image de cette valeur.
 *
 * ── Pourquoi ce script n'ecrit RIEN en base ──────────────────────────────
 *
 * Le schema previent en en-tete : un jeu n'a pas « un » RTP. Il a une valeur
 * studio, des paliers que l'operateur configure — toujours plus bas —, parfois
 * un taux d'achat de bonus. Quatre fiches Red Tiger ont deja porte le palier
 * operateur a la place de la valeur studio.
 *
 * Or `slotConfig` porte DEUX choses : `rtp`, un scalaire, et `RTP`, un tableau
 * de seize entrees dont on ne sait pas encore ce qu'il enumere — paliers
 * configurables, ou taux par niveau de mise. Ecrire avant de le savoir, ce
 * serait exactement l'erreur contre laquelle le schema met en garde.
 *
 * Ce script releve donc, et s'arrete la. La passe d'ecriture viendra quand on
 * aura lu le tableau sur une dizaine de jeux.
 *
 * ── La cadence ───────────────────────────────────────────────────────────
 *
 * Trois chargements en 65 s ont valu une heure de ban sur le serveur de jeu.
 * Deux minutes entre deux jeux, `--pause=` pour ajuster. Une seule campagne a
 * la fois sur ce poste : en parallele, les jeux ne se chargent plus a temps et
 * le journal accuse l'adaptateur d'un defaut qui est celui de la machine.
 *
 *   npx tsx --env-file=.env.local scripts/relever-config-gati.ts --limite=10
 *   npx tsx --env-file=.env.local scripts/relever-config-gati.ts --slugs=a,b,c
 */
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const arg = (nom: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=');

const LIMITE = Number(arg('limite') ?? 10);
const PAUSE = Number(arg('pause') ?? 120_000);
const SLUGS = arg('slugs')?.split(',').map((s) => s.trim()).filter(Boolean);
const SORTIE = arg('sortie') ?? '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/ygg';

/*
 * Le corps part en CHAINE, pas en fonction flechee.
 *
 * `tsx` compile avec esbuild, qui nomme les fonctions en leur ajoutant un
 * appel a son helper `__name`. Ce helper n'existe pas dans la page :
 * `page.evaluate(() => …)` y meurt sur « __name is not defined ». C'est ce qui
 * a tue la premiere execution de la sonde.
 */
const LIRE_CONFIG = `(function () {
  var gd = window.gameData;
  if (!gd) {
    /* Pas ce moteur : on rend de quoi le nommer, pour savoir ce qui reste. */
    var TIERS = /google-analytics|googletagmanager|gtag|hotjar|sentry|newrelic/i;
    var src = [].slice.call(document.querySelectorAll('script[src]'))
      .map(function (x) { return x.getAttribute('src') || ''; })
      .filter(function (u) { return u && !TIERS.test(u); })[0] || 'sans script';
    return { absent: (src.split('?')[0].split('/').pop() || src).slice(0, 40) };
  }
  var sc = gd.slotConfig || (gd.gameConfig && gd.gameConfig.slotConfig) || {};

  /* Le tableau de seize : on le rend ENTIER et brut. C'est ce qu'il faut
   * lire avant de decider ce qu'il enumere. */
  var tableau = null;
  try { tableau = JSON.parse(JSON.stringify(sc.RTP)); } catch (e) { tableau = '(illisible)'; }

  /* La grille : startingSymbols est un tableau par rouleau. */
  var grille = null;
  try {
    var ss = sc.startingSymbols;
    if (Array.isArray(ss) && ss.length) {
      grille = { rouleaux: ss.length, rangees: Array.isArray(ss[0]) ? ss[0].length : null,
                 rangeesParRouleau: ss.map(function (r) { return Array.isArray(r) ? r.length : null; }) };
    }
  } catch (e) { grille = '(illisible)'; }

  var lignes = null;
  try { lignes = Array.isArray(sc.paylines) ? sc.paylines.length : null; } catch (e) {}

  var modes = null;
  try { modes = sc.gameModes ? Object.keys(sc.gameModes) : null; } catch (e) {}

  return {
    rtp: sc.rtp === undefined ? null : sc.rtp,
    tableauRTP: tableau,
    lignes: lignes,
    defaultNumLines: sc.defaultNumLines === undefined ? null : sc.defaultNumLines,
    grille: grille,
    gameModes: modes,
    clesSlotConfig: Object.keys(sc).slice(0, 30),
    titre: document.title
  };
})()`;

type Releve = {
  slug: string;
  nom: string;
  demoUrl: string;
  rtpEnBase: string | null;
  grilleEnBase: string | null;
  lignesEnBase: string | null;
  lu?: Record<string, unknown>;
  absent?: string;
  erreur?: string;
};

async function lireUnJeu(page: Page, demoUrl: string): Promise<Record<string, unknown>> {
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  /* La configuration arrive apres le chargement du moteur. Vingt-cinq
   * secondes : mesure sur 2-fast-2-fruity, ou `gameData` etait rempli a 25 s
   * sur un poste calme. On reessaie plutot que d'attendre en aveugle. */
  for (let essai = 0; essai < 25; essai++) {
    await page.waitForTimeout(1_000);
    const r = (await page.evaluate(LIRE_CONFIG)) as Record<string, unknown>;
    if (!r.absent) return r;
    if (essai === 24) return r;
  }
  return { absent: 'jamais rempli' };
}

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  const jeux = await prisma.jeu.findMany({
    where: {
      /* Le champ du studio s'appelle `slug`, pas `cle` — et la relation se
       * filtre par `is`. Les deux erreurs ont coute deux executions. */
      studio: { is: { slug: 'yggdrasil' } },
      demoUrl: { not: null },
      ...(SLUGS ? { slug: { in: SLUGS } } : {}),
    },
    select: { slug: true, nom: true, demoUrl: true, rtpStudio: true, grille: true, lignesPaiement: true },
    orderBy: { slug: 'asc' },
    take: SLUGS ? undefined : LIMITE,
  });
  await prisma.$disconnect();

  if (!jeux.length) { console.log('aucun jeu'); return; }
  console.log(`${jeux.length} jeux — pause ${PAUSE / 1000}s entre deux chargements\n`);

  mkdirSync(SORTIE, { recursive: true });
  const nav = await chromium.launch({
    executablePath: process.env.CHROME_BIN || undefined,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  const releves: Releve[] = [];
  for (const [i, jeu] of jeux.entries()) {
    const base: Releve = {
      slug: jeu.slug, nom: jeu.nom, demoUrl: jeu.demoUrl!,
      rtpEnBase: jeu.rtpStudio ? String(jeu.rtpStudio) : null,
      grilleEnBase: jeu.grille, lignesEnBase: jeu.lignesPaiement,
    };
    const page = await nav.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      const lu = await lireUnJeu(page, jeu.demoUrl!);
      if (lu.absent) { base.absent = String(lu.absent); console.log(`  — ${jeu.slug} : autre moteur (${lu.absent})`); }
      else { base.lu = lu; console.log(`  ✓ ${jeu.slug} : rtp=${lu.rtp} lignes=${lu.lignes ?? lu.defaultNumLines} grille=${JSON.stringify(lu.grille)}`); }
    } catch (e) {
      base.erreur = String(e).slice(0, 120);
      console.log(`  ! ${jeu.slug} : ${base.erreur}`);
    }
    await page.close();
    releves.push(base);
    /* Ecrit a chaque tour : une campagne interrompue ne doit pas perdre ce
     * qu'elle a deja paye en chargements. */
    writeFileSync(join(SORTIE, 'releve-gati.json'), JSON.stringify(releves, null, 1));
    if (i < jeux.length - 1) await new Promise((r) => setTimeout(r, PAUSE));
  }

  await nav.close();
  const lus = releves.filter((r) => r.lu).length;
  console.log(`\n${lus}/${releves.length} jeux ont livre leur configuration`);
  console.log(`relevé : ${join(SORTIE, 'releve-gati.json')}`);
  console.log('\nRien n’a été écrit en base — c’est voulu : lire le tableau RTP avant de décider.');
}

main().catch((e) => { console.error(e); process.exit(1); });
