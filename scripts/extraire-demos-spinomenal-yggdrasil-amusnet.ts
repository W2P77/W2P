/**
 * Donne une démo jouable aux jeux Spinomenal, Yggdrasil et Amusnet.
 *
 * ── 1 462 fiches, trois studios, zéro page publiée ────────────────────────
 *
 * Spinomenal : 648 jeux en base, **aucune** `demoUrl`. Yggdrasil : 574 jeux,
 * 34 URLs qui mènent toutes à la fiche produit — une page de présentation,
 * pas un jeu. Amusnet : 280 jeux, 6 URLs du même défaut. Le pipeline de
 * captures part de la démo ; sans capture, la fiche n'est pas publiable. Ces
 * trois catalogues ne sont donc pas « incomplets » sur le site : ils y sont
 * **invisibles**, pour une URL. À eux trois ils pèsent une fois et demie le
 * catalogue visible d'aujourd'hui (967 fiches).
 *
 * ── Chacun publie sa démo à un endroit différent ──────────────────────────
 *
 * **Amusnet** tient son catalogue dans un Drupal ouvert :
 * `backend.careers-amusnet.com/jsonapi/node/game` rend 491 nœuds, chacun avec
 * son `field_game_gin` — le « game identification number » — et son chemin.
 * Dix requêtes paginées pour 280 jeux, et un appariement au slug qui couvre
 * 275 fiches sur 280.
 *
 * Le bouton « Play Demo » de la fiche produit n'est pas un lien : il appelle
 * `POST amusnet.com/api/lobby`, reçoit un `gameLaunchToken` (un UUID frappé à
 * chaque appel), et pose une iframe sur
 * `free.games.amusnet.io/gl/amusnet?gameLaunchToken=…&gameId=<gin>&…`. Deux
 * raisons de **ne pas** écrire cette adresse en base : le jeton est émis à la
 * demande, et surtout le lanceur exige un `Referer` du domaine amusnet.com —
 * sans lui il répond **302 vers la page d'accueil marketing**. C'est le piège
 * Wazdan à l'identique : la page charge, rien n'échoue, et on photographie le
 * site du studio en croyant filmer un jeu. On écrit donc la **fiche produit**,
 * comme le font déjà les six lignes en base, et l'adaptateur de capture
 * cliquera le bouton depuis la page — c'est le chemin que le studio lui-même
 * emprunte. Le `gin` est affiché dans le journal : c'est lui dont l'auteur de
 * l'adaptateur aura besoin.
 *
 * **Yggdrasil** est un WordPress dont le type `games` est exposé :
 * `wp-json/wp/v2/games` rend les 571 jeux en six requêtes. La démo, elle, est
 * dans la fiche produit : l'attribut `data-iframe-src` de la modale porte
 * l'adresse complète, **sans jeton**, sous trois formes que le studio emploie
 * indifféremment — `staticdemo…/init/launchClient.html?gameid=`,
 * `staticdemo…/<gameid>/index.html?…` (déjà résolue) et l'ancien hôte
 * `staticpff…`. On recopie ce qu'on lit, on ne choisit pas la forme.
 *
 * **Spinomenal** ne publie ni API ni jeton : deux pages de liste
 * (`/games/` et `/retro-gaming/`) donnent 646 tuiles nom + slug, et le
 * `wp-sitemap-posts-portfolio-1.xml` les confirme. La démo demande deux sauts :
 * la fiche `/portfolio/<slug>/` porte un bouton « PLAY NOW » dont le `href`
 * mène à une page enveloppe, laquelle pose l'iframe du jeu. **Ce `href` ne se
 * déduit pas du slug** : `/portfolio/book_of_elves/` renvoie vers
 * `/bookof-elves/`. Le fabriquer donnerait un 404 aujourd'hui et, un jour, la
 * démo d'un autre jeu.
 *
 * C'est l'enveloppe qu'on garde en base, pas l'URL de l'iframe : celle-ci se
 * fait compléter en JavaScript d'un `gameToken=FUN_<uuid>` forgé dans le
 * navigateur. On la lit quand même, pour son `gameCode`
 * (`Tower_1ReelAztecSpell`, `SlotMachine_BookOfElves`) — c'est la preuve que
 * l'enveloppe lance un jeu, et c'est la clé qui démasque deux fiches sur un
 * même lanceur.
 *
 * ── Les cinq garde-fous, et ce qu'ils ont attrapé ici ─────────────────────
 *
 * 1. **Un 200 ne prouve rien.** `amusnet.com/games/online-casino/20-golden-dice`
 *    répond **200** et sert une page intitulée « Game Not Found ». Le code HTTP
 *    est donc ignoré comme preuve : ce qui fait foi, c'est le `gin` et le
 *    bouton de démo lus dans la page. Même chose chez Spinomenal, où un slug
 *    inventé rend un 404 propre mais où seule la présence d'un `gameCode` dans
 *    l'iframe atteste un jeu.
 *
 * 2. **Le nom lu est confronté à celui de la base**, deux fois : celui du
 *    catalogue du studio, puis celui de la page. L'égalité est exigée, jamais
 *    le préfixe — accepter « Victorious » pour « Victorious MAX » est
 *    exactement l'accident qu'on cherche à éviter.
 *
 * 3. **Deux fiches ne reçoivent jamais le même lanceur.** La clé est le `gin`
 *    chez Amusnet, le `gameid` chez Yggdrasil, le `gameCode` chez Spinomenal.
 *    Le premier slug par ordre alphabétique garde la démo, l'autre part en
 *    échec nommé : c'est une fusion de fiches à faire à la main, pas une démo
 *    à écrire.
 *
 * 4. **Le catalogue se lit AVANT les fiches.** Un script a déjà sondé 145
 *    fiches d'abord, s'est fait repousser, a reçu un catalogue vide et
 *    **déclaré 58 jeux retirés** alors qu'ils étaient tous en ligne. Ici le
 *    catalogue passe en premier, un code inattendu (403, 429, 5xx) donne
 *    « sondage impossible » et jamais un verdict, et un catalogue
 *    anormalement court **arrête le script**.
 *
 * 5. **Se méfier de ce qui réussit sans rien faire.** Le lanceur Amusnet
 *    répond 302 vers la page d'accueil dès qu'il manque le `Referer`, et il
 *    renvoie un lanceur d'apparence normale pour `gameId=999999` — il recopie
 *    le numéro qu'on lui donne. Aucune de ses réponses n'est donc une preuve.
 *    L'User-Agent déclaré est celui d'un Chrome réel, pour la même raison.
 *
 * ── La cadence n'est pas une précaution de style ──────────────────────────
 *
 * Ce sont des partenaires commerciaux, et leurs démos sont la matière première
 * de tout le chantier de captures : se faire bloquer coûterait plus que les
 * quelques minutes qu'on économiserait. Quatre en parallèle, avec une pause —
 * **sauf Yggdrasil, qui se traite en séquentiel**.
 *
 * ── Yggdrasil se fait en plusieurs fois, et ce n'est pas négociable ───────
 *
 * Le site tourne derrière Wordfence, et celui-ci **cesse de répondre au-delà
 * d'environ 120 pages par exécution** — mesuré quatre fois de suite, toujours
 * au même palier, quelle que soit la couche réseau (undici, `node:https`,
 * socket neuve, session TLS neuve, séquentiel). Il ne refuse pas : il laisse
 * la requête en suspens. Un lot de 100 passe sans un seul incident ; 574 d'une
 * traite, jamais.
 *
 * Donc : `--limite 100`, plusieurs passages espacés. En mode `--appliquer`,
 * les fiches déjà pourvues sont écartées au passage suivant — la reprise est
 * naturelle, il suffit de relancer. En simulation elle ne l'est pas, puisque
 * rien n'est écrit : un lot y vaut pour un sondage, pas pour une campagne.
 * Ne pas chercher à « passer outre » en accélérant : c'est le partenaire qui
 * décide, et perdre son accès coûterait tout le chantier de captures.
 *
 * Usage : npx tsx --env-file=.env.local scripts/extraire-demos-spinomenal-yggdrasil-amusnet.ts \
 *           --studio amusnet|yggdrasil|spinomenal [--appliquer] [--limite N]
 */
import { request as requeteHttps, Agent } from 'node:https';
import { basename } from 'node:path';

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const PARALLELE = 4;
/**
 * Les studios qui ne supportent pas quatre requêtes de front.
 *
 * Yggdrasil tourne sur un hébergement mutualisé qui n'aime pas quatre requêtes
 * de front : il les accepte et répond au ralenti. La vraie panne était
 * ailleurs (voir `SOCKET_NEUVE`), mais le séquentiel reste le bon réglage ici
 * — 2,1 s par fiche, sans une seule erreur sur 200 requêtes. La cadence est
 * donc un réglage par studio, pas une constante.
 */
const CADENCE_PAR_STUDIO: Record<string, number> = { yggdrasil: 1 };
const PAUSE_MS = 250;
/** L'espacement des reprises quand le studio commence à refuser. */
const RECUL_MS = 4000;
/**
 * Le délai au-delà duquel on considère que le studio ne répondra pas.
 *
 * Ce n'est pas une précaution théorique : le serveur d'Yggdrasil **accepte la
 * connexion puis ne répond jamais** (voir `SOCKET_NEUVE`). Sans délai
 * explicite, la campagne s'arrête pour de bon sur une socket muette. Le délai
 * ne remplace pas la vraie réparation, il garantit seulement qu'une panne se
 * voie.
 */
const DELAI_MS = 30000;

type Jeu = { id: string; slug: string; nom: string; demoUrl: string | null };
/** Une démo trouvée (URL + la clé qui identifie le jeu), ou la raison nommée de ne pas en avoir. */
type Resultat = { demo: string; cle: string } | { cause: string };
/** Une entrée du catalogue du studio : ce qu'il déclare publier, sous son propre slug. */
type Entree = { slug: string; nom: string; gin?: number; lien?: string };

/* ── Outillage commun ─────────────────────────────────────────────────────── */

/**
 * Les entités HTML que les catalogues laissent passer.
 *
 * Hacksaw écrivait ses apostrophes en hexadécimal et quatre jeux en sont
 * sortis « retirés par le studio » alors que leur tuile était sous les yeux du
 * script. Spinomenal fait pire : il écrit ses tirets longs en décimal
 * (`1 Reel &#8211; Aztec Spell`) sur **toutes** ses fiches.
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
 * Les studios écrivent « Turbo Gold Deluxe GigaBlox™ », « 1 Reel – Aztec
 * Spell », « Amazons' Battle » ; la base écrit le nom nu. Trois écarts sont de
 * la typographie pure et ont chacun coûté des fiches ici :
 *
 * — Le **signe multiplié** d'Unicode. Spinomenal écrit sa gamme « Hold&Hit
 *   3×3 » avec un `×` U+00D7 ; la base écrit `3x3`. Sans cette équivalence, le
 *   `×` tombait dans les caractères supprimés, `3×3` devenait `33`, et **trente
 *   jeux parfaitement identifiés** — tout le format 3×3 du studio — sortaient
 *   en écart de nom.
 * — Les **diacritiques** : « Guardians Of Éire » chez le studio, « Guardians of
 *   Eire » en base.
 * — L'**esperluette**, qui demande deux lectures : certains catalogues écrivent
 *   « & » là où la base écrit « and », d'autres la suppriment.
 *
 * Ce qui n'est **pas** de la typographie et reste donc un échec : un chiffre
 * romain contre un chiffre arabe (« Demi Gods IV » contre `demi-gods-4`), une
 * abréviation (« Egypt Quest (EQ) » contre « EQ »), un possessif en moins.
 * Ces noms-là désignent peut-être le même jeu, mais c'est un arbitrage à faire
 * à la main sur le champ `nom` de la base, pas une équivalence à coder.
 */
const normaliserNom = (nom: string, esperluette: 'and' | '' = 'and') =>
  decoderEntites(nom)
    .toLowerCase()
    .replace(/×/g, 'x')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, esperluette)
    .replace(/[^a-z0-9]/g, '');

const memeNom = (a: string, b: string) =>
  normaliserNom(a) === normaliserNom(b) || normaliserNom(a, '') === normaliserNom(b, '');

/**
 * Une requête qui distingue « le studio a répondu » de « le studio nous a
 * repoussés ».
 *
 * Un 403, un 429 ou un 5xx ne sont pas une réponse du studio, ce sont nos
 * requêtes qui reviennent : on réessaie en s'espaçant, et si ça persiste on
 * rapporte un sondage impossible plutôt qu'un verdict. C'est la garde qui
 * manquait le jour où 58 jeux en ligne ont été déclarés retirés.
 */
/**
 * Socket neuve **et session TLS neuve** à chaque requête. Ce n'est pas un excès
 * de prudence : c'est la réparation d'une panne qui a coûté quatre campagnes.
 *
 * ── Ce qu'on voyait ──
 *
 * Le script s'arrêtait chez Yggdrasil toujours au même endroit — 4, 121, 121,
 * 364 fiches sur 574 — avec une socket ouverte, établie, et parfaitement
 * muette. Aucune erreur, aucune progression, rien dans le journal. Au même
 * instant, `curl` et un **processus Node neuf** obtenaient la même page en
 * 2,3 s, sur la même IP. Une panne qui ressemble à une lenteur est la pire des
 * deux : on attend, on relance, on accuse le partenaire de nous bannir.
 *
 * ── Ce que ce n'était pas ──
 *
 * Ni un bannissement d'IP (un autre processus passait dans la seconde), ni du
 * DNS (une seule adresse A), ni le pool de connexions d'undici (`keepAlive:
 * false` ne changeait rien, et `Connection: close` encore moins : undici gère
 * son pool lui-même et ignore l'en-tête).
 *
 * ── Ce que c'était ──
 *
 * La **reprise de session TLS**. Node met en cache les tickets de session par
 * agent ; le serveur d'Yggdrasil cesse d'honorer un ticket au bout d'une
 * centaine de requêtes et laisse la poignée de main en suspens au lieu de la
 * refuser. Un processus neuf repartait de zéro, d'où l'illusion. Mesure
 * décisive : avec `maxCachedSessions: 0`, **200 requêtes d'affilée, zéro
 * échec, 2,1 s de moyenne**.
 */
const SOCKET_NEUVE = new Agent({ keepAlive: false, maxCachedSessions: 0, maxSockets: PARALLELE });

/** Une réponse du studio, suivie jusqu'au bout de ses redirections. */
function requete(
  url: string,
  entetes: Record<string, string>,
  sautsRestants = 5,
): Promise<{ code: number; corps: string; url: string }> {
  return new Promise((resoudre, rejeter) => {
    const appel = requeteHttps(
      url,
      {
        agent: SOCKET_NEUVE,
        /* `identity` : on lit du HTML, la décompression n'apporte rien ici. */
        headers: { 'User-Agent': NAVIGATEUR, 'Accept-Encoding': 'identity', ...entetes },
        timeout: DELAI_MS,
      },
      (reponse) => {
        const code = reponse.statusCode ?? 0;
        const suite = reponse.headers.location;
        if (code >= 300 && code < 400 && suite && sautsRestants > 0) {
          reponse.resume();
          return resoudre(requete(new URL(suite, url).toString(), entetes, sautsRestants - 1));
        }
        let corps = '';
        reponse.setEncoding('utf8');
        reponse.on('data', (morceau: string) => {
          corps += morceau;
        });
        reponse.on('end', () => resoudre({ code, corps, url }));
      },
    );
    /*
     * Deux délais, pas un : `timeout` couvre l'inactivité de la socket, et le
     * garde-fou explicite couvre la réponse qui arrive au compte-gouttes sans
     * jamais finir. C'est la seconde qui a figé les campagnes.
     */
    const butoir = setTimeout(() => appel.destroy(new Error("aucune réponse en " + DELAI_MS / 1000 + " s")), DELAI_MS);
    appel.on('timeout', () => appel.destroy(new Error("aucune réponse en " + DELAI_MS / 1000 + " s")));
    appel.on('error', (e) => {
      clearTimeout(butoir);
      rejeter(e);
    });
    appel.on('close', () => clearTimeout(butoir));
    appel.end();
  });
}

/**
 * Une requête qui distingue « le studio a répondu » de « le studio nous a
 * repoussés ».
 *
 * Un 403, un 429, un 5xx ou une absence de réponse ne sont pas une réponse du
 * studio, ce sont nos requêtes qui reviennent : on réessaie en s'espaçant, et
 * si ça persiste on rapporte un sondage impossible plutôt qu'un verdict. C'est
 * la garde qui manquait le jour où 58 jeux en ligne ont été déclarés retirés.
 */
async function recuperer(
  url: string,
  entetes: Record<string, string> = {},
): Promise<{ ok: true; html: string; url: string } | { ok: false; cause: string }> {
  let dernier = '';
  for (let essai = 0; essai < 3; essai++) {
    if (essai) await new Promise((r) => setTimeout(r, RECUL_MS * essai));
    try {
      const r = await requete(url, entetes);
      if (r.code === 403 || r.code === 429 || r.code >= 500) {
        dernier = `HTTP ${r.code}`;
        continue;
      }
      if (r.code < 200 || r.code >= 300) return { ok: false, cause: `HTTP ${r.code}` };
      return { ok: true, html: r.corps, url: r.url };
    } catch (e) {
      dernier = e instanceof Error ? e.message.slice(0, 48) : 'erreur réseau';
    }
  }
  return { ok: false, cause: `sondage impossible (${dernier})` };
}

/** Exécute par lots, avec une pause entre chaque : ce sont des partenaires. */
async function parLots<T>(
  elements: T[],
  traiter: (e: T) => Promise<void>,
  parallele = PARALLELE,
  total = elements.length,
) {
  for (let i = 0; i < elements.length; i += parallele) {
    await Promise.all(elements.slice(i, i + parallele).map(traiter));
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    const pas = Math.max(1, Math.round(40 / parallele));
    if ((i / parallele) % pas === 0) process.stdout.write(`  ${i + parallele}/${total}\r`);
  }
}

/**
 * L'entrée du catalogue qui correspond à une fiche de la base.
 *
 * Le slug d'abord, le nom ensuite — et seulement s'il ne désigne qu'une carte.
 * Onze slugs divergeaient chez Push Gaming, quatre-vingts divergent chez
 * Spinomenal, où le studio panache tirets et tirets bas (`book_of_elves`).
 * Fabriquer nous-mêmes le slug du studio donnerait un 404, et pire, un jour,
 * la démo d'un autre jeu.
 */
function apparier(
  jeu: Jeu,
  parSlug: Map<string, Entree>,
  parNom: Map<string, Entree[]>,
): Entree | { cause: string } {
  const surSlug = parSlug.get(jeu.slug);
  if (surSlug) {
    if (!memeNom(surSlug.nom, jeu.nom)) return { cause: `le catalogue annonce « ${surSlug.nom} »` };
    return surSlug;
  }
  const surNom = parNom.get(normaliserNom(jeu.nom)) ?? [];
  if (surNom.length === 1) return surNom[0];
  return {
    cause: surNom.length > 1 ? 'nom porté par plusieurs entrées du catalogue' : 'absent du catalogue du studio',
  };
}

/* ── Amusnet ──────────────────────────────────────────────────────────────── */

const AMUSNET_JSONAPI = 'https://backend.careers-amusnet.com/jsonapi/node/game';
/** Les seuls champs utiles : le reste du nœud pèse 80 dates de sortie par pays. */
const AMUSNET_CHAMPS = 'title,field_game_gin,field_json_api_path,status';

type NoeudAmusnet = {
  attributes?: {
    title?: string;
    status?: boolean;
    field_game_gin?: number | null;
    field_json_api_path?: string | null;
  };
};

/**
 * Le catalogue que le Drupal d'Amusnet publie, lu en pages de cinquante.
 *
 * Un nœud `status: false` est un jeu dépublié — sa fiche répond « Game Not
 * Found » en 200. On l'écarte ici pour que l'échec porte le nom du studio
 * (« absent du catalogue ») plutôt qu'une lecture de page ratée.
 */
async function catalogueAmusnet(): Promise<Entree[]> {
  const entrees: Entree[] = [];
  let url: string | null =
    `${AMUSNET_JSONAPI}?fields%5Bnode--game%5D=${AMUSNET_CHAMPS}&page%5Blimit%5D=50`;

  while (url) {
    const r = await recuperer(url);
    if (!r.ok) break;
    let page: { data?: NoeudAmusnet[]; links?: { next?: { href?: string } } };
    try {
      page = JSON.parse(r.html);
    } catch {
      break;
    }
    for (const noeud of page.data ?? []) {
      const a = noeud.attributes;
      const slug = (a?.field_json_api_path ?? '').replace(/^\//, '');
      if (!a?.status || !a.title || !a.field_game_gin || !slug) continue;
      entrees.push({ slug, nom: a.title, gin: a.field_game_gin });
    }
    url = page.links?.next?.href ?? null;
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  return entrees;
}

/** La fiche produit Amusnet telle que le studio la sert. */
const ficheAmusnet = (slug: string) => `https://amusnet.com/games/online-casino/${slug}`;

/**
 * Le `gin` que la fiche produit affiche, et le bouton qui ouvre la démo.
 *
 * Le `gin` est lu dans le bloc « Game info » du corps rendu, pas dans le
 * payload React : la page embarque des carrousels de jeux voisins dont un
 * regex attraperait le numéro du premier venu.
 */
export function lireFicheAmusnet(html: string): { gin: number; nom: string; demo: boolean } | null {
  const gin = /Game ID: <!-- -->(\d+)/.exec(html);
  const titre = /<title>([^<]*)<\/title>/i.exec(html);
  if (!gin || !titre) return null;
  return {
    gin: Number(gin[1]),
    nom: decoderEntites(titre[1]).replace(/\s*\|\s*Amusnet\s*$/i, '').trim(),
    demo: html.includes('id="play-demo-btn"'),
  };
}

/**
 * Amusnet : la fiche produit confirme le catalogue, et c'est elle qu'on écrit.
 *
 * `amusnet.com/games/online-casino/20-golden-dice` répond **200** avec une
 * page « Game Not Found » : sans la lecture du `gin`, cinq fiches seraient
 * sorties avec une URL qui ouvre un message d'erreur sous un bouton « jouer ».
 */
async function demoAmusnet(jeu: Jeu, entree: Entree): Promise<Resultat> {
  const url = ficheAmusnet(entree.slug);
  const page = await recuperer(url);
  if (!page.ok) return { cause: `fiche produit ${page.cause}` };

  const fiche = lireFicheAmusnet(page.html);
  if (!fiche) return { cause: 'fiche produit sans numéro de jeu (page « Game Not Found »)' };
  if (!memeNom(fiche.nom, jeu.nom)) return { cause: `la page annonce « ${fiche.nom} »` };
  if (entree.gin !== undefined && fiche.gin !== entree.gin) {
    return { cause: `la page porte le jeu ${fiche.gin}, le catalogue le jeu ${entree.gin}` };
  }
  if (!fiche.demo) return { cause: 'fiche produit sans bouton de démo' };

  return { demo: url, cle: `gin ${fiche.gin}` };
}

/* ── Yggdrasil ────────────────────────────────────────────────────────────── */

type PosteWordpress = { slug?: string; link?: string; title?: { rendered?: string } };

/** Le catalogue du WordPress d'Yggdrasil : 571 jeux en six pages de cent. */
async function catalogueYggdrasil(): Promise<Entree[]> {
  const entrees: Entree[] = [];
  for (let page = 1; page <= 12; page++) {
    const r = await recuperer(
      `https://yggdrasilgaming.com/wp-json/wp/v2/games?per_page=100&page=${page}&_fields=slug,link,title`,
    );
    if (!r.ok) break;
    let lot: PosteWordpress[];
    try {
      lot = JSON.parse(r.html);
    } catch {
      break;
    }
    if (!Array.isArray(lot) || !lot.length) break;
    for (const p of lot) {
      if (p.slug && p.link && p.title?.rendered) {
        entrees.push({ slug: p.slug, nom: decoderEntites(p.title.rendered), lien: p.link });
      }
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  return entrees;
}

/** Les hôtes sur lesquels Yggdrasil sert réellement un jeu. */
const HOTES_DEMO_YGGDRASIL = /^https:\/\/static(demo|pff)\.yggdrasilgaming\.com\//;

/**
 * Le lanceur et le nom que la fiche produit Yggdrasil déclare.
 *
 * La modale porte deux attributs jumeaux, `data-iframe-src` et
 * `data-iframe-mobile-src` : on prend le premier, c'est la version bureau.
 * Le studio emploie trois formes d'adresse (`init/launchClient.html?gameid=`,
 * `<gameid>/index.html` déjà résolue, et l'ancien hôte `staticpff`) — on
 * recopie ce qu'on lit plutôt que d'en normaliser une, un lanceur reconstruit
 * n'est plus celui que le studio publie.
 */
export function lireFicheYggdrasil(html: string): { demo: string; nom: string } | null {
  const lanceur = /data-iframe-src="([^"]+)"/.exec(html);
  const titre = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!lanceur || !titre) return null;
  return {
    demo: decoderEntites(lanceur[1]).trim(),
    nom: decoderEntites(titre[1].replace(/<[^>]+>/g, ' ')).trim(),
  };
}

/**
 * La clé qui identifie le jeu derrière un lanceur Yggdrasil.
 *
 * Le `gameid` est le même sous les trois formes d'adresse : c'est lui, et non
 * l'URL entière, qui doit servir à démasquer deux fiches sur un même jeu.
 */
const gameidYggdrasil = (url: string) =>
  /[?&]gameid=(\d+)/i.exec(url)?.[1] ?? /yggdrasilgaming\.com\/(\d+)\//.exec(url)?.[1] ?? null;

/** Yggdrasil : un saut. La fiche produit porte le lanceur, sans jeton. */
async function demoYggdrasil(jeu: Jeu, entree: Entree): Promise<Resultat> {
  const page = await recuperer(entree.lien ?? `https://yggdrasilgaming.com/games/${entree.slug}`);
  if (!page.ok) return { cause: `fiche produit ${page.cause}` };

  const fiche = lireFicheYggdrasil(page.html);
  if (!fiche) return { cause: 'fiche produit sans lanceur de démo' };

  /* Un slug qui mène à un autre jeu écrirait une démo fausse sans rien signaler. */
  if (!memeNom(fiche.nom, jeu.nom)) return { cause: `la page annonce « ${fiche.nom} »` };

  /*
   * La modale sert aussi les bandes-annonces YouTube. Un `data-iframe-src` qui
   * ne pointe pas un hôte de démo du studio est une vidéo, pas un jeu.
   */
  if (!HOTES_DEMO_YGGDRASIL.test(fiche.demo)) {
    return { cause: `lanceur hors des hôtes de démo (${fiche.demo.slice(0, 60)})` };
  }
  const gameid = gameidYggdrasil(fiche.demo);
  if (!gameid) return { cause: 'lanceur sans numéro de jeu' };

  return { demo: fiche.demo, cle: `gameid ${gameid}` };
}

/* ── Spinomenal ───────────────────────────────────────────────────────────── */

const LISTES_SPINOMENAL = ['https://spinomenal.com/games/', 'https://spinomenal.com/retro-gaming/'];

/**
 * Les tuiles de jeu des deux pages de liste de Spinomenal.
 *
 * Le studio n'expose pas son type `portfolio` en REST : ces listes sont le seul
 * endroit du site qui relie un nom à un slug. Le titre est cherché **après** le
 * lien, dans la même carte — la tuile est une suite fermée, et la fenêtre de
 * 1 200 caractères ne franchit pas la carte suivante.
 */
export function lireListeSpinomenal(html: string): Entree[] {
  const tuiles: Entree[] = [];
  const motif =
    /href="https:\/\/spinomenal\.com\/portfolio\/([^"/]+)\/"[\s\S]{0,1200}?class="thumb-title[^"]*"[^>]*>([^<]+)</g;
  for (const m of html.matchAll(motif)) {
    tuiles.push({ slug: decodeURIComponent(m[1]), nom: decoderEntites(m[2]).trim() });
  }
  return tuiles;
}

/**
 * L'adresse de la page de jeu, telle que le bouton « PLAY NOW » la porte.
 *
 * Elle n'est **pas** déductible du slug : `/portfolio/book_of_elves/` renvoie
 * vers `/bookof-elves/`. Le studio la sert tantôt absolue, tantôt relative.
 */
export function lireFicheSpinomenal(html: string): { enveloppe: string; nom: string } | null {
  const bouton = /class="game-play-btn"><a[^>]*href="([^"]+)"/.exec(html);
  const titre = /<title>([^<]*)<\/title>/i.exec(html);
  if (!bouton || !titre) return null;
  return {
    enveloppe: new URL(decoderEntites(bouton[1]), 'https://spinomenal.com').toString(),
    nom: decoderEntites(titre[1]).replace(/\s*[–-]\s*Spinomenal\s*$/i, '').trim(),
  };
}

/**
 * Le `gameCode` que l'iframe de la page enveloppe déclare.
 *
 * Spinomenal sert deux générations de lanceur — `cdn-live…/generic-play.html`
 * et l'ancien `games.spinomenal.com/Play/Fun` — et toutes deux portent le
 * `gameCode` (`Tower_1ReelAztecSpell`, `SlotMachine_BookOfElves`). C'est lui la
 * preuve qu'un jeu est derrière l'enveloppe, et lui la clé qui démasque deux
 * fiches sur un même lanceur. L'URL de l'iframe, elle, n'est pas écrite en
 * base : le JavaScript de la page lui ajoute un `gameToken=FUN_<uuid>` forgé
 * dans le navigateur, et une adresse figée vieillit mal.
 */
export function lireGameCodeSpinomenal(html: string): string | null {
  const iframe = /id="game-iframe"[^>]*\ssrc="([^"]+)"/.exec(html);
  if (!iframe) return null;
  return /[?&]gameCode=([^&"']+)/i.exec(decoderEntites(iframe[1]))?.[1] ?? null;
}

/** Spinomenal : deux sauts. La fiche donne l'adresse, l'enveloppe la confirme. */
async function demoSpinomenal(jeu: Jeu, entree: Entree): Promise<Resultat> {
  const fichePage = await recuperer(`https://spinomenal.com/portfolio/${encodeURIComponent(entree.slug)}/`);
  if (!fichePage.ok) return { cause: `fiche produit ${fichePage.cause}` };

  const fiche = lireFicheSpinomenal(fichePage.html);
  if (!fiche) return { cause: 'fiche produit sans bouton « PLAY NOW »' };
  if (!memeNom(fiche.nom, jeu.nom)) return { cause: `la page annonce « ${fiche.nom} »` };

  const enveloppe = await recuperer(fiche.enveloppe);
  if (!enveloppe.ok) return { cause: `page de jeu ${enveloppe.cause}` };

  const gameCode = lireGameCodeSpinomenal(enveloppe.html);
  if (!gameCode) return { cause: 'page de jeu sans lanceur' };

  return { demo: fiche.enveloppe, cle: `gameCode ${gameCode}` };
}

/* ── Réglages par studio ──────────────────────────────────────────────────── */

const STUDIOS = {
  amusnet: {
    catalogue: catalogueAmusnet,
    extraire: demoAmusnet,
    /*
     * La fiche produit **est** la démo retenue chez Amusnet : le filtre ne peut
     * donc pas écarter les fiches déjà traitées, et c'est sans conséquence —
     * un second passage relit les mêmes pages et réécrit la même URL.
     */
    dejaJouable: () => false,
    marqueurJouable: 'amusnet.com/games/online-casino/',
    /* 491 nœuds publiés : en dessous de 300, le studio nous repousse. */
    catalogueMinimum: 300,
  },
  yggdrasil: {
    catalogue: catalogueYggdrasil,
    extraire: demoYggdrasil,
    dejaJouable: (url: string) => HOTES_DEMO_YGGDRASIL.test(url),
    /*
     * Sans `www.` : la base porte les deux écritures pour la même fiche
     * produit, et un marqueur commençant par un point en écartait vingt-trois
     * — vingt-trois jeux qui seraient sortis « déjà pourvus » avec une page de
     * présentation en guise de démo.
     */
    marqueurJouable: 'yggdrasilgaming.com/',
    /* 571 jeux au catalogue : en dessous de 300, on ne conclut rien. */
    catalogueMinimum: 300,
  },
  spinomenal: {
    catalogue: async () => (await Promise.all(LISTES_SPINOMENAL.map(async (u) => {
      const r = await recuperer(u);
      await new Promise((r) => setTimeout(r, PAUSE_MS));
      return r.ok ? lireListeSpinomenal(r.html) : [];
    }))).flat(),
    extraire: demoSpinomenal,
    dejaJouable: (url: string) => /^https:\/\/spinomenal\.com\/(?!portfolio\/)/.test(url),
    marqueurJouable: 'spinomenal.com/',
    /* 646 tuiles sur les deux listes : en dessous de 300, une liste a sauté. */
    catalogueMinimum: 300,
  },
} as const;

type NomStudio = keyof typeof STUDIOS;

async function main() {
  const iS = process.argv.indexOf('--studio');
  const studio = (iS >= 0 ? process.argv[iS + 1] : undefined) as NomStudio | undefined;
  if (!studio || !(studio in STUDIOS)) {
    console.error('Studio manquant ou inconnu. Attendu : --studio amusnet|yggdrasil|spinomenal');
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
   * Le catalogue d'abord, les fiches ensuite : l'ordre inverse a déjà coûté un
   * verdict faux sur 58 jeux. Un catalogue anormalement court arrête tout.
   */
  console.log(`${studio} : lecture du catalogue du studio…`);
  const catalogue = await reglage.catalogue();
  const parSlug = new Map<string, Entree>();
  const parNom = new Map<string, Entree[]>();
  for (const e of catalogue) {
    if (!parSlug.has(e.slug)) parSlug.set(e.slug, e);
    const cle = normaliserNom(e.nom);
    parNom.set(cle, [...(parNom.get(cle) ?? []), e]);
  }
  console.log(`Catalogue du studio : ${catalogue.length} entrées, ${parSlug.size} slugs distincts.\n`);
  if (parSlug.size < reglage.catalogueMinimum) {
    console.log(
      `Catalogue trop maigre pour conclure quoi que ce soit (< ${reglage.catalogueMinimum}) — ` +
        'le studio nous repousse. On s’arrête.',
    );
    await prisma.$disconnect();
    return;
  }

  /*
   * Les fiches déjà pourvues d'une démo jouable sont écartées ici plutôt qu'en
   * SQL : chez Spinomenal l'enveloppe et la fiche produit vivent sous le même
   * domaine, un `contains` ne les distingue pas.
   */
  const jeux: Jeu[] = (
    await prisma.jeu.findMany({
      where: {
        studio: { slug: studio },
        OR: [{ demoUrl: { contains: reglage.marqueurJouable } }, { demoUrl: null }],
      },
      select: { id: true, slug: true, nom: true, demoUrl: true },
      orderBy: { slug: 'asc' },
    })
  )
    .filter((j) => !(j.demoUrl && reglage.dejaJouable(j.demoUrl)))
    .slice(0, limite);

  const sansDemo = jeux.filter((j) => !j.demoUrl).length;
  console.log(
    `${jeux.length} fiches à traiter` + (sansDemo ? ` — dont ${sansDemo} sans demoUrl du tout.` : '.') + '\n',
  );

  const trouves: Array<{ id: string; slug: string; demo: string; cle: string }> = [];
  const echecs: Array<{ slug: string; cause: string }> = [];

  await parLots(
    jeux,
    async (jeu) => {
      const entree = apparier(jeu, parSlug, parNom);
      if ('cause' in entree) return void echecs.push({ slug: jeu.slug, cause: entree.cause });
      const r = await reglage.extraire(jeu, entree);
      if ('cause' in r) echecs.push({ slug: jeu.slug, cause: r.cause });
      else trouves.push({ id: jeu.id, slug: jeu.slug, demo: r.demo, cle: r.cle });
    },
    CADENCE_PAR_STUDIO[studio] ?? PARALLELE,
  );

  /*
   * Deux fiches qui reçoivent le même jeu sont un doublon de catalogue, pas
   * deux jeux : elles publieraient les mêmes captures sous deux URLs
   * indexables. Le premier slug garde la démo, l'autre part en échec nommé —
   * c'est un arbitrage éditorial, pas une donnée à écrire.
   */
  const retenus: typeof trouves = [];
  const premierPourJeu = new Map<string, string>();
  for (const t of [...trouves].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const deja = premierPourJeu.get(t.cle);
    if (deja) echecs.push({ slug: t.slug, cause: `doublon de catalogue (même ${t.cle} que ${deja})` });
    else {
      premierPourJeu.set(t.cle, t.slug);
      retenus.push(t);
    }
  }

  console.log(`\n${retenus.length} démos trouvées, ${echecs.length} échecs.\n`);
  for (const t of retenus.slice(0, 5)) {
    console.log(`  ${t.slug.padEnd(34)} ${t.cle.padEnd(28)} ${t.demo.slice(0, 96)}`);
  }

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
      console.log(`      ${slugs.slice(0, 10).join(', ')}${slugs.length > 10 ? ', …' : ''}`);
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
  console.log(`\n${retenus.length} URLs écrites pour ${studio}.`);
  await prisma.$disconnect();
}

/*
 * Le script ne s'exécute que lancé directement : sans cette garde, importer une
 * des fonctions de lecture déclencherait en arrière-plan une campagne complète
 * de requêtes chez trois partenaires.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
