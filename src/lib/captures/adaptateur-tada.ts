/**
 * L'adaptateur de capture du studio **TaDa Gaming**.
 *
 * Il vit dans son propre fichier plutôt que dans `adaptateurs.ts` : plusieurs
 * studios se câblent en parallèle, et un fichier commun aurait fait de chaque
 * ajout un conflit. Le branchement se fait dans la table `ADAPTATEURS` — mais
 * **lire « Firefox, pas Chromium » ci-dessous avant de le poser** : sous le
 * runner tel qu'il est, cet adaptateur ne capture rien, il nomme un sabotage.
 *
 * ── Ce que la base contient ────────────────────────────────────────────────
 *
 * 249 fiches, 233 avec une `demoUrl`, **aucune avec un RTP**. Les 233 démos
 * ont la même forme, l'enveloppe du studio `tadagaming.com/PlusTrial/<gid>/
 * en-us`. Elle redirige (302, 0,2 s) vers `uat-wb-api.tadagaming.com/api1/
 * LoginTrial?…&ApiId=2`, qui frappe un `ssoKey` à chaque ouverture et
 * redirige vers le jeu : `casino-wbgame.tadagaming.com/<dossier>/?ssoKey=…&
 * gameId=<gid>`. Le dossier est la clé interne du jeu (`crown`, `csh`, `wl`,
 * `fg3`, `fish24`, `roulette2`). Oui, `uat-` : le site public du studio
 * branche ses démos sur son environnement de recette, et l'hôte de production
 * (`wb-api.`) répond 404 à la même requête. Ce n'est pas nous qui l'avons
 * choisi, et on ne le contourne pas.
 *
 * Le jeu est une application **Cocos Creator 3.8.8** dans un `<canvas>`, et
 * la page annonce `X-Frame-Options: DENY` : capture par navigation, jamais en
 * iframe. Le catalogue est **hétérogène** : des machines à sous en paysage
 * (1136×710 de conception, plein écran), des machines à sous en **portrait**
 * (640×1136, une colonne de 450 px centrée dans le viewport de 1280×800 —
 * 3 Witch's Lamp), des jeux de tir (Royal Shooter 2, `fish24`) et des jeux de
 * table (`pokerking` mène à `/roulette2/`). Rien dans l'URL ne dit lequel.
 *
 * ── Firefox, pas Chromium : le jeu se saborde sous CDP ────────────────────
 *
 * Le code du jeu est protégé par **JScrambler** avec ses contrôles d'intégrité
 * actifs. Sous Playwright + Chromium, tête ou pas, la séquence est la même,
 * reproduite le 14/09/2026 sur 10 Sparkling Crown (gid 526) :
 *
 *   3,9 s   `load`
 *   23 s    « LoadScene MainGame.scene », le moteur est prêt
 *   25,7 s  `console.dir(Error)`, puis aussitôt POST
 *           `notification.jscrambler.com/v2/notifications` « Code violation:
 *           j-016-00079 », et `M.apply is not a function`, `performance is
 *           not defined`, `XMLHttpRequest is not defined` : les globaux sont
 *           retirés un à un
 *   45 s    `page.evaluate('1 + 1')` échoue : « argsAndHandles.slice is not a
 *           function » — le jeu a aussi retiré `Array.prototype.slice`, dont
 *           le script utilitaire de Playwright se sert
 *
 * L'écran reste sur le logo TaDa et sa barre à mi-course, à 70 s comme à
 * 100 s. Ce que le jeu détecte est le domaine CDP `Runtime`, que Playwright
 * active sur chaque page Chromium : l'inspecteur de V8 fabrique alors un
 * aperçu de chaque message de console, et pour une `Error` cet aperçu évalue
 * son `stack` — le `console.dir(Error)` du jeu surveille précisément cet
 * accès. Contre-épreuve (`scripts/_tmp-tada-cdp-nu.ts`) : le même Chromium
 * piloté en WebSocket brut avec seulement `Page` et `Network` charge le jeu
 * jusqu'à l'intro.
 *
 * **Firefox sous Playwright** est piloté par Juggler, pas par CDP : aucun
 * `Runtime.enable`. Vérifié à l'image le 14/09/2026 : aucune requête vers
 * jscrambler.com, `evaluate` répond à 100 s, l'intro est à l'écran entre 20 et
 * 42 s, et le jeu répond aux clics jusqu'au panneau de règles — sur 526
 * (paysage), 2 (Chin Shi Huang, génération plus ancienne) et 505 (portrait).
 * C'est donc un navigateur que cet adaptateur déclare (`navigateur:
 * 'firefox'`), et le runner doit savoir le lancer : le diff est dans le
 * rapport de reconnaissance, pas ici. Tant qu'il n'est pas appliqué,
 * `ouvrirLeJeu` reconnaît le sabotage à l'échec de `evaluate` et le nomme,
 * au lieu de laisser le runner photographier une barre de chargement en
 * « jeu de base » puis rendre « icône des règles introuvable ».
 *
 * ── Ce qui reste fermé, même sous Firefox ─────────────────────────────────
 *
 * Une partie des builds **plante à 12 s** dans son code obfusqué — « can't
 * access property "defineProperties", q3zmn[…] is undefined » (Fortune Gems
 * 3, `fg3`), « … "random" … » (Fortune Coins Unlimited Fortune, 3 Lightning
 * Blitz) — avant toute scène ; le réseau s'arrête à 23 réponses (0,5 Mo) et
 * l'écran reste sur la barre. Sous CDP nu, Chromium reste lui aussi sur la
 * barre de Fortune Gems 3 à 70 s. Ce n'est ni un ban (les autres jeux passent
 * dans la même minute) ni une géo-restriction : c'est une génération de build
 * qui ne tourne pas sous un navigateur piloté, et on ne sait pas si c'est une
 * détection ou une incompatibilité. L'adaptateur le reconnaît (une
 * `pageerror` et toujours pas de scène à 20 s) et le nomme. La part du
 * catalogue concernée est dans le rapport de reconnaissance.
 *
 * ── Le jeu se pilote par son graphe de scène, pas par des coordonnées ─────
 *
 * `window.cc` est exposé, et `cc.director.getScene()` se parcourt : chaque
 * bouton est un nœud nommé, avec sa position monde. C'est ce qui rend
 * l'adaptateur indifférent au paysage/portrait — la position est convertie
 * en pixels par `cc.view.getViewportRect()` et `getScaleX/Y()` (mesuré :
 * paysage, échelle 1,127 et origine 0 ; portrait, échelle 0,704 et origine
 * x = 415). Les noms, identiques sur les trois générations vues :
 *
 *   `Btn_Loading`   le bouton de l'intro ; son Label dit « Loading… 95% »
 *                   puis « Continue » quand il est prêt (20–42 s après `load`)
 *   `Btn_Play`      un second écran « PLAY » sur les jeux récents (526, 505),
 *                   absent sur les anciens (2) ; il ignore un clic donné dans
 *                   la seconde où il apparaît, d'où l'attente et la reprise
 *   `btn_comm`      l'engrenage en bas à gauche (paysage) ou à droite de la
 *                   colonne (portrait) : ouvre le menu
 *   `btn_info`      le « i » du menu : ouvre les règles
 *   `btn_spin`      le bouton de tour — le témoin qu'on est sur une machine à
 *                   sous et qu'elle est prête
 *
 * ── Le panneau de règles est du HTML, dans une iframe ─────────────────────
 *
 * `btn_info` ouvre une iframe plein cadre (paysage : 1280×721 à y = 39 ;
 * portrait : la colonne de 450 px, contenu rendu à 0,704) sur
 * `uat-history.tadagaming.com/en-US/intro?game=<gid>&betmin=…&betmax=…&
 * oddsmax=…&winmax=…&token=…`, une application Nuxt dont le texte défile
 * dans `div.layout-main-content` (536 px visibles en paysage, 5 700 à 9 500 px
 * de haut). Ses sections, relevées sur 526, 2 et 505 : les symboles (Wild,
 * Scatter, Free Game…), « Paytable », « Game Rules », « Game Interruption
 * Mechanism », « Payout Information » (« Maximum Payout Multiplier: 10,000x »,
 * « Minimum bet: 0.2 », « Maximum bet: 200 »), « Buttons ». Le texte est
 * lisible dans le DOM, donc vérifiable sans OCR ; les captures, elles,
 * passent par l'OCR du runner comme partout.
 *
 * ── Le RTP n'est pas affiché, et c'est une décision de l'opérateur ────────
 *
 * Aucune des 5 078 lettres du panneau de 526 ne dit « RTP » — ni 2, ni 505.
 * Ce n'est pas une omission du jeu : l'application charge
 * `GET /v2/game-setting/switch-off-status/2` et reçoit
 * `"IsRtpItemDisplay": false` — le même sur l'hôte de production. Le
 * composant `intro-rtp-value` existe, avec sa formulation prête
 * (`i18_INTRO_SHARE_RTP` = « RTP = {txt0} », suivi de « The RTP was
 * calculated by simulating 100000000 rounds of gameplay. »), et l'API
 * `GET /v2/game-setting/rtp/2/526/48` répond même deux valeurs :
 * `BaseRtpValue 0.9606, IsCert true` et `0.9708, IsCert false`. Mais l'ApiId 2
 * — l'opérateur de démo du site public — a le drapeau éteint, et le joueur ne
 * voit **rien**. La règle du site est que seul ce qui est affiché est cité :
 * une valeur lue dans une réponse d'API, avec deux candidats dont un « non
 * certifié », n'est pas un chiffre affiché. On ne l'écrit pas.
 *
 * Conséquence à connaître avant de lancer une campagne : les captures se
 * publient (le runner les garde sans RTP), mais **aucune fiche TaDa ne
 * devient publiable** par cette voie — il lui manquera toujours le taux. La
 * campagne apporte l'image ; le chiffre viendra d'ailleurs ou ne viendra pas.
 *
 * ── Cadence ───────────────────────────────────────────────────────────────
 *
 * Une centaine de chargements le 14/09/2026, par rafales de cinq à quarante
 * à une minute d'intervalle, sans un refus : `LoginTrial` répond 302 en 0,2 s
 * à chaque fois, le serveur de jeu n'a jamais rendu de 429. Le seuil, s'il
 * existe, n'est pas publié ; aucune pause n'est posée, `--pause=` en ajoute
 * une.
 */
import type { Frame, Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/**
 * L'enveloppe de démo du studio — la seule forme de `demoUrl` en base.
 *
 * C'est elle qu'on ouvre : l'URL finale du jeu porte un `ssoKey` frappé à
 * chaque ouverture, figer celle-là reviendrait à figer un jeton de session.
 */
const ENVELOPPE = /tadagaming\.com\/PlusTrial\/\d+\//;

/** L'iframe du panneau de règles, et son conteneur qui défile. */
const CADRE_REGLES = /tadagaming\.com\/[a-zA-Z-]+\/intro\?/;
const DEFILEUR = '.layout-main-content';

/** Le plafond de vues d'un règlement : au-delà, la fiche se noie dans sa documentation. */
const PRISES_MAX = 8;

/**
 * La bande gauche que `lireLesRegles` ne lit pas (son recadrage part de
 * x = 130) : le texte du panneau, lui, commence à x ≈ 108 en paysage. Sans
 * cette marge l'OCR lirait « he Wild symbol ». En portrait le texte est déjà
 * dans la colonne centrale et la marge ne coûte que quelques pixels.
 */
const MARGE_OCR = 'padding-left: 80px !important; padding-right: 40px !important;';

/** Un nœud de la scène, en pixels du viewport, avec le texte de son Label. */
interface Noeud {
  x: number;
  y: number;
  label: string;
}

/**
 * Ce que le graphe de scène dit des nœuds qu'on cherche, en un seul aller.
 *
 * Un nœud n'est rendu que s'il est actif **et** que toute sa lignée l'est :
 * `btn_info` existe dans la scène dès le chargement, sous un menu inactif, et
 * le prendre pour présent ferait cliquer dans le vide. La conversion monde →
 * pixels est faite ici, dans la page, où le viewport et l'échelle sont connus.
 */
const LIRE_LA_SCENE = `(() => {
  const cc = window.cc;
  if (!cc || !cc.director || !cc.director.getScene()) return null;
  const scene = cc.director.getScene();
  const vp = cc.view.getViewportRect();
  const sx = cc.view.getScaleX();
  const sy = cc.view.getScaleY();
  const canvas = document.querySelector('canvas');
  const dpr = window.devicePixelRatio || 1;
  const voulus = new Set(['Btn_Loading', 'Btn_Play', 'btn_comm', 'btn_info', 'btn_spin']);
  const trouves = {};
  const visite = (n, actif) => {
    if (!n) return;
    actif = actif && n.active;
    if (actif && voulus.has(n.name) && !trouves[n.name]) {
      const w = n.worldPosition;
      const label = n.getComponentInChildren ? n.getComponentInChildren(cc.Label) : null;
      trouves[n.name] = {
        x: Math.round((vp.x + w.x * sx) / dpr),
        y: Math.round((canvas.height - (vp.y + w.y * sy)) / dpr),
        label: label && label.string ? String(label.string).slice(0, 40) : '',
      };
    }
    for (const c of n.children || []) visite(c, actif);
  };
  visite(scene, true);
  return trouves;
})()`;

/**
 * Lit la scène ; `null` tant qu'il n'y en a pas, et une erreur nommée si le
 * transport lui-même est cassé.
 *
 * Sous Chromium, après le sabotage, `evaluate` échoue dans le script
 * utilitaire de Playwright (« argsAndHandles.slice is not a function ») :
 * c'est la signature du sabotage, et on la dit avec ces mots-là.
 */
async function lireLaScene(page: Page): Promise<Record<string, Noeud> | null> {
  try {
    return (await page.evaluate(LIRE_LA_SCENE)) as Record<string, Noeud> | null;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/slice is not a function|is not defined/.test(message)) {
      // Le runner ne montre que 60 caractères : l'essentiel d'abord.
      throw new Error('saboté par JScrambler sous Chromium : lancer Firefox (en-tête)');
    }
    return null;
  }
}

async function cliquer(page: Page, noeud: Noeud): Promise<void> {
  await page.mouse.click(noeud.x, noeud.y);
}

const cadreDesRegles = (page: Page): Frame | undefined =>
  page.frames().find((f) => CADRE_REGLES.test(f.url()));

/**
 * `navigateur` n'est pas encore un champ de l'interface `Adaptateur` : le
 * type intersection le laisse compiler seul, et le runner le lira le jour où
 * l'interface et `capturer-jeux.ts` le connaîtront (diff dans le rapport).
 */
export const TADA: Adaptateur = {
  studio: 'tada',

  demoExploitable: (url) => ENVELOPPE.test(url),

  /** Firefox, parce que Chromium sous Playwright est détecté (voir l'en-tête). */
  navigateur: 'firefox',

  /**
   * Deux secondes, et c'est volontairement trop peu pour un jeu : le vrai
   * chargement est attendu dans `ouvrirLeJeu`, sur le témoin du jeu lui-même
   * (« Continue » dans l'intro), parce qu'il varie de 20 à 42 s d'un jeu à
   * l'autre et d'une charge du poste à l'autre.
   */
  chargementMs: 2_000,

  /*
   * Pas de `avecTete` : Firefox sans tête reçoit le jeu, rouleaux, menu et
   * panneau compris — le piège Wazdan (une fiche marketing servie à un
   * User-Agent « Headless ») a été cherché et n'existe pas ici.
   */

  async ouvrirLeJeu(page) {
    /*
     * Un identifiant inconnu répond 200 avec `{"ErrorCode":2,"Message":"Game
     * Unavailable"}` dans le corps : un code 200 ne prouve rien, ici non plus.
     */
    const corps = await page.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => '');
    if (/Game Unavailable/i.test(corps)) throw new Error('démo retirée : « Game Unavailable »');

    let erreurDePage = '';
    page.on('pageerror', (e) => {
      erreurDePage ||= String(e).slice(0, 80);
    });

    /*
     * L'intro, reconnue à son bouton et non à un délai.
     *
     * Trois issues, chacune nommée : le bouton dit « Continue » ; une
     * `pageerror` et toujours pas de scène à 20 s (le build qui ne tourne pas
     * sous Firefox) ; une scène sans `Btn_Loading` à 45 s (jeu de tir, table :
     * leur accueil n'a pas ce nœud). Quatre-vingt-dix secondes, parce qu'un
     * poste chargé a déjà mis 42 s, et qu'un jeu qui n'y arrive pas doit
     * sortir avec un diagnostic, pas après une minute d'attente d'un panneau.
     */
    const debut = Date.now();
    let scene: Record<string, Noeud> | null = null;
    for (;;) {
      scene = await lireLaScene(page);
      const ecoule = Date.now() - debut;
      if (scene?.Btn_Loading && /continue/i.test(scene.Btn_Loading.label)) break;
      if (!scene && erreurDePage && ecoule > 20_000) {
        throw new Error(`le jeu plante au chargement sous Firefox (${erreurDePage})`);
      }
      if (scene && !scene.Btn_Loading && ecoule > 45_000) {
        throw new Error("écran d'accueil sans « Continue » : pas une machine à sous (tir, table) ?");
      }
      if (ecoule > 90_000) throw new Error('intro jamais prête à 90 s');
      await page.waitForTimeout(1_000);
    }
    await page.waitForTimeout(2_000);
    await cliquer(page, scene!.Btn_Loading);

    /*
     * « PLAY », sur les jeux qui l'ont : le bouton apparaît puis ignore un
     * clic donné dans la seconde (vu sur 3 Witch's Lamp : cliqué à
     * l'apparition, toujours là 35 s plus tard). On le laisse se poser, on
     * clique, et on reprend une fois s'il est encore là.
     */
    for (let essai = 0; essai < 3; essai++) {
      await page.waitForTimeout(3_000);
      const s = await lireLaScene(page);
      if (!s?.Btn_Play) break;
      await cliquer(page, s.Btn_Play);
    }

    // La barre de commandes, puis le repos des rouleaux d'entrée.
    for (let i = 0; i < 40; i++) {
      const s = await lireLaScene(page);
      if (s?.btn_comm) break;
      await page.waitForTimeout(1_000);
    }
    await page.waitForTimeout(3_000);
    const s = await lireLaScene(page);
    if (!s?.btn_comm) throw new Error('barre de commandes jamais apparue après « Continue »');
    if (!s.btn_spin) throw new Error('pas de bouton de tour : pas une machine à sous');
  },

  /**
   * Le menu, le « i », l'iframe, et le défilement de son contenu.
   *
   * On rend 0, jamais `SANS_PANNEAU` : les trois générations vues ont toutes
   * ce panneau, ouvert par le même chemin. Un échec ici est un échec à
   * l'ouvrir — un poste chargé, une animation qui avale le clic — pas un jeu
   * qui n'en a pas.
   */
  async capturerLesRegles(page, cliche) {
    let s = await lireLaScene(page);
    if (!s?.btn_comm) return 0;
    await cliquer(page, s.btn_comm);
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1_000);
      s = await lireLaScene(page);
      if (s?.btn_info) break;
    }
    if (!s?.btn_info) return 0;
    await cliquer(page, s.btn_info);

    /*
     * L'iframe arrive en une seconde, son contenu en quatre ou cinq de plus :
     * l'application Nuxt va chercher ses textes (`language/en-US?GroupIds…`)
     * avant de rendre quoi que ce soit. On attend donc le défileur **et** sa
     * hauteur, pas la seule existence de la frame.
     */
    let cadre: Frame | undefined;
    let hauteur = 0;
    for (let i = 0; i < 30 && !hauteur; i++) {
      await page.waitForTimeout(1_000);
      cadre = cadreDesRegles(page);
      if (!cadre) continue;
      hauteur = await cadre
        .evaluate((sel) => document.querySelector(sel)?.scrollHeight ?? 0, DEFILEUR)
        .catch(() => 0);
    }
    if (!cadre || !hauteur) return 0;

    await cadre.addStyleTag({ content: `${DEFILEUR} { ${MARGE_OCR} }` }).catch(() => {});
    await page.waitForTimeout(700);

    /*
     * Un cran : la hauteur visible moins une ligne, pour qu'aucune ligne ne
     * soit coupée sur toutes les vues à la fois. Puis le plafond ; et, quoi
     * qu'il arrive, des vues **placées** sur les sections que le garde-fou de
     * publication reconnaît (`GAME RULES`, `PAYTABLE`) — c'est là que sont
     * aussi les faits utiles (paiements, plafond de gain, mises). Les vues en
     * double sont écartées en aval, sur comparaison d'images.
     */
    const cran = await cadre.evaluate(
      (sel) => Math.max(200, (document.querySelector(sel)?.clientHeight ?? 500) - 40),
      DEFILEUR,
    );
    let prises = 0;
    await cliche(`regles-${++prises}`);
    for (let n = 0; n < 40 && prises < PRISES_MAX - 3; n++) {
      const bouge = await cadre.evaluate(
        ({ sel, pas }) => {
          const boite = document.querySelector(sel) as HTMLElement | null;
          if (!boite) return false;
          const avant = boite.scrollTop;
          boite.scrollTop = avant + pas;
          return boite.scrollTop !== avant;
        },
        { sel: DEFILEUR, pas: cran },
      );
      if (!bouge) break;
      await page.waitForTimeout(600);
      await cliche(`regles-${++prises}`);
    }
    for (const titre of ['Paytable', 'Game Rules', 'Payout Information']) {
      const placee = await cadre.evaluate(
        ({ sel, motif }) => {
          const boite = document.querySelector(sel) as HTMLElement | null;
          if (!boite) return false;
          const cible = Array.from(boite.querySelectorAll('h1,h2,h3,h4,h5')).find(
            (e) => (e.textContent ?? '').trim().toLowerCase() === motif.toLowerCase(),
          );
          if (!cible) return false;
          const avant = boite.scrollTop;
          boite.scrollTop = avant + cible.getBoundingClientRect().top - boite.getBoundingClientRect().top - 8;
          return boite.scrollTop !== avant;
        },
        { sel: DEFILEUR, motif: titre },
      );
      if (!placee) continue;
      await page.waitForTimeout(600);
      await cliche(`regles-${++prises}`);
    }
    return prises;
  },

  /**
   * Aucun achat de bonus n'est cherché.
   *
   * La base n'en connaît aucun (`achatBonus` est `null` sur les 233 fiches),
   * le paquet de langue du studio prévoit des « Buy Bonus » (« Buy Bonus RTP=
   * {txt0} »), mais aucun des jeux ouverts n'en montre, et le nom du nœud qui
   * le porterait n'a pas été vu. Cliquer à une position supposée produirait
   * une image du jeu de base légendée « Buying the feature » — la faute que le
   * contrôle `/BUY/i` de Pragmatic existe pour empêcher.
   */
  async capturerLAchat() {
    return false;
  },
};
