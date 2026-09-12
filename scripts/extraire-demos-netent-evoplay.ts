/**
 * Donne une démo jouable aux jeux NetEnt et Evoplay qui n'en ont pas.
 *
 * ── Pourquoi ces deux studios, et pourquoi maintenant ─────────────────────
 *
 * NetEnt : 237 jeux en base, 24 `demoUrl`. Evoplay : 269 jeux, 6. Sans démo,
 * le pipeline de captures n'a rien à ouvrir ; sans capture, la fiche n'est pas
 * publiable. Deux catalogues entiers restaient donc invisibles — c'est le
 * blocage que ce script lève, exactement comme `extraire-demos-pragmatic.ts`
 * l'a levé pour Pragmatic.
 *
 * Et les rares `demoUrl` déjà présentes portaient le même défaut que chez
 * Pragmatic : la **fiche produit**, pas la démo. Le bouton « jouer » menait à
 * une page de présentation. On les réécrit avec les autres.
 *
 * ── Les deux studios ne se lisent pas de la même façon ────────────────────
 *
 * NetEnt sert une page Next.js dont le `__NEXT_DATA__` porte un `tableId`, et
 * son propre bouton « Demo » pointe vers `/demo/<tableId>`. Le jeu y est lancé
 * par le SDK `window.nolimit.load()` : il n'existe aucune iframe statique à
 * extraire, cette page **est** l'entrée publique de la démo.
 *
 * C'est la plateforme de Red Tiger, et elle en partage les deux pièges, déjà
 * payés dans `extraire-demos-red-tiger.ts`. `netent.com/demo/<n'importe quoi>`
 * répond 200 : un code HTTP ne prouve rien, seule la lecture du `tableId` dans
 * la page fait foi. Et le payload est lu en JSON, jamais au regex — la page
 * embarque des carrousels de jeux voisins dont un regex attraperait le
 * `tableId` du premier venu. Le nom lu est confronté à celui de la base, et
 * une démo annoncée à une date future n'est pas écrite.
 *
 * Deux formes d'URL cohabitaient en base. `www.netent.com/en/game/<slug>/` est
 * morte aujourd'hui — elle répond 404, y compris pour Starburst. Seule
 * `netent.com/games/<slug>/` vit encore, et c'est elle qu'on interroge. On ne
 * réutilise donc l'URL déjà en base que si elle porte la forme vivante : elle
 * seule sait que notre slug `vikings-netent` se lit `vikings` chez le studio.
 *
 * Evoplay ne publie aucune démo sur sa fiche produit : elle renvoie vers son
 * portail `player.city`, dont la page porte enfin le lien jouable
 * (`demo.demo-evoplay.games`). Deux voies y mènent, et il faut les deux.
 *
 * Le sitemap du portail est la liste que le studio publie lui-même : 101
 * pages, qu'on lit en une requête. Quand notre slug y figure, on ouvre la page
 * et on **vérifie que son payload porte bien ce slug** avant de retenir la
 * démo. Ce n'est pas une URL construite au hasard : c'est une page annoncée,
 * puis confirmée.
 *
 * Mais la fiche produit d'Evoplay sous-référence son propre portail : 176 de
 * nos 269 jeux n'y ont aucun bouton de démo, dont des jeux qui en ont pourtant
 * une (`anubis-moon`). À l'inverse, le bouton est seul à savoir que notre
 * `bandit-bust-bonus-buy` se lit `bandit-bust-bb` chez eux — construire ce
 * slug nous-mêmes donnerait un 404, et pire, un jour, la démo d'un autre jeu.
 * D'où l'ordre : le sitemap d'abord, le bouton en second recours.
 *
 * ── La cadence n'est pas une précaution de style ──────────────────────────
 *
 * Ce sont des partenaires, et leurs démos sont la matière première de tout le
 * chantier de captures : se faire bloquer coûterait plus que les quelques
 * minutes qu'on économiserait. Quatre en parallèle, avec une pause.
 *
 * Usage : npx tsx --env-file=.env.local scripts/extraire-demos-netent-evoplay.ts \
 *           --studio netent|evoplay [--appliquer] [--limite N]
 */
import { config as loadEnv } from 'dotenv';
import { basename, resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PARALLELE = 4;
const PAUSE_MS = 250;

type Jeu = { id: string; slug: string; nom: string; demoUrl: string | null };
type Echec = { slug: string; cause: string };
type FicheNetEnt = {
  tableId: string;
  nom: string;
  demoReleaseDate: string | null;
  exclusiveReleaseDate: string | null;
};

/**
 * Pour confronter deux noms sans buter sur la typographie : le studio écrit
 * « Starburst™ », la base « Starburst ».
 */
const normaliserNom = (nom: string) =>
  nom.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

/**
 * La fiche produit NetEnt, lue dans son payload.
 *
 * On passe par le JSON et par la requête nommée plutôt que par un regex sur
 * `tableId` : la page embarque aussi des carrousels de jeux voisins, et un
 * regex y attraperait le `tableId` du premier venu.
 */
export function lireFicheNetEnt(html: string): FicheNetEnt | null {
  const bloc = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!bloc) return null;

  let donnees: {
    props?: { pageProps?: { initialState?: { cmsApi?: { queries?: Record<string, { data?: Record<string, unknown> }> } } } };
  };
  try {
    donnees = JSON.parse(bloc[1]);
  } catch {
    return null;
  }

  const requetes = donnees?.props?.pageProps?.initialState?.cmsApi?.queries ?? {};
  const cle = Object.keys(requetes).find((k) => k.startsWith('getPopulatedGameBySlugV2'));
  const jeu = cle ? requetes[cle]?.data : null;
  if (typeof jeu?.tableId !== 'string' || typeof jeu?.name !== 'string') return null;

  return {
    tableId: jeu.tableId,
    nom: jeu.name,
    demoReleaseDate: (jeu.demoReleaseDate as string | null) ?? null,
    exclusiveReleaseDate: (jeu.exclusiveReleaseDate as string | null) ?? null,
  };
}

/**
 * La fiche produit NetEnt, dans sa forme vivante.
 *
 * On ne repart de l'URL en base que si elle porte déjà cette forme : elle
 * seule connaît les slugs que nous avons suffixés de notre côté pour éviter
 * une collision (`vikings-netent`). La forme `/en/game/` est morte, la garder
 * garantirait un 404.
 */
function pageProduitNetEnt(jeu: Jeu): string {
  const vivante = jeu.demoUrl && /netent\.com\/games\//.test(jeu.demoUrl);
  if (!vivante) return `https://netent.com/games/${jeu.slug}/`;
  return jeu.demoUrl!.replace(/^https?:\/\/(www\.)?netent\.com/, 'https://netent.com').replace(/\/?$/, '/');
}

/**
 * Les pages de jeu que le portail Evoplay déclare, lues une seule fois.
 *
 * Une requête au lieu de 269 : la liste sert à savoir s'il est utile d'aller
 * frapper à une porte, pas à deviner son adresse.
 */
let sitemapPortail: Promise<Set<string>> | null = null;
function slugsDuPortail(): Promise<Set<string>> {
  sitemapPortail ??= (async () => {
    const r = await recuperer('https://player.city/sitemap.xml');
    if (!r.ok) return new Set<string>();
    return new Set(
      [...r.html.matchAll(/https:\/\/player\.city\/game\/([a-z0-9-]+)\//g)].map((m) => m[1]),
    );
  })();
  return sitemapPortail;
}

/** Le bouton « Play Now » de la fiche Evoplay, vers le portail de démo. */
export function lireLienPortailEvoplay(html: string): string | null {
  /*
   * L'ancre est la classe, pas le domaine : la page porte aussi des bannières
   * vers `player.city`, toutes vers le même jeu promu du moment. Prendre le
   * premier lien venu attribuait « Penalty Shoot-out Cup Mania » à six jeux
   * différents pendant la reconnaissance.
   */
  const m =
    /href="(https:\/\/player\.city\/game\/[^"?]+)[^"]*"[^>]*class="[^"]*to-city-play/.exec(html);
  return m ? m[1].replace(/\/?$/, '/') : null;
}

/** L'URL de démo jouable, dans le payload du portail Evoplay. */
export function lireDemoEvoplay(html: string): string | null {
  const m = /playDemoUrl\\?"\s*:\s*\\?"(https?:[^"\\]+)/.exec(html);
  return m ? m[1] : null;
}

async function recuperer(url: string): Promise<{ ok: true; html: string } | { ok: false; cause: string }> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': NAVIGATEUR } });
    if (!r.ok) return { ok: false, cause: `HTTP ${r.status}` };
    return { ok: true, html: await r.text() };
  } catch (e) {
    return { ok: false, cause: e instanceof Error ? e.message.slice(0, 40) : 'erreur réseau' };
  }
}

/** NetEnt : un saut. La fiche produit porte le `tableId`, la démo en découle. */
async function demoNetEnt(jeu: Jeu): Promise<string | { cause: string }> {
  const page = await recuperer(pageProduitNetEnt(jeu));
  if (!page.ok) return { cause: page.cause };

  const fiche = lireFicheNetEnt(page.html);
  if (!fiche) return { cause: 'pas de tableId dans la page' };

  /* Un slug qui mène à un autre jeu écrirait une démo fausse sans rien signaler. */
  if (normaliserNom(fiche.nom) !== normaliserNom(jeu.nom)) {
    return { cause: `la page annonce « ${fiche.nom} »` };
  }

  /*
   * La fiche produit paraît avant que la démo n'ouvre. Écrire l'URL quand même
   * donnerait un bouton qui répond « Demo is not available yet » : mieux vaut
   * l'échec, le jeu repassera au lot suivant une fois la date atteinte.
   */
  const attente = [fiche.demoReleaseDate, fiche.exclusiveReleaseDate].find(
    (d) => d && Date.parse(d) > Date.now(),
  );
  if (attente) return { cause: `démo ouverte le ${attente.slice(0, 10)}` };

  return `https://netent.com/demo/${fiche.tableId}?showNavbar=true`;
}

/** La démo d'une page du portail, une fois vérifié qu'elle parle bien de ce jeu. */
async function demoDuPortail(url: string, slugAttendu?: string): Promise<string | { cause: string }> {
  const page = await recuperer(url);
  if (!page.ok) return { cause: `portail ${page.cause}` };
  /* Une page annoncée par le sitemap reste à confirmer : on exige son slug dans le payload. */
  if (slugAttendu && !page.html.includes(`"slug\\":\\"${slugAttendu}\\"`)) {
    return { cause: 'page du portail ne correspondant pas au jeu' };
  }
  const demo = lireDemoEvoplay(page.html);
  if (!demo) return { cause: 'portail sans playDemoUrl' };
  return demo;
}

/** Evoplay : le portail quand il annonce le jeu, la fiche produit sinon. */
async function demoEvoplay(jeu: Jeu): Promise<string | { cause: string }> {
  if ((await slugsDuPortail()).has(jeu.slug)) {
    const direct = await demoDuPortail(`https://player.city/game/${jeu.slug}/`, jeu.slug);
    if (typeof direct === 'string') return direct;
  }
  const fiche = await recuperer(`https://evoplay.games/game/${jeu.slug}/`);
  if (!fiche.ok) return { cause: `fiche produit ${fiche.cause}` };
  const portail = lireLienPortailEvoplay(fiche.html);
  if (!portail) return { cause: 'aucun bouton de démo sur la fiche' };
  return demoDuPortail(portail);
}

const STUDIOS = {
  netent: {
    /* Les fiches produit déjà en base sont des pages de présentation : on les reprend avec les vides. */
    domaineFicheProduit: 'netent.com',
    extraire: demoNetEnt,
    /* Ce que porte une démo réellement jouable — sert à recompter après écriture. */
    marqueurJouable: 'netent.com/demo/',
  },
  evoplay: {
    domaineFicheProduit: 'evoplay.games/game/',
    extraire: demoEvoplay,
    marqueurJouable: 'demo-evoplay.games',
  },
} as const;

async function main() {
  const iS = process.argv.indexOf('--studio');
  const studio = iS >= 0 ? process.argv[iS + 1] : undefined;
  if (studio !== 'netent' && studio !== 'evoplay') {
    console.error('Studio manquant ou inconnu. Attendu : --studio netent|evoplay');
    process.exit(1);
  }
  const reglage = STUDIOS[studio];
  const appliquer = process.argv.includes('--appliquer');
  const iL = process.argv.indexOf('--limite');
  const limite = iL >= 0 ? Number(process.argv[iL + 1]) : Infinity;

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const jeux: Jeu[] = (
    await prisma.jeu.findMany({
      where: {
        studio: { slug: studio },
        OR: [{ demoUrl: { contains: reglage.domaineFicheProduit } }, { demoUrl: null }],
      },
      select: { id: true, slug: true, nom: true, demoUrl: true },
      orderBy: { slug: 'asc' },
    })
  ).slice(0, limite);

  const sansDemo = jeux.filter((j) => !j.demoUrl).length;
  console.log(
    `${studio} : ${jeux.length} fiches à lire` +
      (sansDemo ? ` — dont ${sansDemo} sans demoUrl, page déduite du slug.` : '.') +
      '\n',
  );

  const trouves: Array<{ id: string; slug: string; demo: string }> = [];
  const echecs: Echec[] = [];

  for (let i = 0; i < jeux.length; i += PARALLELE) {
    await Promise.all(
      jeux.slice(i, i + PARALLELE).map(async (jeu) => {
        const r = await reglage.extraire(jeu);
        if (typeof r === 'string') trouves.push({ id: jeu.id, slug: jeu.slug, demo: r });
        else echecs.push({ slug: jeu.slug, cause: r.cause });
      }),
    );
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    if ((i / PARALLELE) % 10 === 0) process.stdout.write(`  ${i + PARALLELE}/${jeux.length}\r`);
  }

  console.log(`\n${trouves.length} démos trouvées, ${echecs.length} échecs.\n`);
  for (const t of trouves.slice(0, 5)) console.log(`  ${t.slug.padEnd(32)} ${t.demo}`);

  /*
   * Les échecs sont nommés, jamais comblés. Un slug qui ne répond pas chez le
   * studio n'est pas une absence de démo : c'est un slug à corriger à la main,
   * et une URL devinée mettrait une page morte derrière un bouton « jouer ».
   */
  if (echecs.length) {
    const parCause = new Map<string, string[]>();
    for (const e of echecs) parCause.set(e.cause, [...(parCause.get(e.cause) ?? []), e.slug]);
    console.log('\nÉchecs par cause :');
    for (const [cause, slugs] of [...parCause].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(slugs.length).padStart(3)} × ${cause}`);
      console.log(`      ${slugs.slice(0, 12).join(', ')}${slugs.length > 12 ? ', …' : ''}`);
    }
  }

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  /* Le pooler expire sur une transaction longue : des lots de 25, pas un $transaction. */
  for (let i = 0; i < trouves.length; i += 25) {
    await Promise.all(
      trouves
        .slice(i, i + 25)
        .map((t) => prisma.jeu.update({ where: { id: t.id }, data: { demoUrl: t.demo } })),
    );
  }
  const jouables = await prisma.jeu.count({
    where: { studio: { slug: studio }, demoUrl: { contains: reglage.marqueurJouable } },
  });
  console.log(`\n${trouves.length} URLs écrites. ${jouables} jeux ${studio} ont une démo jouable.`);
  await prisma.$disconnect();
}

/*
 * Le script ne s'exécute que lancé directement : sans cette garde, importer
 * une des fonctions de lecture déclencherait une campagne complète de requêtes
 * en arrière-plan.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
