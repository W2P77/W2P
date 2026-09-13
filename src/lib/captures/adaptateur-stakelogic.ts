/**
 * L'adaptateur de capture du studio **Stakelogic**.
 *
 * Il vit dans son propre fichier plutôt que dans `adaptateurs.ts` : plusieurs
 * studios se câblent en parallèle, et un fichier commun aurait fait de chaque
 * ajout un conflit. Le branchement se fait dans la table `ADAPTATEURS`.
 *
 * ── Ce que la base contient ────────────────────────────────────────────────
 *
 * Les 193 `demoUrl` sont des lanceurs directs, sans jeton ni portail 18+ :
 * `ngpd.st01-gs-stakelogic.com/demo/play?gameId=…` (109) et
 * `ngpd.demo-gs-stakelogic.com/demo/play?gameId=…` (84). Les deux hôtes
 * servent le même habillage, vérifié à l'image sur 9 Pyramids of Fortune
 * (st01) et Hot 7 Hold & Spin (demo). Chromium **sans tête** reçoit le jeu,
 * rouleaux et mise compris — le piège Wazdan (une fiche marketing servie en
 * silence à un User-Agent « Headless ») a été cherché et n'existe pas ici.
 *
 * ── Deux générations de jeux, et une seule est prise ──────────────────────
 *
 * Le `gameId` dit la génération. À **huit chiffres** (140 fiches) ou cinq
 * (3 fiches), le jeu tourne dans l'enveloppe moderne du studio : une couche
 * **HTML** (MUI) posée sur le canvas, où chaque bouton porte un attribut
 * `btnname` — `BUTTON_MENU`, `BUTTON_OPEN_RULES_SECTION`, `BUTTON_MENU_CLOSE`,
 * `BUTTON_BUY_BONUS`. Les classes, elles, sont générées (`jss185`) et changent
 * d'un jeu à l'autre : on ne s'appuie que sur `btnname` et sur les `id`.
 *
 * À **quatre chiffres** (50 fiches : Abra-ca-dice, Book of Cleopatra, les
 * « Quattro »…), c'est l'ancienne plateforme GWT « igaming2go » : deux mises
 * en page différentes sur deux jeux reconnus, un panneau à onglets chez l'un,
 * des pages horizontales chez l'autre, et **aucune mention du RTP** dans le
 * DOM de l'un ni de l'autre. Les prendre demanderait une reconnaissance à
 * part ; `demoExploitable` les écarte, et le runner le dit en clair
 * (« 50 écartés ») au lieu de les faire échouer un par un en « icône des
 * règles introuvable ».
 *
 * ── Trois écrans avant le jeu, et l'un d'eux change le RTP ─────────────────
 *
 * 1. Le voile « ENABLE SOUNDS? CLICK ANYWHERE TO CONTINUE », en HTML, posé
 *    par l'enveloppe une fois le jeu chargé à 100 %. C'est **lui** qui dit que
 *    le jeu est prêt : mesuré de 2,5 s à 41 s après `load` selon la charge du
 *    poste — un délai fixe serait faux dans un sens ou dans l'autre.
 * 2. L'écran d'accueil du jeu, dessiné dans le canvas, avec un bouton
 *    « CONTINUE » à (640, 686) sur 9 Pyramids of Fortune et Big Sugar
 *    Bonanza. Tous les jeux n'en ont pas (The Watcher's Luck, Big Runner
 *    Deluxe ouvrent directement). Ce qui le distingue à coup sûr : tant qu'il
 *    est là, la barre de boutons HTML n'existe pas dans le DOM.
 * 3. La boîte « SUPER STAKE » — « Would you like to activate SUPER STAKE? »,
 *    YES / NO — sur les jeux qui vendent ce pari annexe. **On répond NO** :
 *    activé, il double la mise et change le mode de jeu, donc la capture de
 *    base montrerait une mise que personne n'a choisie et un jeu qui n'est
 *    pas le jeu par défaut.
 *
 * ── Où est le RTP ─────────────────────────────────────────────────────────
 *
 * Le menu (☰, en bas à gauche) ouvre un panneau HTML sur l'onglet PAYTABLE ;
 * l'onglet « ? » est GAME RULES, et c'est lui qui porte la ligne « The
 * theoretical minimum payback percentage (RTP) is 96.02% ». Relevé conforme à
 * la base sur les quatre jeux lus (96,02 · 95,30 · 94,00 · 96,01).
 *
 * Cette formulation n'est lue par **aucune** règle de `extraireLesFaits` —
 * vérifié : `rtp: null` sur la phrase exacte. Ce n'est pas bloquant, les 193
 * fiches ont déjà leur taux en base et la capture seule les rend publiables ;
 * mais un écart entre le panneau et la base ne serait pas signalé. Le
 * PAYTABLE de Hot 7 Hold & Spin, lui, affiche « Hold & Spin Bonus RTP is:
 * 44.81% » — le retour d'une **fonction**, pas du jeu — que les bornes
 * 80–99,9 de `lecture-regles.ts` rejetteraient de toute façon.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/** Le voile son de l'enveloppe : la preuve que le jeu a fini de charger. */
const VOILE_SON = /CLICK ANYWHERE/i;

/**
 * Le bouton « CONTINUE » de l'écran d'accueil, dessiné dans le canvas — et
 * il n'est pas au même endroit selon le jeu.
 *
 * Mesuré à (640, 686) sur 9 Pyramids of Fortune et Big Sugar Bonanza, à
 * (533, 658) sur Kraken's Catch, dont l'accueil est une autre mise en page
 * (bouton vert à gauche d'un « DON'T SHOW NEXT TIME »). Une position unique
 * laissait Kraken's Catch sur son accueil pendant les quinze tours, puis en
 * « icône des règles introuvable ». Ni Espace ni Entrée ne ferment cet
 * écran — essayés sur les deux jeux, sans effet.
 *
 * D'où une liste, parcourue en boucle : un clic à côté du bouton tombe sur
 * l'illustration et ne fait rien (vérifié, quinze clics à (640, 686) sur
 * Kraken's Catch), donc l'ordre n'a pas d'importance. Ces points ne sont
 * cliqués que tant que la barre de boutons HTML est absente du DOM : une fois
 * le jeu ouvert, (640, 686) tombe sur le **bouton SPIN** (641, 673, 120 px de
 * côté), et un clic y lancerait un tour.
 */
const CONTINUER = [
  { x: 640, y: 686 },
  { x: 533, y: 658 },
];

/** Un point du voile son, qui couvre tout l'écran : n'importe où fait. */
const N_IMPORTE_OU = { x: 640, y: 400 };

/** Les boutons de l'enveloppe, par leur attribut sémantique. */
const MENU = '[btnname="BUTTON_MENU"]';
const ONGLET_REGLES = '[btnname="BUTTON_OPEN_RULES_SECTION"]';
const FERMER = '[btnname="BUTTON_MENU_CLOSE"]';
const ACHAT = '[btnname="BUTTON_BUY_BONUS"]';

/**
 * Le panneau du menu, présent dans le DOM seulement quand il est ouvert.
 *
 * Son `id` change avec l'onglet — `layout_info` pour PAYTABLE, `layout_Rules`
 * pour GAME RULES — et `layout_UI` est la barre du jeu, qui disparaît quand le
 * panneau s'ouvre. Viser `#layout_info` seul rendait « ABSENT » sur l'onglet
 * des règles, pourtant grand ouvert : la première simulation n'a rapporté que
 * la table de gains sur trois jeux.
 */
const PANNEAU = 'section[id^="layout_"]:not(#layout_UI)';

/** La boîte Super Stake, et son bouton de refus. */
const BOITE = '[class*="modalRoot"]';

/**
 * Le bouton d'achat quand le jeu le dessine lui-même dans le canvas.
 *
 * Big Sugar Bonanza n'a pas de `BUTTON_BUY_BONUS` dans le DOM et vend pourtant
 * ses tours gratuits : son bouton est peint par le jeu, à la place que
 * l'enveloppe réserve à cette fonction — (100, 557) là où 9 Pyramids of
 * Fortune et Candy Links Bonanza posent leur bouton HTML. Le clic y est fait
 * en second recours, et ce n'est **pas lui** qui décide : voir
 * `capturerLAchat`.
 */
const ACHAT_CANVAS = { x: 98, y: 557 };

/** Le corps du panneau : là où le texte défile, sans l'en-tête ni les onglets. */
const CORPS_DU_PANNEAU = { left: 176, top: 160, width: 1044, height: 420 };

/** Le centre de l'écran, que seule une boîte ouverte change en grand. */
const CENTRE = { left: 200, top: 120, width: 880, height: 480 };

/** Le corps du panneau va de y=162 à y=577 : une ligne est lisible entre ces bornes. */
const FENETRE_LISIBLE = { haut: 165, bas: 575 };

/**
 * Un cran de molette, et pourquoi 380.
 *
 * Le corps du panneau montre 415 px et une ligne de texte en fait 26 : avec
 * un pas inférieur à 415 − 26, **toute** ligne est entière sur au moins un
 * cran. C'est ce qui rend la cadence de capture sûre pour la ligne du RTP,
 * en plus du contrôle direct de `ligneRtpLisible`.
 */
const CRAN = 380;

/**
 * En dessous, le panneau ne défile plus.
 *
 * Mesuré cran par cran sur 9 Pyramids of Fortune (12 crans) et Big Sugar
 * Bonanza (9 crans) : de **3,1 à 15,3** tant que le texte descend, **0,0**
 * une fois le bas atteint. Le 3,1 est un vrai défilement — les derniers
 * paragraphes se ressemblent — et c'est lui qui fixe le seuil.
 */
const SEUIL_A_BOUGE = 2;

/**
 * Au-dessus, une boîte a couvert le centre de l'écran.
 *
 * Mesuré : **48,9** pour la boîte « TRIGGER FEATURE » de 9 Pyramids of
 * Fortune (dessinée dans le canvas), **93,2** pour la boîte « BUY BONUS » de
 * Big Sugar Bonanza (en HTML), et 0,5 pour un jeu au repos photographié deux
 * fois. Vingt tient entre deux régimes qui ne se touchent pas.
 */
const SEUIL_BOITE_OUVERTE = 20;

/** Le plafond de la descente : garde-fou d'une molette qui n'agirait plus. */
const CRANS_MAX = 40;

/** Le nombre de vues qu'on publie au plus, panneau de gains compris. */
const PRISES_MAX = 8;

async function empreinte(page: Page, zone = CORPS_DU_PANNEAU): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract(zone)
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

/** Vrai si un élément de l'enveloppe est dans le DOM avec une taille. */
async function present(page: Page, selecteur: string): Promise<boolean> {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }, selecteur);
}

/**
 * Le titre du panneau, lu dans le DOM.
 *
 * Le panneau est en HTML : « PAYTABLE » ou « GAME RULES » sont ses premiers
 * mots. On lit le DOM et non l'OCR parce que c'est plus sûr **et** que ça ne
 * remplace pas le contrôle du runner, qui relira les captures à l'OCR de
 * toute façon — l'en-tête, blanc sur fond sombre à y≈100, s'y lit sans faute.
 */
async function enTeteDuPanneau(page: Page): Promise<string> {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    return ((el as HTMLElement | null)?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }, PANNEAU);
}

/**
 * Vrai si la ligne « … (RTP) is 96.02% » est entièrement visible à l'écran.
 *
 * On cherche l'élément **le plus profond** qui porte « (RTP) » : la ligne
 * vit dans un `<div>` qui contient des `<br>`, donc exiger un élément sans
 * enfant la manquait — c'est arrivé sur Hot 7 Hold & Spin à la reconnaissance,
 * alors que la ligne était à l'écran.
 */
async function ligneRtpLisible(page: Page): Promise<boolean> {
  return page.evaluate(
    ({ haut, bas, panneau }) => {
      const candidats = [...document.querySelectorAll(`${panneau} *`)].filter(
        (el) =>
          /\(RTP\)/.test(el.textContent ?? '') &&
          ![...el.children].some((c) => /\(RTP\)/.test(c.textContent ?? '')),
      );
      return candidats.some((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.top >= haut && r.bottom <= bas;
      });
    },
    { ...FENETRE_LISIBLE, panneau: PANNEAU },
  );
}

/**
 * Refuse la boîte Super Stake si elle est là, en l'attendant au plus `delaiMs`.
 *
 * Refusée par son bouton et non par un clic à position fixe : YES est juste
 * à sa gauche (542, 492 contre 738, 492), et l'accepter changerait la mise et
 * le mode de jeu de la capture. Une boîte inconnue — sans bouton NO — est
 * fermée par Échap ; si elle résiste, le clic du menu échouera plus loin et
 * le jeu restera en file, ce qui est le bon résultat pour un écran qu'on n'a
 * jamais vu.
 */
async function refuserLaBoite(page: Page, delaiMs: number): Promise<void> {
  const boite = page.locator(BOITE).first();
  const limite = Date.now() + delaiMs;
  while (!(await boite.isVisible().catch(() => false))) {
    if (Date.now() >= limite) return;
    await page.waitForTimeout(500);
  }
  const non = boite.locator('button', { hasText: /^NO$/i }).first();
  if (await non.isVisible().catch(() => false)) await non.click().catch(() => {});
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(2_000);
}

export const STAKELOGIC: Adaptateur = {
  studio: 'stakelogic',

  /**
   * Le lanceur du studio, et seulement la génération moderne.
   *
   * Les deux hôtes (`st01-gs`, `demo-gs`) passent ; un `gameId` de quatre
   * chiffres est un jeu de l'ancienne plateforme, sans adaptateur — voir
   * l'en-tête du fichier.
   */
  demoExploitable: (url) => /-gs-stakelogic\.com\/demo\/play\?gameId=\d{5,}$/.test(url),

  /**
   * Deux secondes, et c'est volontairement trop peu pour un jeu.
   *
   * L'événement `load` arrive en 0,5–0,7 s : il ne dit rien du moteur, qui
   * met encore de 2,5 à 41 s à afficher son voile son selon la charge du
   * poste. C'est ce voile que `ouvrirLeJeu` attend, avec un plafond large.
   */
  chargementMs: 2_000,

  /*
   * Pas de `avecTete` : vérifié sur huit jeux des deux hôtes, la démo se
   * charge, se peint et répond aux clics en Chromium sans tête.
   */

  /**
   * Une précaution, pas un seuil mesuré.
   *
   * Stakelogic n'a refusé aucune des ~30 ouvertures de la reconnaissance, et
   * son plafond — s'il existe — n'est pas publié. BGaming a coûté une campagne
   * pour l'avoir découvert en production. `--pause=` la remplace.
   */
  pauseEntreJeuxMs: 4_000,

  /**
   * Le voile son, l'accueil s'il y en a un, puis le refus du Super Stake.
   *
   * ── Le jeu commande le rythme ───────────────────────────────────────────
   *
   * Aucun délai fixe ici : on attend le voile (jusqu'à 90 s — 41 s mesurés
   * sur un poste à `load 18`), on le ferme d'un clic, puis on clique
   * « CONTINUE » **tant que** la barre de boutons HTML n'est pas apparue. Sur
   * un jeu sans accueil la boucle sort au premier tour sans avoir cliqué.
   *
   * Le voile qui ne vient pas n'est pas rattrapé : un jeu qui ne l'affiche
   * pas en 90 s est en panne ou géo-bloqué, et l'échec doit se voir dans le
   * journal plutôt que produire une capture noire.
   */
  async ouvrirLeJeu(page) {
    await page.waitForFunction(
      (motif) => new RegExp(motif, 'i').test(document.body.innerText),
      VOILE_SON.source,
      { timeout: 90_000 },
    );
    await page.mouse.click(N_IMPORTE_OU.x, N_IMPORTE_OU.y);
    await page.waitForTimeout(2_500);

    for (let tour = 0; tour < 16; tour++) {
      if (await present(page, MENU)) break;
      const point = CONTINUER[tour % CONTINUER.length];
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(2_000);
    }

    /*
     * La boîte Super Stake arrive **après** la barre de boutons — mesuré : la
     * barre est là, la boîte n'y est pas encore, et une seconde plus tard elle
     * y est (Candyways Bonanza Megaways). La première version la cherchait une
     * fois, tout de suite, et ne la trouvait pas ; le clic du menu tombait
     * ensuite sur son voile et trois jeux sur six sortaient en « icône des
     * règles introuvable ». On lui laisse donc le temps d'arriver, et
     * `capturerLesRegles` la refuse encore une fois avant d'ouvrir le menu.
     */
    await refuserLaBoite(page, 6_000);
    // Les rouleaux tombent en scène après l'accueil ; photographier pendant
    // le mouvement donnerait une capture de base à moitié montée.
    await page.waitForTimeout(3_000);
  },

  /**
   * La table de gains, puis les règles du haut jusqu'en bas.
   *
   * ── Ce qu'on photographie, et dans quel ordre ──────────────────────────
   *
   * Le menu ouvre sur PAYTABLE : une vue, celle des symboles. Puis l'onglet
   * GAME RULES, dont on prend le haut, les deux crans suivants — la ligne du
   * RTP y est sur les quatre jeux reconnus, entre 190 et 540 px sous le début
   * du texte —, puis un cran sur deux jusqu'au plafond de vues, **sans cesser
   * de descendre** jusqu'au bas du panneau, dont la dernière vue est prise.
   *
   * La cadence n'est pas seule à garantir la ligne du RTP : à chaque cran on
   * demande au DOM si elle est entière à l'écran, et on la photographie alors
   * même hors cadence. Deux garde-fous pour une seule ligne, parce qu'elle
   * est la raison d'être de la capture.
   *
   * ── Pourquoi 0 et jamais `SANS_PANNEAU` ────────────────────────────────
   *
   * Tous les jeux de l'enveloppe moderne ont ce panneau. Un échec ici veut
   * dire qu'on n'a pas su l'ouvrir — accueil récalcitrant, boîte inconnue,
   * poste trop chargé —, pas qu'il n'existe pas.
   */
  async capturerLesRegles(page, cliche) {
    /*
     * Deux essais, et une boîte refusée avant chacun.
     *
     * Le premier échec possible n'est pas un mauvais pointage — le bouton
     * porte son nom — mais un voile : la boîte Super Stake arrivée après le
     * contrôle de `ouvrirLeJeu`, ou un poste si chargé que le panneau met
     * plus de 2,5 s à se peindre. Le bouton du menu n'est pas un
     * interrupteur : un second clic sur un panneau déjà ouvert tombe hors de
     * la barre, qui a disparu avec lui, et ne fait rien.
     */
    let ouvert = false;
    for (let essai = 0; essai < 2 && !ouvert; essai++) {
      await refuserLaBoite(page, essai === 0 ? 0 : 3_000);
      await page.locator(MENU).first().click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_500);
      ouvert = /^PAYTABLE/i.test(await enTeteDuPanneau(page));
    }
    if (!ouvert) return 0;

    let prises = 0;
    await cliche(`regles-${++prises}`);

    await page.locator(ONGLET_REGLES).first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    if (!/^GAME RULES/i.test(await enTeteDuPanneau(page))) {
      // La table de gains est prise et vaut par elle-même ; le panneau est
      // refermé pour que l'achat ne soit pas cliqué dans le texte.
      await page.locator(FERMER).first().click({ timeout: 5_000 }).catch(() => {});
      return prises;
    }
    await cliche(`regles-${++prises}`);
    let rtpPris = await ligneRtpLisible(page);

    // La molette agit sous le curseur, que le clic sur l'onglet a laissé
    // dans la colonne de gauche.
    await page.mouse.move(640, 400);
    let precedente = await empreinte(page);
    let dernierCranPris = true;
    for (let cran = 1; cran <= CRANS_MAX; cran++) {
      await page.mouse.wheel(0, CRAN);
      await page.waitForTimeout(1_200);
      const actuelle = await empreinte(page);
      if (ecartMoyen(precedente, actuelle) < SEUIL_A_BOUGE) break;
      precedente = actuelle;

      const rtpIci = !rtpPris && (await ligneRtpLisible(page));
      const enCadence = cran <= 2 || cran % 2 === 0;
      dernierCranPris = rtpIci || (enCadence && prises < PRISES_MAX - 1);
      if (dernierCranPris) {
        await cliche(`regles-${++prises}`);
        if (rtpIci) rtpPris = true;
      }
    }
    // Le bas du panneau, sauf s'il vient d'être pris : le runner écarterait
    // le doublon, mais autant ne pas le produire.
    if (!dernierCranPris) await cliche(`regles-${++prises}`);

    await page.locator(FERMER).first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    return prises;
  },

  /**
   * La boîte d'achat, **si le jeu en vend une** — et deux façons de le savoir.
   *
   * ── Le bouton HTML d'abord ─────────────────────────────────────────────
   *
   * 9 Pyramids of Fortune et Candy Links Bonanza posent `BUTTON_BUY_BONUS`
   * dans le DOM, à (100, 557). Sa présence est déjà la réponse ; le clic
   * ouvre une boîte « TRIGGER FEATURE » peinte dans le canvas, et c'est le
   * changement du centre de l'écran (48,9 mesuré) qui confirme qu'elle est là.
   *
   * ── Le bouton canvas ensuite, et lui ne suffit pas ─────────────────────
   *
   * Big Sugar Bonanza n'a rien dans le DOM et vend pourtant ses tours
   * gratuits par un bouton peint au même endroit. On y clique donc aussi —
   * mais un clic à position fixe dans un canvas peut tomber sur n'importe
   * quoi, et le changement d'image seul ne dit pas **ce** qui s'est ouvert.
   * On exige alors un second témoin : le mot « BUY » dans le texte de la
   * page, que la boîte HTML du jeu apporte (« BUY BONUS · FREE SPINS · 20.00
   * · BUY »). Sans lui, on ne publie rien : un faux négatif coûte une image,
   * un faux positif publierait le jeu de base sous la légende « Buying the
   * feature ».
   *
   * Rien n'est confirmé : ni le bouton vert, ni la coche. La boîte est
   * photographiée avant tout engagement, ce que la légende affirme.
   */
  async capturerLAchat(page, cliche) {
    const avant = await empreinte(page, CENTRE);

    const boutonHtml = await present(page, ACHAT);
    if (boutonHtml) {
      await page.locator(ACHAT).first().click({ timeout: 5_000 }).catch(() => {});
    } else {
      await page.mouse.click(ACHAT_CANVAS.x, ACHAT_CANVAS.y);
    }
    await page.waitForTimeout(3_000);

    if (ecartMoyen(avant, await empreinte(page, CENTRE)) < SEUIL_BOITE_OUVERTE) return false;
    if (!boutonHtml) {
      const texte = await page.evaluate(() => document.body.innerText);
      if (!/\bBUY\b/i.test(texte)) return false;
    }
    await cliche('achat');
    return true;
  },
};
