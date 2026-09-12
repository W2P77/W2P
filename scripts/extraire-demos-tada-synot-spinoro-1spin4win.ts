/**
 * Donne une démo jouable aux jeux TaDa, Synot, Spinoro et 1spin4win.
 *
 * ── Quatre studios entiers absents du site ────────────────────────────────
 *
 * TaDa Gaming 249 jeux, Synot Games 243, Spinoro 231, 1spin4win 229 : **952
 * fiches, et pas une seule `demoUrl`**. Le pipeline de captures part de la
 * démo ; sans capture, la fiche n'est pas publiable. Ces quatre catalogues ne
 * sont donc pas « incomplets » sur le site, ils y sont invisibles, pour une
 * URL. À eux quatre ils pèsent près d'un tiers de l'écart entre les ~1 000
 * fiches visibles et les 11 600 de la base.
 *
 * ── Les quatre studios ne se lisent pas de la même façon ──────────────────
 *
 * **1spin4win** est le cas idéal : chaque fiche produit porte un bloc
 * JSON-LD dont le nœud `VideoGame` déclare `name`, `identifier` et une
 * `potentialAction` de type `PlayAction` dont la `target` **est** le lanceur
 * (`gs.1spin4win.com:10443/gmh5/games.html?game=BookOfNibiru&…&freeplay=true`).
 * L'URL n'est donc jamais fabriquée par nous : elle est recopiée de la donnée
 * structurée que le studio publie, à côté du nom qui permet de la vérifier.
 * Le catalogue complet est le `sitemap.xml` — la page `/games` n'en montre
 * que vingt, et `/gamelist`, qui les porterait toutes, est interdit par le
 * `robots.txt` du studio : on ne le touche pas.
 *
 * **TaDa** publie son catalogue en deux temps, et c'est une bonne nouvelle
 * pour ses serveurs. La page `/games` embarque un `gamesProgressiveConfig`
 * qui liste **tous** les `gid` (281 aujourd'hui), et son endpoint
 * `/games/get-more-games?gids=…` rend jusqu'à cent cartes HTML par appel,
 * chacune avec le nom du jeu et sa clé. Trois requêtes suffisent donc pour le
 * catalogue entier, au lieu de 249. La démo, elle, est l'iframe posée par
 * `/PlusIntro/<Cle>?showGame=true` : `/PlusTrial/<gid>/en-us`. C'est cette
 * enveloppe qu'on retient, et pas l'URL finale — `/PlusTrial` redirige vers
 * un `LoginTrial` qui **fabrique un `ssoKey` à chaque ouverture** ; figer
 * l'URL finale en base reviendrait à figer un jeton de session. Et c'est le
 * catalogue, jamais le `<title>` du build, qui sert à confronter les noms :
 * TaDa livre ses jeux sous leur nom interne (« Witch » pour « Witches
 * Night », « TripleFortuneNuts » pour « 3 Fortune Nuts ») quand il ne les
 * livre pas sans titre du tout. Le contrôle posé là rejetait 101 jeux en
 * ligne — 56 % de réussite au lieu de 94 %.
 *
 * **Spinoro** pose le lanceur directement dans la page du jeu, en clair,
 * dans l'`<iframe id="game-iframe">`. Deux formes coexistent
 * (`/syndication_framework/games.html?gameId=636&…` et
 * `/syndication_framework/games/650/index.html?gameId=650&…`) : les deux sont
 * lues, aucune n'est reconstruite. La page porte deux `<iframe id="game-
 * iframe">`, celle du haut avec un `src` **vide** (elle est remplie par JS au
 * chargement) ; prendre la première rendrait une chaîne vide sur tout le
 * catalogue. Le catalogue est le `game-sitemap.xml` de Yoast.
 *
 * **Synot Games ne publie aucune démo publique.** C'est le résultat de ce
 * lot, et il est utile : il évite de refaire le tour dans six mois. Ce qui a
 * été essayé, en septembre 2026 —
 *   · la fiche produit (`/games/<slug>/`) : ni iframe de jeu, ni bouton, ni
 *     le mot « demo » ; le seul bouton du catalogue est « MORE INFO » ;
 *   · l'API WordPress `wp-json/wp/v2/games` : 246 jeux, `acf` vide, aucun
 *     champ d'URL de jeu ; la route maison `wp-json/synot/v1/games` ne rend
 *     que le HTML des vignettes, avec le même « MORE INFO » ;
 *   · les scripts du thème (`dist/main.js`, `js/script.js`, 210 ko) : le mot
 *     « demo » n'y apparaît **pas une seule fois** ;
 *   · les sous-domaines : `demo.synotgames.com` existe bien (Cloudflare
 *     devant un applicatif Azure) mais répond 404 **vide** sur la racine et
 *     sur tout chemin essayé, sans page d'entrée publique ; `games.`,
 *     `play.`, `gs.`, `static.`, `launcher.` n'ont pas d'enregistrement DNS ;
 *     `ca.synotgames.com` est un back-office opérateur derrière login ;
 *   · `dev.synotgames.com`, la préproduction, sert la même fiche sans démo.
 * Les démos Synot qu'on trouve en ligne sont hébergées par des comparateurs
 * — c'est-à-dire des concurrents. Y envoyer notre bouton « jouer » est
 * exactement l'erreur qui a coûté 590 fiches sur BetsRank : le script ne le
 * fera pas. Il sonde quand même les 243 fiches produit à chaque exécution,
 * pour que le jour où Synot ouvrira ses démos, une simple relance les trouve.
 *
 * ── Les cinq garde-fous ───────────────────────────────────────────────────
 *
 * 1. **Un 200 ne prouve rien.** Chez 1spin4win, `gmh5/games.html?game=…`
 *    répond 200 sur n'importe quelle chaîne : c'est une coquille de 180
 *    octets qui charge le jeu en JS. Chez TaDa, `/PlusTrial/99999/en-us`
 *    répond 200 lui aussi — avec, dans le corps,
 *    `{"ErrorCode":2,"Message":"Game Unavailable"}`. La preuve qu'un jeu
 *    existe est toujours une donnée lue dans sa propre réponse : le JSON-LD
 *    chez 1spin4win, l'iframe chez Spinoro, et chez TaDa le `gameId` que le
 *    `LoginTrial` du studio réémet avec `demo=true` dans l'URL finale.
 * 2. **Le nom lu est confronté à celui de la base**, en égalité, jamais en
 *    préfixe. Le contrôle sert déjà ici : notre `aladdin-megaways` mène chez
 *    Spinoro à « Aladdin's Treasures Megaways ». Accepter serait écrire une
 *    démo sur la foi d'un slug.
 * 3. **Deux fiches ne reçoivent jamais le même lanceur.** Deux slugs qui
 *    rendent la même URL sont un doublon de catalogue, pas deux jeux : le
 *    premier par ordre de slug la garde, le second part en échec nommé.
 * 4. **Le catalogue du studio est lu AVANT de sonder les fiches**, et un
 *    catalogue anormalement court arrête le script au lieu de conclure. Sans
 *    cette garde, un studio qui nous repousse fait passer tout son catalogue
 *    pour retiré — l'accident a déjà été payé chez Hacksaw, 58 jeux déclarés
 *    morts alors qu'ils étaient tous en ligne.
 * 5. **Ce qui réussit sans rien faire est suspect.** Toutes les requêtes
 *    partent avec un User-Agent de Chrome réel, et aucune conclusion n'est
 *    tirée d'un `load` : on lit ce que la page contient.
 *
 * ── Deux choses à savoir avant d'écrire ───────────────────────────────────
 *
 * Aucun des quatre studios n'a d'adaptateur de capture
 * (`src/lib/captures/`) : écrire ces `demoUrl` rend les fiches *capturables*,
 * pas encore capturées. Le lanceur 1spin4win et celui de Spinoro n'envoient
 * ni `X-Frame-Options` ni `frame-ancestors`, ils sont donc embarquables en
 * iframe chez nous ; celui de TaDa déclare `frame-ancestors 'self'
 * *.tadagaming.com` et l'URL finale du jeu ajoute `X-Frame-Options: DENY` —
 * chez TaDa la capture par navigation marchera, l'iframe non.
 *
 * Usage : npx tsx --env-file=.env.local scripts/extraire-demos-tada-synot-spinoro-1spin4win.ts \
 *           --studio tada|synot-games|spinoro|1spin4win [--appliquer] [--limite N]
 */
import { config as loadEnv } from 'dotenv';
import { basename, resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PARALLELE = 4;
const PAUSE_MS = 250;
/** L'espacement des reprises quand le studio commence à nous refuser. */
const RECUL_MS = 4000;

/**
 * En deçà, le catalogue n'est pas un catalogue, c'est une panne.
 *
 * Le plus petit des quatre studios porte 229 jeux. Un catalogue à moins de
 * 150 entrées veut dire que le studio nous repousse ou qu'il a changé de
 * forme : dans les deux cas l'absence d'un jeu ne prouve rien, et conclure
 * reviendrait à déclarer retiré tout ce qu'on n'a pas su lire.
 */
const CATALOGUE_MINIMAL = 150;

type Jeu = { id: string; slug: string; nom: string; demoUrl: string | null };
type Echec = { slug: string; cause: string };
/** Une démo trouvée, ou la raison nommée de ne pas en avoir trouvé. */
type Resultat = string | { cause: string };

/** Ce qu'une lecture de catalogue rapporte à l'appelant : de quoi décider d'arrêter. */
type Catalogue = { taille: number; detail: string };

/**
 * Les entités HTML que ces quatre sites laissent passer.
 *
 * Les trois formes cohabitent : Spinoro écrit `Aladdin&#039;s` en décimal,
 * les catalogues WordPress de Synot écrivent `&#8217;` et `&amp;`. Sans
 * décodage, la normalisation garde les chiffres de l'entité et un jeu
 * parfaitement identifié ressort en écart de nom.
 */
const decoderEntites = (texte: string) =>
  texte
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');

/**
 * Pour confronter deux noms sans buter sur la typographie.
 *
 * L'esperluette est le seul écart qui demande deux lectures : un studio écrit
 * « Rock & Roll » là où la base écrit « Rock and Roll », un autre l'inverse.
 * Les deux conventions sont acceptées — c'est de la typographie, pas un autre
 * jeu. Tout le reste (®, ™, apostrophes, espaces) tombe.
 */
const normaliserNom = (nom: string, esperluette: 'and' | '' = 'and') =>
  decoderEntites(nom).toLowerCase().replace(/&/g, esperluette).replace(/[^a-z0-9]/g, '');

const memeNom = (a: string, b: string) =>
  normaliserNom(a) === normaliserNom(b) || normaliserNom(a, '') === normaliserNom(b, '');

type Reponse = { ok: true; html: string; url: string } | { ok: false; cause: string };

/**
 * Une requête qui distingue « le studio a répondu » de « le studio nous a
 * repoussés ».
 *
 * Un 403, un 429 ou un 5xx ne sont pas une réponse du studio, ce sont nos
 * requêtes qui reviennent : on réessaie en s'espaçant, et si ça persiste on
 * rapporte un sondage impossible plutôt qu'un verdict. C'est la garde qui
 * manquait le jour où 58 jeux Hacksaw ont été déclarés retirés.
 */
async function recuperer(url: string): Promise<Reponse> {
  let dernier = '';
  for (let essai = 0; essai < 3; essai++) {
    if (essai) await new Promise((r) => setTimeout(r, RECUL_MS * essai));
    try {
      const r = await fetch(url, { headers: { 'User-Agent': NAVIGATEUR } });
      if (r.status === 403 || r.status === 429 || r.status >= 500) {
        dernier = `sondage impossible (HTTP ${r.status})`;
        continue;
      }
      if (!r.ok) return { ok: false, cause: `HTTP ${r.status}` };
      return { ok: true, html: await r.text(), url: r.url };
    } catch (e) {
      dernier = e instanceof Error ? e.message.slice(0, 40) : 'erreur réseau';
    }
  }
  return { ok: false, cause: dernier || 'erreur réseau' };
}

/** Les slugs qu'un sitemap déclare, dans l'ordre où le studio les publie. */
async function slugsDuSitemap(url: string, motif: RegExp): Promise<string[]> {
  const r = await recuperer(url);
  if (!r.ok) return [];
  return [...new Set([...r.html.matchAll(motif)].map((m) => m[1]))];
}

/* ── 1spin4win ────────────────────────────────────────────────────────── */

/** Le nœud `VideoGame` du JSON-LD d'une fiche produit 1spin4win. */
type NoeudJeu = {
  '@type'?: string;
  name?: string;
  identifier?: string;
  potentialAction?: { '@type'?: string; target?: string };
};

/**
 * Le couple nom / lanceur que la fiche produit 1spin4win déclare elle-même.
 *
 * On passe par le JSON-LD plutôt que par un regex sur `gs.1spin4win.com` : la
 * page embarque aussi un carrousel de jeux voisins, chacun avec son propre
 * bouton « demo play », et un regex y attraperait le lanceur du premier venu.
 * Le nœud `VideoGame` du `@graph`, lui, décrit le jeu de la page et lui seul.
 */
export function lireFiche1spin4win(html: string): { nom: string; lanceur: string } | null {
  for (const bloc of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    let donnees: { '@graph'?: NoeudJeu[] };
    try {
      donnees = JSON.parse(bloc[1]) as { '@graph'?: NoeudJeu[] };
    } catch {
      /* Un bloc illisible n'est pas une raison d'abandonner le suivant. */
      continue;
    }
    const jeu = (donnees['@graph'] ?? []).find((n) => n['@type'] === 'VideoGame');
    const cible = jeu?.potentialAction?.target;
    if (jeu?.name && cible) return { nom: jeu.name, lanceur: decoderEntites(cible) };
  }
  return null;
}

let catalogue1spin4win: Promise<Set<string>> | null = null;
function jeuxDe1spin4win(): Promise<Set<string>> {
  catalogue1spin4win ??= (async () =>
    new Set(
      await slugsDuSitemap(
        'https://www.1spin4win.com/sitemap.xml',
        /<loc>https:\/\/www\.1spin4win\.com\/games\/([a-z0-9-]+)<\/loc>/g,
      ),
    ))();
  return catalogue1spin4win;
}

async function demo1spin4win(jeu: Jeu): Promise<Resultat> {
  const catalogue = await jeuxDe1spin4win();
  if (!catalogue.has(jeu.slug)) return { cause: 'absent du sitemap du studio' };

  const page = await recuperer(`https://www.1spin4win.com/games/${jeu.slug}`);
  if (!page.ok) return { cause: `fiche produit ${page.cause}` };

  const fiche = lireFiche1spin4win(page.html);
  if (!fiche) return { cause: 'fiche produit sans PlayAction dans son JSON-LD' };
  if (!memeNom(fiche.nom, jeu.nom)) {
    return { cause: `la page annonce « ${decoderEntites(fiche.nom)} »` };
  }
  /* Le studio pourrait un jour pointer sa propre fiche marketing : ce n'est pas un jeu. */
  if (!fiche.lanceur.includes('gs.1spin4win.com')) {
    return { cause: `PlayAction hors lanceur (${fiche.lanceur.slice(0, 48)})` };
  }
  return fiche.lanceur;
}

/* ── TaDa Gaming ──────────────────────────────────────────────────────── */

type CarteTada = { gid: string; nom: string; cle: string };

/**
 * Le catalogue TaDa, lu une fois, en trois requêtes au lieu de 249.
 *
 * La page `/games` n'affiche que cinquante jeux mais embarque un
 * `gamesProgressiveConfig` qui liste **tous** les `gid`, par rubrique ; son
 * endpoint `get-more-games` rend ensuite les cartes HTML par paquets de cent.
 * Un `gid` sans carte est un jeu retiré du site : la carte manque, et c'est
 * précisément ce qu'on veut savoir.
 */
let catalogueTada: Promise<CarteTada[]> | null = null;
function jeuxDeTada(): Promise<CarteTada[]> {
  catalogueTada ??= (async () => {
    const page = await recuperer('https://tadagaming.com/games');
    if (!page.ok) return [];
    const bloc = /<script type="application\/json" id="gamesProgressiveConfig">([\s\S]*?)<\/script>/.exec(
      page.html,
    );
    if (!bloc) return [];

    let config: { cardsUrl?: string; typeGidOrder?: Record<string, string[]> };
    try {
      config = JSON.parse(bloc[1]);
    } catch {
      return [];
    }
    const cardsUrl = config.cardsUrl;
    const gids = [...new Set(Object.values(config.typeGidOrder ?? {}).flat())];
    if (!cardsUrl || !gids.length) return [];

    const cartes: CarteTada[] = [];
    for (let i = 0; i < gids.length; i += 100) {
      const r = await recuperer(`${cardsUrl}?gids=${gids.slice(i, i + 100).join(',')}`);
      if (!r.ok) break;
      let lot: { cards?: Record<string, string> };
      try {
        lot = JSON.parse(r.html);
      } catch {
        break;
      }
      for (const [gid, carte] of Object.entries(lot.cards ?? {})) {
        const nom = /class="subtitle">([^<]+)</.exec(carte)?.[1]?.trim();
        const cle = /PlusIntro\/([A-Za-z0-9_-]+)\?/.exec(carte)?.[1];
        if (nom && cle) cartes.push({ gid, nom, cle });
      }
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    return cartes;
  })();
  return catalogueTada;
}

/**
 * TaDa : la carte donne le `gid`, l'enveloppe de démo le confirme.
 *
 * Le nom est la première clé, la clé `PlusIntro` la seconde : 22 de nos noms
 * divergent de ceux du studio (« Legacyof Egypt », « Speed Bacarrat ») alors
 * que leur slug retombe exactement sur la clé du studio. On ne retient une
 * carte par son nom que si elle est la seule à le porter — deux cartes pour
 * un même titre, c'est une refonte publiée sous le même nom, et choisir
 * reviendrait à tirer à pile ou face.
 */
async function demoTada(jeu: Jeu): Promise<Resultat> {
  const cartes = await jeuxDeTada();
  const parNom = cartes.filter((c) => memeNom(c.nom, jeu.nom));
  const parCle = cartes.filter((c) => normaliserNom(c.cle) === normaliserNom(jeu.slug));
  const carte = parNom.length === 1 ? parNom[0] : parCle.length === 1 ? parCle[0] : null;
  if (!carte) {
    if (parNom.length > 1) return { cause: 'nom porté par plusieurs cartes du catalogue' };
    return { cause: `« ${jeu.nom} » absent du catalogue : jeu retiré du site du studio` };
  }

  /*
   * On garde l'enveloppe `/PlusTrial/<gid>/…`, jamais l'URL finale : celle-ci
   * porte un `ssoKey` que `LoginTrial` fabrique à chaque ouverture. Figer un
   * jeton de session en base donnerait un bouton mort le lendemain.
   */
  const enveloppe = `https://tadagaming.com/PlusTrial/${carte.gid}/en-us`;
  const trial = await recuperer(enveloppe);
  if (!trial.ok) return { cause: `enveloppe de démo ${trial.cause}` };

  /*
   * `/PlusTrial/<gid inventé>` répond 200 lui aussi, avec pour tout corps
   * `{"ErrorCode":2,"Message":"Game Unavailable"}`. Le code HTTP ne tranche
   * donc rien : c'est le corps qu'on lit.
   */
  const erreur = /"Message"\s*:\s*"([^"]+)"/.exec(trial.html.slice(0, 200));
  if (erreur) return { cause: `le studio répond « ${erreur[1]} » sur le jeu ${carte.gid}` };

  /*
   * Ici la preuve n'est pas le `<title>`, et c'est une leçon du lot.
   *
   * TaDa livre ses builds sous leur nom **interne** : le jeu 226 s'intitule
   * « Witch » pour « Witches Night », le 781 « TripleFortuneNuts » pour « 3
   * Fortune Nuts », et une bonne moitié des builds anciens n'a pas de balise
   * `<title>` du tout. Exiger l'égalité des noms là-dessus rejetait 101 jeux
   * parfaitement en ligne — le contrôle de nom a donc sa place là où le
   * studio publie un nom destiné aux joueurs : la carte de son catalogue,
   * déjà confrontée plus haut.
   *
   * Ce qui se vérifie ici, c'est que l'enveloppe a bien ouvert **une session
   * de démo pour ce jeu-là** : le `LoginTrial` du studio réémet le `gameId`
   * demandé et pose `demo=true` dans l'URL finale. Un gid inconnu n'arrive
   * jamais jusque-là, il repart sur le JSON d'erreur ci-dessus.
   */
  const finale = trial.url;
  if (!new RegExp(`[?&]gameId=${carte.gid}(&|$)`).test(finale)) {
    return { cause: `l'ouverture du jeu ${carte.gid} retombe sur ${finale.slice(0, 60)}` };
  }
  if (!/[?&]demo=true(&|$)/.test(finale)) {
    return { cause: `le jeu ${carte.gid} ne s'ouvre pas en mode démo` };
  }

  return enveloppe;
}

/* ── Spinoro ──────────────────────────────────────────────────────────── */

let catalogueSpinoro: Promise<Set<string>> | null = null;
function jeuxDeSpinoro(): Promise<Set<string>> {
  catalogueSpinoro ??= (async () =>
    new Set(
      await slugsDuSitemap(
        'https://www.spinoro.com/game-sitemap.xml',
        /<loc>https:\/\/www\.spinoro\.com\/game\/([a-z0-9-]+)\/?<\/loc>/g,
      ),
    ))();
  return catalogueSpinoro;
}

/**
 * Le nom et le lanceur que la page de jeu Spinoro déclare.
 *
 * La page pose **deux** `<iframe id="game-iframe">` : celle du haut, réservée
 * au bureau, a un `src` vide que le JS remplit au chargement ; celle du bas
 * porte l'URL en clair. On ne retient donc que les `src` non vides — prendre
 * la première iframe rendrait une chaîne vide sur tout le catalogue.
 *
 * Le nom se lit dans le `<h1>` de la page plutôt que dans le `<title>`, qui
 * traîne un « - SpinOro » à éplucher.
 */
export function lireFicheSpinoro(html: string): { nom: string; lanceur: string } | null {
  const nom = /<h1[^>]*class="[^"]*so-main__desc-title[^"]*"[^>]*>([^<]+)<\/h1>/.exec(html)?.[1];
  const lanceur = [...html.matchAll(/<iframe[^>]*id="game-iframe"[^>]*src="([^"]+)"/g)]
    .map((m) => decoderEntites(m[1]))
    .find((u) => u.includes('games.spinoro.com'));
  if (!nom || !lanceur) return null;
  return { nom: decoderEntites(nom).trim(), lanceur };
}

async function demoSpinoro(jeu: Jeu): Promise<Resultat> {
  const catalogue = await jeuxDeSpinoro();
  if (!catalogue.has(jeu.slug)) return { cause: 'absent du sitemap du studio' };

  const page = await recuperer(`https://www.spinoro.com/game/${jeu.slug}/`);
  if (!page.ok) return { cause: `page de jeu ${page.cause}` };

  const fiche = lireFicheSpinoro(page.html);
  if (!fiche) return { cause: 'page de jeu sans lanceur en iframe' };
  if (!memeNom(fiche.nom, jeu.nom)) return { cause: `la page annonce « ${fiche.nom} »` };
  return fiche.lanceur;
}

/* ── Synot Games ──────────────────────────────────────────────────────── */

/**
 * Le catalogue Synot, lu par l'API WordPress du studio.
 *
 * `wp-json/wp/v2/games` rend cent entrées par page et annonce son total dans
 * l'en-tête `X-WP-Total`. On ne lit que slug et titre : le reste de l'objet
 * (`acf`, taxonomies) ne porte aucune URL de jeu — c'est justement le constat
 * de ce lot.
 */
let catalogueSynot: Promise<Map<string, string>> | null = null;
function jeuxDeSynot(): Promise<Map<string, string>> {
  catalogueSynot ??= (async () => {
    const par = new Map<string, string>();
    for (let page = 1; page <= 10; page++) {
      const r = await recuperer(
        `https://www.synotgames.com/wp-json/wp/v2/games?per_page=100&page=${page}&_fields=slug,title`,
      );
      if (!r.ok) break;
      let lot: Array<{ slug?: string; title?: { rendered?: string } }>;
      try {
        lot = JSON.parse(r.html);
      } catch {
        break;
      }
      if (!Array.isArray(lot) || !lot.length) break;
      for (const e of lot) if (e.slug && e.title?.rendered) par.set(e.slug, e.title.rendered);
      if (lot.length < 100) break;
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    return par;
  })();
  return catalogueSynot;
}

/**
 * Tout ce qui, sur une fiche Synot, ressemblerait à un lanceur de jeu.
 *
 * Le jour où le studio ouvrira ses démos, c'est par là qu'elles arriveront :
 * une iframe qui n'est ni un tag manager ni une vidéo, ou un lien qui porte
 * les paramètres d'un lanceur. La fonction ne décide de rien — elle rapporte
 * une piste à qualifier à la main, parce qu'une URL trouvée par ressemblance
 * n'est pas une démo vérifiée.
 */
const HORS_JEU = /googletagmanager|youtube|youtu\.be|vimeo|facebook|doubleclick|clarity\.ms/i;

export function chercherLanceurSynot(html: string): string | null {
  for (const m of html.matchAll(/<iframe[^>]*\ssrc="([^"]+)"/g)) {
    const src = decoderEntites(m[1]);
    if (src && !HORS_JEU.test(src)) return src;
  }
  const lien = /href="([^"]*(?:gameId=|playMode=|demo\.synotgames\.com|games\.synotgames\.com)[^"]*)"/i.exec(
    html,
  );
  return lien ? decoderEntites(lien[1]) : null;
}

/**
 * Synot : le sondage confirme, fiche par fiche, qu'il n'y a rien à prendre.
 *
 * Ce n'est pas une formalité. Le studio a 243 fiches chez nous et 246 chez
 * lui ; conclure « Synot ne publie pas de démo » sur trois pages regardées à
 * la main serait la même faute que de conclure « retiré » sur un catalogue
 * vide. Le script sonde donc tout, et si une fiche porte un jour un lanceur,
 * il ressort nommément dans les échecs au lieu d'être noyé.
 */
async function demoSynot(jeu: Jeu): Promise<Resultat> {
  const catalogue = await jeuxDeSynot();
  const titre = catalogue.get(jeu.slug);
  if (!titre) return { cause: 'absent du catalogue WordPress du studio' };
  if (!memeNom(titre, jeu.nom)) return { cause: `le catalogue annonce « ${decoderEntites(titre)} »` };

  const page = await recuperer(`https://www.synotgames.com/games/${jeu.slug}/`);
  if (!page.ok) return { cause: `fiche produit ${page.cause}` };

  const piste = chercherLanceurSynot(page.html);
  if (piste) return { cause: `piste à qualifier à la main : ${piste.slice(0, 80)}` };
  return { cause: 'fiche produit sans lanceur : le studio ne publie aucune démo publique' };
}

/* ── Réglages par studio ──────────────────────────────────────────────── */

const STUDIOS = {
  tada: {
    catalogue: async (): Promise<Catalogue> => {
      const c = await jeuxDeTada();
      return { taille: c.length, detail: `${c.length} cartes lues sur tadagaming.com/games` };
    },
    extraire: demoTada,
    /* Ce que porte une démo réellement jouable — sert à filtrer et à recompter. */
    marqueurJouable: 'tadagaming.com/PlusTrial/',
    /* Une `demoUrl` de cette forme est une page de présentation : on la reprend avec les vides. */
    ficheProduit: 'tadagaming.com/PlusIntro/',
  },
  'synot-games': {
    catalogue: async (): Promise<Catalogue> => {
      const c = await jeuxDeSynot();
      return { taille: c.size, detail: `${c.size} jeux déclarés par l'API WordPress du studio` };
    },
    extraire: demoSynot,
    marqueurJouable: 'synotgames.com/play/',
    ficheProduit: 'synotgames.com/games/',
  },
  spinoro: {
    catalogue: async (): Promise<Catalogue> => {
      const c = await jeuxDeSpinoro();
      return { taille: c.size, detail: `${c.size} jeux dans le game-sitemap.xml du studio` };
    },
    extraire: demoSpinoro,
    marqueurJouable: 'games.spinoro.com',
    ficheProduit: 'spinoro.com/game/',
  },
  '1spin4win': {
    catalogue: async (): Promise<Catalogue> => {
      const c = await jeuxDe1spin4win();
      return { taille: c.size, detail: `${c.size} jeux dans le sitemap.xml du studio` };
    },
    extraire: demo1spin4win,
    marqueurJouable: 'gs.1spin4win.com',
    ficheProduit: '1spin4win.com/games/',
  },
} as const;

type NomStudio = keyof typeof STUDIOS;

async function main() {
  const iS = process.argv.indexOf('--studio');
  const studio = (iS >= 0 ? process.argv[iS + 1] : undefined) as NomStudio | undefined;
  if (!studio || !(studio in STUDIOS)) {
    console.error(
      'Studio manquant ou inconnu. Attendu : --studio tada|synot-games|spinoro|1spin4win',
    );
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
        OR: [{ demoUrl: { contains: reglage.ficheProduit } }, { demoUrl: null }],
      },
      select: { id: true, slug: true, nom: true, demoUrl: true },
      orderBy: { slug: 'asc' },
    })
  )
    .filter((j) => !j.demoUrl?.includes(reglage.marqueurJouable))
    .slice(0, limite);

  console.log(`${studio} : ${jeux.length} fiches à traiter.\n`);
  if (!jeux.length) {
    await prisma.$disconnect();
    return;
  }

  /*
   * Le catalogue d'abord, les fiches ensuite. L'ordre inverse a déjà coûté
   * cher : sonder 145 fiches puis lire un catalogue vidé par le blocage qu'on
   * venait de provoquer fait passer un studio entier pour retiré.
   */
  const catalogue = await reglage.catalogue();
  console.log(`Catalogue du studio : ${catalogue.detail}.`);
  if (catalogue.taille < CATALOGUE_MINIMAL) {
    console.log(
      `\nCatalogue trop maigre pour conclure quoi que ce soit — le studio nous repousse ` +
        `ou a changé de forme. On s’arrête, rien n’est écrit.`,
    );
    await prisma.$disconnect();
    return;
  }
  console.log('');

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
   * c'est une fusion de fiches à faire à la main, pas une démo à écrire.
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

  const taux = Math.round((retenus.length / jeux.length) * 100);
  console.log(`\n${retenus.length} démos trouvées sur ${jeux.length} (${taux} %), ${echecs.length} échecs.\n`);
  for (const t of retenus.slice(0, 5)) console.log(`  ${t.slug.padEnd(34)} ${t.demo.slice(0, 110)}`);

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
 * chez quatre partenaires, en arrière-plan.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
