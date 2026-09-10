/**
 * Les adaptateurs de capture, un par studio.
 *
 * ── Pourquoi un adaptateur et pas une routine générique ───────────────────
 *
 * Chaque studio dessine son jeu dans un `<canvas>` : il n'y a **aucun DOM à
 * interroger**, donc aucun sélecteur. On ne peut pas demander « le bouton
 * d'info » — on ne peut que cliquer à un endroit. Ces endroits sont stables
 * *dans* un studio, qui réutilise le même habillage sur tous ses jeux, et
 * n'ont aucun rapport d'un studio à l'autre.
 *
 * D'où cette table : un studio, une séquence de coordonnées. Elle est le
 * résultat d'une reconnaissance manuelle — trois essais ont été nécessaires
 * chez Pragmatic pour trouver l'icône « i », que j'avais d'abord placée
 * 100 px trop à gauche.
 *
 * ── La fragilité est réelle, et elle est nommée ───────────────────────────
 *
 * Un studio qui redessine son interface casse son adaptateur, et rien ne le
 * signalera : le script continuera de cliquer dans le vide et produira des
 * captures du jeu de base, en croyant capturer la table de gains. C'est
 * pourquoi `verifierLaCapture` existe — on compare les captures entre elles,
 * et deux images identiques trahissent un clic qui n'a rien fait.
 */
import type { Page } from 'playwright';

/** Le jeu n'a pas de panneau de règles, et n'en aura jamais : c'est acquis. */
export const SANS_PANNEAU = -1;

import { BARRE_HISTORIQUE, EN_TETE_PANNEAU } from './lecture-regles';

export interface Adaptateur {
  studio: string;
  /** Le temps de chargement du jeu, mesuré et non deviné. */
  chargementMs: number;
  /** Ferme l'écran d'accueil, s'il y en a un. */
  ouvrirLeJeu(page: Page): Promise<void>;
  /**
   * Ouvre le panneau de règles et renvoie le nombre de captures prises —
   * les doublons en sont écartés plus loin, sur comparaison d'images.
   *
   * Renvoie `SANS_PANNEAU` pour un jeu qui n'en a pas **par conception** :
   * c'est un résultat, pas un échec, et le distinguer de 0 évite de remettre
   * indéfiniment en file un jeu qui n'aura jamais rien de plus à donner.
   *
   * `lireLEcran` rend le texte de ce qui est affiché à l'instant. Sans lui,
   * l'adaptateur cliquerait à l'aveugle — c'est ce qu'il faisait, et il
   * capturait sept fois le jeu de base en croyant feuilleter les règles.
   * Renvoie 0 s'il n'a pas su ouvrir le panneau.
   */
  capturerLesRegles(
    page: Page,
    cliche: (nom: string) => Promise<void>,
    lireLEcran: (bande?: 'haut' | 'bas') => Promise<string>,
  ): Promise<number>;

  /** Ouvre la boîte d'achat de bonus. Renvoie faux si le jeu n'en propose pas. */
  capturerLAchat(
    page: Page,
    cliche: (nom: string) => Promise<void>,
    lireLEcran: (bande?: 'haut' | 'bas') => Promise<string>,
  ): Promise<boolean>;
}

export const PRAGMATIC: Adaptateur = {
  studio: 'pragmatic-play',
  chargementMs: 30_000,

  /**
   * Ferme l'écran d'accueil : **la touche Espace**.
   *
   * ── Trois versions ratées avant la bonne ───────────────────────────────
   *
   * 1. **Un clic à position fixe** (1122, 527) — le bouton de lancement de
   *    Gates of Olympus. Échouait un jeu sur deux : la mise en page change.
   * 2. **Six positions essayées dès la 22ᵉ seconde.** Le problème n'était pas
   *    *où* cliquer mais *quand* : ces jeux mettent plus de 22 s à charger et
   *    n'écoutent pas avant.
   * 3. **Une détection de l'accueil par OCR**, pour attendre le bon moment.
   *    Elle ne lisait rien : le texte de l'accueil est décoratif, courbé,
   *    ombré — l'OCR en tire « TO START (UU ». Le panneau de règles se lit
   *    parfaitement, l'écran d'accueil pas du tout.
   *
   * La réponse était dans le panneau de règles lui-même : « SPACE and ENTER
   * buttons on the keyboard can be used to start and stop the spin. » Le gros
   * bouton rond de l'accueil n'est pas cliquable — c'est une **illustration**
   * dans la phrase « PRESS ⟳ TO START PLAYING! ». Vérifié à l'écran : Espace
   * ouvre le jeu, le clic sur le rond ne fait rien.
   */
  async ouvrirLeJeu(page) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(5000);
    // Filet, pour les rares habillages sans écran d'accueil ou qui l'ont
    // déjà fermé : un second Espace y lancerait un tour, sans conséquence.
    await page.keyboard.press('Space');
    await page.waitForTimeout(4000);
  },

  /**
   * Trouve l'icône « i », feuillette, referme.
   *
   * ── Pragmatic sert deux habillages, et tout en découle ─────────────────
   *
   * **Large** (Gates of Olympus, 5 Lions Dance) : le jeu occupe toute la
   * largeur, l'icône « i » colle au bord gauche à x=133, et le panneau de
   * règles est **paginé** — une flèche « suivant » en bas à gauche, « Page
   * 1/6 » en bas à droite.
   *
   * **Étroit** (les classiques à trois rouleaux, comme 777 Rush) : le jeu est
   * cadré au centre sur ~400 px, l'icône suit le cadre — x=466 ici, et la
   * largeur du cadre change d'un jeu à l'autre. Le panneau, lui, n'est pas
   * paginé du tout : il **défile**.
   *
   * Les deux erreurs que ça a coûtées, et qu'on ne refera pas :
   *
   * 1. Une coordonnée fixe pour l'icône. Elle marchait sur l'habillage large
   *    et ratait l'autre en silence — le script capturait sept fois le jeu de
   *    base. Le garde-fou du script les rejetait sans rien apprendre : ils
   *    revenaient échouer au lot suivant, indéfiniment.
   * 2. La flèche « suivant » cliquée sur l'habillage étroit. À (256, 625) on
   *    tombe **hors du panneau**, ce qui le referme : la première capture
   *    était bonne, les six suivantes montraient le jeu de base.
   *
   * D'où : on cherche l'icône en vérifiant après chaque clic, et la position
   * qui a marché nous dit lequel des deux habillages on a en face.
   */
  async capturerLesRegles(page, cliche, lireLEcran) {
    /*
     * Chaque candidat porte l'habillage qu'il désigne. Le large d'abord :
     * c'est la grande majorité du catalogue, la recherche n'y coûte rien.
     */
    const CANDIDATS: Array<{ x: number; large: boolean }> = [
      { x: 133, large: true },
      { x: 466, large: false }, // cadre ~400 px
      { x: 380, large: false }, // cadre plus large
      { x: 520, large: false }, // cadre plus étroit
    ];

    let large: boolean | null = null;
    for (const candidat of CANDIDATS) {
      await page.mouse.click(candidat.x, 745);
      await page.waitForTimeout(4500);
      if (EN_TETE_PANNEAU.test(await lireLEcran())) {
        large = candidat.large;
        break;
      }
      // Un clic manqué tombe sur le décor et n'ouvre rien ; Échap referme ce
      // qu'un clic malheureux aurait pu ouvrir avant d'essayer plus loin.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }
    if (large === null) {
      /*
       * Un troisième habillage existe, et il n'a pas de panneau du tout.
       *
       * Les classiques historiques (888 Gold et sa famille) peignent leur
       * table de gains en permanence à côté des rouleaux, sous une barre de
       * commandes grise ; l'engrenage n'ouvre que le son et le tour rapide.
       * Leur capture de base contient donc déjà toute leur documentation —
       * et leur RTP n'est affiché nulle part, donc on n'en écrira aucun.
       *
       * Les confondre avec un échec de recherche les renvoyait en file à
       * chaque campagne, pour un rechargement complet et le même échec.
       */
      return BARRE_HISTORIQUE.test(await lireLEcran('bas')) ? SANS_PANNEAU : 0;
    }

    /*
     * Sept captures, quel que soit l'habillage — mais pas par le même moyen.
     *
     * **Large** : le panneau est paginé, une flèche par page. Certains jeux
     * n'en ont que six ; le septième clic repasse par la première et le
     * doublon est écarté en aval, sur comparaison d'images.
     *
     * **Étroit** : le panneau défile, et il est long. Mesuré sur 777 Rush,
     * il faut **douze crans de molette** pour faire apparaître la ligne
     * « The theoretical RTP of this game is 96.50% » — c'est-à-dire la seule
     * qu'on vienne chercher. Sept crans s'arrêtaient juste avant, et le jeu
     * repartait sans son RTP alors que le panneau était bien ouvert.
     *
     * D'où le découplage : on descend cran par cran, mais on ne photographie
     * qu'un cran sur trois. Capturer chaque cran donnerait dix-huit images
     * quasi identiques sur la fiche ; en sauter deux sur trois donne sept
     * vues qui se suivent sans se répéter, et la dernière prise après la
     * boucle garantit qu'on montre le bas du panneau.
     */
    const CAPTURES = 7;

    if (large) {
      for (let n = 1; n <= CAPTURES; n++) {
        await cliche(`regles-${n}`);
        await page.mouse.click(256, 625); // la flèche « page suivante »
        await page.waitForTimeout(2200);
      }
    } else {
      const CRANS = 18;
      const UN_CRAN_SUR = 3;
      // La molette agit là où est le curseur : il faut le poser dans le
      // panneau, que le clic sur l'icône a laissé bien plus bas.
      await page.mouse.move(640, 380);
      for (let n = 0; n < CRANS; n++) {
        if (n % UN_CRAN_SUR === 0) await cliche(`regles-${n / UN_CRAN_SUR + 1}`);
        await page.mouse.wheel(0, 420);
        await page.waitForTimeout(1200);
      }
      await cliche(`regles-${CAPTURES}`); // le bas du panneau
      // Sur l'habillage étroit, un clic hors du cadre referme le panneau —
      // c'est précisément ce que faisait la flèche par erreur.
      await page.mouse.click(100, 400);
    }

    if (large) await page.mouse.click(1178, 49); // la croix, en haut à droite
    await page.waitForTimeout(2000);
    return CAPTURES;
  },

  /**
   * La boîte d'achat de bonus, **si le jeu en propose une**.
   *
   * Sans ce contrôle, on cliquait dans le vide, on capturait le jeu de base,
   * et on le publiait sous la légende « Buying the feature » : une image
   * fausse sur la fiche d'un jeu qui n'a même pas de tours gratuits. Le
   * bouton porte son nom à l'écran, on se contente de vérifier qu'il est là.
   */
  async capturerLAchat(page, cliche, lireLEcran) {
    if (!/BUY/i.test(await lireLEcran())) return false;
    await page.mouse.click(100, 165); // « BUY FREE SPINS », en haut à gauche
    await page.waitForTimeout(3500);
    await cliche('achat');
    return true;
  },
};

export const ADAPTATEURS: Record<string, Adaptateur> = {
  'pragmatic-play': PRAGMATIC,
};
