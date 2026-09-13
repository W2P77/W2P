/**
 * L'adaptateur de capture de **Nolimit City**.
 *
 * ── Pourquoi il n'est pas une troisième entrée de l'adaptateur Red Tiger ──
 *
 * Le CHANGELOG du 12/09/2026 dit que Nolimit City « tourne sur la plateforme
 * de Red Tiger et NetEnt », et c'est vrai **de la page hôte seulement** :
 * `nolimitcity.com/demo/<tableId>` est le même document Next.js multi-tenant
 * (`/[tenant]/demo/[tableId]`, tenant `nolimitcity`), avec la même porte d'âge
 * « Yes, I'm 18 or older » et la même surcouche Radix. Mais le jeu, lui, ne
 * passe **pas** par `fansite.evo-games.com/entry` ni par l'application Vue de
 * `/launcher/` : la page hôte pose une iframe `about:blank` que l'embed
 * `nolimitjs.nolimitcdn.com/dist/nolimit-latest.js` remplit avec le lanceur
 * propre du studio — `demo.nolimitcdn.com/loader/loader-desktop.html`, puis
 * `demo.nolimitcdn.com/games/<Jeu>/<version>/game.js` (PixiJS), serveur
 * `demo.nolimitcity.com/EjsFrontWeb/fs`. Aucun jeton, aucun `/entry`.
 *
 * Branché tel quel, l'adaptateur Red Tiger échoue trois fois : sa regex
 * `DEMO_JOUABLE` ne connaît pas `nolimitcity.com` (« 142 écartés, 0 jeux à
 * capturer »), son `CADRE_JEU` (`/launcher/`) ne matche jamais, et il conclut
 * au bout de 75 s à `LimiteDeDebit('fansite.evo-games.com')` — un ban qui
 * n'existe pas. Vérifié le 13/09/2026, dix ouvertures, toutes servies en 200.
 *
 * ── Ce que le jeu donne, et ce qu'il ne donne pas ─────────────────────────
 *
 * Les commandes du jeu sont peintes dans le canvas (`@nolimitcity/slot-keypad`,
 * PixiJS) : ≡, CONTINUE, X sont des coordonnées, pas des sélecteurs. Le jeu
 * est dessiné en 1280×720 (`info.json`) et mis à l'échelle dans le canvas, et
 * la barre de commandes est ancrée aux bords : on clique donc en **proportion
 * de la boîte du canvas**, jamais en pixels de page — le cadre est décalé par
 * les deux barres de navigation de l'hôte, et ce décalage n'est pas garanti.
 *
 * En revanche, le **menu** que ≡ ouvre est du HTML dans le document du jeu :
 * `#gameInfoContainer` porte trois sections, `#paytable` (h1 « Pay table »),
 * `#rules` (h1 « Game rules », puis `#game`, `#gamble`, `#common`) et
 * `#gui-guide`. C'est une seule page défilante de 12 000 px, avec un ascenseur
 * dont `scrollTop` s'écrit et se vérifie (mesuré : 0 → 5 974 → 0 → 4 933).
 * La ligne `li.rtp` — « The theoretical return to the player for this game
 * is 96.10% » — est remplie par le serveur à l'ouverture (avant, les gabarits
 * portent « -1% ») et vaut, sur Bangkok Hilton, exactement le chiffre de la
 * base. Les lignes suivantes, `li.rtp.rtp-feature`, donnent le taux des
 * achats de fonction et des xBoost : ce n'est **pas** celui du jeu, et le
 * sélecteur les exclut.
 *
 * ── Deux limites qui vivent dans d'autres fichiers ─────────────────────────
 *
 * 1. `extraireLesFaits` (`lecture-regles.ts`) exigeait le sigle `RTP` après
 *    « theoretical » ; Nolimit écrit « theoretical return to the player for
 *    this game is 96.10% », sans sigle, et la lecture rendait `rtp: null`.
 *    La formulation y est désormais (`formulationNolimit`), ancrée sur « for
 *    this game is » pour ne jamais attraper le taux d'un achat de fonction,
 *    qui suit la même tournure sur la même page. Verrouillé par un test.
 *
 * 2. Le garde-fou de publication (`EN_TETE_PANNEAU`) veut lire `RTP`,
 *    `GAME RULES`, `PAYTABLE` ou `MALFUNCTION VOIDS ALL PAYS` dans l'OCR, et
 *    `lireLesRegles` recadre à partir de x=130. Or Nolimit écrit son texte à
 *    partir de x≈74 et son titre à x≈33 : l'OCR lisait « e rules » et
 *    « lfunction voids all pays », et les quatre vues étaient refusées — la
 *    fiche repartait en file à chaque campagne. D'où la feuille de style
 *    injectée dans `capturerLesRegles` : 120 px de marge à gauche du menu, et
 *    rien d'autre. Vérifié hors ligne — un décalage de 120 px sur les mêmes
 *    captures fait lire « Game rules » — puis dans le jeu.
 *
 * ── Sans tête, et c'est mesuré ─────────────────────────────────────────────
 *
 * Chez Red Tiger, c'est `fansite.evo-games.com` — derrière Akamai — qui refuse
 * un Chromium sans tête, pas la page hôte. Nolimit ne l'appelle jamais : en
 * sans-tête, Beheaded a chargé son canvas et son nom en 18 s le 13/09/2026,
 * et la simulation du runner a photographié le menu. Une campagne de 144
 * fiches n'ouvre donc aucune fenêtre sur le poste. Si un jour le lanceur
 * Nolimit passe derrière une protection du même genre, le symptôme sera « le
 * cadre du jeu Nolimit n'est jamais apparu » sur toute la campagne : c'est
 * ici qu'il faudra remettre `avecTete: true`, et nulle part ailleurs.
 *
 * ── La cadence n'est pas celle d'Evolution ─────────────────────────────────
 *
 * Le lanceur Nolimit n'est pas compté par `fansite.evo-games.com`. Dix
 * ouvertures en vingt-cinq minutes le 13/09/2026, dont trois en cinq minutes,
 * toutes servies. Le seuil du studio n'est pas publié et n'a pas été cherché
 * — c'est un partenaire — donc la pause est une précaution alignée sur
 * BGaming et Evoplay, pas une mesure. `--pause=` la remplace.
 */
import type { Frame, Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/** La page produit `nolimitcity.com/games/<slug>` n'est pas un jeu : on l'écarte. */
const DEMO_JOUABLE = /nolimitcity\.com\/demo\//;

/** Le conteneur que le lanceur Nolimit pose dans le document du jeu. */
const CONTENEUR = '.nolimit.container';
/** Le même, une fois le jeu chargé : c'est le témoin qu'on attend. */
const PRET = '.nolimit.container.ready';
/** La page HTML du menu (table de gains, règles, guide). */
const MENU = '#gameInfoContainer';

/** La taille native du jeu, celle dans laquelle ses commandes sont placées. */
const JEU = { largeur: 1280, hauteur: 720 };

/**
 * Les commandes du canvas, en coordonnées du jeu. Relevées à l'écran sur
 * Bangkok Hilton, puis vérifiées par leur effet (le menu qui s'ouvre, le menu
 * qui se ferme), jamais supposées.
 *
 * · CONTINUE ferme le carrousel de présentation des fonctions ; sur un jeu
 *   qui n'en aurait pas, le point tombe sous les rouleaux et ne fait rien.
 * · ≡ vit en bas à gauche, au-dessus du bouton du son ; le bundle le place à
 *   `t.left + i` sur cette rangée. Un premier essai en bas à droite a basculé
 *   le tour rapide, sans autre effet.
 * · X est la croix de la barre latérale du menu, en bas à droite.
 */
const CONTINUER = { x: 640, y: 615 };
const OUVRIR_MENU = { x: 50, y: 536 };
const FERMER_MENU = { x: 1224, y: 638 };

/**
 * La marge qui met le texte dans le champ de l'OCR. Voir l'en-tête : le
 * recadrage de `lireLesRegles` commence à x=130, le titre du jeu à x≈33.
 */
const STYLE_POUR_L_OCR = `${MENU}{padding-left:120px !important;box-sizing:border-box !important}`;

/**
 * Masque le mobilier de la page hôte qui recouvre le jeu.
 *
 * Copie de `DEGAGER_LHOTE` de l'adaptateur Red Tiger, qui ne l'exporte pas :
 * c'est la même page hôte, avec la même porte d'âge (qu'on ne clique pas —
 * elle remonte l'iframe) et la même surcouche Radix anonyme. Sans lui, la
 * surcouche « intercepts pointer events » et Playwright refuse tout clic
 * dans le canvas, trente secondes durant. Vu à la troisième ouverture.
 *
 * Pas de fonction imbriquée ici ni dans aucun `evaluate` de ce fichier : tsx
 * les décore d'un `__name(...)` qui n'existe pas dans la page, et le corps
 * échoue en « __name is not defined ». Payé sur une sonde.
 */
const DEGAGER_LHOTE = () => {
  let masques = 0;
  for (const element of Array.from(document.querySelectorAll('body *'))) {
    const noeud = element as HTMLElement;
    if (noeud.tagName === 'IFRAME' || noeud.querySelector('iframe')) continue;
    const style = getComputedStyle(noeud);
    if (style.display === 'none') continue;
    const boite = noeud.getBoundingClientRect();
    if (!boite.width || !boite.height) continue;
    const texte = (noeud.innerText ?? '').trim();
    const nommee = /18 or older|Cookie Policy|DEMO MODE/i.test(texte) && texte.length < 400;
    const anonyme =
      style.position === 'fixed' &&
      texte === '' &&
      boite.width >= innerWidth * 0.9 &&
      boite.height >= innerHeight * 0.9;
    if (nommee || anonyme) {
      noeud.style.setProperty('display', 'none', 'important');
      masques++;
    }
  }
  document.body.style.setProperty('pointer-events', 'auto', 'important');
  return masques;
};

const degager = (page: Page) => page.evaluate(DEGAGER_LHOTE).catch(() => 0);

/**
 * Le cadre du jeu, reconnu à son contenu et non à son URL : l'embed Nolimit
 * écrit le document dans une iframe `about:blank`, qui n'a pas d'adresse.
 */
async function cadreDuJeu(page: Page): Promise<Frame | undefined> {
  for (const cadre of page.frames()) {
    if (cadre === page.mainFrame()) continue;
    const trouve = await cadre
      .evaluate((sel) => !!document.querySelector(sel), CONTENEUR)
      .catch(() => false);
    if (trouve) return cadre;
  }
  return undefined;
}

const present = (cadre: Frame, selecteur: string): Promise<boolean> =>
  cadre.evaluate((sel) => !!document.querySelector(sel), selecteur).catch(() => false);

/** Vrai quand la page du menu est affichée — c'est le DOM qui le dit, pas l'image. */
const menuOuvert = (cadre: Frame): Promise<boolean> =>
  cadre
    .evaluate((sel) => {
      const menu = document.querySelector(sel) as HTMLElement | null;
      if (!menu) return false;
      const boite = menu.getBoundingClientRect();
      return boite.width > 0 && boite.height > 0 && getComputedStyle(menu).visibility !== 'hidden';
    }, MENU)
    .catch(() => false);

/**
 * Clique une commande peinte dans le canvas, désignée en coordonnées du jeu.
 *
 * Playwright calcule le point dans la boîte du canvas, à travers l'iframe :
 * c'est lui qui sait où est le cadre, et il lève si le clic est intercepté —
 * on ne clique pas dans le vide sans le savoir.
 */
async function cliquerLeJeu(cadre: Frame, point: { x: number; y: number }): Promise<boolean> {
  const canvas = cadre.locator('canvas').first();
  const boite = await canvas.boundingBox().catch(() => null);
  if (!boite) return false;
  return canvas
    .click({
      position: {
        x: (point.x / JEU.largeur) * boite.width,
        y: (point.y / JEU.hauteur) * boite.height,
      },
      timeout: 8_000,
    })
    .then(() => true)
    .catch(() => false);
}

/**
 * Amène une partie du menu en haut de l'écran, en pilotant son ascenseur.
 *
 * L'ascenseur est cherché par le plus grand débordement visible du document
 * — le menu est de loin le plus haut conteneur qui déborde — et `scrollTop`
 * est écrit **puis relu** : la question se pose à chaque studio (BGaming l'a
 * trouvé inopérant), elle ne se suppose jamais.
 *
 * La cible est soit un sélecteur (le premier élément visible qui y répond),
 * soit un motif cherché dans les **nœuds de texte** du menu : les titres de
 * section (« MAX WIN ») sont des `h2` sans identifiant, et le texte est le
 * seul moyen de les nommer. Un `Range` donne la position de la ligne même.
 */
const placer = (
  cadre: Frame,
  cible: { selecteur: string } | { motif: RegExp },
  marge = 24,
): Promise<boolean> =>
  cadre
    .evaluate(
      ({ selecteur, motif, marge }) => {
        let boite: HTMLElement | null = null;
        let debordement = 50;
        for (const e of Array.from(document.querySelectorAll('*'))) {
          const h = e as HTMLElement;
          const r = h.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const ecart = h.scrollHeight - h.clientHeight;
          if (ecart > debordement && h.clientHeight > 100) {
            debordement = ecart;
            boite = h;
          }
        }
        if (!boite) return false;
        const ascenseur = boite as HTMLElement;

        let haut: number | null = null;
        if (selecteur) {
          for (const c of Array.from(document.querySelectorAll(selecteur))) {
            const r = c.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              haut = r.top;
              break;
            }
          }
        } else if (motif) {
          const regle = new RegExp(motif, 'i');
          const marcheur = document.createTreeWalker(ascenseur, NodeFilter.SHOW_TEXT);
          let noeud: Node | null = null;
          while ((noeud = marcheur.nextNode())) {
            if (regle.test(noeud.textContent ?? '')) break;
          }
          if (noeud) {
            const zone = document.createRange();
            zone.selectNode(noeud);
            haut = zone.getBoundingClientRect().top;
          }
        }
        if (haut === null) return false;

        const avant = ascenseur.scrollTop;
        ascenseur.scrollTop = avant + haut - ascenseur.getBoundingClientRect().top - marge;
        return ascenseur.scrollTop !== avant || Math.abs(haut - ascenseur.getBoundingClientRect().top - marge) < 2;
      },
      {
        selecteur: 'selecteur' in cible ? cible.selecteur : null,
        motif: 'motif' in cible ? cible.motif.source : null,
        marge,
      },
    )
    .catch(() => false);

export const NOLIMIT_CITY: Adaptateur = {
  studio: 'nolimit-city',

  demoExploitable: (url) => DEMO_JOUABLE.test(url),

  /** Le lanceur Nolimit n'est pas derrière Akamai. Voir l'en-tête du fichier. */
  avecTete: false,

  /** Une précaution alignée sur BGaming et Evoplay, pas une mesure. */
  pauseEntreJeuxMs: 30_000,

  /**
   * Trois secondes : la page hôte est prête en moins de deux, et le jeu, lui,
   * est attendu activement dans `ouvrirLeJeu` — le canvas est apparu entre 2
   * et 5 s sur les essais, le témoin `.ready` de 1 à 8 s plus tard.
   */
  chargementMs: 3_000,

  async ouvrirLeJeu(page) {
    /*
     * Le cadre d'abord, le témoin `.ready` ensuite — et un dégagement de
     * l'hôte à chaque tour, parce que la porte d'âge arrive après le jeu.
     */
    let cadre: Frame | undefined;
    for (let seconde = 0; seconde < 75 && !cadre; seconde++) {
      await degager(page);
      cadre = await cadreDuJeu(page);
      if (!cadre) await page.waitForTimeout(1_000);
    }
    if (!cadre) throw new Error('le cadre du jeu Nolimit n’est jamais apparu');

    for (let essai = 0; essai < 40 && !(await present(cadre, PRET)); essai++) {
      await degager(page);
      await page.waitForTimeout(1_500);
    }
    await page.waitForTimeout(2_000);
    await degager(page);

    /*
     * CONTINUE ferme le carrousel de présentation. Il n'a pas de témoin
     * propre — c'est du canvas — mais le menu en a un : si ≡ n'ouvre rien
     * dans `capturerLesRegles`, c'est que le carrousel est encore là, et on
     * lui redonne sa chance là-bas.
     */
    await cliquerLeJeu(cadre, CONTINUER);
    await page.waitForTimeout(3_000);
    await degager(page);
  },

  /**
   * Quatre vues du menu, dans un ordre qui n'est pas celui de la page.
   *
   * 1. Le haut de « Game rules » — la seule vue qui porte un mot que le
   *    garde-fou de publication reconnaît. Elle passe en premier : le tri des
   *    doublons garde toujours la première capture.
   * 2. Le haut de « Pay table » — des images de symboles, qui séparent deux
   *    pages de texte pour que le tri les garde toutes (écarts mesurés 13,9 /
   *    17,8 / 13,7 pour un seuil de 6).
   * 3. « MAX WIN » — la section qui chiffre le plafond, absente de certains
   *    jeux, d'où le repli silencieux.
   * 4. La ligne du taux de retour, hors achats de fonction.
   */
  async capturerLesRegles(page, cliche) {
    const cadre = await cadreDuJeu(page);
    if (!cadre) return 0;

    await degager(page);
    await cliquerLeJeu(cadre, OUVRIR_MENU);
    await page.waitForTimeout(3_000);
    if (!(await menuOuvert(cadre))) {
      // Le carrousel de présentation a probablement avalé le premier clic.
      await cliquerLeJeu(cadre, CONTINUER);
      await page.waitForTimeout(2_500);
      await cliquerLeJeu(cadre, OUVRIR_MENU);
      await page.waitForTimeout(3_000);
    }
    /*
     * On rend 0, pas `SANS_PANNEAU` : tous les habillages Nolimit vus portent
     * ce menu. Un échec ici veut dire qu'on n'a pas su l'ouvrir, pas qu'il
     * n'existe pas — et `SANS_PANNEAU` retire le jeu de la file pour toujours.
     */
    if (!(await menuOuvert(cadre))) return 0;

    /*
     * La feuille de style va dans le `<body>`, en dernier : celle du jeu est
     * chargée à l'intérieur du conteneur, donc après un `<head>`, et une
     * déclaration de même spécificité posée plus tôt perd. D'où `!important`
     * aussi — les deux, parce qu'un seul des deux a déjà échoué.
     */
    await cadre
      .evaluate((css) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.body.appendChild(style);
      }, STYLE_POUR_L_OCR)
      .catch(() => {});
    await page.waitForTimeout(500);

    let prises = 0;
    const vues: Array<{ selecteur: string } | { motif: RegExp }> = [
      { selecteur: '#rules > h1' },
      { selecteur: '#paytable > h1' },
      { motif: /^\s*MAX WIN\s*$/ },
      { selecteur: 'li.rtp:not(.rtp-feature)' },
    ];
    for (const vue of vues) {
      if (!(await placer(cadre, vue))) continue;
      await page.waitForTimeout(1_200);
      await cliche(`regles-${++prises}`);
    }

    // La croix de la barre latérale ; Échap en repli, et on ne s'acharne pas.
    await cliquerLeJeu(cadre, FERMER_MENU);
    await page.waitForTimeout(2_000);
    if (await menuOuvert(cadre)) await page.keyboard.press('Escape');

    return prises;
  },

  /**
   * Nolimit vend ses fonctions — le bouton « Nolimit Bonus » est en haut à
   * droite de la barre de commandes — et la boîte est un dialogue HTML
   * (`bonus-feature`), donc vérifiable. Mais elle n'a pas été reconnue : on
   * rend `false` plutôt que de cliquer à l'aveugle et de légender le jeu de
   * base « Buying the feature ». C'est la prochaine chose à instruire, avec
   * un témoin DOM avant de photographier.
   */
  async capturerLAchat() {
    return false;
  },
};
