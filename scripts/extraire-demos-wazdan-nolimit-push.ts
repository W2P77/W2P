/**
 * Donne une démo jouable aux jeux Wazdan, Nolimit City et Push Gaming.
 *
 * ── Trois studios entiers absents du site ─────────────────────────────────
 *
 * Wazdan : 262 jeux en base, 4 `demoUrl`. Nolimit City : 151 jeux, 136 URLs
 * qui mènent toutes à la **fiche produit**, pas au jeu. Push Gaming : 85 jeux,
 * 84 URLs du même défaut. Le pipeline de captures part de la démo ; sans
 * capture, la fiche n'est pas publiable. Ces trois catalogues ne sont donc pas
 * « incomplets » sur le site : ils y sont **invisibles**, pour une URL.
 *
 * ── Les trois studios ne se lisent pas de la même façon ───────────────────
 *
 * **Wazdan** publie lui-même la liste : `wazdan.com/gamesapi` rend 1 200
 * entrées dont 265 de type `game`, chacune avec son `gameDemo` déjà construit
 * (`gamelaunch.wazdan.com/demo-demo/gamelauncher?…&game=411`) et le `src` de sa
 * fiche produit, d'où l'on tire le slug. Une requête au lieu de 262, et
 * surtout : **l'URL de démo n'est jamais fabriquée par nous**, elle est
 * recopiée du catalogue du studio. Quand notre slug n'y figure pas, second
 * recours sur la fiche produit, dont le `var gameParams` porte le même couple
 * nom / `game_url`. Attention à l'ordre : la page déclare d'abord
 * `gameParams = {"game_url":null}` puis le réassigne — c'est la seconde
 * affectation qui compte, et une page 404 s'arrête à la première.
 *
 * **Nolimit City** tourne sur la plateforme de Red Tiger et de NetEnt, avec
 * ses deux pièges déjà payés dans `extraire-demos-red-tiger.ts`. Le bouton
 * « Demo » ne porte pas de lien : il pousse `/demo/{tableId}`, et le `tableId`
 * (`Beheaded`) se lit dans le `__NEXT_DATA__` de la fiche produit. Cette route
 * répond **200 pour n'importe quelle chaîne** — `/demo/CeJeuNexistePas` rend
 * la même page à sept octets près, ceux du `tableId` recopié. Un code HTTP ne
 * prouve donc rien : seul le `tableId` lu dans la page du jeu fait foi. Et le
 * payload est lu en JSON via la requête nommée, jamais au regex, parce que la
 * page embarque des carrousels de jeux voisins dont un regex attraperait le
 * `tableId` du premier venu.
 *
 * **Push Gaming** ne montre aucune démo sur sa fiche produit : elle n'a ni
 * iframe, ni bouton, ni le mot « demo ». La démo vit sur une page distincte,
 * `/games/play/<slug>.html`, que seule la **liste** `/games/` déclare, via le
 * `data-url` du bouton « Play Game » posé à côté du nom du jeu. Cette page
 * pose une iframe dont le `src` est un base64 à décoder — et ce lanceur porte
 * un `token` à usage unique : rejoué une heure plus tard il répond **403**.
 * C'est donc la page enveloppe qu'on retient, pas l'URL décodée ; le token s'y
 * régénère à chaque ouverture. On la lit quand même, pour vérifier qu'elle
 * porte bien un lanceur en `mode=DEMO` — une page enveloppe vide serait un
 * bouton mort.
 *
 * ── Les trois garde-fous ──────────────────────────────────────────────────
 *
 * 1. **Un 200 ne prouve rien.** Chez Nolimit City comme chez Red Tiger, la
 *    route de démo est statique. On ne construit jamais une URL sans avoir lu
 *    l'identifiant du jeu dans sa propre page ; un slug qui répond 404 est un
 *    échec rapporté par son nom, jamais une URL devinée.
 *
 * 2. **Le nom lu est confronté à celui de la base.** Chez NetEnt,
 *    `/games/victorious/` annonce aujourd'hui « Victorious MAX™ » — un autre
 *    jeu — en gardant l'ancien identifiant. Ici le contrôle a tout de suite
 *    servi : `nolimitcity.com/games/game-1` annonce « Fire In The Hole 4 ».
 *    L'égalité est exigée, jamais le préfixe : accepter « Victorious » pour
 *    « Victorious MAX » est exactement l'erreur qu'on cherche à éviter.
 *
 * 3. **Deux fiches ne reçoivent jamais le même lanceur.** Deux de nos slugs
 *    qui rendent la même URL de démo sont un doublon de catalogue, pas deux
 *    jeux : on garde le premier par ordre de slug et on rapporte l'autre.
 *    Sans ce contrôle, deux fiches publieraient les mêmes captures.
 *
 * ── La cadence n'est pas une précaution de style ──────────────────────────
 *
 * Ce sont des partenaires, et leurs démos sont la matière première de tout le
 * chantier de captures : se faire bloquer coûterait plus que les quelques
 * minutes qu'on économiserait. Quatre en parallèle, avec une pause.
 *
 * Usage : npx tsx --env-file=.env.local scripts/extraire-demos-wazdan-nolimit-push.ts \
 *           --studio wazdan|nolimit-city|push-gaming [--appliquer] [--limite N]
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
/** Une démo trouvée, ou la raison nommée de ne pas en avoir trouvé. */
type Resultat = string | { cause: string };

/**
 * Les entités HTML que les listes de studios laissent passer.
 *
 * Push Gaming sert « Bait &#039;n&#039; Bank » dans sa liste. Sans décodage,
 * la normalisation garde les chiffres de l'entité (`039`) et six jeux
 * parfaitement identifiés ressortaient en écart de nom.
 */
const decoderEntites = (texte: string) =>
  texte
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');

/**
 * Pour confronter deux noms sans buter sur la typographie.
 *
 * Le studio écrit « 9 Coins™ », « Apocalypse Super xNudge® » ; la base écrit
 * le nom nu. L'esperluette est le seul écart qui demande deux lectures :
 * Wazdan écrit « Win & Replay » et « BARs&7s » là où la base écrit « Win
 * Replay » et « Bars7s ». Les deux conventions sont acceptées — c'est de la
 * typographie, pas un autre jeu.
 */
const normaliserNom = (nom: string, esperluette: 'and' | '' = 'and') =>
  decoderEntites(nom).toLowerCase().replace(/&/g, esperluette).replace(/[^a-z0-9]/g, '');

const memeNom = (a: string, b: string) =>
  normaliserNom(a) === normaliserNom(b) || normaliserNom(a, '') === normaliserNom(b, '');

async function recuperer(
  url: string,
): Promise<{ ok: true; html: string } | { ok: false; cause: string }> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': NAVIGATEUR } });
    if (!r.ok) return { ok: false, cause: `HTTP ${r.status}` };
    return { ok: true, html: await r.text() };
  } catch (e) {
    return { ok: false, cause: e instanceof Error ? e.message.slice(0, 40) : 'erreur réseau' };
  }
}

/* ── Wazdan ───────────────────────────────────────────────────────────── */

type EntreeWazdan = { nom: string; demo: string };

/**
 * Le catalogue que Wazdan publie lui-même, lu une seule fois.
 *
 * L'API mêle jeux, actualités et pages (1 200 entrées pour 265 jeux) : le
 * `type` est le seul tri fiable, et une entrée sans `gameDemo` est un jeu
 * annoncé dont la démo n'est pas ouverte — on la laisse tomber plutôt que de
 * construire son URL, elle reviendra au lot suivant.
 */
let catalogueWazdan: Promise<Map<string, EntreeWazdan>> | null = null;
function jeuxDeWazdan(): Promise<Map<string, EntreeWazdan>> {
  catalogueWazdan ??= (async () => {
    const par = new Map<string, EntreeWazdan>();
    const r = await recuperer('https://wazdan.com/gamesapi');
    if (!r.ok) return par;
    let donnees: { data?: Array<{ type?: string; name?: string; src?: string; gameDemo?: string | null }> };
    try {
      donnees = JSON.parse(r.html);
    } catch {
      return par;
    }
    for (const entree of donnees.data ?? []) {
      if (entree.type !== 'game' || !entree.gameDemo || !entree.name || !entree.src) continue;
      const slug = /wazdan\.com\/games\/([^/?#]+)/.exec(entree.src)?.[1];
      if (slug) par.set(slug, { nom: entree.name, demo: entree.gameDemo });
    }
    return par;
  })();
  return catalogueWazdan;
}

/**
 * Le couple nom / URL de démo que la fiche produit Wazdan déclare.
 *
 * La page assigne `gameParams` deux fois : d'abord `{"game_url":null}`, puis
 * l'objet complet. Prendre la première affectation rendrait `null` sur toutes
 * les fiches — c'est celle qui porte un `name` qui fait foi.
 */
export function lireFicheWazdan(html: string): EntreeWazdan | null {
  for (const m of html.matchAll(/var gameParams = (\{.*?\});/g)) {
    try {
      const p = JSON.parse(m[1]) as { name?: string; game_url?: string | null };
      if (p.name && p.game_url) return { nom: p.name, demo: p.game_url };
    } catch {
      /* Une affectation illisible n'est pas une raison d'abandonner la suivante. */
    }
  }
  return null;
}

/** Wazdan : le catalogue du studio d'abord, sa fiche produit en second recours. */
async function demoWazdan(jeu: Jeu): Promise<Resultat> {
  const catalogue = await jeuxDeWazdan();
  const entree = catalogue.get(jeu.slug);
  if (entree) {
    if (!memeNom(entree.nom, jeu.nom)) return { cause: `le catalogue annonce « ${entree.nom} »` };
    return entree.demo;
  }

  const page = await recuperer(`https://wazdan.com/games/${jeu.slug}`);
  if (!page.ok) return { cause: `absent du catalogue, fiche produit ${page.cause}` };
  const fiche = lireFicheWazdan(page.html);
  if (!fiche) return { cause: 'fiche produit sans lanceur de démo' };
  if (!memeNom(fiche.nom, jeu.nom)) return { cause: `la page annonce « ${fiche.nom} »` };
  return fiche.demo;
}

/* ── Nolimit City ─────────────────────────────────────────────────────── */

type FicheNolimit = {
  tableId: string;
  nom: string;
  demoReleaseDate: string | null;
  exclusiveReleaseDate: string | null;
};

/**
 * La fiche produit Nolimit City, lue dans son payload.
 *
 * On passe par la requête nommée plutôt que par un regex sur `tableId` : la
 * page embarque aussi des carrousels de jeux voisins, et un regex y
 * attraperait le `tableId` du premier venu.
 */
export function lireFicheNolimit(html: string): FicheNolimit | null {
  const bloc = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!bloc) return null;

  let donnees: {
    props?: {
      pageProps?: {
        initialState?: { cmsApi?: { queries?: Record<string, { data?: Record<string, unknown> }> } };
      };
    };
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
 * La fiche produit Nolimit City à interroger.
 *
 * L'URL déjà en base est reprise quand elle porte la forme vivante : elle
 * seule sait que notre `apocalypse-super-xnudge` se lit `apocalypse` chez le
 * studio. Le slug ne sert que là où il n'y a rien.
 */
function pageProduitNolimit(jeu: Jeu): string {
  const vivante = jeu.demoUrl && /nolimitcity\.com\/games\//.test(jeu.demoUrl);
  return vivante
    ? jeu.demoUrl!.replace(/^https?:\/\/(www\.)?nolimitcity\.com/, 'https://nolimitcity.com')
    : `https://nolimitcity.com/games/${jeu.slug}`;
}

/** Nolimit City : un saut. La fiche produit porte le `tableId`, la démo en découle. */
async function demoNolimit(jeu: Jeu): Promise<Resultat> {
  const page = await recuperer(pageProduitNolimit(jeu));
  if (!page.ok) return { cause: page.cause };

  const fiche = lireFicheNolimit(page.html);
  if (!fiche) return { cause: 'pas de tableId dans la page' };

  /* Un slug qui mène à un autre jeu écrirait une démo fausse sans rien signaler. */
  if (!memeNom(fiche.nom, jeu.nom)) return { cause: `la page annonce « ${fiche.nom} »` };

  /*
   * La fiche produit paraît avant que la démo n'ouvre. Écrire l'URL quand même
   * donnerait un bouton qui répond « Demo is not available yet » : mieux vaut
   * l'échec, le jeu repassera au lot suivant une fois la date atteinte.
   */
  const attente = [fiche.demoReleaseDate, fiche.exclusiveReleaseDate].find(
    (d) => d && Date.parse(d) > Date.now(),
  );
  if (attente) return { cause: `démo ouverte le ${attente.slice(0, 10)}` };

  return `https://nolimitcity.com/demo/${fiche.tableId}?showNavbar=true`;
}

/* ── Push Gaming ──────────────────────────────────────────────────────── */

/**
 * Les pages de démo que la liste `/games/` de Push Gaming déclare.
 *
 * Le bouton « Play Game » porte son `data-url` à côté du nom du jeu : c'est le
 * seul endroit du site qui relie un nom à sa page de démo, la fiche produit
 * n'en parle pas. On apparie chaque `data-url` au dernier nom rencontré, dans
 * l'ordre du document — la liste est une suite de cartes complètes.
 */
let cataloguePush: Promise<Array<{ nom: string; slug: string }>> | null = null;
function jeuxDePush(): Promise<Array<{ nom: string; slug: string }>> {
  cataloguePush ??= (async () => {
    const r = await recuperer('https://www.pushgaming.com/games/');
    if (!r.ok) return [];
    const cartes: Array<{ nom: string; slug: string }> = [];
    let nom: string | null = null;
    for (const m of r.html.matchAll(
      /<p class="title">([^<]+)<\/p>|data-url="\/games\/play\/([a-z0-9-]+)\.html"/g,
    )) {
      if (m[1]) nom = decoderEntites(m[1].trim());
      else if (nom) cartes.push({ nom, slug: m[2] });
    }
    return cartes;
  })();
  return cataloguePush;
}

/**
 * Le lanceur base64 posé dans l'iframe de la page de démo.
 *
 * Le script concatène plusieurs littéraux : on les recolle avant de décoder.
 * L'URL décodée n'est jamais écrite en base — son `token` est à usage unique
 * et répond 403 rejouée — mais elle est la preuve que la page enveloppe lance
 * bien un jeu en démo, et non une page vide.
 */
export function lireLanceurPush(html: string): string | null {
  const bloc = /var gameUrl\s*=\s*([\s\S]{0,4000}?);/.exec(html);
  if (!bloc) return null;
  const base64 = [...bloc[1].matchAll(/'([^']*)'/g)].map((m) => m[1]).join('');
  if (!base64) return null;
  try {
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Push Gaming : la liste donne l'adresse, la page de démo la confirme.
 *
 * Le nom est la seconde clé d'appariement, et c'est nécessaire : onze de nos
 * slugs diffèrent de ceux du studio (`cats-of-olympuss` s'y lit
 * `cats-olympuss`). Fabriquer nous-mêmes ce slug donnerait un 404, et pire, un
 * jour, la démo d'un autre jeu — on ne retient donc le nom que s'il désigne
 * une seule carte de la liste.
 */
async function demoPush(jeu: Jeu): Promise<Resultat> {
  const cartes = await jeuxDePush();
  if (!cartes.length) return { cause: 'liste /games/ illisible' };

  const parSlug = cartes.find((c) => c.slug === jeu.slug);
  const parNom = cartes.filter((c) => memeNom(c.nom, jeu.nom));
  const carte = parSlug ?? (parNom.length === 1 ? parNom[0] : null);
  if (!carte) {
    return { cause: parNom.length > 1 ? 'nom porté par plusieurs cartes' : 'absent de la liste /games/' };
  }
  if (!memeNom(carte.nom, jeu.nom)) return { cause: `la liste annonce « ${carte.nom} »` };

  const url = `https://www.pushgaming.com/games/play/${carte.slug}.html`;
  const page = await recuperer(url);
  if (!page.ok) return { cause: `page de démo ${page.cause}` };
  const lanceur = lireLanceurPush(page.html);
  if (!lanceur) return { cause: 'page de démo sans lanceur' };
  if (!/mode=DEMO/i.test(lanceur) || !/rgsGameId=/.test(lanceur)) {
    return { cause: 'lanceur sans jeu en mode démo' };
  }
  return url;
}

/* ── Réglages par studio ──────────────────────────────────────────────── */

const STUDIOS = {
  wazdan: {
    /* Les `demoUrl` déjà en base sont des pages de présentation : on les reprend avec les vides. */
    ficheProduit: 'wazdan.com/games/',
    extraire: demoWazdan,
    /* Ce que porte une démo réellement jouable — sert à recompter après écriture. */
    marqueurJouable: 'gamelaunch.wazdan.com',
  },
  'nolimit-city': {
    ficheProduit: 'nolimitcity.com/games/',
    extraire: demoNolimit,
    marqueurJouable: 'nolimitcity.com/demo/',
  },
  'push-gaming': {
    ficheProduit: 'pushgaming.com/games/',
    extraire: demoPush,
    marqueurJouable: 'pushgaming.com/games/play/',
  },
} as const;

type NomStudio = keyof typeof STUDIOS;

async function main() {
  const iS = process.argv.indexOf('--studio');
  const studio = (iS >= 0 ? process.argv[iS + 1] : undefined) as NomStudio | undefined;
  if (!studio || !(studio in STUDIOS)) {
    console.error('Studio manquant ou inconnu. Attendu : --studio wazdan|nolimit-city|push-gaming');
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

  /*
   * Chez Push Gaming la page de démo vit sous la fiche produit
   * (`/games/play/…` est un `/games/…`) : le filtre SQL ne peut pas les
   * distinguer. Les déjà-converties sont donc écartées ici, ce qui rend un
   * second passage du script inoffensif pour les trois studios.
   */
  const jeux: Jeu[] = (
    await prisma.jeu.findMany({
      where: {
        studio: { slug: studio },
        OR: [{ demoUrl: { contains: reglage.ficheProduit } }, { demoUrl: null }],
      },
      select: { id: true, slug: true, nom: true, demoUrl: true },
      orderBy: { slug: 'asc' },
    })
  )
    .filter((j) => !j.demoUrl?.includes(reglage.marqueurJouable))
    .slice(0, limite);

  const sansDemo = jeux.filter((j) => !j.demoUrl).length;
  console.log(
    `${studio} : ${jeux.length} fiches à traiter` +
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

  /*
   * Deux fiches qui reçoivent le même lanceur sont un doublon de catalogue,
   * pas deux jeux : elles publieraient les mêmes captures sous deux URLs
   * indexables. Le premier slug garde la démo, l'autre part en échec nommé —
   * c'est un arbitrage éditorial, pas une donnée à écrire.
   */
  const retenus: typeof trouves = [];
  const premierPourDemo = new Map<string, string>();
  for (const t of [...trouves].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const deja = premierPourDemo.get(t.demo);
    if (deja) echecs.push({ slug: t.slug, cause: `doublon de catalogue (même lanceur que ${deja})` });
    else {
      premierPourDemo.set(t.demo, t.slug);
      retenus.push(t);
    }
  }

  console.log(`\n${retenus.length} démos trouvées, ${echecs.length} échecs.\n`);
  for (const t of retenus.slice(0, 5)) console.log(`  ${t.slug.padEnd(34)} ${t.demo}`);

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
  for (let i = 0; i < retenus.length; i += 25) {
    await Promise.all(
      retenus
        .slice(i, i + 25)
        .map((t) => prisma.jeu.update({ where: { id: t.id }, data: { demoUrl: t.demo } })),
    );
  }
  const jouables = await prisma.jeu.count({
    where: { studio: { slug: studio }, demoUrl: { contains: reglage.marqueurJouable } },
  });
  console.log(`\n${retenus.length} URLs écrites. ${jouables} jeux ${studio} ont une démo jouable.`);
  await prisma.$disconnect();
}

/*
 * Le script ne s'exécute que lancé directement : sans cette garde, importer
 * une des fonctions de lecture déclencherait une campagne complète de requêtes
 * chez trois partenaires, en arrière-plan.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
