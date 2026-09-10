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
 * d'environ 1100×500 au milieu d'un document de 7 000 px de haut. Capturer
 * cette page donnerait des images du site de BGaming, pas du jeu.
 *
 * La vraie démo est ailleurs, et **la page nous la donne** : un bouton porte
 * `data-iframe-src="https://demo.bgaming-network.com/play/<Jeu>/FUN?server=demo"`.
 * On la lit dans le DOM et on y va. C'est le point important : cette URL n'est
 * **pas reconstruite** à partir du slug. La tentation était forte —
 * `hit-the-route` → `HitTheRoute` — mais le catalogue contient des titres
 * numérotés (`Dragon's Gold 100`) et ponctués dont la transcription en
 * chameau n'est pas devinable. On lit, on ne devine pas.
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
 *   aucun RTP** ; feuilleté jusqu'au bout sur All-Star Fruits, il s'arrête sur
 *   « Bet Ways » sans jamais donner un chiffre de retour ;
 * · l'icône « ? » (120, 703) ouvre le texte réglementaire — « About the game »,
 *   « How to play », « Autospins », puis **« Return to Player »**, et c'est là,
 *   et seulement là, qu'on lit « The overall theoretical Return to Player (RTP)
 *   is 97.04% ».
 *
 * Une première version ne capturait que l'onglet « i ». Elle ouvrait bien un
 * panneau, produisait de belles images, et ne rapportait aucun RTP — sans rien
 * signaler, puisque le panneau était réellement ouvert. C'est exactement le
 * mode d'échec que ce chantier essaie d'éviter. On capture donc les deux, et
 * le contrôle d'ouverture se fait sur l'onglet « ? », le seul dont l'en-tête
 * soit prononçable par l'OCR sur tous les jeux essayés.
 */
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

/**
 * L'en-tête qui prouve qu'on est dans l'onglet « ? ».
 *
 * `EN_TETE_PANNEAU` de `lecture-regles.ts` ne convient pas ici : il cherche
 * « RTP », « GAME RULES » ou « PAYTABLE », et la première page du panneau
 * BGaming n'affiche aucun des trois — elle affiche « Symbols », ou même
 * directement « Scatter » sur Aztec Magic Bonanza, qui n'a pas de titre de
 * section. Le contrôle aurait rejeté un panneau pourtant ouvert.
 *
 * La casse varie d'un jeu à l'autre — « About the Game » sur All-Star Fruits,
 * « About the game » sur Hit the Route — d'où le drapeau insensible.
 */
const EN_TETE_AIDE = /about the game|how to play|autospin|return to player|RTP/i;

/**
 * Le vocabulaire de la boîte d'achat de bonus.
 *
 * Les deux roues sont titrées « FREE SPINS » et « MAGIC SPINS » en très gros
 * ; l'OCR en tire « FREE MAGIC CDINEC CDINC » — les titres passent, « SPINS »
 * non. On se fie donc aux mots qui survivent, pas à la phrase.
 */
const MOTS_ACHAT = /FREE|MAGIC|BONUS|BUY|FEATURE/i;

/** La colonne d'icônes du panneau, en bas à gauche, identique sur tous les jeux. */
const ONGLET_INFO = { x: 120, y: 743 };
const ONGLET_AIDE = { x: 120, y: 703 };
/** Le bouton « CLICK TO START » de l'écran d'accueil. */
const DEMARRER = { x: 640, y: 655 };
/** Le bouton « BUY BONUS », à gauche des rouleaux, sur les jeux qui en ont un. */
const ACHAT = { x: 196, y: 420 };

/** Un cran de molette dans le panneau, mesuré : 500 px de document. */
const CRAN = 500;

/**
 * Combien de crans pour atteindre le bas de chaque onglet.
 *
 * Mesurés sur All-Star Fruits : 13 crans pour l'onglet « i », 11 pour « ? ».
 * On dépasse volontairement — un panneau butant en bas ne bouge plus, et les
 * captures surnuméraires sont des doublons que `capturer-jeux.ts` écarte sur
 * comparaison d'images. Dépasser coûte quelques secondes ; ne pas atteindre le
 * bas de l'onglet « ? » coûterait **le RTP**, qui y est l'avant-dernière
 * section. Le sens de l'erreur n'est pas symétrique.
 */
const CRANS_INFO = 12;
const CRANS_AIDE = 20;
/** Un cliché tous les N crans : au-delà, les vues se recouvrent et se ressemblent. */
const CADENCE_INFO = 3;
const CADENCE_AIDE = 4;

export const BGAMING: Adaptateur = {
  studio: 'bgaming',

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
   * 1500x ». Les flèches sont loin du centre (x≈260 et x≈1020), donc un clic
   * central ne fait jamais tourner le carrousel.
   *
   * Le second clic est un filet, pour les jeux qui n'ont pas d'écran d'accueil
   * ou dont le premier clic est arrivé pendant une transition. Il tombe alors
   * sur les rouleaux ou sur le décor, où BGaming ne lance rien : le tour se
   * déclenche par le bouton rond en bas à droite ou par la barre d'espace, pas
   * par un clic sur la grille. La capture « base » reste donc au repos.
   */
  async ouvrirLeJeu(page) {
    const demo = await page
      .locator(ATTRIBUT_DEMO)
      .first()
      .getAttribute('data-iframe-src', { timeout: 8_000 })
      .catch(() => null);

    if (demo) {
      await page.goto(demo, { waitUntil: 'load', timeout: 120_000 });
      // Mesuré à trois reprises : l'accueil est peint entre 4 et 11 s selon la
      // charge. Douze secondes laissent de la marge sans allonger la campagne
      // de façon sensible — c'est moins que ce que Pragmatic exige d'office.
      await page.waitForTimeout(12_000);
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
   * Le contrôle se fait en revanche sur l'onglet « ? », **avant** de capturer
   * quoi que ce soit. Vérifier sur l'onglet « i » ne marche pas : sa première
   * page n'a pas de titre commun d'un jeu à l'autre.
   */
  async capturerLesRegles(page, cliche, lireLEcran) {
    // Le clic sur « i » ouvre le panneau *et* déplie la colonne d'onglets :
    // « ? » n'est pas cliquable tant que le panneau est fermé.
    await page.mouse.click(ONGLET_INFO.x, ONGLET_INFO.y);
    await page.waitForTimeout(3_500);
    await page.mouse.click(ONGLET_AIDE.x, ONGLET_AIDE.y);
    await page.waitForTimeout(3_000);

    if (!EN_TETE_AIDE.test(await lireLEcran())) {
      /*
       * Une seconde tentative, et une seule.
       *
       * Le cas observé n'est pas un mauvais pointage mais un mauvais moment :
       * l'écran d'accueil encore affiché avale le clic, la colonne d'onglets
       * n'existe pas, et le second clic tombe dans le décor. Échap remet le
       * jeu à plat, un clic de plus ferme l'accueil s'il traînait encore.
       */
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1_500);
      await page.mouse.click(DEMARRER.x, DEMARRER.y);
      await page.waitForTimeout(3_000);
      await page.mouse.click(ONGLET_INFO.x, ONGLET_INFO.y);
      await page.waitForTimeout(3_500);
      await page.mouse.click(ONGLET_AIDE.x, ONGLET_AIDE.y);
      await page.waitForTimeout(3_000);
      if (!EN_TETE_AIDE.test(await lireLEcran())) {
        /*
         * On rend 0, pas `SANS_PANNEAU`.
         *
         * `SANS_PANNEAU` affirme qu'un jeu n'a **par conception** rien à
         * documenter, et retire définitivement le jeu de la file. Les trois
         * habillages BGaming rencontrés portent tous le même panneau : un
         * échec ici veut dire qu'on n'a pas su l'ouvrir, pas qu'il n'existe
         * pas. Le déclarer inexistant serait une affirmation qu'on ne peut
         * pas soutenir, et elle serait irréversible.
         */
        return 0;
      }
    }

    let prises = 0;
    const feuilleter = async (crans: number, cadence: number) => {
      // La molette agit sous le curseur, et le clic sur l'onglet l'a laissé en
      // bas à gauche, hors du panneau : sans ce recentrage, rien ne défile.
      await page.mouse.move(640, 400);
      for (let n = 0; n <= crans; n++) {
        if (n % cadence === 0) await cliche(`regles-${++prises}`);
        await page.mouse.wheel(0, CRAN);
        await page.waitForTimeout(900);
      }
    };

    await page.mouse.click(ONGLET_INFO.x, ONGLET_INFO.y);
    await page.waitForTimeout(2_500);
    await feuilleter(CRANS_INFO, CADENCE_INFO);

    await page.mouse.click(ONGLET_AIDE.x, ONGLET_AIDE.y);
    await page.waitForTimeout(2_500);
    await feuilleter(CRANS_AIDE, CADENCE_AIDE);

    /*
     * Échap plutôt que la croix.
     *
     * La croix ne tient pas en place : elle est à x=1136 sur l'onglet « i » et
     * à x=1099 sur l'onglet « ? », le panneau réservant sa gouttière à
     * l'ascenseur selon la longueur du contenu. Un clic à la mauvaise abscisse
     * tombe dans le panneau et ne referme rien — et `capturerLAchat`, appelé
     * juste après, cliquerait alors dans le règlement en croyant acheter un
     * bonus. Échap ferme les deux onglets, vérifié à l'écran.
     */
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2_500);
    return prises;
  },

  /**
   * La boîte d'achat de bonus, **si le jeu en propose une**.
   *
   * Le problème est que le bouton « BUY BONUS » de BGaming est peint à gauche
   * des rouleaux, vers y=420, alors que `lireLEcran` ne sait lire que la bande
   * haute (y 30-220) ou la bande basse (y 630-800) : on ne peut pas constater
   * sa présence avant de cliquer, comme le fait l'adaptateur Pragmatic.
   *
   * D'où le contrôle inversé : on lit la bande haute **avant** le clic, on
   * clique, on relit. Ce qu'on exige n'est pas qu'un mot d'achat soit présent
   * — le titre du jeu, écrit verticalement à droite, traverse la bande et
   * pourrait contenir « Magic » ou « Bonus » — mais qu'il soit **apparu**. Un
   * jeu sans bouton d'achat ne change rien à l'écran : le clic tombe sur le
   * décor, les deux lectures se ressemblent, et on rend faux.
   *
   * Le sens de l'erreur est choisi : un faux négatif coûte une image ; un faux
   * positif publierait le jeu de base sous la légende « Buying the feature »,
   * sur la fiche d'un jeu qui n'a peut-être même pas de tours gratuits.
   */
  async capturerLAchat(page, cliche, lireLEcran) {
    const avant = await lireLEcran();
    await page.mouse.click(ACHAT.x, ACHAT.y);
    await page.waitForTimeout(4_000);
    const apres = await lireLEcran();

    if (!MOTS_ACHAT.test(apres) || MOTS_ACHAT.test(avant)) {
      // Un clic malheureux a pu ouvrir autre chose : on remet à plat, sinon la
      // page suivante hériterait d'une boîte ouverte.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1_500);
      return false;
    }

    await cliche('achat');
    return true;
  },
};
