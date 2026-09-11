/**
 * Où lire le catalogue **complet** d'un studio.
 *
 * ── Pourquoi un adaptateur par studio ─────────────────────────────────────
 *
 * Notre base ne sait pas ce qu'un studio a publié : elle sait ce qu'on y a
 * mis. La seule source qui fasse autorité sur « tous les jeux de X » est le
 * site de X — et chacun l'expose à sa façon. Quatre formes rencontrées, quatre
 * stratégies, aucune généralisable :
 *
 * · **BGaming** — un `game-sitemap.xml` dédié. 343 jeux en une requête.
 * · **Nolimit City** — le sitemap principal, les jeux sous `/games/`.
 * · **Play'n GO** — un sitemap Wix aux noms générés, et les jeux ne sont pas
 *   sous `/games/` mais sous `/additional-game-content/`. Chercher le motif
 *   attendu rendait zéro résultat sur un sitemap qui en contient 417.
 * · **Hacksaw** — le sitemap ne descend pas jusqu'aux jeux ; c'est la page de
 *   listing qui les porte tous, 146 liens d'un coup.
 *
 * ── Le sitemap plutôt que le listing, quand il existe ─────────────────────
 *
 * Un sitemap est publié *pour* être énuméré, il est complet par construction,
 * et il coûte une requête là où un listing paginé en coûte cinquante. On ne
 * racle une page de listing que faute de mieux.
 */

export interface SourceStudio {
  /** Le slug du studio dans notre base. */
  studio: string;
  /** Ce qu'on interroge, pour le journal et pour pouvoir le rejouer à la main. */
  origine: string;
  /** Rend les URL de fiches produit du studio. */
  lister(recuperer: (url: string) => Promise<string>): Promise<string[]>;
  /**
   * Comment lire le slug dans l'URL, quand le défaut ne suffit pas.
   *
   * Habanero nomme ses pages `SGBattleTheBeast` : la normalisation commune en
   * fait `sgbattlethebeast`, qui ne ressemble à aucun slug de notre base. Sans
   * ce crochet, son inventaire annoncerait 226 jeux manquants et 6 jeux
   * « chez nous seulement » — le catalogue entier compté deux fois.
   */
  slug?(url: string): string;
}

/**
 * Les `<loc>` d'un sitemap, **index compris**.
 *
 * Un `sitemap.xml` est souvent un index qui pointe d'autres sitemaps plutôt
 * que des pages. Sans descendre d'un niveau, on lit les URL des sous-sitemaps
 * et on conclut que le studio ne publie aucun jeu : Nolimit City rendait zéro
 * alors qu'il en liste 143. Un seul niveau suffit — aucun des sites rencontrés
 * n'imbrique plus loin.
 */
/**
 * Un `<loc>`, que son contenu soit nu ou enveloppé de CDATA.
 *
 * Evoplay publie `<loc><![CDATA[https://…]]></loc>` — la forme que génère All
 * in One SEO. Le motif `[^<]+` bute sur le `<` de `<![CDATA[` et rend zéro
 * résultat : le studio passait pour n'avoir aucun jeu alors qu'il en liste 447.
 * Un sitemap vide et un sitemap illisible se ressemblent trop pour qu'on se
 * fie au compte.
 */
const LOC = /<loc>\s*(?:<!\[CDATA\[)?([^<\]]+)/g;

export function locsDuTexte(xml: string): string[] {
  return [...xml.matchAll(LOC)].map((m) => m[1].trim());
}

async function locs(
  xml: string,
  recuperer: (url: string) => Promise<string>,
): Promise<string[]> {
  const directes = locsDuTexte(xml);
  if (!/<sitemapindex/i.test(xml)) return directes;

  const tout: string[] = [];
  for (const sous of directes) {
    try {
      const contenu = await recuperer(sous);
      tout.push(...locsDuTexte(contenu));
    } catch {
      // Un sous-sitemap injoignable ne doit pas faire échouer l'inventaire
      // entier : on perd sa part, le reste du studio reste comptabilisé.
    }
  }
  return tout;
}

function filtrer(urls: string[], motif: RegExp): string[] {
  return [...new Set(urls.filter((u) => motif.test(u)))];
}

export const SOURCES: SourceStudio[] = [
  {
    studio: 'pragmatic-play',
    origine: 'https://www.pragmaticplay.com/sitemap_index.xml',
    /*
     * L'index de Pragmatic melange huit sitemaps d'articles et onze de jeux.
     * On ne descend que dans ceux qui portent les jeux : tirer les autres
     * coute dix-neuf requetes la ou onze suffisent, pour un resultat
     * identique.
     */
    async lister(recuperer) {
      const index = await recuperer(this.origine);
      const sous = locsDuTexte(index).filter((u) => /games-sitemap\d*\.xml$/.test(u));
      const tout: string[] = [];
      for (const s of sous) {
        try {
          const contenu = await recuperer(s);
          tout.push(...locsDuTexte(contenu));
        } catch {
          // Un sous-sitemap injoignable ne doit pas faire echouer l'inventaire.
        }
      }
      return filtrer(tout, /\/games\/[^/]+\/?$/);
    },
  },
  {
    studio: 'bgaming',
    origine: 'https://bgaming.com/game-sitemap.xml',
    async lister(recuperer) {
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+$/);
    },
  },
  {
    studio: 'nolimit-city',
    origine: 'https://nolimitcity.com/sitemap.xml',
    async lister(recuperer) {
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+$/);
    },
  },
  {
    studio: 'playn-go',
    origine:
      'https://www.playngo.com/dynamic-additional-game-content_p_cf43b67c_08fa_4d8f_8fd1_48114bf0b15b_0_5000-sitemap.xml',
    async lister(recuperer) {
      // Les jeux ne sont pas sous `/games/` chez eux : le motif attendu
      // rendait zéro résultat sur un sitemap qui en contient 417.
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/additional-game-content\/[^/]+$/);
    },
  },
  {
    studio: 'hacksaw-gaming',
    origine: 'https://www.hacksawgaming.com/games',
    async lister(recuperer) {
      const html = await recuperer(this.origine);
      const liens = [...html.matchAll(/href="(\/games\/[^"?#]+)"/g)].map(
        (m) => `https://www.hacksawgaming.com${m[1]}`,
      );
      // `/games/scratchcards` est une catégorie, pas un jeu.
      return filtrer(liens, /\/games\/[^/]+$/).filter((u) => !u.endsWith('/scratchcards'));
    },
  },
  {
    studio: 'wazdan',
    origine: 'https://wazdan.com/games-sitemap.xml',
    async lister(recuperer) {
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+$/);
    },
  },
  {
    studio: 'thunderkick',
    origine: 'https://www.thunderkick.com/games-sitemap.xml',
    async lister(recuperer) {
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+\/?$/);
    },
  },
  {
    studio: 'quickspin',
    origine: 'https://quickspin.com/games-sitemap.xml',
    async lister(recuperer) {
      // Chez eux c'est `/slots/`, et la page de listing `/slots/` elle-même
      // figure dans le sitemap : exiger un segment après la barre l'écarte.
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/slots\/[^/]+\/?$/);
    },
  },
  {
    studio: 'endorphina',
    origine: 'https://endorphina.com/sitemap.xml',
    async lister(recuperer) {
      // Les traductions vivent dans des sitemaps séparés (`sitemap_es.xml`,
      // `sitemap_pt-br.xml`, `sitemap_it.xml`) : le principal est déjà en
      // anglais seul, rien à dédoublonner.
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+$/);
    },
  },
  {
    studio: 'amusnet',
    origine: 'https://amusnet.com/sitemap.xml',
    /*
     * Amusnet range son catalogue en trois familles, et deux ne sont pas de
     * notre ressort :
     *
     * · `/games/online-casino/` — 331 jeux, ce qu'on catalogue.
     * · `/games/land-based/` — 58 bornes physiques de casino terrestre. Un
     *   visiteur ne peut pas y jouer depuis une page web : les lister
     *   gonflerait le dénominateur d'un tiers avec des machines qu'on ne
     *   pourra jamais ni capturer ni sourcer.
     * · `/games/live-casino/` — 35 tables filmées. Leur modèle de faits est
     *   autre : pas de panneau de règles à lire, et un « gain maximum » qui
     *   porte sur une case de mise, pas sur la mise totale. À traiter à part
     *   le jour où on ouvrira le live, pas à mélanger ici.
     */
    async lister(recuperer) {
      return filtrer(
        await locs(await recuperer(this.origine), recuperer),
        /\/games\/online-casino\/[^/]+$/,
      );
    },
  },
  {
    studio: 'habanero',
    origine: 'https://habanerosystems.com/sitemap.xml',
    async lister(recuperer) {
      // Le sitemap sert les 226 jeux dans une douzaine de langues (`/zh-CN/`,
      // `/it-IT/`…), soit 904 URL pour un seul catalogue. On ne garde que la
      // forme sans préfixe.
      return filtrer(
        await locs(await recuperer(this.origine), recuperer),
        /^https:\/\/habanerosystems\.com\/games\/[^/]+$/,
      );
    },
    /*
     * `SGBattleTheBeast` est un identifiant interne, pas un slug : `SG` pour
     * slot game, `TG` pour table game, puis le titre en CamelCase. La
     * normalisation commune en ferait `sgbattlethebeast`. On coupe le préfixe
     * et on rend les césures — vérifié contre nos 6 fiches existantes, 5
     * retombent au bon slug et la 6e révèle une vraie divergence (`the-koi-gate`
     * chez eux, `koi-gate` chez nous), ce que la colonne « chez nous seulement »
     * est faite pour montrer.
     */
    slug(url) {
      const brut = url.split('/').filter(Boolean).pop() ?? '';
      return brut
        .replace(/^(SG|TG)(?=[A-Z0-9])/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },
  },
  {
    studio: 'evoplay',
    origine: 'https://evoplay.games/sitemap.xml',
    async lister(recuperer) {
      const index = locsDuTexte(await recuperer(this.origine));
      const jeux = index.find((u) => u.endsWith('/game-sitemap.xml'));
      if (!jeux) return [];
      // 447 URL pour trois langues : `/pt-br/jogo/`, `/es/juego/`, `/game/`.
      // Seule la dernière forme nous intéresse.
      return filtrer(locsDuTexte(await recuperer(jeux)), /^https:\/\/evoplay\.games\/game\/[^/]+\/?$/);
    },
  },
  {
    studio: 'netent',
    origine: 'https://netent.com/sitemap.xml',
    async lister(recuperer) {
      return filtrer(await locs(await recuperer(this.origine), recuperer), /^https:\/\/netent\.com\/games\/[^/]+$/);
    },
  },
  {
    studio: 'red-tiger',
    origine: 'https://redtiger.com/sitemap.xml',
    async lister(recuperer) {
      return filtrer(await locs(await recuperer(this.origine), recuperer), /^https:\/\/redtiger\.com\/games\/[^/]+$/);
    },
  },
  {
    studio: 'yggdrasil',
    origine: 'https://www.yggdrasilgaming.com/games-sitemap.xml',
    async lister(recuperer) {
      // 571 jeux : le catalogue maison **et** celui des studios partenaires
      // qu'ils distribuent sous leur plateforme. Les deux sont publiés sous la
      // marque, on ne cherche pas à les démêler ici.
      return filtrer(await locs(await recuperer(this.origine), recuperer), /^https:\/\/yggdrasilgaming\.com\/games\/[^/]+$/);
    },
  },
  {
    studio: 'elk-studios',
    origine: 'https://www.elk-studios.com/game-sitemap.xml',
    async lister(recuperer) {
      const urls = filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+\/?$/);
      // Trois pages de travail traînent dans leur sitemap — `hiddenprogress`,
      // `hidden`, `test-page-iframes`. Créer une fiche pour chacune mettrait
      // trois jeux inexistants au dénominateur du catalogue.
      return urls.filter((u) => !/\/(hidden|hiddenprogress|test-page-iframes)\/?$/.test(u));
    },
  },
  {
    studio: 'fugaso',
    origine: 'https://fugaso.com/games',
    /*
     * Aucun sitemap : `/sitemap.xml` rend le « This page could not be found »
     * de leur Next.js, et le robots.txt n'existe pas. C'est donc le listing,
     * comme chez Hacksaw — mais celui-ci sert **tout** le catalogue d'un coup.
     * Sa pagination `/games/2` … `/games/13` est purement cliente : les treize
     * adresses rendent les mêmes 104 liens (13 pages × 8 vignettes = 104).
     * Boucler dessus coûterait douze requêtes pour zéro jeu de plus.
     */
    async lister(recuperer) {
      const html = await recuperer(this.origine);
      const liens = [...html.matchAll(/href="(\/game\/[^"?#]+)"/g)].map(
        (m) => `https://fugaso.com${m[1]}`,
      );
      return filtrer(liens, /\/game\/[^/]+$/);
    },
  },
  {
    studio: 'tomhorn',
    origine: 'https://www.tomhorngaming.com/sitemap.xml',
    async lister(recuperer) {
      // Un sitemap plat de 384 URL, dont 242 d'articles de blog. La page de
      // listing `/games/` y figure au même rang que les jeux : exiger un
      // segment entre les deux barres l'écarte, faute de quoi le catalogue
      // gagnerait une fiche nommée « Games ».
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+\/$/);
    },
  },
  {
    studio: 'tada',
    origine: 'https://tadagaming.com/sitemap.xml',
    /*
     * 5 083 URL pour 281 jeux : le catalogue est servi dans dix-sept langues
     * (`/fr-FR/PlusIntro/…`, `/zh-CN/PlusIntro/…`). Sans le filtre sur la
     * forme nue, TaDa compterait dix-sept fois.
     *
     * Quatre pages sont nommées par un numéro — `/PlusIntro/81`, `92`, `304`,
     * `531` — comme chez PG Soft, et ce sont bien des jeux (« 81 » est Crazy
     * 777). On ne peut pas en déduire de nom : les écarter laisse quatre
     * saisies à la main plutôt que quatre fiches intitulées « 81 ».
     */
    async lister(recuperer) {
      const urls = filtrer(
        await locs(await recuperer(this.origine), recuperer),
        /^https:\/\/tadagaming\.com\/PlusIntro\/[^/]+$/,
      );
      return urls.filter((u) => !/\/\d+$/.test(u));
    },
    /*
     * `ChinShiHuang` est un identifiant en CamelCase, pas un slug — la
     * normalisation commune en ferait `chinshihuang`. On rend les césures, y
     * compris à la frontière lettre/chiffre : sans elle `Crazy777` donnerait
     * `crazy777` là où le studio titre « Crazy 777 ».
     *
     * Mesuré sur les 277 fiches, titre de la page à l'appui : 232 tombent
     * exactement sur le slug attendu, 43 s'en écartent d'un séparateur près
     * (`Fortunetree` pour « Fortune Tree », `BookofGold` pour « Book of
     * Gold ») — ceux-là, le garde-fou « jumeaux » de l'inventaire les
     * reconnaît déjà comme des doublons et ne les crée pas —, et 2 seulement
     * divergent vraiment, les deux esperluettes rendues « and ».
     */
    slug(url) {
      const brut = url.split('/').filter(Boolean).pop() ?? '';
      return brut
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .replace(/([A-Za-z])(\d)/g, '$1-$2')
        .replace(/(\d)([A-Za-z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },
  },
  {
    studio: 'reevo',
    origine: 'https://reevotech.com/page-sitemap.xml',
    /*
     * Le domaine n'est pas `reevo.com` : celui-là appartient à un opérateur
     * télécom homonyme, dont la page d'accueil ne dit pas un mot du métier.
     * Le studio publie sur `reevotech.com`.
     *
     * On vise directement `page-sitemap.xml` plutôt que l'index : les trois
     * autres sous-sitemaps ne portent que 222 actualités, trois offres
     * d'emploi et une page d'API.
     */
    async lister(recuperer) {
      // La page de listing `/games/` vit dans le même sitemap que les jeux.
      return filtrer(
        await locs(await recuperer(this.origine), recuperer),
        /^https:\/\/reevotech\.com\/games\/[^/]+\/$/,
      );
    },
  },
  {
    studio: 'amatic',
    origine: 'https://www.amatic.com/products/slot-games',
    /*
     * Amatic ne publie **aucune page par jeu** : son sitemap tient en 59 URL
     * de cabinets et de pages société, et dans le listing la vignette d'un jeu
     * n'est pas un lien. Le catalogue est pourtant bien là — 121 vignettes,
     * chacune portant son titre en clair dans l'`alt` de son image.
     *
     * On lit donc l'`alt`, et non un `href` comme chez Hacksaw. Deux détails
     * qui décident du résultat :
     *
     * · l'attribut `data-name` voisin colle l'année de sortie au titre
     *   (« Book Of Aztec 2011 ») ; l'`alt` ne le fait pas. Le prendre créerait
     *   des `book-of-aztec-2011` qui ne se rapprocheraient d'aucune fiche.
     * · les URL rendues pointent le listing, titre en ancre. Elles ne mènent
     *   nulle part de plus précis parce qu'il n'existe rien de plus précis :
     *   c'est le crochet `slug()` qui les relit, `slugDepuisUrl` coupant
     *   justement l'ancre.
     */
    async lister(recuperer) {
      const html = await recuperer(this.origine);
      const tuiles = html.match(/slot-games-single[\s\S]{0,900}?<\/div>/g) ?? [];
      const noms = tuiles
        .map((tuile) => tuile.match(/alt="([^"]*)"/)?.[1] ?? '')
        // `Billy&#039;s Game`, `Fire &amp; Ice` : sans décodage, l'apostrophe
        // devient le slug `billy-039-s-game`.
        .map((nom) => nom.replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&').trim())
        .filter(Boolean);
      return [...new Set(noms)].map((nom) => `${this.origine}#${encodeURIComponent(nom)}`);
    },
    slug(url) {
      return decodeURIComponent(url.split('#')[1] ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },
  },
  {
    studio: 'platipus',
    origine: 'https://platipusgaming.com/en/games',
    /*
     * Leur sitemap ne descend pas jusqu'aux jeux : 35 URL en tout, les mêmes
     * pages de société dans cinq langues. Et le listing n'a pas davantage de
     * `href` à offrir — c'est une application Nuxt, les vignettes sont posées
     * par le script.
     *
     * L'état rendu par le serveur est en revanche dans la page, et il porte le
     * catalogue entier : `games:{count:174,entities:[…]}`, chaque entrée avec
     * son chemin échappé à la mode JavaScript (`/en/games/…`).
     * Les 174 annoncés et les 174 lus concordent : le listing n'est pas tronqué
     * à une première page, il n'y a pas de seconde à aller chercher.
     */
    async lister(recuperer) {
      const html = await recuperer(this.origine);
      const slugs = [...html.matchAll(/\\u002Fen\\u002Fgames\\u002F([a-z0-9-]+)/g)].map((m) => m[1]);
      return [...new Set(slugs)].map((s) => `https://platipusgaming.com/en/games/${s}`);
    },
  },
  {
    studio: 'swintt',
    origine: 'https://swintt.com/games/loadGameItems',
    /*
     * Aucun sitemap — `/sitemap.xml` rend 404 et le robots.txt n'en déclare
     * pas —, et le listing `/games` ne porte qu'un seul lien de jeu, celui de
     * la nouveauté mise en avant. Le reste arrive par l'adresse que la page
     * annonce elle-même en clair (`loadMoreGameItemsURL`), qui répond à un GET
     * nu : douze jeux par page, et `allowRetry: false` sur la dernière.
     *
     * Dix-sept requêtes pour 193 jeux, là où un sitemap en coûterait une. On
     * paie parce qu'il n'y a rien d'autre — et la pagination est déterministe
     * (16 × 12 + 1 = 193, aucun doublon d'une page à l'autre), donc complète.
     * Le plafond de quarante tours est là pour qu'un changement de contrat
     * côté studio coûte un inventaire tronqué, jamais une boucle sans fin.
     */
    async lister(recuperer) {
      const tout = new Set<string>();
      for (let page = 1; page <= 40; page += 1) {
        const reponse = await recuperer(`${this.origine}?page=${page}`);
        const slugs = [...reponse.matchAll(/swintt\.com\\?\/games\\?\/([a-z0-9-]+)/g)].map((m) => m[1]);
        for (const s of slugs) tout.add(`https://swintt.com/games/${s}`);
        if (!slugs.length || !/"allowRetry"\s*:\s*true/.test(reponse)) break;
      }
      return [...tout];
    },
  },
  {
    studio: 'microgaming',
    origine: 'https://microgaming.io/game-sitemap1.xml',
    /*
     * Le domaine historique `microgaming.co.uk` redirige vers `microgaming.io`,
     * et leur index s'appelle `sitemaps.xml` — au pluriel. Chercher
     * `sitemap.xml` rend 404 et fait conclure à un studio sans catalogue.
     */
    async lister(recuperer) {
      // `/games-list/` — la page de listing — est la 223e URL du sitemap des
      // jeux : exiger `/game/` au singulier avec un seul segment l'écarte.
      return filtrer(
        await locs(await recuperer(this.origine), recuperer),
        /^https:\/\/microgaming\.io\/game\/[^/]+\/$/,
      );
    },
  },
  {
    studio: 'big-time-gaming',
    origine: 'https://www.bigtimegaming.com/sitemap.xml',
    async lister(recuperer) {
      // 207 URL sous `/games/`, dont 90 seulement sont des jeux : le reste est
      // rangé plus profond (catégories, déclinaisons). Exiger un seul segment
      // écarte tout ça.
      return filtrer(
        await locs(await recuperer(this.origine), recuperer),
        /^https:\/\/www\.bigtimegaming\.com\/games\/[^/]+\/?$/,
      );
    },
  },
];

/**
 * Les studios qu'on ne peut **pas** inventorier automatiquement, et pourquoi.
 *
 * Sans cette liste, un studio absent de `SOURCES` se lit comme « pas encore
 * fait » alors que c'est parfois « pas faisable ». La nuance décide de la
 * suite : on écrit un adaptateur dans un cas, on ouvre un fichier à la main
 * dans l'autre.
 */
export const SANS_SOURCE_AUTOMATISABLE: Record<string, string> = {
  blueprint:
    "blueprintgaming.com sert `User-agent: * / Disallow: /` — le site entier refuse l'exploration. On ne passe pas outre : checklist à tenir à la main.",
  betsoft:
    "betsoftgaming.com ne publie aucun sitemap : `/sitemap.xml` rend la page d'accueil en HTML, et robots.txt n'en déclare pas.",
  booming:
    "le domaine `boominggames.com` enregistré chez nous ne résout plus (ENOTFOUND). Retrouver leur site avant tout inventaire.",
  evolution:
    "evolution.com ne publie aucune page par jeu : son sitemap ne porte que des actualités, des pages investisseurs et neuf marques. Leur catalogue ne s'inventorie pas depuis leur site.",
  pgsoft:
    "pgsoft.com identifie ses jeux par un numéro (`/games/201/`), pas par un slug. On peut en compter, pas les rapprocher des nôtres — un inventaire y créerait des fiches nommées « 201 ».",
  playson:
    'playson.com rend 403 sur robots.txt comme sur le sitemap : le site refuse la requête automatisée.',
  spribe:
    'spribe.co publie un sitemap vide (aucun `<loc>`). Rien à énumérer.',
  'push-gaming':
    "pushgaming.com raccourcit ses URL en supprimant les petits mots — `mystery-mission-moon` pour « Mystery Mission To The Moon », `land-zenith` pour « Land of Zenith ». La transformation n'est pas réversible : 11 jeux qu'on a déjà seraient recréés sous un second slug, soit deux pages indexables pour un seul jeu.",
  'relax-gaming':
    "relax-gaming.com colle ses slugs sans séparateur (`/products/casino/moneytrain5`). On ne peut pas en déduire « Money Train 5 » : les fiches créées porteraient un nom illisible. Leur titre est sur la page, une passe par fiche reste possible.",
  'inout-games':
    "aucun `siteUrl` en base pour ce studio : on ne sait même pas où regarder. Retrouver leur site avant tout inventaire.",
  ezugi:
    "ezugi.com rend 403 derrière Cloudflare, page d'accueil comprise : le site refuse la requête automatisée. On ne passe pas outre.",
  pateplay:
    "le robots.txt de pateplay.com interdit `/api/`, et c'est la seule voie qui porte le catalogue : le site est une application cliente dont le `sitemap.xml` — pourtant déclaré par ce même robots.txt — rend la coquille HTML au lieu du XML.",
  spadegaming:
    "spadegaming.com est une application cliente dont le `sitemap.xml` ne liste que des gabarits de route (`/game-detail:name`), jamais un jeu. Le catalogue vient d'une API dont le nom de route n'existe que dans un bundle minifié de 978 ko : on ne devine pas du code obscurci.",
  voltent:
    "voltent.com tient en une seule page — son sitemap ne déclare que la racine, `/games` rend 404, et l'API WordPress répond 401. Ses ~150 jeux n'y existent que comme noms de fichiers d'images (`MightyCrownEmpireOfGold_icon_285x190.jpg`) : aucune page par jeu à inventorier.",
  playtech:
    "playtech.com ne publie aucune page par jeu : son sitemap sert 399 communiqués, 170 clients, 41 partenaires et les 10 `/products/` déjà repérés par le prospecteur — son catalogue de logiciels B2B, pas des machines à sous.",
  novomatic:
    "novomatic.com est le site du fabricant de bornes : `/produkte/` ne porte que des cabinets et des « game mixes », et aucun sitemap n'est publié. Son catalogue en ligne appartient à sa filiale Greentube, dont la page `/all-games/` est remplie par script — les liens y sont encore des gabarits `{{url}}` — et dont le sitemap ne contient pas une seule fiche de jeu.",
  luckystreak:
    "`luckystreak.com` et `luckystreak.io` sont deux domaines en vente, pas le studio ; le vrai site est `luckystreaklive.com`, dont le sitemap ne porte que blog, carrières et fournisseurs, aucune page par jeu. C'est de surcroît un fournisseur de tables filmées, hors périmètre comme le `live-casino` d'Amusnet.",
};

/**
 * Le slug d'un jeu, déduit de son URL chez le studio.
 *
 * Les URL portent des caractères encodés — `3-cursed-chests%3A-hold-%26-win`
 * chez Hacksaw, `merlin%3A-journey-of-flame` chez Play'n GO. Décoder puis
 * normaliser est indispensable : sans ça, deux écritures du même jeu comptent
 * pour deux jeux différents, et l'inventaire annonce des manquants qui n'en
 * sont pas.
 */
export function slugDepuisUrl(url: string): string {
  /*
   * La requête et l'ancre d'abord.
   *
   * Dragon Gaming publie `/games/mythical-creatures/?lang=zh-hans` : le dernier
   * segment est alors `?lang=zh-hans`, et tous ses jeux traduits seraient
   * tombés sur le même slug « lang-zh-hans ».
   */
  const sansRequete = url.split('#')[0].split('?')[0];
  const dernier = decodeURIComponent(sansRequete.split('/').filter(Boolean).pop() ?? '')
    // Merkur et Push Gaming servent des `.html`. Sans couper l'extension,
    // « jokers-cap.html » devient le slug « jokers-cap-html ».
    .replace(/\.(html?|php|aspx?)$/i, '');
  return dernier
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
