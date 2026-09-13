/**
 * L'adaptateur de capture de **Spinomenal**.
 *
 * Fichier séparé de `adaptateurs.ts` à dessein : plusieurs studios s'instruisent
 * en parallèle, et la table `ADAPTATEURS` est le seul point où ils se croisent.
 * Le branchement s'y fait en une ligne.
 *
 * ── Ce que la base contient : la fiche produit, en deux sauts ──────────────
 *
 * Les 633 `demoUrl` pointent sur `spinomenal.com/<slug>/`, un WordPress servi
 * en 0,5 s. La fiche embarque une `<iframe id="game-iframe">` dont le `src`
 * est le lanceur, et **la page le réécrit au chargement** : `curl` y lit un
 * jeton figé de 2019 (`FUN_636959271879492949`), le navigateur un jeton frais
 * (`FUN_1A09B5BD…`). On lit donc le `src` dans la page rendue, jamais dans le
 * HTML brut, et on navigue dessus plein cadre — c'est la même manœuvre que
 * chez Hacksaw.
 *
 * Recensé sur les 633 fiches (`scripts/_tmp-spinomenal-scan.ts`, 13/09/2026),
 * le lanceur prend deux formes qui aboutissent au même `generic-play.html` :
 * `games.spinomenal.com/Play/Fun?…` (330, redirigé) et
 * `cdn-live.spinomenal.com/external_components/generic-play.html?…` (290,
 * direct). Deux hôtes de moindre importance : `cdn-latam` / `spinomenal-games.com`
 * (15, fonctionnent), et **`cdn-newdev` (13), un CDN de développement qui
 * répond « Error 9989 / Reload »** — ces fiches sont refusées avec un message
 * nommé, pas photographiées en noir.
 *
 * ── Deux moteurs sous la même enveloppe, et un seul témoin ─────────────────
 *
 * L'enveloppe `generic-play.html` (Vue) est commune, et c'est elle qui porte le
 * **panneau de règles en HTML** : `.paytable-screen-holder`, plein écran,
 * `display: none` au repos, avec un corps `.game-info-content-holder` qui
 * défile. C'est le seul point stable du studio, et c'est lui qui juge chaque
 * clic — pas l'OCR, pas une empreinte d'image. Un panneau ouvert se lit à sa
 * hauteur, point.
 *
 * Sous cette enveloppe, deux moteurs de jeu :
 *
 * · **Le récent** (~305 fiches) : un ruban de commandes en HTML
 *   (`.game-ribbon-manager`), avec `#paytable` à (88, 718), `#buy-feature` à
 *   (559, 708), et un corps `.PC-ui-container--body` dont l'**opacité dit
 *   l'état** — 0 pendant l'écran d'accueil, 0,5 sous un popup, 1 en jeu.
 * · **L'ancien** (~330 fiches, Construct 2, `#c2canvas`) : tout est peint dans
 *   le canvas, et le « ? » **change de place selon l'habillage** — (100, 722)
 *   sur Book of Sirens, (133, 727) sur Super Miner, (1152, 705) sur Kupala,
 *   (42, 262) sur les Retro. Les jeux « 1 Reel » (famille `Tower_`, ~55
 *   fiches, les deux moteurs) le mettent à (1243, 633).
 *
 * D'où : on essaie d'abord le bouton HTML s'il existe, puis des candidats
 * ordonnés par famille — la famille se lit dans le `gameCode` du lanceur
 * (`SlotMachine_`, `Retro_`, `Tower_`) — et on s'arrête au premier que le
 * témoin DOM confirme. Un candidat manqué tombe sur le décor : les positions
 * ont été confrontées à chaque habillage reconnu pour ne croiser ni le bouton
 * de tour, ni la mise, ni la maison (qui renvoie au site du studio).
 *
 * ── Aucun panneau ne publie le RTP, et ce n'est pas un défaut de lecture ────
 *
 * Lu dans le DOM du panneau, donc sans OCR, sur huit jeux des trois familles
 * et des deux moteurs : **pas une occurrence de « RTP » ni de pourcentage**.
 * Le studio publie ses taux sur sa fiche produit (une liste de versions, déjà
 * lue par le lecteur générique : 554 des 633 fiches ont leur RTP en base). La
 * campagne apportera donc les captures, jamais le chiffre — `rtp` sortira
 * `null`, la fiche garde son taux, et les 554 deviennent publiables.
 *
 * Le contrôle de publication de `capturer-jeux.ts` passe quand même : chaque
 * panneau écrit « Malfunction voids all pays » (section LINES ou HOW TO PLAY),
 * que `EN_TETE_PANNEAU` reconnaît, et la plupart citent aussi « the PAYTABLE ».
 *
 * ── Le sans-tête suffit ────────────────────────────────────────────────────
 *
 * Vérifié à l'image sur une douzaine de jeux en `headless: true` : rouleaux,
 * mise, panneau, boîte d'achat. Pas de Cloudflare, pas de 301 vers une page
 * marketing. Pas d'`avecTete`, donc — le poser coûterait une fenêtre par jeu.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/** L'iframe de la fiche produit, dont le `src` est le lanceur. */
const IFRAME_DU_JEU = '#game-iframe';

/** Le panneau de règles de l'enveloppe, plein écran quand il est ouvert. */
const PANNEAU = '.paytable-screen-holder';

/** Le corps du panneau, qui défile ; sa hauteur visible fait 692 px. */
const CORPS_DU_PANNEAU = '.game-info-content-holder';

/** La croix du panneau, en haut à droite : rend le jeu de base. */
const FERMER = { x: 1255, y: 25 };

/**
 * Le corps du ruban HTML du moteur récent, dont l'opacité dit où en est le jeu.
 *
 * Mesuré sur Demi Gods VI et 777 Frosty Charms : 0 tant que l'écran d'accueil
 * est affiché, 0,5 sous le popup « NEW FEATURE », 1 quand le jeu écoute. Sans
 * ce témoin, un clic sur `#paytable` juste après l'accueil tombait dans le
 * fondu d'entrée et ne faisait rien — vu sur Demi Gods VI, quatre secondes
 * après la fermeture de l'accueil.
 */
const RUBAN = '.PC-ui-container--body';

/** Le bouton « ? » du ruban HTML, et le bouton d'achat quand le jeu en vend un. */
const BOUTON_REGLES = '#paytable';
const BOUTON_ACHAT = '#buy-feature';

/** La boîte d'achat du moteur récent, en HTML — visible seulement ouverte. */
const BOITE_ACHAT = '.buy-feature-container';

/**
 * Un point de décor, où un clic ne fait rien d'autre que fermer un accueil.
 *
 * L'écran d'accueil (« START ») se ferme sur **n'importe quel clic** — vérifié
 * sur Demi Gods VI (moteur récent), Book of Sirens (ancien) et 1 Reel Aztec
 * Spell (Tower). Il n'y a donc pas à chercher le bouton, qui bouge d'un jeu à
 * l'autre. Le point est choisi hors de tout bouton sur les habillages reconnus :
 * la colonne d'icônes des Retro est à x=42 et commence à y≈240, le panneau
 * « RETRO BET » du moteur récent tient dans x<155 et y<245, la barre de
 * commandes est sous y=660.
 */
const DECOR = { x: 10, y: 400 };

/**
 * Le « CONTINUE » du popup « NEW FEATURE » des Retro, selon le moteur.
 *
 * Les jeux `Retro_` ouvrent sur une boîte « RETRO XTREME » qui **bloque le
 * « ? »** — vérifié sur 777 Devils Deal : le clic sur l'aide ne fait rien tant
 * qu'elle est là. Son bouton est à (640, 685) dans l'ancien moteur (Devils
 * Deal, Empire Rush, Flamingo Fever, Havana Nights), à (640, 600) dans le
 * récent (Frosty Charms).
 *
 * On ne clique **jamais** ces points hors d'un Retro : (640, 685) est le
 * bouton de tour sur les autres habillages, et lancerait un tour avant la
 * capture « jeu de base ».
 */
const CONTINUER_ANCIEN = { x: 640, y: 685 };
const CONTINUER_RECENT = { x: 640, y: 600 };

/**
 * Où vit le « ? » dans le canvas, par habillage — l'ordre suit la famille.
 *
 * Chaque point a été vérifié à l'image sur le jeu cité, puis confronté aux
 * autres habillages pour s'assurer qu'un clic manqué y tombe sur le décor.
 */
const AIDE_TOWER = { x: 1243, y: 633 }; // 1 Reel Aztec Spell, 1 Reel Baba Yaga
const AIDE_RETRO = { x: 42, y: 262 }; // 777 Devils Deal, Empire Rush, Flamingo Fever
const AIDE_SIRENES = { x: 100, y: 722 }; // Book of Sirens (ancien moteur, barre basse)
const AIDE_MINEUR = { x: 133, y: 727 }; // Super Miner Golden Treasure
const AIDE_KUPALA = { x: 1152, y: 705 }; // Kupala, l'habillage le plus ancien

/**
 * Le bouton « BUY » de l'ancien moteur, peint dans le canvas.
 *
 * (562, 706) sur Book of Sirens, (571, 713) sur Super Miner : un même bouton
 * d'une soixantaine de pixels. Le moteur récent a le sien en HTML au même
 * endroit, et c'est lui qu'on clique par sélecteur.
 */
const ACHAT_ANCIEN = { x: 565, y: 710 };

/**
 * Ce que la boîte d'achat de l'ancien moteur pèse à l'image.
 *
 * Elle est peinte dans le canvas : aucun DOM ne la signale. Mesuré sur Book of
 * Sirens : **47,7** d'écart sur le centre de l'écran quand elle s'ouvre, contre
 * 0 à 5 pour un jeu au repos dont le fond s'anime. Le seuil est au milieu.
 */
const SEUIL_ACHAT_OUVERT = 20;

/**
 * Le nombre de vues qu'on publie, indépendant de la longueur du panneau.
 *
 * Mesuré : 3 163 px sur Kupala, 3 456 sur les Retro, 4 967 sur Demi Gods VI,
 * 5 075 sur Book of Sirens, pour 692 px visibles — de cinq à huit écrans. Au
 * delà de huit, les vues sont réparties à intervalle régulier, la dernière
 * étant toujours le bas du panneau.
 */
const PRISES_MAX = 8;

/** En dessous, l'écran est encore l'écran noir de démarrage. */
const LUMINANCE_DU_JEU = 30;

/** Vrai si le panneau de règles est ouvert — sa hauteur, rien d'autre. */
async function panneauOuvert(page: Page): Promise<boolean> {
  return page.evaluate(
    `(() => { const e = document.querySelector(${JSON.stringify(PANNEAU)}); return !!e && e.getBoundingClientRect().height > 200; })()`,
  ) as Promise<boolean>;
}

/**
 * Le centre d'un élément visible, ou `null` s'il est absent ou replié.
 *
 * Lu dans le DOM et non par `locator.boundingBox()` : celui-ci **attend**
 * l'élément trente secondes quand il n'existe pas, et `#paytable` comme
 * `#buy-feature` n'existent pas sur l'ancien moteur. Mesuré avant la
 * correction : 42 s pour ouvrir le panneau de Kupala et 30 s de plus pour
 * répondre « pas d'achat », contre 13 s de bout en bout sur Demi Gods VI où
 * les deux boutons existent. Une minute perdue par jeu sur plus de 300 fiches.
 */
async function centre(page: Page, selecteur: string): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    `(() => { const e = document.querySelector(${JSON.stringify(selecteur)}); if (!e) return null; const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return null; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
  ) as Promise<{ x: number; y: number } | null>;
}

/** L'opacité du ruban HTML, ou `null` sur l'ancien moteur qui n'en a pas. */
async function opaciteDuRuban(page: Page): Promise<number | null> {
  return page.evaluate(
    `(() => { const e = document.querySelector(${JSON.stringify(RUBAN)}); return e ? Number(getComputedStyle(e).opacity) : null; })()`,
  ) as Promise<number | null>;
}

/** La luminance moyenne de l'écran, de 0 (noir) à 255. */
async function luminance(page: Page): Promise<number> {
  const e = await sharp(await page.screenshot()).grayscale().resize(16, 16, { fit: 'fill' }).raw().toBuffer();
  return e.reduce((a, b) => a + b, 0) / e.length;
}

/** Empreinte du centre de l'écran, là où s'ouvre une boîte d'achat. */
async function empreinte(page: Page): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract({ left: 200, top: 120, width: 880, height: 480 })
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

/** La famille du jeu, lue dans le `gameCode` du lanceur (`Retro_777…`). */
function famille(page: Page): 'Tower' | 'Retro' | 'SlotMachine' | string {
  const code = new URL(page.url()).searchParams.get('gameCode') ?? '';
  return code.split('_')[0];
}

/**
 * Les candidats pour le « ? » du canvas, le plus probable en tête.
 *
 * Tous sont essayés quelle que soit la famille : le `gameCode` dit ce que le
 * studio pense du jeu, pas quel habillage il a reçu, et un candidat manqué ne
 * coûte qu'une seconde et demie.
 */
function candidatsAide(fam: string): Array<{ x: number; y: number }> {
  const tous = [AIDE_SIRENES, AIDE_MINEUR, AIDE_KUPALA, AIDE_RETRO, AIDE_TOWER];
  const premier = fam === 'Tower' ? AIDE_TOWER : fam === 'Retro' ? AIDE_RETRO : AIDE_SIRENES;
  return [premier, ...tous.filter((c) => c !== premier)];
}

export const SPINOMENAL: Adaptateur = {
  studio: 'spinomenal',

  /**
   * La fiche produit, et rien d'autre : c'est ce que la base contient, et
   * c'est elle qui frappe le jeton du lanceur.
   */
  demoExploitable: (url) => /spinomenal\.com\//.test(url),

  /**
   * Deux secondes, parce que ce délai porte sur la fiche produit et non sur
   * le jeu : un WordPress rendu en 0,5 s, mesuré sur huit fiches. Le vrai
   * chargement — celui du moteur, de 4 à 12 s d'écran noir mesurés — est
   * attendu dans `ouvrirLeJeu`, sur l'image et non sur un chronomètre.
   */
  chargementMs: 2_000,

  /**
   * Une précaution, pas une mesure : le RGS de démo n'a jamais refusé un
   * lancement pendant la reconnaissance (une trentaine en deux heures). Le
   * ban BGaming a coûté assez cher pour qu'on ne laisse pas 633 fiches
   * défiler sans respirer. `--pause=` la remplace.
   */
  pauseEntreJeuxMs: 5_000,

  /**
   * De la fiche produit au jeu qui écoute.
   *
   * ── Pourquoi attendre l'image plutôt qu'un délai ─────────────────────────
   *
   * Le `#generic-loader-holder` de l'enveloppe disparaît à +1,3 s, et il ne
   * dit rien : le moteur affiche ensuite son propre écran noir au logo
   * Spinomenal, pendant 4 s (Kupala, Book of Sirens) à 12 s (Demi Gods VI) —
   * plus sur un poste chargé. Un clic donné pendant cet écran est avalé : la
   * première reconnaissance a cliqué le « ? » de Kupala à +9 s et n'a rien
   * obtenu, le même clic à +8 s après un écran plus court a ouvert le panneau.
   * On attend donc que l'écran cesse d'être noir, puis on laisse respirer.
   *
   * ── L'accueil, le popup, et l'ordre des trois gestes ─────────────────────
   *
   * 1. Un clic sur le décor ferme l'écran d'accueil s'il y en a un.
   * 2. Sur le moteur récent, on attend que le ruban soit opaque ; s'il reste
   *    à 0,5, un popup est ouvert et on clique son « CONTINUE ».
   * 3. Sur l'ancien moteur, seul un Retro a un popup, et on clique son
   *    « CONTINUE » — à lui seul, parce que ce point est un bouton de tour
   *    ailleurs.
   */
  async ouvrirLeJeu(page) {
    const lanceur = (await page
      .locator(IFRAME_DU_JEU)
      .first()
      .getAttribute('src', { timeout: 15_000 })
      .catch(() => null)) as string | null;
    if (!lanceur) throw new Error('fiche produit sans iframe de jeu — demoUrl périmée ?');

    const hote = new URL(lanceur).hostname;
    const code = new URL(lanceur).searchParams.get('gameCode') ?? '';
    if (hote.startsWith('cdn-newdev')) {
      // « Error 9989 / Reload » sur les 13 fiches qui y pointent : c'est la
      // demoUrl qui est à réparer, pas l'adaptateur.
      throw new Error('lanceur de développement (cdn-newdev), répond Error 9989 — demoUrl à réparer');
    }
    if (code.startsWith('Table_')) throw new Error('jeu de table, hors sujet');

    await page.goto(lanceur, { waitUntil: 'load', timeout: 120_000 });

    // L'écran noir de démarrage : on attend qu'il s'éclaire, une minute au
    // plus. Un jeu au thème très sombre passerait sous le seuil et attendrait
    // toute la minute — c'est du temps perdu, pas une capture fausse.
    for (let i = 0; i < 60; i++) {
      if ((await luminance(page)) > LUMINANCE_DU_JEU) break;
      await page.waitForTimeout(1_000);
    }
    await page.waitForTimeout(3_000);

    await page.mouse.click(DECOR.x, DECOR.y);
    await page.waitForTimeout(1_500);

    const fam = famille(page);
    const ruban = await opaciteDuRuban(page);
    if (ruban !== null) {
      for (let i = 0; i < 12; i++) {
        const opacite = await opaciteDuRuban(page);
        if (opacite === 1) break;
        // 0,5 : un popup — « NEW FEATURE » sur les Retro — assombrit le ruban.
        if (opacite === 0.5) await page.mouse.click(CONTINUER_RECENT.x, CONTINUER_RECENT.y);
        await page.waitForTimeout(1_000);
      }
    } else if (fam === 'Retro') {
      await page.mouse.click(CONTINUER_ANCIEN.x, CONTINUER_ANCIEN.y);
    }
    // Les rouleaux entrent en scène par une animation, et sur les
    // jeux récents un bandeau « Win up to… » défile encore.
    await page.waitForTimeout(3_000);
  },

  /**
   * Ouvre le panneau, le descend écran par écran, referme.
   *
   * ── Deux portes, un seul juge ────────────────────────────────────────────
   *
   * Le bouton HTML du ruban d'abord, quand il existe : c'est un vrai élément,
   * mesuré et non deviné. Sinon les candidats du canvas, dans l'ordre de la
   * famille. Après chaque clic, le même témoin — la hauteur du panneau dans le
   * DOM. Deux tours, le second après une pause : la panne la plus probable est
   * un jeu qui n'écoute pas encore, pas un mauvais pointage.
   *
   * ── Le panneau défile, on pose sa position ───────────────────────────────
   *
   * Comme chez Hacksaw : `scrollTop` est écrit, pas roulé à la molette. Une
   * vue par écran de 692 px, huit au plus ; au-delà, les vues sont réparties
   * pour que la dernière soit toujours le bas. Il n'y a **rien à viser** —
   * aucune ligne de RTP — et tout à montrer : la table des symboles, les
   * règles des bonus, le mode d'emploi.
   */
  async capturerLesRegles(page, cliche) {
    let ouvert = false;
    for (let essai = 0; essai < 2 && !ouvert; essai++) {
      if (essai > 0) await page.waitForTimeout(3_000);

      const bouton = await centre(page, BOUTON_REGLES);
      if (bouton) {
        await page.mouse.click(bouton.x, bouton.y);
        await page.waitForTimeout(1_500);
        ouvert = await panneauOuvert(page);
        if (ouvert) break;
      }
      for (const c of candidatsAide(famille(page))) {
        await page.mouse.click(c.x, c.y);
        await page.waitForTimeout(1_500);
        ouvert = await panneauOuvert(page);
        if (ouvert) break;
      }
    }
    /*
     * On rend 0, pas `SANS_PANNEAU` : les huit habillages reconnus ont tous
     * ce panneau. Un échec ici veut dire qu'on n'a pas su l'ouvrir — un jeu
     * lent sur un poste chargé, un habillage de plus à recenser — pas qu'il
     * n'existe pas. La fiche reste en file.
     */
    if (!ouvert) return 0;

    const geo = (await page.evaluate(
      `(() => { const e = document.querySelector(${JSON.stringify(CORPS_DU_PANNEAU)}); return e ? { visible: e.clientHeight, total: e.scrollHeight } : null; })()`,
    )) as { visible: number; total: number } | null;
    const course = geo ? Math.max(0, geo.total - geo.visible) : 0;
    const ecrans = geo && geo.visible > 0 ? Math.ceil(course / geo.visible) + 1 : 1;
    const vues = Math.min(ecrans, PRISES_MAX);
    const pas = vues > 1 ? course / (vues - 1) : 0;

    let prises = 0;
    for (let n = 0; n < vues; n++) {
      if (n > 0) {
        await page.evaluate(
          `(() => { const e = document.querySelector(${JSON.stringify(CORPS_DU_PANNEAU)}); if (e) e.scrollTop = ${Math.round(n * pas)}; })()`,
        );
        await page.waitForTimeout(800);
      }
      await cliche(`regles-${++prises}`);
    }

    // La croix referme ; on le vérifie, parce que `capturerLAchat` cliquerait
    // sinon dans la table des symboles.
    for (let essai = 0; essai < 2 && (await panneauOuvert(page)); essai++) {
      await page.mouse.click(FERMER.x, FERMER.y);
      await page.waitForTimeout(1_200);
    }
    return prises;
  },

  /**
   * La boîte d'achat, **quand le jeu en vend une** — et avant toute confirmation.
   *
   * ── Le moteur récent le dit en HTML ──────────────────────────────────────
   *
   * `#buy-feature` n'existe que sur les jeux qui vendent la fonction (Demi Gods
   * VI l'a, Frosty Charms a « MAX BET » à sa place). La boîte qu'il ouvre est
   * elle aussi du HTML : `.buy-feature-container` devient visible. Deux
   * témoins exacts, aucune image à comparer.
   *
   * ── L'ancien moteur le dit dans son panneau ──────────────────────────────
   *
   * Le texte du panneau est lisible dans le DOM même replié, et il contient
   * une section « BUY FEATURE » sur les jeux qui vendent la fonction (Book of
   * Sirens, Super Miner), pas sur les autres (Kupala). Le bouton, lui, est
   * peint dans le canvas ; on le clique à sa place mesurée et on juge la boîte
   * à l'image, sur le centre de l'écran qu'elle couvre.
   *
   * Le sens de l'erreur est choisi : sans mention dans le panneau on ne clique
   * pas, parce qu'un clic à l'aveugle qui tomberait sur un bouton de tour
   * ferait changer l'écran en grand — et publierait des rouleaux en mouvement
   * sous la légende « Buying the feature ».
   *
   * Rien n'est cliqué ensuite : ni « BUY », ni « CANCEL ». `capturer-jeux.ts`
   * ferme la page juste après.
   */
  async capturerLAchat(page, cliche) {
    const bouton = await centre(page, BOUTON_ACHAT);
    if (bouton) {
      await page.mouse.click(bouton.x, bouton.y);
      await page.waitForTimeout(2_500);
      const boite = await centre(page, BOITE_ACHAT);
      const visible =
        boite !== null &&
        ((await page.evaluate(
          `(() => { const e = document.querySelector(${JSON.stringify(BOITE_ACHAT)}); return e ? getComputedStyle(e).visibility !== 'hidden' : false; })()`,
        )) as boolean);
      if (!visible) return false;
      await cliche('achat');
      return true;
    }
    // Un ruban HTML sans bouton d'achat : le jeu n'en vend pas.
    if ((await opaciteDuRuban(page)) !== null) return false;

    const texte = (await page.evaluate(
      `(document.querySelector(${JSON.stringify(PANNEAU)})?.innerText ?? '')`,
    )) as string;
    if (!/BUY\s*FEATURE/i.test(texte)) return false;

    const avant = await empreinte(page);
    await page.mouse.click(ACHAT_ANCIEN.x, ACHAT_ANCIEN.y);
    await page.waitForTimeout(3_000);
    if (ecartMoyen(avant, await empreinte(page)) < SEUIL_ACHAT_OUVERT) return false;
    await cliche('achat');
    return true;
  },
};
