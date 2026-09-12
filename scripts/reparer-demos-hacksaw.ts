/**
 * Rend une démo aux jeux Hacksaw dont la `demoUrl` est périmée.
 *
 * ── Ce qui a cassé ────────────────────────────────────────────────────────
 *
 * Les 145 `demoUrl` Hacksaw de la base pointent toutes la **page produit**
 * du studio, `hacksawgaming.com/games/<slug>`. Trente-six d'entre elles
 * répondent 302 vers `/Start`, qui répond 404 : c'est le
 * `ERR_HTTP_RESPONSE_CODE_FAILURE` qui a fait échouer 36 des 39 jeux de la
 * dernière campagne de captures. Aucun de ces 36 n'avait jamais été capturé —
 * l'échec n'est pas nouveau, il était seulement invisible.
 *
 * ── Pourquoi elles sont mortes ────────────────────────────────────────────
 *
 * Le slug n'a pas changé et le jeu n'a pas été retiré : Hacksaw a **retiré la
 * page produit**, pas le jeu. Sa liste `/games/` porte 246 tuiles, dont 145
 * seulement ont un bouton « Read more » vers une page produit. Les 101 autres
 * n'ont qu'un bouton « Try it » — le jeu reste jouable, sa page de
 * présentation n'existe plus. Les 36 périmées sont toutes dans ce lot.
 *
 * La tuile porte le `data-gameid` que le bouton « Try it » passe au lanceur
 * maison (`hacksaw-launcher.min.js`) : celui-ci lit
 * `static-live.hacksawgaming.com/<gameid>/version.json`, puis ouvre
 * `<gameid>/<version>/index.html`. On refait exactement ce chemin, avec les
 * paramètres que le site lui-même envoie (relevés dans l'iframe d'une page
 * produit encore vivante).
 *
 * ── Trois gardes, trois accidents déjà payés ──────────────────────────────
 *
 * 1. Un 200 ne prouve rien. `static-live/9999/1.12.25/index.html` répond 200
 *    et sert un vrai jeu — intitulé « Slottemplate », le gabarit interne du
 *    studio. Le `gameid` n'est donc jamais déduit d'un compteur : il est lu
 *    dans la tuile du catalogue, et la page de build est ouverte pour être
 *    lue, pas pour son code HTTP.
 * 2. Le nom est confronté deux fois : celui de la tuile contre celui de la
 *    base, puis le `<title>` de la page de build contre celui de la base. Un
 *    `gameid` voisin écrirait sinon une démo qui ouvre un autre jeu, sans que
 *    rien ne le signale.
 * 3. Deux fiches ne reçoivent jamais le même lanceur. Si deux slugs tombent
 *    sur le même `gameid`, c'est un doublon de catalogue : le premier par
 *    ordre de slug le garde, le second est rapporté.
 *
 * ── Deux choses à savoir avant d'écrire ───────────────────────────────────
 *
 * L'URL produite porte le **numéro de version du build** : c'est le seul
 * moyen de l'ouvrir (`<gameid>/index.html` sans version répond 403). Le
 * studio livre des correctifs, la version bougera, et ces 36 URLs se
 * périmeront à leur tour. Le script est donc à relancer, pas à lancer une
 * fois — un second passage ne relit que ce qui pointe encore une page
 * produit, il faudra élargir son filtre le jour où on voudra rafraîchir les
 * versions.
 *
 * Et l'adaptateur de captures ne reconnaît pour l'instant que les `demoUrl`
 * en `hacksawgaming.com/games/` (`demoExploitable`). Écrire ces URLs sans
 * qu'il accepte `static-live.hacksawgaming.com` rendrait les 36 fiches
 * invisibles au runner : la démo serait réparée et la campagne ne les verrait
 * toujours pas.
 *
 * ── Ce que le script ne fait pas ──────────────────────────────────────────
 *
 * Il n'invente aucune URL. Un jeu dont le nom n'est dans aucune tuile est un
 * jeu réellement retiré par le studio : c'est un échec rapporté par son nom,
 * et c'est une conclusion utile — la fiche n'aura jamais de captures.
 *
 * Usage : npx tsx --env-file=.env.local scripts/reparer-demos-hacksaw.ts [--appliquer] [--limite N]
 */
import { basename } from 'node:path';

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PARALLELE = 4;
const PAUSE_MS = 250;
/** L'espacement des reprises quand le studio commence à refuser. */
const RECUL_MS = 4000;

/**
 * Les pages qui portent des tuiles de jeu.
 *
 * `/games/` les porte toutes les 246 aujourd'hui, mais les trois catégories
 * sont lues aussi : elles ne coûtent que trois requêtes, et le jour où la
 * liste principale sera paginée, c'est par là que les tuiles manquantes
 * reviendront. La fusion se fait par `gameid`, un doublon ne gêne pas.
 */
const PAGES_CATALOGUE = [
  'https://www.hacksawgaming.com/games/',
  'https://www.hacksawgaming.com/games/slots',
  'https://www.hacksawgaming.com/games/instant-win-games',
  'https://www.hacksawgaming.com/games/scratchcards',
];

/** Les entités nommées que le catalogue emploie. Les numériques sont traitées à part. */
const ENTITES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * Décode les entités du catalogue.
 *
 * Hacksaw écrit ses apostrophes en **hexadécimal** (`Frank&#x27;s Farm`). Une
 * table qui ne couvrait que les entités nommées et décimales laissait quatre
 * jeux — « Frank's Farm », « Gronk's Gems », « Keep 'em Cool », « Buffalo
 * Stack'n'Sync » — sortir en « retiré par le studio » alors que leur tuile
 * était sous les yeux du script. D'où le décodage numérique générique.
 */
const decoderEntites = (texte: string) =>
  texte
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&(?:amp|quot|apos|nbsp);/g, (e) => ENTITES[e] ?? e);

/**
 * Pour confronter deux noms sans buter sur la typographie.
 *
 * Quatre jeux ne tenaient qu'à une apostrophe (« Frank's Farm », « Gronk's
 * Gems », « Keep 'em Cool », « Buffalo Stack'n'Sync ») et sortaient en jeu
 * retiré alors que leur tuile était là. L'esperluette suit la même règle que
 * chez Red Tiger : le site écrit « & » là où la base écrit « and ».
 */
const normaliserNom = (nom: string) =>
  decoderEntites(nom).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export type Tuile = {
  gameId: string;
  nom: string;
  /** La page produit, quand le studio en publie encore une. */
  slug: string | null;
};

/**
 * Les tuiles de jeu d'une page de catalogue.
 *
 * On découpe sur l'ouverture de chaque `<li>` plutôt que sur une paire
 * `<li>…</li>` : les tuiles imbriquent leurs propres listes, et un regex non
 * glouton s'arrêtait au premier `</li>` intérieur — 143 tuiles lues sur 246,
 * et les 103 tuiles « Try it » seules, celles qui nous intéressent, perdues.
 */
export function lireCatalogue(html: string): Tuile[] {
  const ouvertures = [
    ...html.matchAll(/<li class="[^"]*" data-gameid="(\d+)" aria-label="([^"]*?) \| casino game image">/g),
  ];

  return ouvertures.map((m, i) => {
    const corps = html.slice(m.index, ouvertures[i + 1]?.index ?? html.length);
    const page = /href="\/games\/([^"]+)"/.exec(corps);
    return {
      gameId: m[1],
      nom: decoderEntites(m[2]),
      slug: page ? decodeURIComponent(page[1]) : null,
    };
  });
}

/**
 * L'URL que le bouton « Try it » du studio ouvre dans son iframe.
 *
 * Les paramètres ne sont pas devinés : ils sont relevés tels quels dans le
 * `src` de l'iframe d'une page produit vivante. `token=123131` est la valeur
 * que le site envoie en clair, `mode=2` est le code interne du mode démo.
 */
export const urlLancement = (gameId: string, version: string) =>
  `https://static-live.hacksawgaming.com/${gameId}/${version}/index.html` +
  `?language=en&channel=desktop&gameid=${gameId}&mode=2&token=123131` +
  `&lobbyurl=${encodeURIComponent('https://www.hacksawgaming.com')}&currency=EUR&partner=demo` +
  `&env=https://rgs-demo.hacksawgaming.com/api&realmoneyenv=https://rgs-demo.hacksawgaming.com/api`;

/**
 * Une requête qui distingue « le studio a répondu » de « le studio nous a
 * repoussés ».
 *
 * La première version du script a lancé 145 sondages puis lu le catalogue :
 * arrivé là, Hacksaw refusait tout, le catalogue est revenu vide et le script
 * a conclu que **58 jeux avaient été retirés**. Ils étaient tous en ligne. Un
 * 403, un 429 ou un 5xx ne sont pas une réponse du studio, ce sont nos
 * requêtes qui reviennent : on réessaie en s'espaçant, et si ça persiste on
 * rapporte un sondage impossible plutôt qu'un verdict.
 */
async function recuperer(url: string, options: RequestInit = {}): Promise<Response> {
  let derniere: Response | null = null;
  for (let essai = 0; essai < 3; essai++) {
    if (essai) await new Promise((r) => setTimeout(r, RECUL_MS * essai));
    try {
      const r = await fetch(url, { headers: { 'User-Agent': NAVIGATEUR }, ...options });
      if (r.status !== 403 && r.status !== 429 && r.status < 500) return r;
      derniere = r;
    } catch (e) {
      if (essai === 2) throw e;
    }
  }
  return derniere!;
}

/** Exécute par lots de `PARALLELE`, avec une pause : Hacksaw est un partenaire. */
async function parLots<T>(elements: T[], traiter: (e: T) => Promise<void>) {
  for (let i = 0; i < elements.length; i += PARALLELE) {
    await Promise.all(elements.slice(i, i + PARALLELE).map(traiter));
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
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
   * Le filtre ne retient que les `demoUrl` en page produit. Les fiches déjà
   * réparées portent une URL `static-live` : un second passage ne les relit
   * pas, et ne risque donc pas de les réécrire avec une version obsolète.
   */
  const jeux = await prisma.jeu.findMany({
    where: {
      studio: { slug: 'hacksaw-gaming' },
      demoUrl: { contains: 'hacksawgaming.com/games/' },
    },
    select: { id: true, slug: true, nom: true, demoUrl: true },
    orderBy: { slug: 'asc' },
  });

  console.log(`${jeux.length} fiches Hacksaw portent une page produit en demoUrl.\n`);

  const tuiles = new Map<string, Tuile>();
  for (const page of PAGES_CATALOGUE) {
    const r = await recuperer(page);
    if (!r.ok) {
      console.log(`  ! catalogue ${page} illisible (HTTP ${r.status})`);
      continue;
    }
    for (const t of lireCatalogue(await r.text())) {
      // Une tuile avec page produit est plus informative : elle l'emporte.
      const connue = tuiles.get(t.gameId);
      if (!connue || (t.slug && !connue.slug)) tuiles.set(t.gameId, t);
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  const parNom = new Map<string, Tuile[]>();
  for (const t of tuiles.values()) {
    const cle = normaliserNom(t.nom);
    parNom.set(cle, [...(parNom.get(cle) ?? []), t]);
  }
  console.log(
    `Catalogue du studio : ${tuiles.size} tuiles, dont ${[...tuiles.values()].filter((t) => t.slug).length} avec page produit.\n`,
  );
  /*
   * Sans catalogue, l'absence d'une tuile ne veut rien dire. C'est la garde
   * qui manquait : le script a déjà déclaré 58 jeux retirés sur la foi d'une
   * liste vide. On s'arrête, et on recommence plus tard.
   */
  if (tuiles.size < 100) {
    console.log('Catalogue trop maigre pour conclure quoi que ce soit — le studio nous repousse. On s’arrête.');
    await prisma.$disconnect();
    return;
  }

  console.log('Sondage des pages produit…\n');


  /*
   * `redirect: 'manual'` est la seule façon de voir la panne : Hacksaw renvoie
   * un 302 vers `/Start`, et `fetch` le suit par défaut. En le suivant, on lit
   * le code de `/Start` — 404 aujourd'hui, mais rien ne garantit qu'il le
   * restera, et une page d'accueil en 200 ferait passer les 36 fiches mortes
   * pour vivantes.
   */
  const perimees: typeof jeux = [];
  const vivantes: string[] = [];
  const echecs: string[] = [];
  await parLots(jeux, async (j) => {
    try {
      const r = await recuperer(j.demoUrl!, { redirect: 'manual' });
      if (r.status >= 200 && r.status < 300) vivantes.push(j.slug);
      else if (r.status === 404 || (r.status >= 300 && r.status < 400)) perimees.push(j);
      // Ni vivante ni morte : le studio nous a repoussés, on ne tranche pas.
      else echecs.push(`${j.slug} — sondage impossible (HTTP ${r.status}), fiche laissée en l'état`);
    } catch (e) {
      echecs.push(`${j.slug} — sondage impossible (${e instanceof Error ? e.message.slice(0, 40) : 'erreur'})`);
    }
  });
  perimees.sort((a, b) => a.slug.localeCompare(b.slug));

  console.log(`${vivantes.length} pages produit répondent, ${perimees.length} sont périmées.\n`);
  if (!perimees.length) {
    await prisma.$disconnect();
    return;
  }

  const aReparer = perimees.slice(0, limite);
  const trouves: Array<{ id: string; slug: string; nom: string; gameId: string; demo: string }> = [];

  await parLots(aReparer, async (j) => {
    const candidates = parNom.get(normaliserNom(j.nom)) ?? [];
    if (!candidates.length) {
      return void echecs.push(`${j.slug} — « ${j.nom} » absent du catalogue : jeu retiré par le studio`);
    }
    /*
     * Deux tuiles pour un même nom, c'est le studio qui a mis en ligne une
     * refonte sous le même titre. Choisir revient à tirer à pile ou face :
     * on rapporte et on laisse la fiche en l'état.
     */
    if (candidates.length > 1) {
      return void echecs.push(
        `${j.slug} — ${candidates.length} tuiles portent « ${j.nom} » (${candidates.map((c) => c.gameId).join(', ')})`,
      );
    }
    const tuile = candidates[0];

    try {
      const versionJson = await recuperer(
        `https://static-live.hacksawgaming.com/${tuile.gameId}/version.json?${Date.now()}`,
      );
      if (!versionJson.ok) {
        return void echecs.push(`${j.slug} — version.json du jeu ${tuile.gameId} en HTTP ${versionJson.status}`);
      }
      const { version } = (await versionJson.json()) as { version?: string };
      if (!version) return void echecs.push(`${j.slug} — version.json du jeu ${tuile.gameId} sans version`);

      const demo = urlLancement(tuile.gameId, version);
      const build = await recuperer(demo);
      if (!build.ok) return void echecs.push(`${j.slug} — build ${version} en HTTP ${build.status}`);

      /*
       * La preuve finale, et la seule qui vaille : le nom que le jeu affiche
       * dans son propre `<title>`. C'est ce contrôle qui démasque le gabarit
       * « Slottemplate » servi en 200 sur un `gameid` qui n'existe pas.
       */
      const titre = /<title>([^<]*)<\/title>/i.exec(await build.text())?.[1]?.trim();
      if (!titre) return void echecs.push(`${j.slug} — le build ${tuile.gameId}/${version} n'annonce aucun titre`);
      if (normaliserNom(titre) !== normaliserNom(j.nom)) {
        return void echecs.push(`${j.slug} — le build ${tuile.gameId} annonce « ${titre} »`);
      }

      trouves.push({ id: j.id, slug: j.slug, nom: j.nom, gameId: tuile.gameId, demo });
    } catch (e) {
      echecs.push(`${j.slug} — ${e instanceof Error ? e.message.slice(0, 60) : 'erreur'}`);
    }
  });

  trouves.sort((a, b) => a.slug.localeCompare(b.slug));

  /*
   * Deux fiches sur un même lanceur, c'est deux pages indexables pour un seul
   * jeu. Le premier slug garde l'URL, le second est signalé comme doublon de
   * catalogue : c'est une fusion de fiches à faire à la main, pas une démo à
   * écrire.
   */
  const retenus: typeof trouves = [];
  const prisPar = new Map<string, string>();
  for (const t of trouves) {
    const deja = prisPar.get(t.gameId);
    if (deja) {
      echecs.push(`${t.slug} — même jeu ${t.gameId} que « ${deja} » : doublon de catalogue, fiche laissée en l'état`);
      continue;
    }
    prisPar.set(t.gameId, t.slug);
    retenus.push(t);
  }

  console.log(`${retenus.length} démos retrouvées, ${echecs.length} échecs.\n`);
  for (const t of retenus) console.log(`  ${t.slug.padEnd(24)} jeu ${t.gameId}  ${t.demo.slice(0, 72)}…`);
  if (echecs.length) console.log('');
  for (const e of echecs) console.log(`  ! ${e}`);

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  for (let i = 0; i < retenus.length; i += 25) {
    await Promise.all(
      retenus.slice(i, i + 25).map((t) => prisma.jeu.update({ where: { id: t.id }, data: { demoUrl: t.demo } })),
    );
  }
  console.log(`\n${retenus.length} URLs écrites.`);
  await prisma.$disconnect();
}

/*
 * Le script ne s'exécute que lancé directement.
 *
 * `lireCatalogue` et `urlLancement` sont exportées et réutilisables ; sans
 * cette garde, les importer déclencherait en arrière-plan un sondage complet
 * du catalogue d'un partenaire.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
