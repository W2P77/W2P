/**
 * L'adaptateur de capture de Play'n GO.
 *
 * Fichier séparé de `adaptateurs.ts` à dessein : plusieurs studios sont
 * instruits en parallèle, et la table `ADAPTATEURS` est le seul point où ils se
 * croisent. Le branchement s'y fait en une ligne, quand ce fichier est prêt.
 *
 * ── Ce que Play'n GO publie, et ce qu'il ne publie pas ─────────────────────
 *
 * **Aucune démo Play'n GO n'affiche de RTP.** Ce n'est pas une lecture ratée,
 * c'est un fait vérifié sur les trois habillages du studio : ni la table de
 * gains du jeu, ni la surcouche « Game Rules » n'énoncent le moindre
 * pourcentage. Les deux seules phrases qui contiennent le sigle sont des
 * incises — « Gamble will not impact the overall RTP », « This does not affect
 * the theoretical published RTP » — sans valeur associée.
 *
 * Ce n'est pas une omission de la démo. Le lanceur passe `jurisdiction=ZZ`, et
 * forcer ce paramètre à MGA, GB, SE, DK, ES ou DE rend **exactement le même
 * texte, au caractère près** : la valeur n'est pas dans la page, elle est dans
 * le paramétrage opérateur. C'est ce que dit déjà le champ `ouSourcer` du
 * studio, et la reconnaissance le confirme.
 *
 * Conséquence assumée : cet adaptateur capture de la **documentation**, pas un
 * chiffre. `lireLesRegles` rendra `rtp: null`, `capturer-jeux.ts` laissera donc
 * la fiche sur son niveau de confiance précédent et publiera les images. C'est
 * le comportement voulu — un RTP Play'n GO ne peut venir que du communiqué de
 * presse, à la main.
 *
 * ── Pourquoi la surcouche « ? » est capturée en premier ────────────────────
 *
 * `capturer-jeux.ts` refuse de publier un jeu dont aucune capture ne porte
 * `EN_TETE_PANNEAU` (`/RTP|GAME RULES|PAYTABLE/i`), et le renvoie en file. Or
 * la table de gains Play'n GO n'écrit **aucun** de ces trois mots : elle ne
 * montre que des symboles, des montants et le nom des fonctions. Seule la
 * surcouche du « ? » porte le titre « Game Rules ».
 *
 * Sans elle, tout le catalogue Play'n GO serait rechargé à chaque campagne
 * pour échouer au même endroit — le piège déjà payé chez Pragmatic avec les
 * classiques historiques. D'où l'ordre : le « ? » d'abord, il est la preuve ;
 * la table de gains ensuite, elle est l'illustration.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/**
 * Le préambule juridique de la surcouche d'aide, identique sur tous les jeux.
 *
 * On ne peut pas se servir de `EN_TETE_PANNEAU` pour *vérifier* l'ouverture :
 * son titre « Game Rules » est à y≈277, hors de la bande haute que lit
 * `lireLEcran` (y 30→220). Ce qui s'y trouve, en revanche, c'est le bloc
 * « Unfinished Games » suivi de « Malfunction voids all pays and plays. » —
 * mot pour mot le même sur Crystal Sun, Book of Dead et Moon Princess Extreme.
 * C'est du texte noir sur blanc, ce que l'OCR lit le mieux.
 */
const AIDE_PLAYNGO = /UNFINISHED\s*GAMES|MALFUNCTION\s*VOIDS/i;

/** Le « ? » de la barre noire du lanceur, présent sur les trois habillages. */
const BOUTON_AIDE = { x: 122, y: 787 };
/** La croix de la surcouche d'aide, en haut à droite du cadre blanc. */
const FERMER_AIDE = { x: 1116, y: 41 };

/**
 * Le bouton CONTINUE du carrousel d'accueil, à deux hauteurs près.
 *
 * ── Pourquoi un balayage et pas la touche Espace ───────────────────────────
 *
 * Chez Pragmatic, Espace ferme l'accueil. Ici c'est jouable — le panneau
 * annonce « Spacebar to spin » — mais le réglage « Spacebar to spin » est
 * **actif par défaut** (vu dans le menu Settings) : une fois l'accueil fermé,
 * un second Espace lance un tour, et la capture « jeu de base » montrerait
 * alors des rouleaux en mouvement ou un gain. On clique donc.
 *
 * Les deux hauteurs viennent de la mesure : 672 px sur Crystal Sun et Moon
 * Princess Extreme, 648 px sur Book of Dead. L'abscisse 637 est commune, et
 * surtout elle évite les deux pièges du carrousel : la case « Don't show
 * again » (x≈810 à 875 selon le jeu) et le bouton SPIN (x≈940 à 1030).
 *
 * Un balayage plus large a été essayé — y ∈ {624, 648, 672, 700} — et **il
 * abîme la capture de base** : sur l'habillage classique, 700 px tombe sur les
 * commandes de mise et fait passer Book of Dead de 0,02 à 0,03 de valeur de
 * jeton. Deux hauteurs suffisent, et un clic manqué n'atteint que la barre
 * « PRESS SPIN TO BEGIN », qui est un simple bandeau de message.
 */
const CONTINUER = [672, 648];

/**
 * Les deux boutons qui ouvrent la table de gains, selon l'habillage.
 *
 * · Le « i » rond, en bas à gauche du cadre de jeu : habillages modernes
 *   (Crystal Sun, Moon Princess Extreme).
 * · Le bouton texte PAYTABLE, en bas à droite : habillage classique
 *   (Book of Dead et la famille Rich Wilde), qui n'a pas de « i » du tout.
 */
const TABLE_DE_GAINS = [
  { x: 158, y: 734, habillage: 'moderne' },
  { x: 1093, y: 679, habillage: 'classique' },
];

/**
 * Empreinte de l'écran, pour décider si un clic a fait quelque chose.
 *
 * C'est la même idée que le tri des doublons de `capturer-jeux.ts`, mais posée
 * ici parce que l'adaptateur en a besoin **pendant** la reconnaissance et non
 * après. Le recadrage laisse tomber la barre noire du lanceur (y > 775), qui
 * ne change jamais et diluerait l'écart.
 *
 * Mesures relevées : 18,3 pour un vrai changement de page (Crystal Sun),
 * 19,1 pour un vrai défilement (Moon Princess Extreme), et 0,0 à 4,1 quand le
 * clic n'a rien fait. Le fond des jeux est animé, d'où un seuil et non une
 * égalité — 8 tient largement au milieu des deux régimes.
 */
const SEUIL_A_BOUGE = 8;

async function empreinte(page: Page): Promise<Buffer> {
  const png = await page.screenshot();
  return sharp(png)
    .extract({ left: 40, top: 40, width: 1200, height: 700 })
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

/** Un tour de balayage sur le bouton CONTINUE du carrousel. */
async function fermerLAccueil(page: Page): Promise<void> {
  for (const y of CONTINUER) {
    await page.mouse.click(637, y);
    await page.waitForTimeout(1500);
  }
}

export const PLAYNGO: Adaptateur = {
  studio: 'playn-go',

  /**
   * Huit secondes, et c'est volontairement trop peu pour un jeu.
   *
   * Ce délai-là est attendu par `capturer-jeux.ts` sur l'URL de la base, qui
   * pour 148 des 180 fiches Play'n GO est la **page vitrine** du studio
   * (`playngo.com/games/<slug>/`) — un site Wix, prêt en cinq secondes. Le vrai
   * chargement du jeu se produit dans `ouvrirLeJeu`, après la redirection vers
   * le lanceur, et il y est attendu explicitement.
   */
  chargementMs: 8_000,

  /**
   * De la page vitrine au jeu, puis fermeture du carrousel d'accueil.
   *
   * ── Pourquoi on lit le lien plutôt que de fabriquer l'URL ──────────────────
   *
   * Le lanceur a une forme régulière :
   * `https://<hôte>.playngonetwork.com/casino/ContainerLauncher?pid=2&gid=<gid>
   * &lang=en_GB&practice=1&channel=desktop&demo=2`. On serait tenté de la
   * composer à partir du slug — c'est faux deux fois. L'hôte change (`asccw`
   * pour Crystal Sun, `released` pour Moon Princess Extreme) et le `gid` n'est
   * pas le slug : `book-of-dead` est servi par `gid=bookofdead`, et la vitrine
   * de Crystal Sun porte aussi un `gid=bookofdeadgc` sur un encart voisin.
   *
   * La page vitrine, elle, est du DOM ordinaire — c'est le seul endroit de
   * toute la chaîne Play'n GO qui ne soit pas un `<canvas>`. On y prend le lien
   * que le studio publie lui-même, en filtrant sur `channel=desktop` : le même
   * bouton existe en `channel=mobile`, et le rendu mobile ne tient pas dans le
   * viewport 1280×800 attendu par les recadrages OCR.
   *
   * ── Trente fiches n'arriveront jamais ici ──────────────────────────────────
   *
   * 30 des 180 `demoUrl` pointent sur `demo.playngo.com/RGSGameLaunch/...` :
   * **ce domaine ne résout plus** (`ERR_NAME_NOT_RESOLVED`, confirmé aussi hors
   * navigateur). Ces fiches échoueront au `goto` du script, avant même cette
   * fonction. Il n'y a rien à rattraper ici : c'est la base qu'il faut corriger,
   * en les réécrivant vers `playngo.com/games/<slug>/`.
   */
  async ouvrirLeJeu(page) {
    if (/playngo\.com\/(games|post)\//.test(page.url())) {
      const lanceur = (await page.evaluate(`(() => {
        const liens = Array.from(document.querySelectorAll('a'))
          .map((a) => a.href)
          .filter((h) => /ContainerLauncher/.test(h) && /channel=desktop/.test(h));
        return liens.length ? liens[0] : null;
      })()`)) as string | null;
      // Sans lien de lancement, on laisse la page en l'état : la suite ne
      // trouvera aucun panneau et rendra 0, ce qui remet le jeu en file. Le
      // silence serait pire — on capturerait la vitrine en croyant tenir le jeu.
      if (!lanceur) return;
      await page.goto(lanceur, { waitUntil: 'load', timeout: 120_000 });
    }

    /*
     * Dix-huit secondes, mesurées et non devinées : à t+5 s la barre de
     * progression est à moitié, à t+10 s le carrousel d'accueil est affiché.
     * On prend de la marge parce que le carrousel **tourne tout seul** et que
     * cliquer pendant une transition de page ne ferme rien.
     */
    await page.waitForTimeout(18_000);
    await fermerLAccueil(page);
    await page.waitForTimeout(2_500);
  },

  /**
   * La surcouche « Game Rules », puis la table de gains.
   *
   * ── Trois habillages, et un seul point commun ──────────────────────────────
   *
   * La reconnaissance a trouvé trois interfaces, et elles ne partagent que la
   * barre noire du lanceur, en bas :
   *
   * **Moderne fenêtré** (Crystal Sun) — un « i » violet à (158, 734) ouvre un
   * cadre incrusté, x 105→1180, y 65→650, **paginé** : flèches à (150, 603) et
   * (315, 603), pastilles au milieu, croix rouge à (1152, 93).
   *
   * **Moderne plein écran** (Moon Princess Extreme) — le même « i », mais la
   * table de gains couvre tout le viewport et **défile à la molette** ; la
   * flèche de pagination n'existe pas, un clic à (315, 603) y rend 0,0 d'écart.
   *
   * **Classique** (Book of Dead, la famille Rich Wilde) — pas de « i » du tout.
   * Un bouton texte PAYTABLE à (1093, 679), un cadre paginé dont les flèches
   * sont ailleurs : (232, 578) et (332, 578).
   *
   * D'où le principe, repris de l'adaptateur Pragmatic : on n'affirme rien, on
   * essaie et on vérifie. L'ouverture est vérifiée par l'OCR quand un texte
   * connu existe, par comparaison d'images quand il n'y en a pas.
   */
  async capturerLesRegles(page, cliche, lireLEcran) {
    /* ── 1. La surcouche « ? » ──────────────────────────────────────────────
     *
     * Elle est capturée d'abord parce qu'elle est la seule preuve exploitable
     * (voir l'en-tête du fichier), et parce que son échec est informatif : si
     * elle ne s'ouvre pas, c'est presque toujours que le carrousel d'accueil
     * est encore là. On lui redonne donc sa chance avant d'abandonner.
     */
    let aideOuverte = false;
    for (let essai = 0; essai < 3 && !aideOuverte; essai++) {
      if (essai > 0) await fermerLAccueil(page);
      await page.mouse.click(BOUTON_AIDE.x, BOUTON_AIDE.y);
      await page.waitForTimeout(6_000);
      aideOuverte = AIDE_PLAYNGO.test(await lireLEcran());
    }
    if (!aideOuverte) return 0;

    let n = 0;
    /*
     * Le texte d'aide tient sur un écran chez les jeux simples (Crystal Sun :
     * 680 px pour 680 px de cadre) et déborde chez les autres (Book of Dead et
     * Moon Princess Extreme : 932 et 934 px). Trois vues couvrent les deux cas ;
     * les doublons du premier sont écartés en aval, sur comparaison d'images.
     */
    await page.mouse.move(640, 400);
    for (let vue = 0; vue < 3; vue++) {
      await cliche(`regles-${++n}`);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(1_500);
    }
    await page.mouse.click(FERMER_AIDE.x, FERMER_AIDE.y);
    await page.waitForTimeout(2_500);

    /* ── 2. La table de gains ───────────────────────────────────────────────
     *
     * Tout ce qui suit est du bonus : la publication est déjà acquise grâce à
     * l'aide. On ne prend donc aucun risque — chaque étape est vérifiée, et le
     * moindre doute rend la main avec ce qu'on a.
     */
    const avant = await empreinte(page);
    let ouverte = false;
    for (const bouton of TABLE_DE_GAINS) {
      await page.mouse.click(bouton.x, bouton.y);
      await page.waitForTimeout(4_000);
      if (ecartMoyen(avant, await empreinte(page)) > SEUIL_A_BOUGE) {
        ouverte = true;
        break;
      }
      /*
       * Le clic n'a rien ouvert — ou a ouvert puis refermé. Sur l'habillage
       * classique, (158, 734) tombe sur l'étiquette « COIN VALUE », qui est
       * décorative ; sur les modernes, (1093, 679) tombe sur le décor. Aucun
       * des deux ne déclenche de tour, c'est pour ça que ces deux positions-là
       * ont été retenues parmi les candidates.
       */
    }
    if (!ouverte) return n;

    /*
     * Quel geste fait avancer la table de gains ? On l'apprend en le faisant.
     *
     * L'ordre compte : la flèche moderne d'abord (la majorité du catalogue),
     * la flèche classique ensuite, la molette en dernier. La molette est mise
     * au bout parce qu'elle est la seule à ne jamais échouer bruyamment — sur
     * un cadre paginé elle ne fait rien, et on ne saurait plus rien conclure.
     */
    const GESTES: Array<{ nom: string; agir: () => Promise<void> }> = [
      { nom: 'flèche fenêtrée', agir: async () => page.mouse.click(315, 603) },
      { nom: 'flèche classique', agir: async () => page.mouse.click(332, 578) },
      {
        nom: 'molette',
        agir: async () => {
          // La molette agit sous le curseur : il faut le poser dans le cadre,
          // que le clic d'ouverture a laissé tout en bas de l'écran.
          await page.mouse.move(640, 400);
          await page.mouse.wheel(0, 500);
        },
      },
    ];

    let precedente = await empreinte(page);
    await cliche(`regles-${++n}`);

    let geste: (typeof GESTES)[number] | null = null;
    for (const candidat of GESTES) {
      await candidat.agir();
      await page.waitForTimeout(2_200);
      const actuelle = await empreinte(page);
      if (ecartMoyen(precedente, actuelle) > SEUIL_A_BOUGE) {
        geste = candidat;
        precedente = actuelle;
        await cliche(`regles-${++n}`);
        break;
      }
      precedente = actuelle;
    }
    // Une table de gains d'une seule page existe : ce n'est pas un échec, et
    // la vue déjà prise la documente entièrement.
    if (!geste) return n;

    /*
     * Six vues au plus, et on s'arrête dès que l'écran ne bouge plus.
     *
     * Sans cette sortie, un cadre de trois pages rendrait six captures dont
     * trois doublons — que le tri d'aval jetterait, mais après les avoir
     * écrites, converties et comptées. Et un panneau qui défile bute en bas
     * sans rien dire : c'est exactement le cas que le compteur seul ne voit pas.
     */
    const VUES_MAX = 6;
    for (let vue = 2; vue < VUES_MAX; vue++) {
      await geste.agir();
      await page.waitForTimeout(2_200);
      const actuelle = await empreinte(page);
      if (ecartMoyen(precedente, actuelle) < SEUIL_A_BOUGE) break;
      precedente = actuelle;
      await cliche(`regles-${++n}`);
    }

    return n;
  },

  /**
   * Play'n GO ne vend pas de fonction bonus dans ses démos.
   *
   * Vérifié sur les trois habillages : aucun bouton d'achat à l'écran, et le
   * texte d'aide — qui énumère pourtant chaque commande, jusqu'à « Hyper
   * Spin » — n'en mentionne aucun. Quelques titres récents du studio proposent
   * un achat chez certains opérateurs, mais pas dans la démo `pid=2` du site
   * du studio, qui est la seule chose qu'on ouvre ici.
   *
   * On rend donc `false` sans cliquer. Chercher à l'aveugle produirait une
   * image du jeu de base légendée « Buying the feature » — la faute que le
   * contrôle `/BUY/i` de l'adaptateur Pragmatic existe précisément pour
   * empêcher. Si un habillage à achat apparaît un jour, c'est ici qu'il faudra
   * poser le même genre de vérification, pas un clic de plus.
   */
  async capturerLAchat() {
    return false;
  },
};
