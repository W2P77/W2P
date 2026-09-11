/**
 * L'adaptateur de capture du studio **BGaming**.
 *
 * Il vit dans son propre fichier plutôt que dans `adaptateurs.ts` : plusieurs
 * studios se câblent en parallèle, et un fichier commun aurait fait de chaque
 * ajout un conflit. Le branchement se fait dans la table `ADAPTATEURS`.
 *
 * ── Ce que BGaming a de différent, et qui a dicté tout le reste ────────────
 *
 * Chez Pragmatic, la `demoUrl` en base **est** le jeu. Chez BGaming, non : les
 * 227 `demoUrl` du catalogue pointent sur la fiche marketing du site studio
 * (`bgaming.com/games/<slug>`), qui n'est pas un jeu mais une page de vente —
 * portail 18+, bandeau cookies, vidéo Vimeo, et le jeu confiné dans un encart
 * au milieu d'un long document. Capturer cette page donnerait des images du
 * site de BGaming, pas du jeu.
 *
 * La vraie démo est ailleurs, et **la page nous la donne** : un bouton porte
 * `data-iframe-src`. On la lit dans le DOM et on y va. C'est le point
 * important : cette URL n'est **pas reconstruite** à partir du slug. La
 * tentation était forte — `hit-the-route` → `HitTheRoute` — mais le catalogue
 * contient des titres numérotés (`Dragon's Gold 100`) et ponctués dont la
 * transcription en chameau n'est pas devinable. On lit, on ne devine pas.
 *
 * L'hôte de cet attribut n'est d'ailleurs pas constant : `bgaming-network.com`
 * sur Adventures, `demo.bgaming-network.com` sur All-Star Fruits et Alice
 * Wonderluck. Les deux redirigent vers `demo.bgaming-network.com/games/<Jeu>/
 * FUN?launch_token=…`, jeton compris — une raison de plus de lire l'attribut
 * au lieu de composer quoi que ce soit.
 *
 * Bénéfice secondaire, et il compte pour la cadence : l'URL directe rend un
 * `<canvas>` de 1280×800 exactement, donc le jeu occupe tout le viewport, et
 * les recadrages OCR de `lecture-regles.ts` retombent dessus sans réglage.
 *
 * ── Le RTP n'est pas dans le panneau qu'on croit ──────────────────────────
 *
 * L'habillage BGaming a **deux** onglets de documentation, empilés dans une
 * colonne d'icônes en bas à gauche, et ils ne disent pas la même chose :
 *
 * · l'icône « i » (120, 743) ouvre la table des symboles, les fonctions et les
 *   lignes de gain — c'est le plus beau pour la fiche, et il **ne contient
 *   aucun RTP** ;
 * · l'icône « ? » (120, 703) ouvre le texte réglementaire — « About the game »,
 *   « How to play », « Autospins », puis **« Return to Player »**, et c'est là,
 *   et seulement là, qu'on lit « The overall theoretical Return to Player (RTP)
 *   is 97.04% ».
 *
 * Une première version ne capturait que l'onglet « i ». Elle ouvrait bien un
 * panneau, produisait de belles images, et ne rapportait aucun RTP — sans rien
 * signaler, puisque le panneau était réellement ouvert. C'est exactement le
 * mode d'échec que ce chantier essaie d'éviter.
 *
 * ── Les deux onglets ne sont pas faits de la même matière ─────────────────
 *
 * Découvert à la reconnaissance, et c'est ce qui rend cet adaptateur fiable :
 * l'onglet « ? » est du **HTML** (`div.casino-modal-scroll`), l'onglet « i »
 * est peint dans le `<canvas>`. On a donc, pour le seul onglet qui porte le
 * chiffre, un témoin exact de ce qui est affiché et de l'endroit où se trouve
 * la ligne du RTP — au lieu d'un nombre de crans de molette deviné.
 *
 * Ce qui **ne** marche pas, et qu'il ne faut pas réessayer : écrire
 * `scrollTop`. Le conteneur est pourtant en `overflow: auto`, mais la valeur
 * posée retombe à 0 sans rien déplacer — mesuré. Et la molette avance d'un pas
 * **fixe de 193 px quel que soit le `deltaY`** : 500, 1 200 et 3 000 donnent
 * exactement le même déplacement. Le seul réglage qui agisse est donc le
 * *nombre* d'événements, ce qui condamne tout calcul fondé sur l'amplitude.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/**
 * L'attribut qui porte l'URL de la vraie démo sur la fiche marketing.
 *
 * Présent dans le HTML initial, avant tout clic : ni le portail 18+ ni le
 * bandeau cookies n'ont besoin d'être fermés pour le lire, ce qui économise
 * deux interactions et une bonne dizaine de secondes par jeu.
 */
const ATTRIBUT_DEMO = 'button[data-iframe-src]';

/** Le panneau réglementaire, et lui seul : c'est du HTML, pas du canvas. */
const PANNEAU_AIDE = '.casino-modal-scroll';

/**
 * L'en-tête qui prouve que l'onglet « ? » est **peint**, et pas seulement
 * présent dans le DOM.
 *
 * `EN_TETE_PANNEAU` de `lecture-regles.ts` ne convient pas ici : il cherche
 * « RTP », « GAME RULES » ou « PAYTABLE », et la première page du panneau
 * BGaming n'affiche aucun des trois — elle affiche « About the game ». Le
 * contrôle aurait rejeté un panneau pourtant ouvert.
 *
 * La casse varie d'un jeu à l'autre — « About the Game » sur All-Star Fruits,
 * « About the game » sur Adventures — d'où le drapeau insensible.
 */
const EN_TETE_AIDE = /about the game|how to play|autospin|return to player|RTP/i;

/** La colonne d'icônes du panneau, en bas à gauche, identique sur tous les jeux. */
const ONGLET_INFO = { x: 120, y: 743 };
const ONGLET_AIDE = { x: 120, y: 703 };
/** Le bouton « CLICK TO START » de l'écran d'accueil. */
const DEMARRER = { x: 640, y: 655 };

/**
 * Les deux emplacements connus du bouton « BUY BONUS ».
 *
 * Il n'en a pas un seul, et c'est tout le problème : à gauche des rouleaux sur
 * All-Star Fruits (196, 420), tout en haut à gauche sur Adventures (147, 182).
 * Une coordonnée unique — c'est ce que faisait la version précédente — rate
 * donc une partie du catalogue **en silence**, exactement la panne que
 * l'adaptateur Pragmatic a payée sur son icône « i ».
 *
 * Les deux points ont été choisis parmi des candidats inertes : vérifié à
 * l'écran, un clic qui les manque tombe sur le parchemin ou sur la grille, où
 * BGaming ne lance rien — le tour se déclenche par le bouton rond en bas à
 * droite ou par la barre d'espace. La capture de base reste au repos.
 */
const ACHAT = [
  { x: 196, y: 420 },
  { x: 147, y: 182 },
];

/**
 * Le pas de la molette dans le panneau : 193 px, mesuré, et insensible au
 * `deltaY` demandé. Le panneau fait 600 px de haut, donc trois crans couvrent
 * presque exactement un écran, sans trou ni recouvrement inutile.
 */
const CRANS_PAR_VUE = 3;

/**
 * Le plafond de balayage, et pourquoi il vaut 30.
 *
 * Le plus long panneau rencontré (Alice Wonderluck) mesure 4 757 px pour
 * 600 px de fenêtre, et sa ligne de RTP apparaît au **vingtième** cran. Un
 * plafond de 20, comme le portait la version précédente, s'arrêtait donc juste
 * avant le seul chiffre qu'on vienne chercher — et l'aurait fait sans rien
 * signaler, puisque le panneau était bien ouvert.
 */
const CRANS_MAX = 30;

/** Vrai si l'onglet « ? » est présent dans le DOM. */
async function aideDansLeDom(page: Page): Promise<boolean> {
  return page.evaluate((sel) => document.querySelector(sel) != null, PANNEAU_AIDE);
}

/**
 * Empreinte de l'écran, pour décider si un clic a fait quelque chose.
 *
 * L'onglet « i » est peint dans le canvas : il n'a ni identifiant ni texte
 * interrogeable, et sa première page n'a pas d'en-tête commun d'un jeu à
 * l'autre — « Symbols » ici, « Scatter » ailleurs. L'OCR ne peut donc pas
 * confirmer son ouverture. Ce qui la confirme, c'est que l'écran s'assombrit
 * entièrement : un panneau qui s'ouvre change tout, un clic manqué ne change
 * rien.
 *
 * Sans ce contrôle, un clic manqué donnerait cinq captures du jeu de base
 * publiées sous le titre « Game rules, page N » — le tri des doublons d'aval
 * n'en garde qu'une, mais il la garde.
 */
async function empreinte(page: Page): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract({ left: 200, top: 100, width: 880, height: 560 })
    .grayscale()
    .resize(16, 16, { fit: 'fill' })
    .raw()
    .toBuffer();
}

function ecartMoyen(a: Buffer, b: Buffer): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

/**
 * En dessous, rien n'a bougé.
 *
 * Mesuré : l'ouverture d'un panneau ou de la boîte d'achat dépasse 30 ; un
 * clic tombé dans le décor reste sous 3, le fond des jeux étant animé.
 */
const SEUIL_A_BOUGE = 12;

/**
 * Ce que le règlement du jeu dit de son achat de bonus, retenu par page.
 *
 * `capturerLAchat` a besoin de savoir si le jeu **vend** une fonction avant
 * d'aller la chercher à deux endroits. L'information existe, et elle est du
 * studio : le texte de l'onglet « ? » décrit le bouton quand il existe
 * (« Buy Bonus. A player has a possibility to buy a Bonus game… »). Elle est
 * lue pendant qu'on tient le panneau ouvert, puisqu'Échap le retire du DOM et
 * qu'on ne peut plus l'interroger ensuite.
 *
 * Une `WeakMap` et non une variable : le script capture deux jeux en
 * parallèle, et une valeur globale ferait répondre un jeu pour l'autre.
 */
const venteDeBonus = new WeakMap<Page, boolean>();

export const BGAMING: Adaptateur = {
  studio: 'bgaming',

  /** Leur `demoUrl` est la fiche marketing : c'est de là qu'on part. */
  demoExploitable: (url) => /bgaming\.com\/games\//.test(url),

  /*
   * Pas de `avecTete` : vérifié sur trois jeux, la démo BGaming se charge et
   * se joue en Chromium **sans tête**, contrairement au RGS de Hacksaw que
   * Cloudflare refuse. Le déclarer inutilement coûterait une fenêtre ouverte
   * par jeu sur toute une campagne.
   */

  /**
   * Trois secondes, et non trente.
   *
   * Ce délai est consommé par `capturer-jeux.ts` **sur la `demoUrl`**, c'est-
   * à-dire sur la fiche marketing, qui est un document HTML ordinaire chargé
   * en moins d'une seconde. Le vrai chargement — celui du moteur de jeu — est
   * attendu dans `ouvrirLeJeu`, après le saut vers la démo, parce que c'est le
   * seul endroit qui sache quand il commence.
   */
  chargementMs: 3_000,

  /**
   * Saute de la fiche marketing vers la démo, puis ferme l'écran d'accueil.
   *
   * L'écran d'accueil est un carrousel : un visuel de fonctionnalité, deux
   * flèches sur les côtés, un « CLICK TO START » centré en bas et un « MAX WIN
   * 2100x ». Les flèches sont loin du centre (x≈210 et x≈1070), donc un clic
   * central ne fait jamais tourner le carrousel.
   *
   * Le second clic est un filet, pour les jeux qui n'ont pas d'écran d'accueil
   * ou dont le premier clic est arrivé pendant une transition. Il tombe alors
   * sur les rouleaux ou sur le décor, où BGaming ne lance rien : vérifié à
   * l'écran, deux captures prises de part et d'autre d'un tel clic sont
   * identiques. La capture « base » reste donc au repos.
   *
   * ── Dix-huit secondes, et pourquoi c'est un chronomètre ─────────────────
   *
   * Le moteur ne publie aucun témoin exploitable : le `<canvas>` existe dès la
   * première seconde, pendant l'écran de chargement, et le DOM reste vide
   * jusqu'à l'ouverture d'un panneau. Il n'y a donc rien à attendre — mesuré
   * entre 10 et 15 s sur trois jeux, d'où 18. Le filet n'est pas le délai
   * lui-même mais la seconde tentative de `capturerLesRegles` : si l'accueil
   * est encore là, elle le referme et rouvre le panneau au lieu d'abandonner.
   */
  async ouvrirLeJeu(page) {
    const demo = await page
      .locator(ATTRIBUT_DEMO)
      .first()
      .getAttribute('data-iframe-src', { timeout: 8_000 })
      .catch(() => null);

    if (demo) {
      await page.goto(demo, { waitUntil: 'load', timeout: 120_000 });
      await page.waitForTimeout(18_000);
    }

    await page.mouse.click(DEMARRER.x, DEMARRER.y);
    await page.waitForTimeout(4_000);
    await page.mouse.click(DEMARRER.x, DEMARRER.y);
    await page.waitForTimeout(3_000);
  },

  /**
   * Ouvre le panneau, vérifie qu'il est bien ouvert, feuillette les deux
   * onglets, referme.
   *
   * L'ordre — table des symboles d'abord, texte réglementaire ensuite — est
   * celui dans lequel les images sortiront sur la fiche : on montre le jeu
   * avant de citer son règlement.
   *
   * Chaque onglet a son propre contrôle, parce qu'ils ne sont pas faits de la
   * même matière : comparaison d'images pour « i », qui est du canvas ; DOM
   * **et** OCR pour « ? », qui est du HTML — le DOM dit ce que le jeu croit
   * afficher, l'OCR dit ce qui est peint, et un panneau ouvert derrière le
   * canvas satisferait le premier seul.
   */
  async capturerLesRegles(page, cliche, lireLEcran) {
    const jeuAuRepos = await empreinte(page);

    // Le clic sur « i » ouvre le panneau *et* déplie la colonne d'onglets :
    // « ? » n'est pas cliquable tant que le panneau est fermé.
    let ouvert = false;
    for (let essai = 0; essai < 2 && !ouvert; essai++) {
      if (essai > 0) {
        /*
         * Une seconde tentative, et une seule.
         *
         * Le cas observé n'est pas un mauvais pointage mais un mauvais moment :
         * l'écran d'accueil encore affiché avale le clic et la colonne
         * d'onglets n'existe pas. Échap remet le jeu à plat, un clic de plus
         * ferme l'accueil s'il traînait encore.
         */
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1_500);
        await page.mouse.click(DEMARRER.x, DEMARRER.y);
        await page.waitForTimeout(3_000);
      }
      await page.mouse.click(ONGLET_INFO.x, ONGLET_INFO.y);
      await page.waitForTimeout(3_500);
      await page.mouse.click(ONGLET_AIDE.x, ONGLET_AIDE.y);
      await page.waitForTimeout(3_000);
      ouvert = (await aideDansLeDom(page)) && EN_TETE_AIDE.test(await lireLEcran());
    }
    if (!ouvert) {
      /*
       * On rend 0, pas `SANS_PANNEAU`.
       *
       * `SANS_PANNEAU` affirme qu'un jeu n'a **par conception** rien à
       * documenter, et le retire définitivement de la file. Les habillages
       * BGaming rencontrés portent tous le même panneau : un échec ici veut
       * dire qu'on n'a pas su l'ouvrir, pas qu'il n'existe pas. Le déclarer
       * inexistant serait une affirmation qu'on ne peut pas soutenir, et elle
       * serait irréversible.
       */
      await page.keyboard.press('Escape').catch(() => {});
      return 0;
    }

    /*
     * Le règlement décrit l'achat de bonus quand le jeu en vend un. On le note
     * maintenant : Échap retire le panneau du DOM, et `capturerLAchat` ne
     * pourrait plus le lire.
     */
    venteDeBonus.set(
      page,
      await page.evaluate((sel) => {
        const e = document.querySelector(sel) as HTMLElement | null;
        return /buy\s+bonus|buy\s+a\s+bonus|buy\s+feature/i.test(e?.innerText ?? '');
      }, PANNEAU_AIDE),
    );

    let prises = 0;

    /* ── 1. L'onglet « i », peint dans le canvas ──────────────────────────── */
    await page.mouse.click(ONGLET_INFO.x, ONGLET_INFO.y);
    await page.waitForTimeout(2_500);
    if (ecartMoyen(jeuAuRepos, await empreinte(page)) > SEUIL_A_BOUGE) {
      // La molette agit sous le curseur, et le clic sur l'onglet l'a laissé en
      // bas à gauche, hors du panneau : sans ce recentrage, rien ne défile.
      await page.mouse.move(640, 400);
      /*
       * Cinq vues, soit quinze crans : la table des symboles la plus longue
       * rencontrée en demandait treize. Dépasser ne coûte que des doublons,
       * que `capturer-jeux.ts` écarte sur comparaison d'images ; s'arrêter
       * trop tôt couperait la liste des fonctions en deux.
       */
      for (let vue = 0; vue < 5; vue++) {
        await cliche(`regles-${++prises}`);
        for (let cran = 0; cran < CRANS_PAR_VUE; cran++) {
          await page.mouse.wheel(0, 500);
          await page.waitForTimeout(500);
        }
        await page.waitForTimeout(400);
      }
    }

    /* ── 2. L'onglet « ? », qui porte le chiffre ──────────────────────────── */
    await page.mouse.click(ONGLET_AIDE.x, ONGLET_AIDE.y);
    await page.waitForTimeout(2_500);
    if (!(await aideDansLeDom(page))) {
      await page.keyboard.press('Escape');
      return prises;
    }

    /**
     * Où en est la ligne du RTP, en coordonnées d'écran.
     *
     * C'est la seule chose qu'on vienne chercher, et c'est aussi la dernière
     * section du panneau. Un balayage à nombre de crans fixé d'avance
     * s'arrêtait avant elle sur les panneaux longs — mesuré : vingt crans sur
     * Alice Wonderluck. On lit donc sa position réelle et on s'arrête quand
     * elle est à l'écran, ce qui marche aussi bien sur un panneau court.
     *
     * `null` quand le jeu ne publie pas la ligne : on balaie alors jusqu'au
     * plafond sans rien inventer, et `lireLesRegles` rendra `rtp: null`.
     */
    const hauteurDuRtp = () =>
      page.evaluate((sel) => {
        const m = document.querySelector(sel) as HTMLElement | null;
        if (!m) return null;
        const ligne = [...m.querySelectorAll('*')].find(
          (e) => e.children.length === 0 && /overall theoretical/i.test(e.textContent ?? ''),
        );
        return ligne ? Math.round(ligne.getBoundingClientRect().top) : null;
      }, PANNEAU_AIDE);

    await page.mouse.move(640, 400);
    for (let cran = 0; cran <= CRANS_MAX; cran++) {
      if (cran % CRANS_PAR_VUE === 0) await cliche(`regles-${++prises}`);
      const y = await hauteurDuRtp();
      // Le recadrage d'OCR de `lireLesRegles` s'arrête à y=680 : une ligne plus
      // basse serait dans la capture mais hors de ce que le moteur lira.
      if (y != null && y > 60 && y < 620) {
        await cliche(`regles-${++prises}`);
        break;
      }
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(600);
    }

    /*
     * Échap plutôt que la croix.
     *
     * La croix ne tient pas en place : elle est à x=1136 sur l'onglet « i » et
     * à x=1099 sur l'onglet « ? », le panneau réservant sa gouttière à
     * l'ascenseur selon la longueur du contenu. Un clic à la mauvaise abscisse
     * tombe dans le panneau et ne referme rien — et `capturerLAchat`, appelé
     * juste après, cliquerait alors dans le règlement en croyant acheter un
     * bonus. Échap ferme les deux onglets, vérifié à l'écran : le conteneur
     * disparaît du DOM.
     */
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2_500);
    return prises;
  },

  /**
   * La boîte d'achat de bonus, **si le jeu en vend une**.
   *
   * ── Pourquoi le règlement décide, et pas l'écran ────────────────────────
   *
   * Le bouton « BUY BONUS » est peint dans le canvas, à un endroit qui change
   * d'un jeu à l'autre (voir `ACHAT`). On ne peut donc ni le voir ni le viser
   * à coup sûr — mais on peut savoir s'il **existe** : le règlement lu à
   * l'onglet « ? » le décrit quand le jeu le propose. C'est une affirmation du
   * studio, pas une déduction de notre part.
   *
   * ── Pourquoi une comparaison d'images et pas un mot à l'écran ───────────
   *
   * La version précédente lisait la bande haute avant et après le clic et
   * exigeait qu'un mot d'achat soit **apparu**. Sur Adventures, le bouton
   * « BUY BONUS » est lui-même dans cette bande, à y≈180 : le mot y est donc
   * déjà avant le clic, et la règle rendait faux sur un jeu qui vend pourtant
   * sa fonction.
   *
   * Ce qu'on exige maintenant, c'est que l'écran ait **changé en grand** — une
   * boîte d'achat couvre le jeu — et que la bande haute porte le vocabulaire
   * de l'achat. Les deux ensemble, sur un jeu dont le règlement annonce la
   * fonction, ne laissent guère de place à une méprise.
   *
   * Le sens de l'erreur reste choisi : un faux négatif coûte une image ; un
   * faux positif publierait le jeu de base sous la légende « Buying the
   * feature », sur la fiche d'un jeu qui n'a peut-être pas de tours gratuits.
   */
  async capturerLAchat(page, cliche, lireLEcran) {
    if (!venteDeBonus.get(page)) return false;

    const avant = await empreinte(page);
    for (const bouton of ACHAT) {
      await page.mouse.click(bouton.x, bouton.y);
      await page.waitForTimeout(4_000);
      const aBouge = ecartMoyen(avant, await empreinte(page)) > SEUIL_A_BOUGE;
      if (aBouge && /FREE|MAGIC|BONUS|BUY|FEATURE|SPINS/i.test(await lireLEcran())) {
        await cliche('achat');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1_500);
        return true;
      }
      // Un clic malheureux a pu ouvrir autre chose : on remet à plat, sinon le
      // candidat suivant cliquerait par-dessus une boîte ouverte.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1_500);
    }
    return false;
  },
};
