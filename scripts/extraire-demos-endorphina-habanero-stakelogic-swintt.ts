/**
 * Donne une démo jouable aux jeux Endorphina, Habanero, Stakelogic et Swintt.
 *
 * ── Quatre studios entiers absents du site ────────────────────────────────
 *
 * Endorphina : 233 jeux en base, 6 `demoUrl` — et ces six pointent la **fiche
 * produit**, pas le jeu. Habanero : 225 jeux, 6 URLs du même défaut.
 * Stakelogic : 206 jeux, aucune URL. Swintt : 193 jeux, aucune URL. Le
 * pipeline de captures part de la démo ; sans capture, la fiche n'est pas
 * publiable. Ces 857 fiches ne sont donc pas « incomplètes » sur le site :
 * elles y sont **invisibles**, pour une URL.
 *
 * ── Le catalogue d'abord, les fiches ensuite ──────────────────────────────
 *
 * Chacun des quatre studios publie sa liste, et c'est la première chose que
 * le script lit — un script qui sonde 145 fiches avant de demander le
 * catalogue se fait repousser, reçoit une liste vide et déclare « 58 jeux
 * retirés » alors qu'ils sont tous en ligne. Ici le catalogue arrive en
 * premier, et s'il est anormalement court le script s'arrête sans conclure.
 *
 * Les quatre listes couvrent la base à la fiche près, ce qui est le vrai
 * enseignement de la reconnaissance :
 *
 * · **Endorphina** — `sitemap.xml`, 234 `/games/<slug>` pour 233 en base.
 * · **Habanero** — la page `/games`, 226 couples `data-game-launch` /
 *   `data-game-title` pour 225 en base.
 * · **Stakelogic** — `stakelogic.com/en/sitemap.xml` (celui que le robots.txt
 *   déclare), 206 `/en/slot/<slug>/` pour 206 en base. Attention : le
 *   `/sitemap.xml` de la racine est un reliquat de 2025 qui n'en porte que
 *   186 — s'y fier ferait conclure à vingt jeux retirés.
 * · **Swintt** — `loadGameItems`, douze tuiles par page, 193 pour 193 en base,
 *   et chaque tuile porte déjà son lanceur construit par le studio.
 *
 * ── Où se trouve la vraie démo, studio par studio ─────────────────────────
 *
 * **Endorphina** met un lien nu sur sa fiche produit : `/games/<slug>/play`.
 * Cette page est une enveloppe qui pousse `edemo.endorphina.com/session/open/
 * sid/<sid>` — un `sid` à usage unique, dont le rejeu répond 403. C'est donc
 * l'enveloppe qu'on retient, le `sid` s'y régénère à chaque ouverture. Et on
 * ne l'ouvre même pas : le robots.txt du studio interdit toute URL finissant
 * par `/play`. La preuve qu'un jeu existe se lit entièrement dans sa fiche
 * produit — son `<h1>` et son bouton « Play Demo » —, qui est une page
 * autorisée.
 *
 * **Habanero** construit son iframe en JavaScript ; le HTML servi ne porte
 * aucune URL de jeu. Le bundle `site2026js` révèle le chemin :
 * `/Games/PrePlayApp?keyname=<keyname>`, avec le `keyname` posé sur le bouton
 * en `data-game-launch`. Cette route redirige vers le vrai lanceur,
 * `app-test.insvr.com/games/?brandid=…&keyname=…&mode=fun`. Le `brandid` n'est
 * pas deviné : il est lu une fois dans le `Location` que le studio renvoie.
 *
 * **Stakelogic** pose l'iframe en clair dans sa fiche produit, avec deux
 * hôtes de lancement selon les jeux (`ngpd.demo-gs-…` et `ngpd.st01-gs-…`) :
 * une expression qui n'accepterait que le premier laisserait tomber la
 * majorité du catalogue.
 *
 * **Swintt** est le cas idéal : le catalogue porte le lanceur déjà construit,
 * l'URL n'est jamais fabriquée par nous. Dix-sept requêtes pour 193 jeux.
 *
 * ── Ce qu'il faut savoir avant de capturer ────────────────────────────────
 *
 * Les lanceurs des quatre studios sont **embarquables en iframe** : aucun ne
 * pose de `x-frame-options` ni de `frame-ancestors`. C'est la fiche produit
 * Habanero qui en porte un (`SAMEORIGIN`), pas le lanceur — raison de plus
 * pour écrire l'URL `app-test.insvr.com` plutôt que le `PrePlayApp` qui y
 * mène.
 *
 * Mais le jeu Endorphina, lui, **se refuse selon le pays** : au bout de la
 * chaîne, `demo.endorphina.network` répond « 403 Forbidden For Your Region »
 * depuis ce poste. L'enveloppe `/play` et le `sid` sont parfaitement valides ;
 * c'est le serveur de jeu qui filtre. Une campagne de captures lancée d'ici
 * photographierait 229 pages d'erreur — il faut sortir par un pays autorisé,
 * ou renoncer à Endorphina. Les trois autres studios répondent 200 depuis ce
 * poste.
 *
 * ── Les cinq garde-fous ───────────────────────────────────────────────────
 *
 * 1. **Un 200 ne prouve rien**, et les quatre studios le démontrent chacun à
 *    leur façon. Le lanceur Stakelogic répond 200 sur un `gameId` inventé —
 *    avec `INCORRECT_REQUEST` dans le corps. Le lanceur Swintt répond 200 sur
 *    un `gameId` inventé — avec `<title>Launch Error</title>`. Le
 *    `PrePlayApp` de Habanero redirige n'importe quel `keyname`, existant ou
 *    non, vers une URL de lanceur parfaitement formée. On ne conclut donc
 *    jamais sur un code HTTP : on lit une donnée dans la page du jeu.
 *
 * 2. **Le nom lu est confronté à celui de la base**, à chaque étape et par
 *    égalité, jamais par préfixe — accepter « Victorious » pour « Victorious
 *    MAX » est exactement l'accident qu'on cherche à éviter. Chaque studio
 *    offre un endroit où lire le nom : le `<h1>` chez Endorphina, l'`og:title`
 *    « Habanero - <nom> » du lanceur, l'attribut `name="<Nom>_Demo"` de
 *    l'iframe Stakelogic, l'`alt` de la vignette puis le titre du jeu lancé
 *    chez Swintt.
 *
 * 3. **Deux fiches ne reçoivent jamais le même lanceur.** Deux slugs sur une
 *    même URL sont un doublon de catalogue : le premier par ordre de slug la
 *    garde, l'autre est rapporté. Sans ça, deux pages indexables publieraient
 *    les mêmes captures.
 *
 * 4. **Un code inattendu ne donne pas un verdict.** Un 403, un 429 ou un 5xx
 *    ne sont pas une réponse du studio, ce sont nos requêtes qui reviennent :
 *    on réessaie en s'espaçant, puis on rapporte « sondage impossible » et on
 *    laisse la fiche en l'état.
 *
 * 5. **Se méfier de ce qui réussit sans rien faire.** Trois tuiles SwinttLive
 *    servent un **PDF commercial** derrière leur bouton « PLAY NOW » : la page
 *    charge, rien n'échoue, et on photographierait une plaquette en croyant
 *    filmer un jeu. Neuf autres pointent `egs2-games.nlgc02.com`, un hôte qui
 *    ne résout plus. Les douze sont refusées par leur nom. L'User-Agent est
 *    celui d'un Chrome réel, par principe — le 301 du lanceur Swintt a été
 *    vérifié identique avec un UA « Headless », mais c'est chez Wazdan qu'on a
 *    appris à ne pas le supposer.
 *
 * ── La cadence n'est pas une précaution de style ──────────────────────────
 *
 * Ce sont des partenaires commerciaux, et leurs démos sont la matière
 * première de tout le chantier de captures : se faire bloquer coûterait
 * infiniment plus que les minutes économisées. Quatre en parallèle, avec une
 * pause.
 *
 * Usage : npx tsx --env-file=.env.local scripts/extraire-demos-endorphina-habanero-stakelogic-swintt.ts \
 *           --studio endorphina|habanero|stakelogic|swintt [--appliquer] [--limite N]
 */
import { config as loadEnv } from 'dotenv';
import { basename, resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PARALLELE = 4;
const PAUSE_MS = 250;
/** L'espacement des reprises quand un studio commence à nous repousser. */
const RECUL_MS = 4000;

type Jeu = { id: string; slug: string; nom: string; demoUrl: string | null };
/**
 * Une démo trouvée, ou la raison nommée de ne pas en avoir trouvé.
 *
 * L'`identite` est ce qui désigne le **jeu** derrière le lanceur, et ce n'est
 * pas toujours l'URL : Swintt sert certains de ses jeux par un client
 * générique où seul le `gamesetId` distingue une partie d'une autre. C'est
 * sur elle que porte le contrôle des doublons, sinon deux fiches pourraient
 * publier les captures du même jeu sous deux adresses différentes.
 */
type Trouvaille = {
  demo: string;
  identite: string;
  /**
   * Faux quand le studio ne publie nulle part le nom du jeu que ce lanceur
   * ouvre. On l'accepte alors sur la foi de la page du jeu — mais le rapport
   * le dit, parce qu'une confrontation qu'on n'a pas faite ne doit pas se
   * lire comme une confrontation réussie.
   */
  nomConfronte: boolean;
  /** Le nom que le studio donne au jeu, quand il diffère du nôtre. */
  nomStudio?: string;
};
type Resultat = Trouvaille | { cause: string };

/* ── Lecture du texte des studios ─────────────────────────────────────── */

/** Les entités nommées que les catalogues emploient. Les numériques sont traitées à part. */
const ENTITES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
  '&#039;': "'",
};

/**
 * Décode les entités des catalogues.
 *
 * Les quatre studios mélangent les trois écritures : Swintt sert « Jekyll
 * &amp; Hyde Co. », Habanero échappe ses apostrophes en décimal, et Hacksaw
 * nous avait appris l'hexadécimal. Une table qui n'en couvrirait qu'une
 * ferait sortir des jeux parfaitement identifiés en « absent du catalogue ».
 */
const decoderEntites = (texte: string) =>
  texte
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&(?:amp|quot|apos|nbsp);/g, (e) => ENTITES[e] ?? e);

/**
 * Pour confronter deux noms sans buter sur la typographie.
 *
 * Stakelogic écrit « Bandits Thunder Link™ », Swintt « Fresh Fruit deluxe
 * Diamonds » avec une minuscule au milieu, Endorphina « Satoshi's secret ».
 * L'esperluette est le seul écart qui demande deux lectures : un studio écrit
 * « & » là où la base écrit « and », et l'inverse existe aussi.
 */
const normaliserNom = (nom: string, esperluette: 'and' | '' = 'and') =>
  decoderEntites(nom)
    .toLowerCase()
    .replace(/&/g, esperluette)
    .replace(/[^a-z0-9]/g, '');

const memeNom = (a: string, b: string) =>
  normaliserNom(a) === normaliserNom(b) || normaliserNom(a, '') === normaliserNom(b, '');

/** Le contenu d'une balise, débarrassé du balisage que les studios y glissent. */
const texteBalise = (html: string, balise: string): string | null => {
  const m = new RegExp(`<${balise}[^>]*>([\\s\\S]*?)</${balise}>`, 'i').exec(html);
  return m ? decoderEntites(m[1].replace(/<[^>]+>/g, '')).trim() : null;
};

/* ── Requêtes ─────────────────────────────────────────────────────────── */

type Reponse =
  | { ok: true; statut: number; corps: string; urlFinale: string }
  | { ok: false; cause: string; repoussé: boolean };

/**
 * Une requête qui distingue « le studio a répondu » de « le studio nous a
 * repoussés ».
 *
 * Un 403, un 429 ou un 5xx ne sont pas une réponse : ce sont nos requêtes qui
 * reviennent. On réessaie en s'espaçant, et si ça persiste on le dit — la
 * fiche reste en l'état plutôt que de partir en « jeu retiré ».
 */
async function recuperer(url: string, options: RequestInit = {}): Promise<Reponse> {
  let dernierStatut: number | null = null;
  for (let essai = 0; essai < 3; essai += 1) {
    if (essai) await new Promise((r) => setTimeout(r, RECUL_MS * essai));
    try {
      const r = await fetch(url, { headers: { 'User-Agent': NAVIGATEUR }, ...options });
      if (r.status === 403 || r.status === 429 || r.status >= 500) {
        dernierStatut = r.status;
        continue;
      }
      if (!r.ok && !(r.status >= 300 && r.status < 400)) {
        return { ok: false, cause: `HTTP ${r.status}`, repoussé: false };
      }
      return { ok: true, statut: r.status, corps: await r.text(), urlFinale: r.url || url };
    } catch (e) {
      if (essai === 2) {
        const message = e instanceof Error ? e.message : 'erreur réseau';
        /*
         * Un hôte qui ne résout plus est une conclusion, pas un incident de
         * parcours. `fetch` ne le dit pas dans son message — il rend un
         * laconique « fetch failed » — mais le code d'erreur est dans `cause`,
         * et sans aller le chercher neuf jeux Swintt sortaient en panne réseau
         * alors que c'est leur hébergeur qui a disparu.
         */
        const code = (e as { cause?: { code?: string } })?.cause?.code ?? '';
        if (/ENOTFOUND|EAI_AGAIN/i.test(`${code} ${message}`)) {
          return { ok: false, cause: 'hôte introuvable (DNS)', repoussé: false };
        }
        /*
         * Un hôte qui coupe la connexion est le plus souvent un environnement
         * interne exposé par erreur — `ngpd.dev02-gs-stakelogic.com` chez
         * Stakelogic. Le dire vaut mieux que « fetch failed ».
         */
        if (/ECONNRESET|ECONNREFUSED|EPROTO|CERT/i.test(`${code} ${message}`)) {
          return { ok: false, cause: 'hôte injoignable depuis l’extérieur', repoussé: false };
        }
        return { ok: false, cause: message.slice(0, 50), repoussé: true };
      }
    }
  }
  return { ok: false, cause: `sondage impossible (HTTP ${dernierStatut})`, repoussé: true };
}

/** Exécute par lots de `PARALLELE`, avec une pause : ce sont des partenaires. */
async function parLots<T>(elements: T[], traiter: (e: T) => Promise<void>, total = elements.length) {
  for (let i = 0; i < elements.length; i += PARALLELE) {
    await Promise.all(elements.slice(i, i + PARALLELE).map(traiter));
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    if ((i / PARALLELE) % 10 === 0) process.stdout.write(`  ${i + PARALLELE}/${total}\r`);
  }
}

/**
 * Un catalogue lu une seule fois, quel que soit le nombre de fiches.
 *
 * Sans cette mémoïsation, chaque jeu relancerait la lecture de la liste du
 * studio — 226 fois la même page de 350 Ko.
 */
function uneSeuleFois<T>(lire: () => Promise<T>): () => Promise<T> {
  let promesse: Promise<T> | null = null;
  return () => (promesse ??= lire());
}

/* ── Endorphina ───────────────────────────────────────────────────────── */

/**
 * Les jeux que le sitemap d'Endorphina déclare.
 *
 * La page `/games` ne sert que douze tuiles et charge le reste en
 * JavaScript ; le sitemap, lui, porte le catalogue entier en une requête.
 */
const catalogueEndorphina = uneSeuleFois(async (): Promise<Set<string>> => {
  const r = await recuperer('https://endorphina.com/sitemap.xml');
  if (!r.ok) return new Set();
  return new Set(
    [...r.corps.matchAll(/https:\/\/endorphina\.com\/games\/([a-z0-9-]+)</g)].map((m) => m[1]),
  );
});

/**
 * La fiche produit Endorphina à interroger.
 *
 * L'URL déjà en base est reprise quand elle porte la forme vivante : elle
 * seule sait que notre `minotaurus` se lit `minotauros` chez le studio. Le
 * slug ne sert que là où il n'y a rien.
 */
const ficheEndorphina = (jeu: Jeu): string => {
  const vivante = jeu.demoUrl && /^https:\/\/endorphina\.com\/games\/[a-z0-9-]+$/.test(jeu.demoUrl);
  return vivante ? jeu.demoUrl! : `https://endorphina.com/games/${jeu.slug}`;
};

/**
 * Le nom que la fiche Endorphina annonce, confronté au nôtre.
 *
 * Trois écarts, tous de typographie, et tous rencontrés sur des slugs que le
 * sitemap du studio déclare mot pour mot : le studio suffixe « Slot » à
 * huit titres (« Geisha Slot »), écrit ses suites en chiffres romains là où
 * nous les écrivons en chiffres arabes (« The Emirate II » / « The Emirate
 * 2 »), et garde l'article que nous laissons parfois tomber. Quinze jeux
 * sortaient en écart de nom pour ça.
 *
 * Ce qui n'est PAS accepté, et reste un échec rapporté : un titre qui ajoute
 * un sous-titre (« Mongol Treasures II: Archery Competition »), un titre plus
 * long que le nôtre (« Rabbits, Rabbits, Rabbits! » pour « Rabbits »), ou un
 * jeu que le studio a rebaptisé (« Durga » s'appelle aujourd'hui « Goddess of
 * War »). Accepter un préfixe est exactement l'accident du « Victorious » pris
 * pour « Victorious MAX ».
 */
export function memeJeuEndorphina(annonce: string, nom: string): boolean {
  const romain = (t: string) =>
    t.replace(/\b(I{1,3}|IV|V)\b/g, (r) => String(['I', 'II', 'III', 'IV', 'V'].indexOf(r) + 1));
  const variantes = (t: string) => {
    const sansSlot = t.replace(/\s+slot$/i, '');
    return [t, sansSlot, sansSlot.replace(/^the\s+/i, '')].flatMap((v) => [v, romain(v)]);
  };
  return variantes(annonce).some((a) => variantes(nom).some((b) => memeNom(a, b)));
}

/**
 * Endorphina : tout se lit dans la fiche produit, et c'est voulu.
 *
 * Le robots.txt du studio interdit toute URL finissant par `/play`. On ne
 * sonde donc jamais l'enveloppe de démo : son existence est attestée par le
 * lien que la fiche produit — page autorisée — porte en clair, et le `<h1>` de
 * cette même page confirme qu'on est bien sur le bon jeu.
 */
async function demoEndorphina(jeu: Jeu): Promise<Resultat> {
  const catalogue = await catalogueEndorphina();
  const page = await recuperer(ficheEndorphina(jeu));
  if (!page.ok) {
    /* Un 404 sur un slug absent du catalogue est un verdict ; sinon c'est un incident. */
    if (page.cause === 'HTTP 404' && !catalogue.has(jeu.slug)) {
      return { cause: 'absent du catalogue du studio' };
    }
    return { cause: `fiche produit ${page.cause}` };
  }

  const annonce = texteBalise(page.corps, 'h1');
  if (!annonce) return { cause: 'fiche produit sans titre lisible' };
  if (!memeJeuEndorphina(annonce, jeu.nom)) return { cause: `la fiche annonce « ${annonce} »` };

  const lien = /href="\/games\/([a-z0-9-]+)\/play"/.exec(page.corps);
  if (!lien) return { cause: 'fiche produit sans bouton « Play Demo »' };
  return {
    demo: `https://endorphina.com/games/${lien[1]}/play`,
    identite: lien[1],
    nomConfronte: memeNom(annonce, jeu.nom),
    nomStudio: annonce,
  };
}

/* ── Habanero ─────────────────────────────────────────────────────────── */

type TuileHabanero = { keyname: string; nom: string };

/**
 * Le catalogue Habanero, lu sur la page `/games`.
 *
 * Le couple qui compte est `data-game-launch` (le `keyname` que le lanceur
 * attend) et `data-game-title` (le nom). Il n'existe nulle part ailleurs : le
 * HTML servi ne porte aucune URL de jeu, l'iframe est posée en JavaScript.
 */
const catalogueHabanero = uneSeuleFois(async (): Promise<TuileHabanero[]> => {
  const r = await recuperer('https://www.habanerosystems.com/games');
  if (!r.ok) return [];
  const vues = new Map<string, TuileHabanero>();
  for (const m of r.corps.matchAll(/data-game-launch="([^"]+)"\s+data-game-title="([^"]*)"/g)) {
    if (!vues.has(m[1])) vues.set(m[1], { keyname: m[1], nom: decoderEntites(m[2]) });
  }
  return [...vues.values()];
});

/**
 * Le `brandid` du lanceur, demandé au studio plutôt que recopié.
 *
 * `/Games/PrePlayApp?keyname=…` redirige vers l'URL que le site ouvre dans
 * son iframe : c'est Habanero qui écrit le `brandid`, pas nous. Le sondage se
 * fait sur un `keyname` réel du catalogue — la route redirige aussi les
 * `keyname` inventés, elle ne prouve donc rien par elle-même, mais le
 * paramètre qu'elle porte, lui, est le bon.
 */
const brandidHabanero = uneSeuleFois(async (): Promise<string | null> => {
  const tuiles = await catalogueHabanero();
  if (!tuiles.length) return null;
  const r = await recuperer(
    `https://www.habanerosystems.com/Games/PrePlayApp?keyname=${encodeURIComponent(tuiles[0].keyname)}`,
    { redirect: 'manual' },
  );
  if (!r.ok) return null;
  return /brandid=([0-9a-f-]{36})/i.exec(decoderEntites(r.corps))?.[1] ?? null;
});

export const urlLanceurHabanero = (brandid: string, keyname: string) =>
  `https://app-test.insvr.com/games/?brandid=${brandid}&keyname=${encodeURIComponent(keyname)}` +
  `&mode=fun&locale=en&nofunplaymessage=1&ifrm=1`;

/**
 * La tuile Habanero qui correspond à une de nos fiches.
 *
 * Nos slugs sont dérivés du `keyname` du studio, pas de son nom : `SGWealthInn`
 * a donné `wealth-inn`, `AcesandEights50Hand` a donné `acesand-eights50-hand`.
 * Le préfixe de famille (`SG` pour les slots, `TG` pour les jeux de table)
 * saute — sans lui, `blackjack-american` restait le seul jeu sans lanceur.
 * Le nom reste le second recours, et n'est retenu que s'il désigne une seule
 * tuile.
 */
export function apparierHabanero(
  tuiles: TuileHabanero[],
  jeu: Jeu,
): { tuile: TuileHabanero; parCle: boolean } | null {
  const cle = normaliserNom(jeu.slug);
  const parCle = tuiles.filter((t) => normaliserNom(t.keyname.replace(/^(?:SG|TG)/, '')) === cle);
  if (parCle.length === 1) return { tuile: parCle[0], parCle: true };
  const parNom = tuiles.filter((t) => memeNom(t.nom, jeu.nom));
  return parNom.length === 1 ? { tuile: parNom[0], parCle: false } : null;
}

/**
 * Habanero : le catalogue donne le `keyname`, le lanceur confirme le jeu.
 *
 * Un `keyname` inventé traverse `PrePlayApp` sans broncher et arrive sur
 * `app-test.insvr.com`, qui répond alors 302 sur un corps vide. La preuve est
 * donc dans le lanceur lui-même : un vrai jeu y sert 200, avec son nom en
 * `og:title` (« Habanero - Wealth Inn ») et un `base href` vers le build du
 * jeu.
 *
 * Ce nom est confronté à celui du **catalogue**, pas d'abord au nôtre, et
 * c'est un choix. Nos slugs Habanero sont fabriqués à partir du `keyname` du
 * studio, pas de son nom : `AcesandEights50Hand` a donné le slug
 * `acesand-eights50-hand` et le nom « Acesand Eights50 Hand », qui n'est le
 * nom de rien. Vingt-quatre fiches sont dans ce cas. Exiger l'égalité avec
 * notre nom les ferait sortir en « le lanceur annonce un autre jeu » alors
 * que l'appariement est structurellement certain — c'est notre nom qui est à
 * refaire, et le script le dit plutôt que de le taire.
 *
 * Le build, lui, n'est pas un critère : « Jellyfish Flow Ultra » tourne sur
 * le build de « Jellyfish Flow », et exiger le `keyname` dans le chemin
 * sortait trois jeux bien vivants.
 */
async function demoHabanero(jeu: Jeu): Promise<Resultat> {
  const tuiles = await catalogueHabanero();
  const brandid = await brandidHabanero();
  if (!brandid) return { cause: 'brandid du lanceur illisible' };

  const appariement = apparierHabanero(tuiles, jeu);
  if (!appariement) return { cause: 'absent du catalogue du studio' };
  const { tuile, parCle } = appariement;

  const url = urlLanceurHabanero(brandid, tuile.keyname);
  const lanceur = await recuperer(url, { redirect: 'manual' });
  if (!lanceur.ok) return { cause: `lanceur ${lanceur.cause}` };
  if (lanceur.statut >= 300) return { cause: `lanceur sans jeu (HTTP ${lanceur.statut})` };

  const titre = /<meta property="og:title" content="([^"]*)"/.exec(lanceur.corps)?.[1];
  if (!titre) return { cause: 'lanceur sans titre de jeu' };
  const annonce = decoderEntites(titre).replace(/^Habanero\s*-\s*/i, '');
  if (!/base href="[^"]*\/gamecontent\//.test(lanceur.corps)) {
    return { cause: 'lanceur sans build de jeu' };
  }
  if (!memeNom(annonce, tuile.nom)) {
    return { cause: `le catalogue dit « ${tuile.nom} », le lanceur « ${annonce} »` };
  }
  /* L'appariement par nom n'a pas la certitude structurelle de l'appariement par clé. */
  if (!parCle && !memeNom(annonce, jeu.nom)) {
    return { cause: `le lanceur annonce « ${annonce} »` };
  }

  return {
    demo: url,
    identite: tuile.keyname,
    nomConfronte: memeNom(annonce, jeu.nom),
    nomStudio: annonce,
  };
}

/* ── Stakelogic ───────────────────────────────────────────────────────── */

/**
 * Les jeux que Stakelogic déclare dans le sitemap de son robots.txt.
 *
 * Le `/sitemap.xml` de la racine est un reliquat produit par un générateur
 * tiers en 2025 : il ne porte que 186 jeux sur 206. S'y fier ferait conclure
 * que vingt jeux ont été retirés alors qu'ils sont tous en ligne — c'est
 * `stakelogic.com/en/sitemap.xml`, celui que le robots.txt déclare, qui fait
 * foi.
 */
const catalogueStakelogic = uneSeuleFois(async (): Promise<Set<string>> => {
  const r = await recuperer('https://stakelogic.com/en/sitemap.xml');
  if (!r.ok) return new Set();
  return new Set(
    [...r.corps.matchAll(/https:\/\/stakelogic\.com\/en\/slot\/([a-z0-9-]+)\//g)].map((m) => m[1]),
  );
});

/**
 * L'iframe de démo posée en clair dans la fiche produit Stakelogic.
 *
 * Deux hôtes de lancement coexistent selon les jeux (`ngpd.demo-gs-…` et
 * `ngpd.st01-gs-…`) : n'accepter que le premier laisserait tomber la majeure
 * partie du catalogue. Et deux **gabarits** coexistent aussi. L'ancien porte
 * un attribut `name` qui nomme le jeu embarqué (`Beer_Mania_Demo`) ; le
 * nouveau, celui des sorties récentes, n'a plus que `class="game-frame"` et
 * ne nomme rien. C'est la classe, présente sur les deux, qui sert de point
 * d'ancrage — 39 jeux sortaient en « fiche sans iframe » pour avoir cherché
 * le seul `name`.
 *
 * Deux `gameId` différents dans une même page voudraient dire qu'on ne sait
 * pas lequel est le jeu : on ne tranche pas.
 */
export function lireIframeStakelogic(html: string): { nom: string | null; demo: string } | null {
  const trouvees = new Map<string, string | null>();
  for (const m of html.matchAll(/<iframe[^>]*class="game-frame"[^>]*>|<iframe[^>]*\ssrc="https:\/\/[a-z0-9.-]+-gs-stakelogic\.com\/demo\/play\?gameId=\d+"[^>]*>/gi)) {
    const demo = /\ssrc="(https:\/\/[a-z0-9.-]+-gs-stakelogic\.com\/demo\/play\?gameId=\d+)"/i.exec(m[0])?.[1];
    if (!demo) continue;
    const brut = /\sname="([^"]*)"/i.exec(m[0])?.[1];
    /*
     * WordPress a remplacé les esperluettes des titres par le mot `amp` :
     * « Candy_Wild_Bonanza_Hold__amp__Spin_Demo ». Sans le retirer, trois
     * jeux parfaitement identifiés sortaient en écart de nom.
     */
    const nom = brut
      ? brut.replace(/_+Demo$/i, '').replace(/_+/g, ' ').replace(/\bamp\b/g, ' ').replace(/\s+/g, ' ').trim()
      : null;
    if (!trouvees.has(demo) || (nom && !trouvees.get(demo))) trouvees.set(demo, nom || null);
  }
  if (trouvees.size !== 1) return null;
  const [demo, nom] = [...trouvees][0];
  return { demo, nom };
}

/**
 * Stakelogic : la fiche produit désigne le jeu, le lanceur confirme qu'il tourne.
 *
 * `/demo/play?gameId=999999` répond **200** comme n'importe quel jeu réel :
 * le code HTTP ne tranche rien. Ce qui tranche, c'est le contenu — un jeu
 * vivant pose un `<gcw-game gcw-server-url="…">`, un identifiant inconnu pose
 * `ResponseStatus(code=INCORRECT_REQUEST)`.
 */
async function demoStakelogic(jeu: Jeu): Promise<Resultat> {
  const catalogue = await catalogueStakelogic();
  if (!catalogue.has(jeu.slug)) return { cause: 'absent du catalogue du studio' };

  const page = await recuperer(`https://stakelogic.com/en/slot/${jeu.slug}/`);
  if (!page.ok) return { cause: `fiche produit ${page.cause}` };

  const iframe = lireIframeStakelogic(page.corps);
  if (!iframe) return { cause: 'fiche produit sans iframe de démo unique' };
  /*
   * Quand l'iframe nomme son jeu, l'égalité est exigée — et elle sert : neuf
   * fiches embarquent le lanceur d'un autre jeu, `wild-wild-bass-3` ouvrant
   * « The Secret of Machu Picchu ». Quand le nouveau gabarit ne nomme rien,
   * on ne peut pas confronter : la fiche est retenue sur la foi de sa propre
   * page, et le rapport dit combien de jeux sont dans ce cas.
   */
  if (iframe.nom && !memeNom(iframe.nom, jeu.nom)) {
    return { cause: `l'iframe annonce « ${iframe.nom} »` };
  }

  const lanceur = await recuperer(iframe.demo);
  if (!lanceur.ok) return { cause: `lanceur ${lanceur.cause}` };
  if (/INCORRECT_REQUEST/.test(lanceur.corps)) return { cause: 'lanceur : identifiant inconnu' };
  if (!/gcw-server-url="https?:\/\//.test(lanceur.corps)) {
    return { cause: 'lanceur sans partie ouverte' };
  }
  return {
    demo: iframe.demo,
    identite: /gameId=(\d+)/.exec(iframe.demo)![1],
    nomConfronte: iframe.nom !== null,
  };
}

/* ── Swintt ───────────────────────────────────────────────────────────── */

type TuileSwintt = { slug: string; nom: string; lanceur: string | null };

/**
 * Le catalogue que Swintt publie lui-même, douze tuiles par page.
 *
 * `loadGameItems` répond à un GET nu et annonce `allowRetry: false` sur la
 * dernière page. Dix-sept requêtes pour 193 jeux, là où un sitemap en
 * coûterait une — mais le studio n'en publie pas, et surtout chaque tuile
 * porte **déjà** l'URL de démo construite par Swintt : on ne fabrique rien.
 * Le plafond de quarante tours est là pour qu'un changement de contrat côté
 * studio coûte un inventaire tronqué, jamais une boucle sans fin.
 */
const catalogueSwintt = uneSeuleFois(async (): Promise<TuileSwintt[]> => {
  const tuiles = new Map<string, TuileSwintt>();
  for (let page = 1; page <= 40; page += 1) {
    const r = await recuperer(`https://swintt.com/games/loadGameItems?page=${page}`);
    if (!r.ok) break;
    let charge: { gameItems?: string; allowRetry?: boolean };
    try {
      charge = JSON.parse(r.corps) as { gameItems?: string; allowRetry?: boolean };
    } catch {
      break;
    }
    const html = charge.gameItems ?? '';
    /*
     * On découpe sur l'ouverture de chaque tuile : les cartes imbriquent
     * leurs propres `<div>`, et une paire non gloutonne s'arrêterait au
     * premier `</div>` intérieur, avant le lanceur.
     */
    for (const carte of html.split('<div class="game-tile').slice(1)) {
      const slug = /swintt\.com\/games\/([a-z0-9-]+)/.exec(carte)?.[1];
      if (!slug || tuiles.has(slug)) continue;
      const lanceur = /data-media-content='<iframe class="playGameNowiFrame" src="([^"]+)"/.exec(carte)?.[1];
      const nom = /class="gameItem_thumbnailImage" src="[^"]*" alt="([^"]*)"/.exec(carte)?.[1];
      tuiles.set(slug, {
        slug,
        nom: decoderEntites(nom ?? ''),
        lanceur: lanceur ? decoderEntites(lanceur).trim() : null,
      });
    }
    if (!charge.allowRetry) break;
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  return [...tuiles.values()];
});

/**
 * Le jeu que le lanceur Swintt a réellement ouvert.
 *
 * Swintt sert ses jeux de quatre façons, et chacune dit l'identité ailleurs :
 * un sous-domaine `staging-<jeu>.swintt-stg.net`, un build nommé sur le CDN
 * (`/game/fresh_fruit_deluxe_diamonds/`), un studio partenaire qui héberge
 * pour lui (`cloud.fireballserver.com/games/…/jacks-goldmine/`), ou un
 * **client générique** dont le `<title>` est « Casino » et où seul
 * `gamesetId` distingue une partie d'une autre. Les 68 jeux de cette dernière
 * forme sortaient en « le lanceur annonce Casino » : le client ne ment pas,
 * il ne nomme simplement rien.
 *
 * Ne rien reconnaître du tout est en revanche un échec : c'est le cas d'une
 * page qui se charge sans lancer de jeu.
 */
export function jeuLance(urlFinale: string, titre: string): { identite: string; nom: string | null } | null {
  const cible = decodeURIComponent(urlFinale);
  const fireball = /cloud\.fireballserver\.com\/games\/[^/]+\/([a-z0-9-]+)\//i.exec(cible)?.[1];
  if (fireball) return { identite: `fireball:${fireball}`, nom: titre || fireball.replace(/-/g, ' ') };
  const build = /\/game\/([a-z0-9_-]+)\//i.exec(cible)?.[1];
  if (build) return { identite: `build:${build}`, nom: build.replace(/_/g, ' ') };
  const sousDomaine = /https:\/\/staging-([a-z0-9-]+)\.swintt-stg\.net/i.exec(cible)?.[1];
  if (sousDomaine) return { identite: `staging:${sousDomaine}`, nom: titre || sousDomaine };
  const gameset = /[?&]gamesetId=(\d+)/.exec(cible)?.[1];
  if (gameset) return { identite: `gameset:${gameset}`, nom: null };
  return null;
}

/**
 * Swintt : le catalogue lie le slug au lanceur, l'ouverture prouve que c'est un jeu.
 *
 * Le lien slug → lanceur n'est pas déduit par nous : c'est la tuile du studio
 * qui le porte, et on exige que son nom soit celui de la base avant de la
 * suivre. Restent les pièges de l'ouverture — un `gameId` inconnu rend 200
 * avec `<title>Launch Error</title>`, trois tuiles SwinttLive servent une
 * **plaquette PDF** derrière leur bouton « PLAY NOW », et neuf pointent
 * `egs2-games.nlgc02.com`, un hôte qui ne résout plus.
 *
 * Le contrôle de nom sur la page lancée cherche la **contradiction**, pas
 * l'égalité : le build de « Jade Blade XtraSplit » s'intitule « Jade Blade »
 * et celui de « Lucky Lads Hold & Win » s'intitule « Lucky Lads » — un titre
 * de build raccourci n'est pas un autre jeu. Ce qui serait un autre jeu, et ce
 * qu'on refuse, c'est un titre qui désigne **une autre tuile du catalogue** :
 * c'est le piège du `game-1` de Nolimit City, qui menait à « Fire In The
 * Hole 4 ».
 */
async function demoSwintt(jeu: Jeu): Promise<Resultat> {
  const tuiles = await catalogueSwintt();
  const tuile = tuiles.find((t) => t.slug === jeu.slug);
  if (!tuile) return { cause: 'absent du catalogue du studio' };
  if (!tuile.lanceur) return { cause: 'tuile sans bouton « PLAY NOW »' };
  if (!tuile.nom) return { cause: 'tuile sans nom de jeu' };
  if (!memeNom(tuile.nom, jeu.nom)) return { cause: `le catalogue annonce « ${tuile.nom} »` };
  /* Une plaquette commerciale se charge sans erreur : ce n'est pas un jeu. */
  if (/\.pdf($|\?)/i.test(tuile.lanceur)) return { cause: 'le bouton sert une plaquette PDF' };

  const lanceur = await recuperer(tuile.lanceur);
  if (!lanceur.ok) return { cause: `lanceur ${lanceur.cause}` };

  const titre = texteBalise(lanceur.corps, 'title') ?? '';
  if (/launch error/i.test(titre)) return { cause: 'lanceur : identifiant inconnu' };

  const lance = jeuLance(lanceur.urlFinale, titre);
  if (!lance) return { cause: 'le lanceur n’ouvre aucun jeu identifiable' };

  if (lance.nom && !memeNom(lance.nom, jeu.nom)) {
    const autre = tuiles.find((t) => t.slug !== tuile.slug && memeNom(t.nom, lance.nom!));
    if (autre) return { cause: `le lanceur ouvre « ${autre.nom} »` };
  }
  return { demo: tuile.lanceur, identite: lance.identite, nomConfronte: true };
}

/* ── Réglages par studio ──────────────────────────────────────────────── */

const STUDIOS = {
  endorphina: {
    /* Les `demoUrl` déjà en base sont des fiches produit : on les reprend avec les vides. */
    fichesProduit: 'endorphina.com/games/',
    extraire: demoEndorphina,
    /* Ce que porte une démo réellement jouable — sert à recompter après écriture. */
    marqueurJouable: '/play',
    catalogue: async () => (await catalogueEndorphina()).size,
  },
  habanero: {
    fichesProduit: 'habanerosystems.com/games/',
    extraire: demoHabanero,
    marqueurJouable: 'app-test.insvr.com/games/',
    catalogue: async () => (await catalogueHabanero()).length,
  },
  stakelogic: {
    fichesProduit: 'stakelogic.com/en/slot/',
    extraire: demoStakelogic,
    marqueurJouable: '-gs-stakelogic.com/demo/play',
    catalogue: async () => (await catalogueStakelogic()).size,
  },
  swintt: {
    fichesProduit: 'swintt.com/games/',
    extraire: demoSwintt,
    marqueurJouable: 'swintt-stg.net',
    catalogue: async () => (await catalogueSwintt()).length,
  },
} as const;

type NomStudio = keyof typeof STUDIOS;

/**
 * Le plancher en dessous duquel un catalogue ne veut plus rien dire.
 *
 * Les quatre listes portent entre 193 et 234 entrées. En recevoir vingt, ce
 * n'est pas un studio qui a retiré ses jeux, c'est nous qui nous faisons
 * repousser — et c'est exactement l'accident qui a fait déclarer « 58 jeux
 * retirés » chez Hacksaw. On s'arrête et on revient plus tard.
 */
const CATALOGUE_MINIMUM = 150;

async function main() {
  const iS = process.argv.indexOf('--studio');
  const studio = (iS >= 0 ? process.argv[iS + 1] : undefined) as NomStudio | undefined;
  if (!studio || !(studio in STUDIOS)) {
    console.error(
      'Studio manquant ou inconnu. Attendu : --studio endorphina|habanero|stakelogic|swintt',
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

  /*
   * Chez Endorphina la démo vit sous la fiche produit (`/games/x/play` est un
   * `/games/…`) : le filtre SQL ne peut pas les distinguer. Les fiches déjà
   * converties sont donc écartées ici, ce qui rend un second passage du
   * script inoffensif pour les quatre studios.
   */
  const jeux: Jeu[] = (
    await prisma.jeu.findMany({
      where: {
        studio: { slug: studio },
        OR: [{ demoUrl: { contains: reglage.fichesProduit } }, { demoUrl: null }],
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
      (sansDemo ? ` — dont ${sansDemo} sans demoUrl, fiche déduite du slug.` : '.'),
  );

  /*
   * Le catalogue avant les fiches, toujours. Un script qui sonde d'abord se
   * fait repousser, reçoit une liste vide et transforme son propre blocage en
   * verdict sur le catalogue du studio.
   */
  const taille = await reglage.catalogue();
  console.log(`Catalogue du studio : ${taille} entrées.\n`);
  if (taille < CATALOGUE_MINIMUM) {
    console.log(
      `Catalogue trop maigre (< ${CATALOGUE_MINIMUM}) pour conclure quoi que ce soit — le studio nous repousse. On s’arrête.`,
    );
    await prisma.$disconnect();
    return;
  }

  const trouves: Array<{ id: string; slug: string } & Trouvaille> = [];
  const echecs: Array<{ slug: string; cause: string }> = [];

  await parLots(jeux, async (jeu) => {
    const r = await reglage.extraire(jeu);
    if ('demo' in r) trouves.push({ id: jeu.id, slug: jeu.slug, ...r });
    else echecs.push({ slug: jeu.slug, cause: r.cause });
  });

  /*
   * Deux fiches qui reçoivent le même lanceur sont un doublon de catalogue,
   * pas deux jeux : elles publieraient les mêmes captures sous deux URLs
   * indexables. Le premier slug garde la démo, l'autre part en échec nommé —
   * c'est une fusion de fiches à faire à la main, pas une donnée à écrire.
   */
  const retenus: typeof trouves = [];
  const premierPourJeu = new Map<string, string>();
  for (const t of [...trouves].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const deja = premierPourJeu.get(t.identite);
    if (deja) {
      echecs.push({ slug: t.slug, cause: `doublon de catalogue (même jeu que ${deja})` });
    } else {
      premierPourJeu.set(t.identite, t.slug);
      retenus.push(t);
    }
  }

  const taux = jeux.length ? Math.round((retenus.length / jeux.length) * 100) : 0;
  const muets = retenus.filter((t) => !t.nomConfronte && !t.nomStudio).length;
  console.log(`\n${retenus.length} démos trouvées (${taux} %), ${echecs.length} échecs.`);
  if (muets) {
    console.log(
      `Dont ${muets} dont le nom n’a PAS pu être confronté : le studio ne publie nulle part` +
        ` le nom du jeu que ce lanceur ouvre.`,
    );
  }
  console.log('');

  /*
   * Ces écarts ne sont pas des échecs : le jeu est identifié, c'est son nom
   * chez nous qui est à refaire. Les taire reviendrait à publier des fiches
   * intitulées « Acesand Eights50 Hand ».
   */
  const aRenommer = retenus.filter((t) => t.nomStudio && !t.nomConfronte);
  if (aRenommer.length) {
    console.log(`Noms à corriger en base (${aRenommer.length}) — le studio écrit :`);
    for (const t of aRenommer) console.log(`  ${t.slug.padEnd(34)} « ${t.nomStudio} »`);
    console.log('');
  }
  for (const t of retenus.slice(0, 5)) console.log(`  ${t.slug.padEnd(34)} ${t.demo.slice(0, 96)}`);

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
 * une des fonctions de lecture déclencherait en arrière-plan une campagne
 * complète de requêtes chez quatre partenaires.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
