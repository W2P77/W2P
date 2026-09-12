/**
 * L'adaptateur de capture de Hacksaw Gaming.
 *
 * ── Pourquoi il ne ressemble pas à celui de Pragmatic ─────────────────────
 *
 * Chez Pragmatic, l'habillage est peint dans le `<canvas>` : aucun sélecteur,
 * on ne peut que cliquer à des coordonnées et vérifier par OCR que le clic a
 * fait quelque chose. Chez Hacksaw, **l'interface est du HTML** posé au-dessus
 * du canvas, et chaque élément porte un identifiant stable : `#MainMenuToggle`,
 * `#GameInfoBtn`, `#GameInfoWindow`, `#GameInfoBody`, `#FeatureBuyToggle`.
 * Le canvas ne dessine que les rouleaux.
 *
 * Cliquer à des coordonnées ici serait donc un choix délibérément moins fiable
 * que ce que le jeu offre. On s'appuie sur les identifiants, et l'OCR ne sert
 * plus qu'à une chose : confirmer que ce que le DOM déclare ouvert est
 * réellement **peint à l'écran**. Un panneau `display:flex` recouvert par le
 * canvas donnerait sinon des captures du jeu de base sous une légende de
 * règles — exactement la panne que l'adaptateur Pragmatic a payée.
 *
 * ── Le chemin d'accès est en trois temps, et aucun n'est évitable ──────────
 *
 * `demoUrl` en base pointe la **page produit** (`hacksawgaming.com/games/…`),
 * pas la démo. Il faut donc, dans cet ordre : cliquer « Try it », franchir
 * deux portails (consentement aux cookies, puis vérification d'âge), lire
 * l'URL que le site injecte dans l'iframe `#Game`, et enfin naviguer dessus.
 *
 * Cette dernière navigation n'est pas un raffinement. Dans l'iframe, le jeu
 * est encastré dans la page produit et n'occupe que 1160×635 à partir de
 * (60, 88) : le recadrage OCR de `lireLesRegles`, calibré sur un jeu plein
 * cadre, y attrape le décor du site. Rechargée seule, la démo occupe les
 * 1280×800 du viewport et retombe sur la géométrie que la chaîne attend.
 *
 * ── Ce qui bloque, et qui ne se voit pas d'ici ────────────────────────────
 *
 * Le RGS de démo (`rgs-demo.hacksawgaming.com`) est derrière Cloudflare, qui
 * **refuse un Chromium sans tête**. En `headless`, `play/authenticate` part en
 * `net::ERR_FAILED` et le jeu affiche « Connection lost to wallet ». Avec tête,
 * le même code passe sans rien changer d'autre. `capturer-jeux.ts` lance le
 * navigateur en mode par défaut, donc sans tête : tant qu'il n'ouvre pas
 * `headless: false` pour ce studio, cet adaptateur ne peut pas aboutir. Ce
 * n'est pas réparable ici — l'adaptateur ne reçoit qu'une `Page` déjà née.
 */
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/**
 * L'en-tête du panneau de Hacksaw — et non `EN_TETE_PANNEAU`.
 *
 * La constante partagée cherche `RTP|GAME RULES|PAYTABLE`. Hacksaw titre son
 * panneau « GAME INFO - <nom du jeu> », et le mot « RTP » n'apparaît qu'au
 * quatrième écran de défilement, bien en dessous de la bande haute que
 * `lireLEcran` examine. Mesuré : `EN_TETE_PANNEAU` rend **faux** sur un
 * panneau pourtant grand ouvert. S'en servir ici ferait repartir chaque jeu
 * en file à chaque campagne.
 *
 * Le contrôle final de `capturer-jeux.ts`, lui, reste valable sans y toucher :
 * il teste le texte OCR de la page entière, où « RTP » figure bel et bien.
 */
const EN_TETE_HACKSAW = /GAME\s*INFO|ABOUT\s+THE\s+GAME/i;

/** Le centre du viewport : le seul endroit où l'écran d'accueil écoute. */
const CENTRE = { x: 640, y: 400 };

/** Vrai si l'élément existe et que le navigateur le peint vraiment. */
async function visible(page: Page, id: string): Promise<boolean> {
  return page.evaluate((cible) => {
    const e = document.getElementById(cible);
    if (!e) return false;
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }, id);
}

export const HACKSAW: Adaptateur = {
  studio: 'hacksaw-gaming',

  /** Leur `demoUrl` est la page produit : c'est de là qu'on part. */
  /*
   * Deux formes, parce que Hacksaw a retire ses pages produit sans retirer les
   * jeux. Sur 246 tuiles de son catalogue, 101 n'ont plus qu'un bouton « Try
   * it » : leur page `/games/<slug>` renvoie un 302 vers `/Start`, qui repond
   * 404. Le jeu, lui, vit toujours sur `static-live` — d'ou la seconde forme,
   * `static-live.hacksawgaming.com/<gameid>/<version>/index.html`.
   *
   * Le numero de version y est obligatoire : sans lui la page repond 403. Ces
   * URL se perimeront donc au prochain correctif du studio, et
   * `scripts/reparer-demos-hacksaw.ts` est a relancer periodiquement.
   */
  demoExploitable: (url) =>
    /hacksawgaming\.com\/games\//.test(url) || /static-live\.hacksawgaming\.com\//.test(url),

  /** Cloudflare refuse un Chromium sans tête devant leur RGS de démo. */
  avecTete: true,

  /**
   * Trois secondes, et non trente comme chez Pragmatic — parce que ce délai
   * ne porte pas sur le jeu.
   *
   * `capturer-jeux.ts` attend `chargementMs` juste après le `goto(demoUrl)`,
   * et `demoUrl` est ici la page produit : un document statique qui rend en
   * 2,5 s. Le vrai chargement — celui de la démo, mesuré entre 15 et 25 s — a
   * lieu **dans** `ouvrirLeJeu`, après les deux portails, et il y est attendu
   * sur un signal du jeu plutôt que sur un chronomètre.
   */
  chargementMs: 3000,

  /**
   * De la page produit au jeu jouable.
   *
   * ── Les deux portails, découverts l'un après l'autre ────────────────────
   *
   * Le premier essai cliquait « Try it » puis attendait l'iframe : elle
   * restait à `about:blank`. Un bandeau de consentement aux cookies s'ouvre
   * par-dessus et avale le lancement. Le deuxième essai le fermait, et
   * l'iframe restait vide encore : une **seconde** boîte, « Responsible
   * Gaming », demande la majorité derrière la première. Les deux sont du HTML
   * ordinaire de la page produit, avec des classes explicites — on les vise
   * par elles plutôt que par leur libellé, qui est traduit.
   *
   * ── Pourquoi attendre un signal plutôt qu'un délai ──────────────────────
   *
   * `#MainMenuToggle` existe dès que le moteur a démarré, mais reste
   * `visibility: hidden` tant que l'écran d'accueil est là. Sa bascule en
   * `visible` est donc le seul témoin fiable que le jeu est réellement rendu
   * la main — un `waitForTimeout` de 22 s marchait sur les quatre jeux
   * essayés et n'aurait rien promis sur les 119 autres.
   */
  async ouvrirLeJeu(page) {
    const lancer = page.locator('.js-launch-game').first();
    if ((await lancer.count()) === 0) {
      /*
       * 36 des 159 `demoUrl` Hacksaw en base redirigent vers `/Start`, qui
       * est un 404 : le studio a retiré ces pages produit. Le dire par son
       * nom vaut mieux qu'un « élément introuvable » de Playwright, qui
       * enverrait chercher un bogue d'adaptateur là où il y a une donnée
       * périmée.
       */
      throw new Error('page produit absente (redirigée vers /Start) — demoUrl périmée');
    }
    await lancer.click();
    await page.waitForTimeout(1500);

    // Consentement aux cookies, puis vérification d'âge — dans cet ordre.
    for (const classe of ['.js-cookies-consent[data-consent="granted"]', '.js-responsible-approve']) {
      const portail = page.locator(classe).first();
      if (await portail.isVisible().catch(() => false)) {
        await portail.click();
        await page.waitForTimeout(2000);
      }
    }

    // L'URL de la démo n'est pas devinable : le site l'injecte, jeton compris.
    await page.waitForFunction(
      () => (document.getElementById('Game') as HTMLIFrameElement | null)?.src?.includes('static-live') ?? false,
      undefined,
      { timeout: 30_000 },
    );
    const demo = await page.evaluate(() => document.getElementById('Game')!.getAttribute('src')!);

    // Le jeu seul, plein cadre : voir l'en-tête du fichier.
    await page.goto(demo, { waitUntil: 'load', timeout: 120_000 });
    await page.waitForFunction(() => document.getElementById('MainMenuToggle') != null, undefined, {
      timeout: 90_000,
    });

    /*
     * L'écran d'accueil, lui, est peint dans le canvas : pas d'identifiant,
     * un clic au centre. Certains jeux en empilent deux (l'accueil, puis une
     * page « Bonus features »), d'où la boucle — et non trois clics à la
     * suite, qui lanceraient un tour sur les jeux qui n'en ont qu'un.
     */
    for (let essai = 0; essai < 4; essai++) {
      if (await visible(page, 'MainMenuToggle')) return;
      await page.mouse.click(CENTRE.x, CENTRE.y);
      await page.waitForTimeout(3500);
    }
  },

  /**
   * Ouvre « GAME INFO » et le feuillette.
   *
   * ── Le panneau se défile, et sa longueur varie du simple au double ──────
   *
   * Mesuré sur Wanted Dead or a Wild : `#GameInfoBody` fait 608 px de haut
   * pour 4 825 px de contenu, soit huit écrans. Un nombre de captures fixé
   * d'avance, comme chez Pragmatic, s'arrêterait trop tôt sur les panneaux
   * longs et photographierait le même bas de page plusieurs fois sur les
   * courts. On lit donc la hauteur réelle et on avance d'un écran exact.
   *
   * ── Poser `scrollTop` plutôt que rouler la molette ──────────────────────
   *
   * La molette dépend de la position du curseur et du réglage système ; chez
   * Pragmatic elle a coûté un jeu entier arrêté à un cran du RTP. Ici le
   * panneau est un élément HTML : on écrit sa position de défilement, ce qui
   * est exact et n'a aucun effet de bord.
   *
   * ── La ligne du RTP est visée explicitement ─────────────────────────────
   *
   * C'est la seule qu'on vienne chercher, et un balayage plafonné pourrait
   * s'arrêter avant elle sur un panneau très long. On repère donc son
   * paragraphe dans le DOM, et si aucune capture ne l'a couverte, on ajoute
   * une vue cadrée dessus. Elle est repérée par sa formulation, pas par une
   * position : voir la note sur les deux RTP plus bas.
   */
  async capturerLesRegles(page, cliche, lireLEcran) {
    if (!(await visible(page, 'MainMenuToggle'))) return 0;
    await page.locator('#MainMenuToggle').click();
    await page.waitForTimeout(1800);
    if (!(await visible(page, 'GameInfoBtn'))) {
      // Le menu ne s'est pas ouvert : on le referme pour ne pas laisser le jeu
      // dans un état intermédiaire, et on rend la main sans rien inventer.
      await page.keyboard.press('Escape').catch(() => {});
      return 0;
    }

    await page.locator('#GameInfoBtn').click();
    await page.waitForTimeout(2500);

    /*
     * Deux vérifications qui ne disent pas la même chose, et il faut les deux.
     *
     * Le DOM dit ce que le jeu **croit** afficher ; l'OCR dit ce qui est
     * **peint**. Un panneau ouvert derrière le canvas satisferait le premier
     * et donnerait sept captures du jeu de base publiées comme documentation.
     */
    if (!(await visible(page, 'GameInfoWindow'))) return 0;
    if (!EN_TETE_HACKSAW.test(await lireLEcran())) return 0;

    const mesure = await page.evaluate(() => {
      const corps = document.getElementById('GameInfoBody');
      if (!corps) return null;
      /*
       * Le paragraphe du RTP du **jeu de base**. Hacksaw en publie plusieurs
       * dans le même panneau — voir la note ci-dessous — et seul celui-ci
       * porte « theoretical payout (RTP) ».
       */
      const ligne = [...corps.querySelectorAll('p, div, span')].find(
        (e) => e.children.length === 0 && /theoretical payout\s*\(RTP\)/i.test(e.textContent ?? ''),
      );
      return {
        ecran: corps.clientHeight,
        total: corps.scrollHeight,
        rtp: ligne ? (ligne as HTMLElement).offsetTop : null,
      };
    });
    if (!mesure || mesure.ecran === 0) return 0;

    /*
     * Neuf écrans au plus. Le plus long panneau mesuré en demande huit ; le
     * plafond n'est là que pour empêcher un jeu au panneau anormal de partir
     * en cinquante captures sur une fiche.
     */
    const MAX = 9;
    const dernier = Math.max(0, mesure.total - mesure.ecran);
    let prises = 0;
    let couvre = mesure.rtp == null; // rien à couvrir si la ligne est absente

    for (let pose = 0; prises < MAX; pose += mesure.ecran) {
      const haut = Math.min(pose, dernier);
      await page.evaluate((v) => {
        document.getElementById('GameInfoBody')!.scrollTop = v;
      }, haut);
      await page.waitForTimeout(800);
      await cliche(`regles-${prises + 1}`);
      prises++;
      if (mesure.rtp != null && mesure.rtp >= haut && mesure.rtp < haut + mesure.ecran) couvre = true;
      if (haut >= dernier) break;
    }

    // Le balayage a été plafonné avant la ligne du RTP : on va la chercher.
    if (!couvre && mesure.rtp != null) {
      await page.evaluate((v) => {
        // Un tiers d'écran au-dessus, pour que la ligne ne colle pas au bord.
        const corps = document.getElementById('GameInfoBody')!;
        corps.scrollTop = Math.max(0, v - corps.clientHeight / 3);
      }, mesure.rtp);
      await page.waitForTimeout(800);
      await cliche(`regles-${prises + 1}`);
      prises++;
    }

    await page.locator('#GameInfoClose').click().catch(() => {});
    await page.waitForTimeout(1500);
    return prises;
  },

  /**
   * La boîte « BUY BONUS », quand le jeu en a une.
   *
   * ── Ce qu'on ne doit surtout pas confondre ──────────────────────────────
   *
   * Le champ `ouSourcer` du studio prévient que la page produit affiche le RTP
   * d'achat à côté de celui du jeu. Le panneau du jeu fait pareil, et la
   * confusion y est plus facile encore parce que **tout est dans le même
   * texte**. Les formulations relevées sur Wanted Dead or a Wild :
   *
   * · jeu de base — « The symbol payouts displayed above reflect the currently
   *   selected bet level. **The theoretical payout (RTP) for this game is
   *   96.38%.** The RTP was calculated by simulating 10,000,000,000 rounds. »
   * · achats — « **The RTP when buying** THE GREAT TRAIN ROBBERY **is 96.27%.** »,
   *   puis 96,33 % pour DUEL AT DAWN et **96,43 %** pour DEAD MAN'S HAND.
   *
   * Le piège n'est pas théorique : un jeu peut publier un RTP d'achat
   * **supérieur** à celui du jeu de base (96,43 contre 96,38 ici), donc « le
   * plus bas » ou « le premier lu » sont deux règles fausses. La seule qui
   * tienne est la formulation : « theoretical payout (RTP) for this game ».
   *
   * ── Pourquoi le bouton et pas l'OCR ─────────────────────────────────────
   *
   * Pragmatic cherche le mot « BUY » à l'écran faute de DOM. Ici le bouton
   * est un élément nommé : son absence ou son invisibilité est une réponse
   * franche, là où l'OCR peut lire « BUY » dans un décor.
   */
  async capturerLAchat(page, cliche, lireLEcran) {
    if (!(await visible(page, 'FeatureBuyToggle'))) return false;
    await page.locator('#FeatureBuyToggle').click();
    await page.waitForTimeout(3000);
    if (!(await visible(page, 'FeatureBuyWindow'))) return false;
    // Même raison que pour le panneau de règles : le DOM dit l'intention,
    // l'écran dit le résultat. Une boîte ouverte mais non peinte publierait
    // le jeu de base sous la légende « Buying the feature ».
    if (!/BUY|BONUS/i.test(await lireLEcran())) return false;
    await cliche('achat');
    await page.locator('#FeatureBuyClose').click().catch(() => {});
    return true;
  },
};
