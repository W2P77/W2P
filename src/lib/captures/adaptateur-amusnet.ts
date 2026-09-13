/**
 * L'adaptateur de capture d'**Amusnet**.
 *
 * Il vit dans son propre fichier plutôt que dans `adaptateurs.ts` : plusieurs
 * studios sont instruits en parallèle, et la table `ADAPTATEURS` est le seul
 * point où ils se croisent. Le branchement s'y fait en une ligne.
 *
 * ── Ce que la base contient, et pourquoi ce n'est pas un lanceur ───────────
 *
 * Les 252 `demoUrl` Amusnet pointent toutes sur la **fiche produit**
 * (`amusnet.com/games/online-casino/<slug>`), et c'est délibéré : le lanceur
 * réel (`free.games.amusnet.io/gl/amusnet?gameLaunchToken=…`) porte un jeton
 * frappé à la demande, et sans `Referer` du domaine il répond 302 vers la page
 * marketing. Une URL de lanceur mise en base serait morte à la capture
 * suivante. On part donc de la fiche, et c'est elle qui fabrique le jeton.
 *
 * ── Les deux portails, et l'ordre dans lequel ils tombent ──────────────────
 *
 * La fiche pose deux barrages avant le bouton de démo, et ils se recouvrent :
 * le bandeau `#cookiescript_accept` est **au-dessus** du portail d'âge, si
 * bien qu'un clic sur « Yes, I'm over 18 » avant d'avoir accepté les cookies
 * tombe sur le voile gris. D'où l'ordre — cookies, puis âge, puis démo.
 *
 * ── Ce qu'on a vérifié à l'image, et pas seulement au code HTTP ────────────
 *
 * Le piège Wazdan — un 301 silencieux qui sert la fiche marketing à un
 * Chromium sans tête, sans que rien n'échoue — a été cherché ici : en
 * `headless: true`, la démo s'ouvre bel et bien, rouleaux compris et mise
 * affichée (relevé à l'image sur 10 Bulky Fruits, 20 Super Hot, Cavemen and
 * Dinosaurs et Jacks or Better Poker). Aucune réécriture d'en-tête n'est
 * nécessaire et aucune fenêtre n'est ouverte sur le poste.
 *
 * Le jeu s'ouvre **dans la page elle-même**, en `<iframe>` sur un voile noir :
 * il n'y a ni onglet ni fenêtre à suivre, et la capture d'écran de la `Page`
 * que reçoit le runner montre bien le jeu. Le contenu de l'iframe, lui, est
 * un `<canvas>` d'un autre domaine : aucun sélecteur n'y est interrogeable,
 * d'où des coordonnées pour tout ce qui suit l'ouverture.
 *
 * ── Amusnet n'écrit jamais « RTP », et ça bloque la publication ────────────
 *
 * Le panneau d'information se termine par une section « Return to Player » :
 * « The average return to Player of the game is 96.17% » (10 Bulky Fruits,
 * conforme au 96,17 de la base ; 95,79 sur 20 Super Hot, 96,25 sur Cavemen and
 * Dinosaurs, tous conformes). Le sigle `RTP` n'y figure **nulle part**, pas
 * plus que « GAME RULES » ou « PAYTABLE » — compté : **0 vue sur les 26** du
 * panneau, du titre à la dernière ligne.
 *
 * Or `capturer-jeux.ts` refuse de publier un jeu dont aucune capture ne porte
 * `EN_TETE_PANNEAU` (`/RTP|GAME RULES|PAYTABLE/i`), et `extraireLesFaits` ne
 * connaît pas cette formulation-là — la variante Wazdan qu'il sait lire est
 * « **Game** average return to player: 96.15% », pas « The average return to
 * Player **of the game** is ». Tant que ces deux points de `lecture-regles.ts`
 * n'ont pas été élargis, les fiches de l'habillage machine — tout le catalogue
 * moins une poignée — repartiront en file au lieu d'être publiées, et leur taux
 * restera `null`. Curiosité utile : les fiches de table et de vidéo poker,
 * elles, passeraient — leur page d'aide écrit « Payouts are displayed on the
 * Paytable ».
 *
 * Ce n'est pas réparable ici : `lecture-regles.ts` est un fichier partagé, et
 * cet adaptateur n'a pas à mentir sur ce qu'il a vu pour passer un contrôle.
 *
 * Ce qu'il ne fera pas non plus : rendre `SANS_PANNEAU`. Le drapeau affirme
 * qu'un jeu n'a **par conception** rien à documenter et le retire
 * définitivement de la file. Les deux habillages reconnus portent tous deux ce
 * panneau, et il porte le chiffre : l'affirmation serait fausse, et
 * irréversible.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/** Le bandeau de cookies, premier des deux portails. */
const COOKIES = '#cookiescript_accept';

/**
 * Le portail d'âge, reconnu à son texte faute d'`id` et de classe.
 *
 * Relevé sur les quatre fiches reconnues : `<button>Yes, I'm over 18</button>`,
 * sans le moindre attribut. L'apostrophe est **typographique** (U+2019) dans
 * la page ; l'exprimer en `.` dans l'expression évite de dépendre du signe
 * exact, qu'un changement de gabarit pourrait redresser sans prévenir.
 */
const PORTAIL_AGE = 'text=/Yes, I.m over 18/i';

/** Le bouton qui frappe le jeton et ouvre le jeu, en bas de la fiche. */
const BOUTON_DEMO = '#play-demo-btn';

/**
 * Le cadre du jeu, attendu avant de compter les secondes de chargement.
 *
 * Attendre l'iframe plutôt qu'un délai forfaitaire distingue deux pannes que
 * tout confondrait : une fiche qui n'ouvre rien (bouton absent, jeu retiré)
 * échoue ici avec un message, au lieu de laisser la campagne photographier
 * pendant 15 s une page marketing parfaitement immobile.
 */
const CADRE_DU_JEU = 'iframe[src*="games.amusnet.io"]';

/**
 * Le bouton « menu » de la barre du bas : la seule porte du panneau.
 *
 * Il n'y a **pas** d'icône « i » dans le jeu. Le panneau d'information est un
 * onglet de ce menu, et ce menu appartient à l'enveloppe du lanceur, pas au
 * thème du jeu : même position au pixel près sur un classique (20 Super Hot),
 * une vidéo (10 Bulky Fruits) et un titre récent (Cavemen and Dinosaurs).
 *
 * C'est un interrupteur : le bouton devient une croix au même endroit une
 * fois le menu ouvert, et un second clic referme tout. D'où la vérification
 * avant de recliquer — un second clic « pour être sûr » rendrait le jeu de
 * base.
 */
const MENU = { x: 1184, y: 681 };

/**
 * Le bouton d'aide des jeux de table et de vidéo poker.
 *
 * Cinq fiches repérées au slug — Jacks or Better, 4 of a Kind Bonus Poker et
 * les trois Keno — tournent dans une enveloppe plus ancienne : « MORE GAMES » à la place
 * de l'accueil, aucun onglet, et un bouton qui ouvre directement le texte des
 * règles en plein écran. Il est 57 px à gauche et 5 px plus bas que celui des
 * machines — assez pour que l'un ne réponde jamais à la place de l'autre.
 */
const MENU_TABLE = { x: 1127, y: 686 };

/**
 * L'onglet « i » du menu, à droite de la barre d'onglets.
 *
 * Le menu ouvre sur « GAME SETTINGS » (son, son de fond, tour rapide), qui ne
 * documente rien. Les trois onglets sont, de gauche à droite : l'engrenage
 * (352), l'historique des tours (640) et l'information (927).
 */
const ONGLET_INFO = { x: 927, y: 613 };

/** La croix du panneau, en haut à droite du cadre : rend le jeu de base. */
const FERMER = { x: 1043, y: 189 };

/** Le corps du panneau, où poser le curseur : la molette agit sous lui. */
const CORPS = { x: 640, y: 400 };

/** La pastille « BUY BONUS », à gauche des rouleaux des titres récents. */
const ACHAT = { x: 157, y: 570 };

/**
 * Ce que la boîte d'achat ouverte pèse à l'image, et pourquoi ce n'est pas
 * l'OCR qui le dit.
 *
 * Première version : lire « BUY BONUS », le titre de la boîte, à y≈187 —
 * c'est-à-dire dans la bande haute que `lireLEcran` sait lire. Elle a rendu
 * **faux sur Cavemen and Dinosaurs**, dont la boîte était pourtant grande
 * ouverte à l'écran : la bande y est dominée par les quatre compteurs de
 * jackpot, le titre en touche le bord inférieur, et l'OCR en tire
 * « Parson 0 zor sanoo J CATERED Tova ». Un jeu à achat de bonus sortait donc
 * sans sa capture, sans la moindre erreur — le mode d'échec le plus coûteux.
 *
 * La boîte, elle, couvre le tiers central de l'écran : 49,3 d'écart sur le
 * corps du panneau quand elle s'ouvre, contre 0,0 pour un jeu au repos
 * photographié deux fois à 17 s d'intervalle et 0,0 pour un clic sans effet.
 * On mesure donc, avec le même seuil que l'ouverture d'un panneau.
 */
const SEUIL_ACHAT_OUVERT = 25;

/**
 * Les deux en-têtes qui disent où l'on est, et pourquoi ce ne sont pas des
 * sigles.
 *
 * Tous deux sont écrits en grandes capitales blanches sur noir à y≈188, dans
 * la bande haute que lit `lireLEcran` — l'OCR les rend sans une faute. Le mot
 * « RTP » aurait été le témoin naturel ; il ne figure nulle part chez ce
 * studio, et il se dégrade de toute façon sur un panneau grand ouvert (la
 * leçon payée chez Evoplay, « Rul . B-Ball oan 0%) »).
 *
 * Les distinguer l'un de l'autre n'est pas un luxe : le menu ouvre toujours
 * sur les réglages, et confondre les deux ferait feuilleter trois interrupteurs
 * en croyant photographier la documentation.
 */
const EN_TETE_MENU = /GAME\s*SETTINGS/i;
const EN_TETE_INFO = /INFORMATION/i;

/**
 * Le corps du panneau, sans son en-tête ni sa barre d'onglets.
 *
 * L'empreinte sert à savoir si la molette a fait descendre quelque chose. Y
 * laisser l'en-tête (« INFORMATION », immobile) et la barre d'onglets
 * diluerait l'écart d'un tiers ; y laisser le jeu, animé en permanence
 * derrière le cadre, le rendrait illisible.
 */
const CORPS_DU_PANNEAU = { left: 215, top: 215, width: 850, height: 360 };

/**
 * En dessous, le panneau ne défile plus.
 *
 * Mesuré sur les vues successives de 10 Bulky Fruits : **0,0** deux fois de
 * suite une fois le bas atteint, et de **3,7 à 13,9** tant qu'il descend. Le
 * 3,7 est un vrai défilement — deux paragraphes de texte qui se ressemblent —
 * et c'est lui qui fixe le seuil : à 6, on se serait arrêté au milieu du
 * panneau en croyant tenir la fin, sans jamais atteindre la ligne du taux.
 */
const SEUIL_A_BOUGE = 2;

/**
 * Au-dessus, l'écran a **changé de nature** : le jeu a cédé la place au texte.
 *
 * Ce seuil-là ne mesure pas un défilement mais une ouverture, et il sert là où
 * l'OCR n'a rien à lire — l'habillage des jeux de table, dont la page d'aide
 * s'ouvre sur le nom du jeu et non sur un en-tête fixe. Mesuré : **82,6** quand
 * l'aide s'ouvre, **71,5** et **80,7** pour les deux écrans de l'habillage
 * machine, et **0,0** pour le clic qui ne trouve rien. 25 tient au milieu de
 * deux régimes qui ne se touchent pas.
 */
const SEUIL_OUVERT = 25;

/**
 * Le plafond de la descente — large exprès, et voilà ce qu'il a coûté.
 *
 * Il valait d'abord 30, pour vingt-six crans mesurés sur 10 Bulky Fruits. La
 * première campagne d'essai l'a frôlé : Cavemen and Dinosaurs, plus bavard, a
 * atteint son bas de panneau au vingt-neuvième. Un jeu à peine plus long
 * s'arrêterait donc **au plafond et non au bas**, et la vue « prise après la
 * boucle » — celle qui porte le taux de retour — montrerait un paragraphe du
 * milieu. Sans rien signaler.
 *
 * Le plafond ne doit jamais être ce qui arrête la descente : c'est
 * l'immobilité du texte qui le fait. Il n'est là que pour empêcher une boucle
 * sans fin le jour où la molette cesserait d'agir, et le porter à 60 ne coûte
 * rien aux panneaux courts, qui sortent bien avant.
 */
const CRANS_MAX = 60;

/**
 * Le nombre de vues qu'on publie, indépendant de la longueur du panneau.
 *
 * La cadence seule ne suffit pas : sur un panneau de soixante crans, un cran
 * sur quatre ferait quinze images pour une seule fiche. On cesse donc de
 * photographier passé ce compte, **sans cesser de descendre** — il faut
 * atteindre le bas pour en ramener la dernière vue.
 */
const PRISES_MAX = 8;

async function empreinte(page: Page): Promise<Buffer> {
  const png = await page.screenshot();
  return sharp(png)
    .extract(CORPS_DU_PANNEAU)
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
 * Descend le panneau à la molette et rend le nombre de vues photographiées.
 *
 * `unCranSur` règle la densité : un cran sur quatre pour le panneau des
 * machines (vingt-six à vingt-neuf vues), un sur deux pour celui des jeux de
 * table (sept). La dernière vue est prise **après** la boucle, hors cadence et
 * hors plafond : c'est celle qui porte le taux de retour, et la manquer
 * viderait la capture de sa raison d'être.
 */
async function feuilleter(
  page: Page,
  cliche: (nom: string) => Promise<void>,
  unCranSur: number,
): Promise<number> {
  // La molette agit là où est le curseur, que le clic d'ouverture a laissé
  // dans la barre du bas.
  await page.mouse.move(CORPS.x, CORPS.y);

  let prises = 0;
  let precedente = await empreinte(page);
  for (let cran = 0; cran < CRANS_MAX; cran++) {
    if (cran % unCranSur === 0 && prises < PRISES_MAX - 1) {
      await cliche(`regles-${++prises}`);
    }
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1_200);
    const actuelle = await empreinte(page);
    if (ecartMoyen(precedente, actuelle) < SEUIL_A_BOUGE) break;
    precedente = actuelle;
  }
  await cliche(`regles-${++prises}`); // le bas du panneau, et le taux
  return prises;
}

export const AMUSNET: Adaptateur = {
  studio: 'amusnet',

  /**
   * Six secondes, et c'est volontairement trop peu pour un jeu.
   *
   * Ce délai-là est attendu par `capturer-jeux.ts` sur l'URL de la base, qui
   * est la **fiche produit** : un Next.js servi en 0,7 s, mesuré sur quatre
   * fiches. Le vrai chargement du jeu se produit dans `ouvrirLeJeu`, après le
   * clic sur « Play Demo », et il y est attendu explicitement.
   */
  chargementMs: 6_000,

  /**
   * La fiche produit, et rien d'autre.
   *
   * Une `demoUrl` qui porterait un `gameLaunchToken` serait déjà périmée : le
   * jeton est frappé à la demande. Filtrer sur le dossier `/games/` laisse
   * passer les deux familles de fiches du site (`online-casino`, et les
   * rubriques voisines si un jour la base en contient) sans laisser passer un
   * lanceur mort.
   */
  demoExploitable: (url) => url.includes('amusnet.com/games/'),

  /**
   * Une précaution, pas une mesure.
   *
   * Chaque ouverture fait frapper un jeton de démo côté studio ; le seuil
   * au-delà duquel ils s'en agacent n'est pas publié, et le ban BGaming
   * (Cloudflare 1015 après 227 lancements en 2h40) a coûté assez cher pour
   * qu'on ne laisse pas 252 fiches défiler sans respirer. Le vrai garde-fou
   * reste l'arrêt de la campagne à la première page de ban.
   */
  pauseEntreJeuxMs: 4_000,

  /**
   * Les deux portails, puis le jeu — et aucun écran d'accueil à fermer.
   *
   * ── Pourquoi des sélecteurs ici, et des coordonnées ensuite ──────────────
   *
   * Tout ce qui précède le jeu est du DOM ordinaire : c'est le seul endroit de
   * la chaîne Amusnet qui ne soit pas un `<canvas>`, et cliquer un `id` y est
   * plus sûr qu'une coordonnée — le bouton « Play Demo » est d'ailleurs
   * **hors** de la fenêtre (y≈924 pour un viewport de 800), et c'est Playwright
   * qui fait défiler jusqu'à lui.
   *
   * Un portail absent n'est pas une panne : le bandeau de cookies peut avoir
   * été accepté par un profil réutilisé. D'où des clics facultatifs. Le bouton
   * de démo, lui, n'est pas facultatif : son absence lève, et le runner écrit
   * le nom du jeu en échec plutôt que de photographier la fiche marketing.
   *
   * ── Quinze secondes, mesurées ────────────────────────────────────────────
   *
   * Le compte à rebours part du clic : l'iframe apparaît à +0,6 s, la barre
   * « Loading 0% » est encore à zéro à +2 s, et 10 Bulky Fruits est jouable à
   * +5 s. Mais Cavemen and Dinosaurs, plus lourd, était encore à **86 %** à
   * +8 s — et la première reconnaissance, qui n'attendait que ça, a cliqué son
   * menu dans le vide et rendu « panneau introuvable » sur un jeu parfaitement
   * sain. C'est ce raté-là qui fixe la marge, pas une précaution de principe.
   *
   * Aucun geste n'est donné au jeu lui-même. Ces démos ouvrent **directement**
   * sur « PLEASE PLACE YOUR BET », sans carrousel ni écran d'accueil : un
   * Espace « au cas où » lancerait un tour, et la capture du jeu de base
   * montrerait des rouleaux en mouvement ou un gain.
   */
  async ouvrirLeJeu(page) {
    for (const portail of [COOKIES, PORTAIL_AGE]) {
      const bouton = page.locator(portail).first();
      if (await bouton.isVisible().catch(() => false)) {
        await bouton.click().catch(() => {});
        await page.waitForTimeout(1_200);
      }
    }

    await page.locator(BOUTON_DEMO).first().click({ timeout: 15_000 });
    await page.waitForSelector(CADRE_DU_JEU, { timeout: 30_000 });
    await page.waitForTimeout(15_000);
  },

  /**
   * Le panneau du studio, du haut jusqu'en bas — par l'une ou l'autre porte.
   *
   * ── Deux enveloppes, et une seule se voit d'avance ───────────────────────
   *
   * **Machine à sous** (l'essentiel des 252 fiches) : 10 Bulky Fruits, 20 Super Hot et
   * Cavemen and Dinosaurs — un classique, une vidéo et un titre récent —
   * partagent la même barre du bas au pixel près. Le menu y est à (1184, 681),
   * il ouvre sur « GAME SETTINGS », et le panneau se prend par l'onglet « i ».
   *
   * **Table et vidéo poker** (cinq fiches repérées, poker et keno) : Jacks or
   * Better Poker n'a ni le même bas de page — « MORE GAMES » remplace
   * l'accueil — ni le même menu. Son bouton est à (1127, 686) et ouvre
   * **directement** le texte des règles, plein écran, sans onglets. Un clic à
   * (1184, 681) n'y produit **rien** (écart mesuré : 0,0), ce qui rend l'ordre
   * sûr : on essaie la machine, et son échec n'a rien abîmé.
   *
   * ── Ce qui prouve l'ouverture, et pourquoi ce n'est pas le même témoin ───
   *
   * Sur l'habillage machine, l'OCR : « GAME SETTINGS » puis « INFORMATION »,
   * en capitales blanches sur noir à y≈188, lus sans une faute. Sur l'habillage
   * table, il n'y a **aucun** en-tête à lire — la page s'ouvre sur le titre du
   * jeu, qui change à chaque fiche. On y mesure donc l'image : le jeu cède la
   * place à un mur de texte, soit un écart de **82,6** sur le corps du panneau,
   * quand le clic qui ne fait rien donne **0,0**. Il n'y a pas de zone grise.
   *
   * ── Le panneau défile, il ne se feuillette pas ───────────────────────────
   *
   * Aucune flèche, aucune pastille dans les deux cas : une colonne de texte,
   * vingt-six vues sur 10 Bulky Fruits, sept sur Jacks or Better. On descend à
   * la molette, et on ne photographie qu'un cran sur quatre (un sur deux pour
   * le panneau court) : capturer chaque cran donnerait vingt-six images quasi
   * identiques sur la fiche.
   *
   * La **dernière** vue est prise après la boucle, et ce n'est pas une vue
   * parmi d'autres : c'est celle qui porte « The average return to Player of
   * the game is 96.17% ». Un cran sur quatre la manquerait trois fois sur
   * quatre.
   */
  async capturerLesRegles(page, cliche, lireLEcran) {
    const jeuAuRepos = await empreinte(page);

    /* ── 1. L'habillage machine, par le menu et son onglet « i » ──────────
     *
     * Deux essais, parce que la panne la plus probable ici est un jeu qui
     * n'avait pas fini de charger : le clic tombe alors sur la barre de
     * progression, qui n'écoute pas. On lui redonne sa chance plutôt que de
     * renvoyer la fiche en file pour un rechargement complet.
     *
     * Et pas trois : le bouton est un interrupteur. Si le menu était ouvert et
     * que l'OCR l'a manqué, le second clic le referme — mieux vaut rendre 0 et
     * remettre la fiche en file que feuilleter un jeu de base en croyant lire
     * ses règles.
     */
    let menuOuvert = false;
    for (let essai = 0; essai < 2 && !menuOuvert; essai++) {
      await page.mouse.click(MENU.x, MENU.y);
      await page.waitForTimeout(essai === 0 ? 2_500 : 5_000);
      menuOuvert = EN_TETE_MENU.test(await lireLEcran());
    }

    if (menuOuvert) {
      await page.mouse.click(ONGLET_INFO.x, ONGLET_INFO.y);
      await page.waitForTimeout(2_500);
      // L'onglet n'a pas répondu : on ne feuillette pas les réglages du son.
      if (!EN_TETE_INFO.test(await lireLEcran())) return 0;

      const prises = await feuilleter(page, cliche, 4);
      // Vérifié à l'image sur les trois habillages machine : cette croix-là
      // referme le panneau **et** le menu, et rend le jeu de base.
      await page.mouse.click(FERMER.x, FERMER.y);
      await page.waitForTimeout(2_000);
      return prises;
    }

    /* ── 2. L'habillage table, par son propre bouton ───────────────────────
     *
     * Sur une machine à sous, ce second clic tombe sur le bouton du son, qui
     * n'a aucun effet sur le corps du panneau : la mesure rendra 0 et la fiche
     * repartira en file. Le mauvais habillage ne peut donc pas produire de
     * fausse capture, seulement un échec — et c'est le seul comportement
     * acceptable quand on ne sait pas ce qu'on a en face.
     */
    await page.mouse.click(MENU_TABLE.x, MENU_TABLE.y);
    await page.waitForTimeout(3_000);
    if (ecartMoyen(jeuAuRepos, await empreinte(page)) < SEUIL_OUVERT) return 0;

    const prises = await feuilleter(page, cliche, 2);
    // Le même bouton referme : il n'y a pas de croix ailleurs.
    await page.mouse.click(MENU_TABLE.x, MENU_TABLE.y);
    await page.waitForTimeout(2_000);
    return prises;
  },

  /**
   * L'achat de bonus, **quand le jeu en propose un**.
   *
   * ── Une minorité de titres, et une pastille toujours au même endroit ─────
   *
   * Les classiques n'ont rien à acheter — 10 Bulky Fruits, 10 Burning Heart,
   * 10 Glossy Hot et 20 Super Hot, vérifiés à l'écran : leurs jackpots
   * « Jackpot Cards » se déclenchent au hasard, et rien dans leur cadre ne
   * ressemble à un bouton d'achat. Les titres récents, eux, posent une
   * pastille rouge « BUY BONUS » à gauche des rouleaux, mesurée à (157, 570)
   * sur Cavemen and Dinosaurs.
   *
   * ── Pourquoi on clique avant de vérifier, et non l'inverse ───────────────
   *
   * La pastille est peinte dans le canvas à y≈570 : ni la bande haute (30→220)
   * ni la bande basse (630→800) que sait lire `lireLEcran` ne la couvrent. On
   * ne peut donc pas s'assurer de sa présence avant de cliquer.
   *
   * En revanche la **boîte** qu'elle ouvre se voit : elle couvre le tiers
   * central de l'écran, et c'est cet écart-là qui décide (voir
   * `SEUIL_ACHAT_OUVERT`, et l'échec de la version qui lisait son titre).
   * Rien n'a bougé, on rend `false` sans rien écrire ; sans ce contrôle on
   * publierait une image du jeu de base légendée « Buying the feature » — la
   * faute que le contrôle `/BUY/i` de l'adaptateur Pragmatic existe
   * précisément pour empêcher.
   *
   * ── Attendre le repos avant de prendre la référence ──────────────────────
   *
   * Cette faute-là, la deuxième version l'a commise quand même. Le panneau
   * qu'on vient de fermer se dissipe en fondu, et l'empreinte de départ le
   * contenait encore : entre elle et la mesure d'après clic, ce qui avait
   * changé n'était pas l'arrivée d'une boîte mais la **disparition du
   * panneau** — 49 points d'écart, et une capture du jeu de base publiée sous
   * la légende de l'achat. Vérifié à l'image sur Cavemen and Dinosaurs.
   *
   * D'où l'attente d'un écran immobile : deux empreintes consécutives qui ne
   * diffèrent plus. Un jeu au repos rend 0,0 sur cette zone (mesuré deux fois
   * à 17 s d'intervalle), donc la boucle sort au premier tour dès que le fondu
   * est fini.
   *
   * Le clic à vide est sans conséquence, et c'est ce qui rend l'ordre
   * acceptable : (157, 570) tombe sur le décor, à gauche du cadre des rouleaux
   * — qui commence à x≈200 sur 20 Super Hot et x≈215 sur 10 Bulky Fruits.
   * Aucun tour n'est lancé, aucune mise n'est engagée. Vérifié en campagne :
   * sur les trois jeux sans achat du premier lot, aucune capture « achat »
   * n'est sortie. C'est aussi pour ça qu'on ne presse **jamais** Espace chez ce
   * studio : le panneau annonce que la barre d'espace lance un tour.
   *
   * La boîte est photographiée **avant** toute confirmation : le bouton vert
   * « BUY » n'est jamais cliqué, aucune mise n'est engagée — c'est exactement
   * ce que la légende de la capture affirme.
   */
  async capturerLAchat(page, cliche) {
    let avant = await empreinte(page);
    for (let essai = 0; essai < 4; essai++) {
      await page.waitForTimeout(1_500);
      const actuelle = await empreinte(page);
      const immobile = ecartMoyen(avant, actuelle) < SEUIL_A_BOUGE;
      avant = actuelle;
      if (immobile) break;
    }

    await page.mouse.click(ACHAT.x, ACHAT.y);
    await page.waitForTimeout(3_500);
    if (ecartMoyen(avant, await empreinte(page)) < SEUIL_ACHAT_OUVERT) return false;
    await cliche('achat');
    return true;
  },
};
