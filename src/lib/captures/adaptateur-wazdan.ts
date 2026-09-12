/**
 * L'adaptateur de capture du studio **Wazdan**.
 *
 * Il vit dans son propre fichier plutôt que dans `adaptateurs.ts` : plusieurs
 * studios se câblent en parallèle, et un fichier commun aurait fait de chaque
 * ajout un conflit. Le branchement se fait dans la table `ADAPTATEURS`.
 *
 * ── La `demoUrl` en base est un lanceur, mais il ne se laisse pas ouvrir ───
 *
 * Les 261 `demoUrl` Wazdan pointent sur `gamelaunch.wazdan.com/demo-demo/
 * gamelauncher?license=wazdancom&mode=demo&game=<id>`. C'est bien le lanceur
 * du studio, et il rend le jeu — mais **seulement à un navigateur qu'il juge
 * réel**. Mesuré au `curl`, sur le même jeu, à la même seconde :
 *
 * · UA `Chrome/140` → 200, le jeu ;
 * · UA `HeadlessChrome/140` → **301 vers `wazdan.com//games/<Jeu>`**, la fiche
 *   marketing ;
 * · UA `curl/8.7.1` → le même 301.
 *
 * Le tri se fait donc sur la seule chaîne d'agent, côté serveur, avant tout
 * JavaScript. Et il est silencieux : la page se charge, le `load` se produit,
 * rien n'échoue. La première reconnaissance a passé quarante secondes à
 * photographier le site de Wazdan en croyant filmer un jeu.
 *
 * ── Conséquence d'exploitation, à lire avant la prochaine campagne ────────
 *
 * **Wazdan n'exige PAS un navigateur avec tête**, et c'est pour ça qu'il n'y a
 * pas de `avecTete` ici : vérifié sur six jeux, la démo se charge, se joue et
 * livre ses règles dans un Chromium **sans tête** — à la seule condition que
 * l'en-tête `User-Agent` soit réécrit avant d'aller chercher le jeu, ce que
 * fait `ouvrirLeJeu`. Déclarer `avecTete` coûterait une fenêtre ouverte par
 * jeu sur toute une campagne, pour un problème qui n'est pas celui-là.
 *
 * Corollaire : si un jour la campagne ne rapporte que des captures du site
 * `wazdan.com`, ce n'est pas l'adaptateur qui a bougé, c'est cette réécriture
 * qui ne prend plus — ou la chaîne `UA_NAVIGATEUR_REEL` qui a vieilli.
 *
 * ── Ce que le lanceur redirigé nous laisse quand même ─────────────────────
 *
 * Le runner ouvre la `demoUrl` avant de nous appeler : on hérite donc de la
 * fiche marketing. Elle n'est pas perdue — elle publie le lanceur en clair
 * dans un global, `gameParams.game_url`, qui est **exactement** la `demoUrl`
 * d'origine. On le lit plutôt que de le recomposer : l'adaptateur ne reçoit
 * pas la `demoUrl`, et reconstruire une URL à partir du slug est le genre de
 * devinette qui marche sur les quarante premiers jeux.
 *
 * ── Le panneau qui porte les chiffres est du HTML, pas du canvas ──────────
 *
 * C'est la découverte qui rend cet adaptateur fiable. Le jeu, son écran
 * d'accueil, sa barre de commandes et son panneau « i » sont peints dans un
 * `<canvas>` — un vidage du DOM ne rend que `<canvas id="Default">`. Mais le
 * bouton « ? » ouvre un panneau **HTML** injecté dans la page,
 * `div.customScrollbar-info`, et ce panneau porte :
 *
 * · un `<p class="rtp">` — « Game average return to player: 96.15% », le seul
 *   endroit du jeu où le taux soit écrit ;
 * · sa propre géométrie, donc l'endroit exact où défiler ;
 * · un `scrollTop` **qui s'écrit** (posé à 1000, relu à 1000), contrairement à
 *   celui de BGaming qui retombe à 0.
 *
 * On ne devine donc ni un nombre de crans de molette, ni une position de
 * flèche : on demande au panneau où sont ses lignes et on l'y amène.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/**
 * L'agent que le lanceur accepte.
 *
 * Ce n'est pas un déguisement de confort : sans lui, `gamelaunch.wazdan.com`
 * répond 301 et il n'y a pas de jeu du tout (voir l'en-tête du fichier). La
 * valeur est celle d'un Chrome de bureau ordinaire — c'est bien ce que nous
 * sommes, à la mention `Headless` près.
 */
const UA_NAVIGATEUR_REEL =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/** Le panneau « GAME RULES » du bouton « ? ». Le seul morceau d'UI en HTML. */
const PANNEAU_REGLES = '.customScrollbar-info';

/**
 * Les deux seules coordonnées de l'adaptateur, et pourquoi elles tiennent.
 *
 * La barre de commandes est peinte dans le canvas, donc invisible au DOM. Mais
 * elle est ancrée en bas à gauche du cadre de jeu, et ce cadre occupe presque
 * toute la largeur quel que soit l'habillage : relevé sur six jeux allant du
 * classique à trois rouleaux (Turbo Play) au Hold the Jackpot moderne (12
 * Bells, Magic Spins), l'icône « i » se tient entre x=126 et x=155, le « ? »
 * entre x=289 et x=300, tous deux à y≈742-748. Le point retenu est le centre
 * de cette dispersion, et il a ouvert le panneau **du premier coup sur les six
 * jeux essayés** — contrairement à l'icône « i » de Pragmatic, qui demandait
 * une recherche.
 *
 * Ce qui rend l'affaire sûre, c'est qu'on ne le croit pas sur parole : le clic
 * sur « ? » est vérifié par la présence **et la taille** de `PANNEAU_REGLES`
 * dans le DOM, ce qui est un témoin exact et non une reconnaissance d'image.
 */
const AIDE = { x: 293, y: 745 };
const INFO = { x: 151, y: 745 };

/**
 * Le nombre de vues balayées dans le panneau de règles, hors lignes visées.
 *
 * Le document mesure de 4 327 à 5 010 px pour une fenêtre de 478 à 521 px : un
 * balayage exhaustif produirait une dizaine d'images de texte presque
 * identiques. Quatre vues réparties donnent le début, le corps et la fin de ce
 * qu'on garde, et les deux lignes qui comptent — le RTP et la liste des
 * boutons — sont ajoutées à leur place réelle, pas en plus à la fin.
 */
const VUES_REGLES = 4;

/**
 * Le plafond de pages du panneau « i ».
 *
 * Le plus long rencontré est celui de 12 Bells : douze pages, de « Bonus
 * symbols » à « Disclaimer ». Un panneau plus court s'arrête tout seul, la
 * boucle détectant le retour à la première page ; ce nombre n'est donc qu'un
 * garde-fou contre une pagination qui tournerait sans jamais se refermer.
 */
const PAGES_INFO_MAX = 12;

/**
 * Deux vues consécutives distantes de moins que ça sont la même vue.
 *
 * Le tri des doublons du runner les écarterait de toute façon, mais il le
 * ferait après avoir chargé, enregistré et comparé les images. Autant ne pas
 * les prendre.
 */
const ECART_MINIMAL_PX = 80;

/**
 * Empreinte de l'écran, pour décider si un clic a fait quelque chose.
 *
 * Le panneau « i » est peint dans le canvas : ni identifiant, ni texte
 * interrogeable, et ses en-têtes (« BONUS SYMBOLS », « CASH INFINITY ») ne se
 * ressemblent pas d'un jeu à l'autre. Ce qui se voit en revanche toujours,
 * c'est qu'un panneau qui s'ouvre **couvre le jeu** : on compare donc l'écran
 * à ce qu'il était au repos.
 *
 * Le recadrage laisse de côté la barre du bas, qui reste visible sous le
 * panneau et ne prouverait rien, et les bords, que les habillages larges et
 * étroits ne remplissent pas pareil.
 */
async function empreinte(page: Page): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract({ left: 200, top: 60, width: 880, height: 560 })
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
 * En dessous, c'est le même écran.
 *
 * Mesuré sur quatre jeux : l'ouverture du panneau « i » par-dessus le jeu
 * déplace l'empreinte de 25 à 60 ; deux pages différentes du même panneau, de
 * 15 à 40 ; et un écran qui n'a pas bougé reste sous 3, le fond des jeux
 * Wazdan étant animé (étoiles, halos) même au repos.
 */
const SEUIL_A_BOUGE = 10;

/** La géométrie du panneau de règles, telle que le panneau la déclare. */
interface Reperes {
  /** Hauteur visible : le pas naturel d'un balayage. */
  visible: number;
  total: number;
  /** Où commence la ligne du taux de retour, dans le document. */
  rtp: number | null;
  /**
   * Où commence l'entrée « Paytable » de la liste des boutons.
   *
   * Elle n'a l'air de rien et elle décide pourtant du sort du jeu : voir
   * `capturerLesRegles`.
   */
  paytable: number | null;
  /**
   * Où commence la première phrase de la forme « Low / High volatility ».
   *
   * C'est le plafond du balayage, et la raison est une donnée fausse évitée :
   * voir `capturerLesRegles`.
   */
  volatilite: number | null;
}

/**
 * Interroge le panneau ouvert. Rend `null` s'il n'est pas là ou s'il est plié.
 *
 * La hauteur est aussi importante que la présence : cliquer sur « ? » pendant
 * que l'écran d'accueil est encore affiché laisse le conteneur dans le DOM
 * avec une boîte de 0×0 — mesuré sur Sizzling 777 Deluxe. Un test d'existence
 * seul aurait conclu « panneau ouvert » sur un jeu qui n'avait pas démarré.
 */
async function lireLesReperes(page: Page): Promise<Reperes | null> {
  return page.evaluate((sel) => {
    const boite = document.querySelector(sel) as HTMLElement | null;
    if (!boite) return null;
    const cadre = boite.getBoundingClientRect();
    if (cadre.height < 100) return null;

    const feuilles = [...boite.querySelectorAll('*')].filter((e) => e.children.length === 0);

    /*
     * Les trois lignes repérées d'un coup, puis mesurées ensemble.
     *
     * Une petite fonction nommée serait plus lisible — et impossible ici :
     * `tsx` compile ce fichier avec `keepNames`, qui enveloppe toute fonction
     * portant un nom dans un appel à `__name`. Ce nom existe côté Node, pas
     * dans la page, et l'évaluation meurt sur « __name is not defined ». Seules
     * les fonctions anonymes passées à `map` ou `find` traversent.
     *
     * La formulation de volatilité cherchée est **celle que
     * `extraireLesFaits` reconnaît**, mot pour mot : on veut savoir où elle
     * commence pour s'arrêter avant.
     */
    const reperees = [
      boite.querySelector('p.rtp'),
      feuilles.find((e) => /^\s*paytable\s*$/i.test(e.textContent ?? '')) ?? null,
      feuilles.find((e) =>
        /(very\s+high|medium|low|high)\s+volatility|volatility\s*:?\s*(very\s+high|medium|low|high)/i.test(
          e.textContent ?? '',
        ),
      ) ?? null,
    ].map((e) => (e ? Math.round(e.getBoundingClientRect().top - cadre.top + boite.scrollTop) : null));

    return {
      visible: Math.round(cadre.height),
      total: boite.scrollHeight,
      rtp: reperees[0],
      paytable: reperees[1],
      volatilite: reperees[2],
    };
  }, PANNEAU_REGLES);
}

/** Amène le panneau à la hauteur demandée. */
async function defiler(page: Page, hauteur: number): Promise<void> {
  await page.evaluate(
    ([sel, y]) => {
      const boite = document.querySelector(sel as string) as HTMLElement | null;
      if (boite) boite.scrollTop = y as number;
    },
    [PANNEAU_REGLES, hauteur] as const,
  );
  await page.waitForTimeout(500);
}

export const WAZDAN: Adaptateur = {
  studio: 'wazdan',

  /** Leur lanceur, celui que les 261 fiches portent en base. */
  demoExploitable: (url) => url.includes('gamelaunch.wazdan.com'),

  /**
   * Trois secondes, et non seize.
   *
   * Ce délai est consommé par `capturer-jeux.ts` **sur la `demoUrl`**,
   * c'est-à-dire sur la fiche marketing où le 301 nous a déposés : un document
   * WordPress ordinaire, chargé en moins de deux secondes. Le vrai chargement
   * — celui du moteur de jeu — est attendu dans `ouvrirLeJeu`, après le saut,
   * parce que c'est le seul endroit qui sache quand il commence.
   */
  chargementMs: 3_000,

  /**
   * Dix secondes entre deux lots, et c'est une précaution, pas une mesure.
   *
   * Aucune limite de débit n'a été rencontrée : une trentaine de lancements en
   * quarante-cinq minutes de reconnaissance, aucun 429, aucune page
   * Cloudflare. Contrairement à BGaming, dont les 30 s viennent d'un vrai ban
   * à 227 lancements, ce chiffre ne mesure rien — il reconnaît seulement que
   * Wazdan est un partenaire et que 261 jeux d'affilée se remarquent. Le vrai
   * garde-fou reste l'arrêt de la campagne à la première page de ban, et
   * `--pause=` remplace cette valeur.
   */
  pauseEntreJeuxMs: 10_000,

  /**
   * Saute de la fiche marketing vers le lanceur, puis ferme l'écran d'accueil.
   *
   * ── Seize secondes, et pourquoi c'est un chronomètre ────────────────────
   *
   * Le moteur ne publie aucun témoin exploitable : le `<canvas>` existe dès la
   * première seconde, pendant l'écran de chargement au logo Wazdan, et le DOM
   * reste vide tant qu'aucun panneau n'est ouvert. Il n'y a donc rien à
   * attendre — on chronomètre. Mesuré en photographiant quatre jeux seconde
   * par seconde et en suivant la luminosité de l'image : le logo laisse la
   * place au jeu à la 9ᵉ seconde sur Turbo Play et Sizzling 777 Deluxe, à la
   * 10ᵉ sur Magic Spins, à la 12ᵉ sur 12 Bells. Seize laisse quatre secondes
   * de marge au plus lent, et le filet n'est pas ce délai mais la boucle
   * ci-dessous, qui vérifie avant d'agir.
   *
   * ── L'écran d'accueil se ferme à la barre d'espace, et c'est un piège ───
   *
   * Essayé dans l'ordre : Échap ne fait rien, Entrée ne fait rien, **Espace**
   * ferme le carrousel d'accueil. Mais Espace est aussi la touche de lancement
   * de tour de Wazdan : sur un jeu **sans** écran d'accueil — Turbo Play n'en
   * a pas — la même touche fait tourner les rouleaux. Vérifié à l'écran, et le
   * dégât est exactement celui qu'on cherche à éviter : la capture « base » a
   * montré trois rouleaux en train de tourner, sous la légende « comme la démo
   * l'ouvre, avant tout tour », et le solde était passé de 100 000 à 99 940.
   *
   * D'où l'ordre inversé : on **demande d'abord le panneau de règles**. S'il
   * s'ouvre, l'écran d'accueil n'était pas là et on ne touche pas au clavier.
   * S'il ne s'ouvre pas, c'est que l'accueil avale les clics — et alors, et
   * alors seulement, Espace. Le clic sur « ? » pendant l'accueil est inerte :
   * vérifié à l'écran, il tombe sur le décor du carrousel, à bonne distance de
   * la case « Do not show again » (relevée à x≈51 et x≈140 selon l'habillage).
   */
  async ouvrirLeJeu(page) {
    const lanceur = await page
      .evaluate(() => (window as unknown as { gameParams?: { game_url?: string } }).gameParams?.game_url ?? null)
      .catch(() => null);

    if (lanceur) {
      /*
       * L'en-tête est posé sur la page, donc pour toutes ses requêtes à venir :
       * le document du lanceur comme les ressources du moteur. Le poser après
       * la navigation n'aurait servi à rien — c'est la toute première réponse
       * qui décide entre le jeu et le 301.
       */
      await page.setExtraHTTPHeaders({ 'User-Agent': UA_NAVIGATEUR_REEL });
      await page.goto(lanceur, { waitUntil: 'load', timeout: 120_000 });
      await page.waitForTimeout(16_000);
    }

    for (let essai = 0; essai < 3; essai++) {
      await page.mouse.click(AIDE.x, AIDE.y);
      await page.waitForTimeout(3_000);
      if (await lireLesReperes(page)) {
        /*
         * Échap referme ce panneau — et lui seul. Sur le panneau « i », qui est
         * du canvas, la même touche ouvre une boîte « Exit the game? » : voir
         * `capturerLesRegles`.
         */
        await page.keyboard.press('Escape');
        await page.waitForTimeout(2_000);
        return;
      }
      await page.keyboard.press('Space');
      await page.waitForTimeout(4_000);
    }
  },

  /**
   * Feuillette le panneau « i », puis le panneau « GAME RULES », et referme.
   *
   * L'ordre — table des symboles et fonctions d'abord, règlement ensuite — est
   * celui dans lequel les images sortiront sur la fiche : on montre le jeu
   * avant de citer son règlement.
   *
   * ── Le panneau « i » se feuillette avec sa propre icône ─────────────────
   *
   * Sa pagination a des flèches, mais elles **bougent** : relevées à (943, 615)
   * sur 12 Bells et à (878, 598) sur Magic Spins, sans rapport dérivable avec
   * la géométrie du panneau HTML. Une flèche mal visée ne fait rien au mieux,
   * referme le panneau au pire — et sept captures du jeu de base partiraient
   * sous le titre « Game rules, page N ».
   *
   * Il se trouve qu'on n'en a pas besoin : **recliquer l'icône « i » avance
   * d'une page**. Vérifié sur Magic Spins, où le deuxième clic passe de « Bonus
   * symbols » à « Hold the Jackpot bonus game ». Et sur un habillage classique
   * dont le panneau tient en une page — Turbo Play, dont la table de gains
   * occupe tout l'écran — le deuxième clic **referme**. Les deux comportements
   * se distinguent à l'empreinte, donc sans rien deviner : revenu au jeu, on
   * s'arrête ; revenu à la première page, on s'arrête aussi, le panneau ayant
   * bouclé.
   *
   * ── Échap est interdit tant que le panneau « i » est ouvert ─────────────
   *
   * Coûté une reconnaissance entière : sur le panneau « i », Échap n'est pas
   * « fermer » mais **« quitter le jeu »** — une boîte « Exit the game? Yes /
   * No » s'ouvre par-dessus, et tout ce qui suit clique dedans. Le panneau
   * « i » se quitte donc par l'enchaînement vers « ? », qui le remplace, et
   * c'est le panneau HTML, lui, qu'Échap referme proprement.
   */
  async capturerLesRegles(page, cliche) {
    const jeuAuRepos = await empreinte(page);
    let prises = 0;

    /* ── 1. Le panneau « i », peint dans le canvas ────────────────────────── */
    await page.mouse.click(INFO.x, INFO.y);
    await page.waitForTimeout(3_000);
    let courante = await empreinte(page);
    if (ecartMoyen(jeuAuRepos, courante) > SEUIL_A_BOUGE) {
      const premierePage = courante;
      await cliche(`regles-${++prises}`);
      for (let page_ = 1; page_ < PAGES_INFO_MAX; page_++) {
        await page.mouse.click(INFO.x, INFO.y);
        await page.waitForTimeout(2_200);
        courante = await empreinte(page);
        // Revenu au jeu : le panneau n'avait qu'une page et vient de se fermer.
        if (ecartMoyen(jeuAuRepos, courante) < SEUIL_A_BOUGE) break;
        // Revenu à la première page : la pagination a bouclé.
        if (ecartMoyen(premierePage, courante) < SEUIL_A_BOUGE) break;
        await cliche(`regles-${++prises}`);
      }
    }

    /* ── 2. Le panneau « GAME RULES », qui porte le chiffre ───────────────── */
    let reperes: Reperes | null = null;
    for (let essai = 0; essai < 2 && !reperes; essai++) {
      await page.mouse.click(AIDE.x, AIDE.y);
      await page.waitForTimeout(3_000);
      reperes = await lireLesReperes(page);
    }
    if (!reperes) {
      /*
       * On rend ce qu'on a, et surtout pas `SANS_PANNEAU`.
       *
       * `SANS_PANNEAU` affirme qu'un jeu n'a **par conception** rien à
       * documenter et le retire définitivement de la file. Les six habillages
       * Wazdan rencontrés portent tous ce panneau, du classique à trois
       * rouleaux au Hold the Jackpot : un échec ici veut dire qu'on n'a pas su
       * l'ouvrir, pas qu'il n'existe pas. L'affirmation serait invérifiable et
       * irréversible.
       */
      return prises;
    }

    /**
     * Le plafond du balayage, et la donnée fausse qu'il évite.
     *
     * Le règlement Wazdan se termine par une section générique, « Volatility
     * Levels™ », qui décrit le **réglage** que le joueur peut changer :
     * « Low volatility: … », « High volatility: In this mode you can hit BIG
     * WINs… ». Ce n'est pas la volatilité du jeu, c'est le mode d'emploi d'un
     * bouton — et les trois modes y sont décrits sur tous les jeux, quels
     * qu'ils soient.
     *
     * `extraireLesFaits` y lit pourtant `high volatility` et rend HAUTE, ce qui
     * suffit à `capturer-jeux.ts` pour l'écrire en base : la volatilité n'y est
     * conditionnée qu'à l'absence de désaccord sur le RTP, pas à sa lecture.
     * Vérifié sur 12 Bells, où l'OCR de ces pages rend bien HAUTE. Publié tel
     * quel, c'était **259 fiches sur 261** — celles dont le champ est vide —
     * étiquetées « volatilité haute » sur la foi d'un paragraphe qui parle
     * d'autre chose.
     *
     * Ne pas capturer ces pages est le seul remède qui soit à la portée d'un
     * adaptateur : le texte n'atteint jamais l'interprétation. On y perd la
     * section « Gamble feature » et le pied de page réglementaire ; on y gagne
     * de ne rien affirmer que le studio n'ait dit de ce jeu-là.
     */
    const plafond = reperes.volatilite ?? reperes.total;
    const dernierDepart = Math.max(0, Math.min(plafond, reperes.total) - reperes.visible);

    /*
     * Les hauteurs visées, dans l'ordre du document.
     *
     * Quatre vues réparties donnent la continuité ; deux lignes s'ajoutent à
     * leur place réelle plutôt qu'en supplément à la fin, pour que la fiche se
     * lise dans l'ordre du règlement. Le retrait d'un tiers de fenêtre place la
     * ligne visée dans le haut de l'image et non contre son bord, où le
     * recadrage d'OCR de `lireLesRegles` la couperait.
     */
    const marge = Math.round(reperes.visible / 3);
    const visees = [
      ...Array.from({ length: VUES_REGLES }, (_, i) =>
        Math.round((dernierDepart * i) / Math.max(1, VUES_REGLES - 1)),
      ),
      /*
       * La ligne du taux de retour — la seule qu'on vienne chercher.
       *
       * Elle est loin : mesurée à 1 659 px du haut sur Magic Spins et à 2 172
       * sur Turbo Play, pour une fenêtre de 500. Un balayage à pas fixe peut
       * l'enjamber ; on la vise donc nommément, à partir de la position que le
       * panneau déclare lui-même.
       */
      ...(reperes.rtp != null ? [reperes.rtp - marge] : []),
      /*
       * L'entrée « Paytable » de la liste des boutons, et pourquoi elle décide
       * du sort du jeu.
       *
       * `capturer-jeux.ts` refuse un jeu dont aucune page OCR ne contient
       * `RTP`, `GAME RULES` ou `PAYTABLE` — c'est ce qui prouve que le panneau
       * s'est ouvert. Chez Wazdan, aucun des trois ne va de soi :
       *
       * · le titre « GAME RULES » est peint **au-dessus** du cadre que
       *   `lireLesRegles` recadre (y≈35 sur 12 Bells, contre un recadrage qui
       *   commence à y=60) ; il tombe donc dans l'image mais hors de la lecture ;
       * · la phrase du taux dit « Game average return to player: 96.15% », sans
       *   jamais le sigle.
       *
       * Reste le mot « Paytable », intitulé du bouton dans la liste des
       * commandes. Sans cette vue, un jeu entièrement réussi — panneau ouvert,
       * douze pages capturées, chiffre à l'écran — repartirait en file avec
       * « panneau de règles jamais atteint », et y reviendrait à chaque
       * campagne.
       */
      ...(reperes.paytable != null && reperes.paytable < plafond ? [reperes.paytable - marge] : []),
    ]
      .map((y) => Math.max(0, Math.min(y, reperes.total - reperes.visible)))
      .sort((a, b) => a - b);

    let precedente = -ECART_MINIMAL_PX * 2;
    for (const y of visees) {
      if (y - precedente < ECART_MINIMAL_PX) continue;
      precedente = y;
      await defiler(page, y);
      await cliche(`regles-${++prises}`);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(2_000);
    return prises;
  },

  /**
   * L'achat de bonus n'est pas capturé, et ce n'est pas un oubli.
   *
   * Le bouton existe — un chariot rouge dans la barre du bas, relevé à
   * (355, 723) sur 12 Bells et (364, 723) sur Magic Spins — et le règlement dit
   * quand le jeu le propose (« Using the Buy Feature… »), donc la moitié du
   * travail est faite. Ce qui manque est le contrôle d'après-clic : la boîte
   * d'achat de Wazdan s'ouvre **dans le canvas**, sans témoin DOM, et la
   * reconnaissance n'a pas pu l'atteindre proprement — la seule tentative a été
   * faussée par la boîte « Exit the game? » restée ouverte derrière, et rien
   * n'a donc été vérifié à l'écran.
   *
   * Le sens de l'erreur décide : un faux négatif coûte une image ; un faux
   * positif publierait le jeu de base — ou pire, une boîte de confirmation de
   * sortie — sous la légende « Buying the feature », sur 261 fiches. Tant que
   * ce clic n'a pas été regardé jeu par jeu, il ne sera pas tenté.
   */
  async capturerLAchat() {
    return false;
  },
};
