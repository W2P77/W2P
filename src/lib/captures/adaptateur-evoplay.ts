/**
 * L'adaptateur de capture d'**Evoplay**.
 *
 * Fichier séparé de `adaptateurs.ts` à dessein : plusieurs studios sont
 * instruits en parallèle, et la table `ADAPTATEURS` est le seul point où ils se
 * croisent. Le branchement s'y fait en une ligne, quand ce fichier est prêt.
 *
 * ── Ce qu'Evoplay a de confortable, et ce qu'il a de piégeux ──────────────
 *
 * Le confortable : la `demoUrl` en base **est** le jeu — un lanceur direct
 * (`demo.demo-evoplay.games/demo/<famille>/…`), pas une page produit à
 * traverser comme chez BGaming ou Hacksaw. Et le panneau de documentation est
 * le **même sur tout le catalogue** : un bandeau « Rules », une colonne
 * d'onglets à gauche (Paytable · Rules · Settings · [Bonus Buy] · Fullscreen ·
 * Close), et le texte au centre. Rien à chercher d'un jeu à l'autre.
 *
 * Le piégeux tient en un mot : **Evoplay sert deux moteurs de rendu pour le
 * même habillage.** Sur Anubis' Moon, toute l'interface est du HTML — on y
 * trouve `.ui-rules`, `.control-btn`, un conteneur `.scroll-content` dont on
 * peut lire et écrire le `scrollTop`. Sur Belfry Bliss, Cat's Blessing, Fruit
 * Nova, Hot Volcano, The Greatest Catch, Book of Keno… **le document ne
 * contient pas un seul `<button>`** : l'habillage identique au pixel près est
 * peint dans le `<canvas>`.
 *
 * Relevé sur onze jeux tirés du catalogue : **dix sont en canvas**, un seul en
 * HTML. S'appuyer sur les sélecteurs aurait donc marché à la reconnaissance et
 * échoué sur la campagne. Cet adaptateur ne clique qu'à des coordonnées, et ne
 * lit jamais le DOM — c'est le seul langage que les deux moteurs partagent.
 *
 * ── Le RTP est affiché en permanence, et c'est ce qui sauve la campagne ───
 *
 * Le bandeau du panneau porte, sous le mot « Rules », la ligne
 * « <Nom du jeu> (RTP 96.00%) ». Elle est **fixe** : elle reste à l'écran quand
 * le texte défile, donc **chaque** capture de l'onglet Rules la contient, à
 * y≈78 — dans le recadrage de `lireLesRegles` comme dans la bande haute de
 * `lireLEcran`. Deux conséquences :
 *
 * · le contrôle final de `capturer-jeux.ts` (« une capture porte-t-elle
 *   `EN_TETE_PANNEAU` ? ») passe sur n'importe laquelle des pages ;
 * · c'est aussi **le témoin d'ouverture le plus sûr** qu'on ait ici, puisque
 *   le gros titre « Rules » lui-même, lui, ne se lit pas de façon fiable —
 *   l'OCR en tire « Sols » ou « eta » sur l'onglet Paytable.
 *
 * ── Ce qu'Evoplay écrit, et que `extraireLesFaits` ne sait pas encore lire ─
 *
 * Le bas de l'onglet Rules publie « RETURN TO PLAYER — The overall theoretical
 * return to player is 96.00 %. », « Min bet: DEMO 0.10 », « Max bet: DEMO
 * 10,000.00 ». Aucune de ces trois formulations ne correspond aux gabarits de
 * `lecture-regles.ts` : il exige le sigle `RTP` **après** « Return to Player »
 * (BGaming écrit « Return to Player (RTP) », Evoplay non), et « MINIMUM BET »
 * là où Evoplay écrit « Min bet ».
 *
 * Les captures sont donc publiées — elles valent par elles-mêmes, et la fiche
 * garde son niveau de confiance précédent — mais `rtp` sortira `null` tant que
 * `extraireLesFaits` n'aura pas appris la forme parenthésée du bandeau, qui est
 * la plus propre à lire ici. Ce n'est pas réparable depuis un adaptateur : il
 * ne rend que des captures, jamais des faits. Signalé, pas contourné.
 *
 * ── Le sans-tête suffit, et il a été vérifié ──────────────────────────────
 *
 * Contrairement au RGS de Hacksaw, `demo.demo-evoplay.games` ne met aucun
 * Cloudflare devant ses démos : vérifié sur onze jeux en `headless: true`, le
 * moteur charge, l'écran d'accueil s'affiche, le panneau s'ouvre. Pas de
 * `avecTete` donc — le poser coûterait une fenêtre ouverte par jeu sur toute
 * une campagne, pour rien.
 *
 * Si un jour ce n'était plus vrai (« Access Denied », jeu qui ne charge
 * jamais), la bascule se fait dans `capturer-jeux.ts` et **elle doit
 * s'accompagner de `args: ['--window-position=-2400,-2400']`** : la campagne
 * dure des heures sur le poste de travail de quelqu'un, et une fenêtre qui
 * vole le focus à chaque jeu rend la machine inutilisable. Ce n'est pas un
 * confort, c'est la condition pour que la campagne aille jusqu'au bout.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/**
 * Les familles de démo que cet adaptateur sait conduire.
 *
 * Le catalogue Evoplay en base porte **quatre** formes de `demoUrl`, et elles
 * ne se ressemblent que dans l'adresse :
 *
 * · `/demo/fullstate/…` — les 49 machines à sous. Le cœur de cible.
 * · `/demo/instant/…` — 24 jeux instantanés (keno, gratte-cartes, duels).
 *   Habillage identique, même colonne d'onglets, même bandeau — Book of Keno
 *   annonce même une **plage** « (RTP 95.92% - 96.11%) ». Ils passent.
 * · `/demo/table/…` — 7 jeux de table (roulettes, blackjack, poker). Le
 *   panneau s'ouvre, mais son bandeau **n'affiche aucun RTP** et la colonne
 *   d'onglets gagne deux entrées (History, Sound) qui décalent toutes les
 *   coordonnées. Ce ne sont pas des machines à sous : hors sujet ici.
 * · `/demo/socketgames/…` — 9 jeux à courbe. **Ces adresses rendent un 404
 *   nginx** (vérifié sur Avia Rush) : il n'y a rien à capturer, et le défaut
 *   est dans la `demoUrl`, pas dans l'adaptateur.
 *
 * Trois fiches pointent en plus la page marketing `evoplay.games/game/…`, qui
 * n'est pas un jeu. Les écarter ici plutôt que de les laisser échouer une par
 * une : le journal du runner compte les écartés et dit pourquoi.
 */
const FAMILLES_CONDUITES = /demo\.demo-evoplay\.games\/demo\/(fullstate|instant)\//;

/**
 * Les endroits où l'écran d'accueil se ferme, dans l'ordre où on les essaie.
 *
 * Il n'y a pas **un** écran d'accueil Evoplay mais au moins quatre mises en
 * page, relevées à l'œil sur neuf jeux :
 *
 * · Belfry Bliss, Cat's Blessing — « CLICK TO CONTINUE » : n'importe quel clic
 *   ferme, d'où le centre en premier ;
 * · The Greatest Catch — carrousel avec bouton de lancement en colonne de
 *   droite, à (1090, 405) ;
 * · Anubis' Moon — même famille mais **à une autre échelle** : le même bouton
 *   est à (1136, 508). x=1105 tombe dans les deux boutons, pas y ;
 * · Book of Keno — la fenêtre d'accueil des jeux instantanés, bouton à
 *   (975, 517) ;
 * · B-Ball Blitz (627), Cursed Castle (647), Hot Volcano (697), Fruit Nova
 *   (710) — bouton centré en bas, et il **glisse de quatre-vingts pixels**
 *   d'un jeu à l'autre. Un bouton fait une cinquantaine de pixels de haut :
 *   640 couvre les deux premiers, 703 les deux derniers, et aucune valeur
 *   unique ne couvre les quatre. Juste en dessous du bouton se trouve la case
 *   « Don't show next time » — viser large ferait cocher une case au lieu de
 *   lancer le jeu.
 *
 * **L'ordre n'est pas cosmétique, il est la sûreté de la capture « base ».**
 * Les cinq premiers points sont inertes une fois le jeu ouvert : vérifié à
 * l'écran, ils tombent sur le décor ou les rouleaux, et Evoplay n'y lance
 * rien — le tour se déclenche par le bouton rond du bas. Le sixième, lui,
 * **est ce bouton rond** : un clic là sur un jeu déjà ouvert lance un tour, et
 * la capture « base » montrerait des rouleaux en mouvement au lieu du jeu au
 * repos. Il est donc en dernier, c'est-à-dire atteint seulement quand les cinq
 * précédents n'ont rien changé à l'écran — autrement dit quand on est encore,
 * à coup sûr, sur un écran d'accueil.
 */
const ACCUEIL: Array<{ x: number; y: number }> = [
  { x: 640, y: 400 },
  { x: 1105, y: 405 },
  { x: 1105, y: 508 },
  { x: 975, y: 517 },
  { x: 640, y: 640 },
  { x: 640, y: 703 },
];

/**
 * L'icône « règles », en bas à gauche du jeu.
 *
 * Le seul point de tout cet adaptateur qui n'ait jamais varié : (33, 648) sur
 * Belfry Bliss et Cat's Blessing, (34, 654) sur Anubis' Moon, la même sur les
 * jeux instantanés. Le bouton fait une trentaine de pixels de côté, (33, 651)
 * tombe au milieu des trois.
 */
const ICONE_REGLES = { x: 33, y: 651 };

/**
 * Les deux positions possibles de l'onglet « Paytable », dans le panneau.
 *
 * La colonne d'onglets est **ancrée en bas** : Close et Fullscreen ne bougent
 * jamais, et c'est le groupe du haut qui coulisse selon qu'une entrée « Bonus
 * Buy » s'intercale ou non. Mesuré :
 *
 * · avec Bonus Buy (Belfry Bliss, Cat's Blessing) — Paytable 313, Rules 380 ;
 * · sans (Fruit Nova, Book of Keno) — Paytable 380, Rules 447.
 *
 * Les deux dispositions se recouvrent donc exactement d'un cran, et y=380
 * désigne « Paytable » dans l'une et « Rules » dans l'autre : une coordonnée
 * unique se tromperait d'onglet **en silence**, ce qui est précisément la
 * panne que l'icône « i » a coûtée chez Pragmatic. D'où deux candidats, et une
 * vérification par OCR entre les deux.
 *
 * L'ordre compte : 313 d'abord, parce qu'il est **inerte** sur la disposition
 * sans Bonus Buy — il tombe au-dessus du premier onglet, dans le vide (vérifié
 * sur Fruit Nova : le panneau reste sur Rules). 407 d'abord aurait au
 * contraire rappelé « Rules » sur la disposition avec Bonus Buy, sans dégât
 * mais sans information non plus.
 *
 * 407 et non 380 : le bouton est plus haut qu'il n'y paraît — mesuré, un clic
 * à 407 atteint encore l'entrée centrée sur 380, et s'éloigner de la frontière
 * entre deux onglets vaut mieux que la raser.
 */
const ONGLET_PAYTABLE = [313, 407];

/**
 * L'entrée « Bonus Buy » de la colonne, quand le jeu en vend un.
 *
 * C'est la trouvaille qui rend `capturerLAchat` fiable ici. Le bouton « BONUS
 * BUY » peint **dans le jeu** ne tient pas en place — (52, 553) sur Belfry
 * Bliss, (72, 560) sur Cat's Blessing — et c'est exactement le genre de
 * coordonnée qui rate une partie du catalogue sans rien signaler. L'entrée de
 * la colonne, elle, est toujours au même endroit, et elle **n'existe que si le
 * jeu vend la fonction** : le jeu répond lui-même à la question au lieu qu'on
 * la devine.
 *
 * Sur la disposition sans Bonus Buy, y=545 tombe dans l'espace entre Settings
 * et Fullscreen : le clic est inerte, l'onglet courant reste affiché, et l'OCR
 * le dira.
 */
const ONGLET_ACHAT = 545;

/** Le panneau, au repos, occupe tout l'écran : ce recadrage est toujours dedans. */
const COEUR = { left: 200, top: 100, width: 880, height: 560 };

/**
 * Le panneau Rules, et lui seul.
 *
 * `EN_TETE_PANNEAU` de `lecture-regles.ts` cherche `RTP|GAME RULES|PAYTABLE` :
 * il conviendrait ici, mais il conviendrait **aussi** à l'onglet Paytable, où
 * le mot « Paytable » figure. Or ces deux onglets doivent être distingués l'un
 * de l'autre — c'est toute la mécanique de `ONGLET_PAYTABLE`.
 *
 * ── Pourquoi pas « RTP » seul, qui serait pourtant le mot exact ───────────
 *
 * Le bandeau porte « <Nom du jeu> (RTP 96.00%) », et c'était le premier
 * témoin retenu. Il a échoué sur B-Ball Blitz, panneau **grand ouvert** : la
 * ligne y est écrite en petit sous un titre lui-même mal rendu, et l'OCR en a
 * tiré « Rul . B-Ball oan 0%) » — sept tentatives d'ouverture, sept lectures
 * identiques, et un jeu renvoyé en file avec le diagnostic d'un adaptateur mal
 * réglé. Le sigle n'est donc pas fiable à cette taille.
 *
 * « GAME DESCRIPTION » l'est : c'est la première section de l'onglet, en
 * grandes capitales, et elle a été lue **sans une faute** sur les cinq jeux
 * relevés — Anubis' Moon, Belfry Bliss, Fruit Nova, Book of Keno, B-Ball
 * Blitz — là où le bandeau se dégradait. Elle n'apparaît jamais sur l'onglet
 * Paytable, qui ouvre sur « SYMBOL PAYOUT ». On garde « RTP » en second
 * témoin : quand il passe, il passe.
 */
const EN_TETE_REGLES = /GAME\s*DESCRIPTION|RTP/i;

/**
 * L'onglet Paytable, reconnu par sa première section et non par son titre.
 *
 * Le gros titre « Paytable » est écrit dans une graisse fine que l'OCR ne rend
 * pas — relevé « Sols » sur Belfry Bliss, « eta » sur Fruit Nova. En dessous,
 * « SYMBOL PAYOUT » est en capitales et se lit sans faute sur les deux. C'est
 * la première section de l'onglet, donc elle est à l'écran à l'instant précis
 * où l'on vérifie.
 */
const EN_TETE_PAYTABLE = /SYMBOL\s*PAYOUT|PAYTABLE/i;

/** Le bandeau de la boîte d'achat, lu au mot près sur Belfry Bliss. */
const EN_TETE_ACHAT = /BONUS\s*BUY/i;

/**
 * Le pas de molette, choisi pour que les **deux** moteurs avancent pareil.
 *
 * Mesuré, et c'est le genre de détail qui décide de la moitié des captures :
 *
 * · en canvas, le panneau avance de **33 px par événement, quel que soit le
 *   `deltaY`** — 40, 100, 120, 600, 2000 et 5000 donnent le même déplacement ;
 * · en HTML, il avance **exactement du `deltaY` demandé** — 40 donne 40,
 *   200 donne 200.
 *
 * Une valeur confortable comme 600 ferait donc 33 px d'un côté et 600 de
 * l'autre : le même code sauterait dix-huit écrans sur un moteur et rien sur
 * l'autre. À 40, les deux avancent de 33 à 40 px, et le découpage en vues tient
 * pour les deux.
 */
const PAS_MOLETTE = 40;

/**
 * Seize crans par vue, soit 534 px en canvas et 640 px en HTML.
 *
 * La fenêtre de texte du panneau fait 667 px de haut. On reste donc en dessous
 * **des deux côtés** : un chevauchement coûte une bande de texte répétée d'une
 * image à l'autre, un dépassement couperait des lignes que personne ne verrait
 * jamais — et c'est en bas du panneau, dans la section « RETURN TO PLAYER »,
 * que se trouve la seule ligne qu'on vienne chercher.
 */
const CRANS_PAR_VUE = 16;

/**
 * Le plafond de vues par onglet.
 *
 * Le plus long panneau rencontré (Belfry Bliss, qui documente jackpots, Hells
 * Bells, Devil's Luck, Free Spins et Bonus Buy) demande sept vues ; Anubis'
 * Moon en demande quatre. Dix laisse de la marge sans coûter : la boucle
 * s'arrête d'elle-même dès que le panneau ne bouge plus.
 */
const VUES_MAX = 10;

/**
 * En dessous, l'écran n'a pas changé.
 *
 * Mesuré sur quatre jeux, et la marge est large : deux captures prises à
 * 2,5 s d'intervalle sur un écran au repos — décor animé compris — s'écartent
 * de **0 à 2,6** ; un clic qui rate donne la même chose ; la fermeture de
 * l'écran d'accueil donne **21 à 82**. Entre les deux, il n'y a rien.
 *
 * Le cas limite connu : le carrousel de The Greatest Catch tourne **tout
 * seul** toutes les trente secondes environ, et le changement de vignette pèse
 * 16,6 — au-dessus du seuil. Il peut donc faire croire à `ouvrirLeJeu` qu'un
 * clic a fermé l'accueil alors qu'il n'a rien fait. C'est pour ce cas précis
 * que `capturerLesRegles` sait rejouer la séquence d'accueil.
 */
const SEUIL_A_BOUGE = 12;

/**
 * En dessous, le panneau est arrivé en bas.
 *
 * Même mesure, autre usage : le texte du panneau est fixe, donc deux vues
 * identiques s'écartent de 0. On prend 4 pour absorber l'horloge du bandeau,
 * qui change de minute pendant le défilement.
 */
const SEUIL_FIN_DE_PANNEAU = 4;

/**
 * L'écran de chargement d'Evoplay est **noir**, et c'est mesurable.
 *
 * Luminosité moyenne relevée : 0 à 2 pendant le chargement (logo gris sur
 * fond noir), 52 à 71 dès que l'écran d'accueil est peint, 29 quand le panneau
 * de règles est ouvert. Le seuil de 10 les sépare sans ambiguïté.
 *
 * Sans ce contrôle, la stabilité seule ne suffirait pas : l'écran de
 * chargement est **immobile** dans le recadrage `COEUR` — sa barre de
 * progression est plus bas — et un jeu encore en train de charger passerait
 * donc pour prêt. Le premier clic d'accueil partirait dans le vide et
 * l'apparition de l'accueil, quelques secondes plus tard, serait mise au
 * crédit de ce clic.
 */
const LUMINOSITE_MINIMALE = 10;

/** Empreinte de l'écran : 16×16 en niveaux de gris, comparable d'un instant à l'autre. */
async function empreinte(page: Page): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract(COEUR)
    .grayscale()
    .resize(16, 16, { fit: 'fill' })
    .raw()
    .toBuffer();
}

/** Écart moyen par pixel, de 0 (identiques) à 255. */
function ecartMoyen(a: Buffer, b: Buffer): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

/** Luminosité moyenne de l'écran entier, pour distinguer le chargement du jeu. */
async function luminosite(page: Page): Promise<number> {
  const stats = await sharp(await page.screenshot()).grayscale().stats();
  return stats.channels[0].mean;
}

/**
 * Attend que le moteur ait fini de peindre, au lieu de parier sur un délai.
 *
 * Le temps de chargement mesuré va de 6 s (The Greatest Catch) à 9 s (Belfry
 * Bliss) sur une machine au repos, et le script capture deux jeux en
 * parallèle : un délai fixe serait soit trop court un jour de charge, soit du
 * temps perdu sur toute la campagne. On regarde donc l'écran, ce qui coûte une
 * capture toutes les une seconde et demie et s'arrête dès que c'est prêt.
 *
 * Le plafond n'est pas un abandon : au-delà, on laisse la suite essayer quand
 * même. Un jeu vraiment mort échouera à l'ouverture du panneau, ce qui est le
 * bon endroit pour le dire.
 */
async function attendreLePeintre(page: Page): Promise<void> {
  const PLAFOND = 45_000;
  const PAS = 1_500;
  let precedente = await empreinte(page);
  for (let passe = 0; passe * PAS < PLAFOND; passe++) {
    await page.waitForTimeout(PAS);
    const actuelle = await empreinte(page);
    const fige = ecartMoyen(precedente, actuelle) < SEUIL_FIN_DE_PANNEAU;
    precedente = actuelle;
    if (fige && (await luminosite(page)) > LUMINOSITE_MINIMALE) return;
  }
}

/**
 * Feuillette l'onglet ouvert et rend le nombre de captures prises.
 *
 * On photographie **avant** de faire défiler : la première vue est le haut du
 * panneau, celle que le lecteur attend en tête. Et on s'arrête quand un bloc
 * de crans n'a plus rien déplacé — le panneau bute en bas — plutôt qu'à un
 * nombre de pages décidé d'avance, parce que la longueur varie du simple au
 * double d'un jeu à l'autre et que c'est justement la **dernière** section qui
 * porte le RTP.
 */
async function feuilleter(
  page: Page,
  cliche: (nom: string) => Promise<void>,
  numero: () => number,
): Promise<number> {
  // La molette agit sous le curseur, et le clic précédent l'a laissé sur la
  // colonne d'onglets, hors de la zone de texte : sans ce recentrage, rien ne
  // défile et on photographie sept fois la même page.
  await page.mouse.move(640, 400);
  let prises = 0;
  let precedente = await empreinte(page);
  for (let vue = 0; vue < VUES_MAX; vue++) {
    await cliche(`regles-${numero()}`);
    prises++;
    for (let cran = 0; cran < CRANS_PAR_VUE; cran++) {
      await page.mouse.wheel(0, PAS_MOLETTE);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(700);
    const actuelle = await empreinte(page);
    if (ecartMoyen(precedente, actuelle) < SEUIL_FIN_DE_PANNEAU) break;
    precedente = actuelle;
  }
  return prises;
}

export const EVOPLAY: Adaptateur = {
  studio: 'evoplay',

  /** Le lanceur direct, et seulement pour les familles qu'on sait conduire. */
  demoExploitable: (url) => FAMILLES_CONDUITES.test(url),

  /**
   * Cinq secondes, et le vrai chargement est attendu ailleurs.
   *
   * Ce délai est consommé par `capturer-jeux.ts` juste après le `goto`, à un
   * moment où l'écran est encore noir. Le mesurer finement ici n'aurait aucun
   * sens : c'est `attendreLePeintre`, au début d'`ouvrirLeJeu`, qui sait quand
   * le moteur a fini, parce qu'il regarde l'écran au lieu de compter.
   */
  chargementMs: 5_000,

  /**
   * Trente secondes entre deux lots — une précaution, pas un seuil mesuré.
   *
   * Aucun bannissement n'a été rencontré pendant la reconnaissance : une
   * cinquantaine de lancements en une heure sur `demo.demo-evoplay.games` sans
   * le moindre 429 ni page Cloudflare. Le chiffre est donc emprunté à BGaming,
   * qui l'a payé, et non constaté ici. Evoplay est un partenaire : perdre
   * l'accès à ses démos coûterait tout le chantier, et quatre minutes ajoutées
   * sur les soixante-treize jeux ne coûtent rien.
   */
  pauseEntreJeuxMs: 30_000,

  /**
   * Ferme l'écran d'accueil, et laisse le jeu au repos.
   *
   * On essaie les positions de `ACCUEIL` dans l'ordre, et on s'arrête au
   * premier clic qui **change l'écran** — ce qui évite d'aller taper le bouton
   * de tour une fois le jeu ouvert (voir le commentaire de `ACCUEIL`).
   *
   * Le seul cas qui resterait ouvert est un jeu **sans aucun écran d'accueil** :
   * les cinq premières positions n'y changeraient rien, la sixième lancerait un
   * tour, et la capture « base » montrerait des rouleaux en mouvement. Aucune
   * des neuf machines à sous reconnues n'est dans ce cas — elles ont toutes un
   * accueil, et la case « Don't show next time » n'est jamais cochée dans un
   * contexte de navigation neuf. Le risque est nommé, pas nul.
   *
   * Il existe en revanche, chez les jeux **instantanés**, des titres qui n'ont
   * ni accueil ni habillage de machine à sous : Adrenaline Rush ouvre sur un
   * choix de personnage et de voiture, avec ses propres boutons. Aucune
   * position d'accueil ne l'ouvrira jamais, et l'icône « règles » n'est pas là
   * où elle est partout ailleurs. Ces jeux ressortiront en « icône des règles
   * introuvable » et resteront en file — c'est le bon résultat : l'adaptateur
   * ne sait pas les conduire, et prétendre le contraire produirait des captures
   * d'un écran de garage sous la légende « Game rules ».
   *
   * Les trois secondes finales ne sont pas décoratives : si le dernier clic a
   * bien lancé un tour, elles laissent les rouleaux se reposer avant que le
   * runner ne prenne la capture « base ».
   */
  async ouvrirLeJeu(page) {
    await attendreLePeintre(page);
    for (const point of ACCUEIL) {
      const avant = await empreinte(page);
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(4_000);
      if (ecartMoyen(avant, await empreinte(page)) > SEUIL_A_BOUGE) break;
    }
    await page.waitForTimeout(3_000);
  },

  /**
   * Ouvre le panneau, feuillette les deux onglets qui documentent le jeu.
   *
   * L'ordre — **Rules puis Paytable** — n'est pas celui de BGaming, et c'est
   * délibéré. Le panneau s'ouvre déjà sur Rules : le capturer d'abord ne coûte
   * aucun clic, donc aucune occasion de se tromper d'onglet, et garantit que
   * la page qui porte le RTP est prise même si la bascule vers Paytable rate.
   * La table des symboles vient ensuite ; si on ne la trouve pas, on a déjà
   * l'essentiel.
   *
   * Le filet d'ouverture rejoue les positions d'accueil une à une. Le cas visé
   * n'est pas un mauvais pointage — l'icône « règles » ne bouge jamais — mais
   * un écran d'accueil encore là : le carrousel qui tourne tout seul peut
   * avoir fait croire à `ouvrirLeJeu` qu'il était fermé (voir `SEUIL_A_BOUGE`).
   * Un clic sur l'icône qui ne rencontre pas le jeu tombe sur le décor de
   * l'accueil et n'ouvre rien : on peut le rejouer sans dégât.
   */
  async capturerLesRegles(page, cliche, lireLEcran) {
    let ouvert = false;
    for (let essai = 0; essai <= ACCUEIL.length && !ouvert; essai++) {
      if (essai > 0) {
        await page.mouse.click(ACCUEIL[essai - 1].x, ACCUEIL[essai - 1].y);
        await page.waitForTimeout(3_500);
      }
      await page.mouse.click(ICONE_REGLES.x, ICONE_REGLES.y);
      await page.waitForTimeout(3_500);
      ouvert = EN_TETE_REGLES.test(await lireLEcran());
    }
    if (!ouvert) {
      /*
       * On rend 0, jamais `SANS_PANNEAU`.
       *
       * `SANS_PANNEAU` affirme qu'un jeu n'a **par conception** rien à
       * documenter, et le retire définitivement de la file. Chez Evoplay,
       * l'habillage est partagé par tout le catalogue et porte toujours ce
       * panneau : un échec ici veut dire qu'on n'a pas su l'ouvrir, pas qu'il
       * n'existe pas. Le déclarer inexistant serait une affirmation
       * invérifiable — et irréversible.
       */
      return 0;
    }

    let compteur = 0;
    const numero = () => ++compteur;

    /* ── 1. L'onglet « Rules », celui qui porte le chiffre ────────────────── */
    let prises = await feuilleter(page, cliche, numero);

    /* ── 2. L'onglet « Paytable », celui qui montre le jeu ────────────────── */
    for (const y of ONGLET_PAYTABLE) {
      await page.mouse.click(ICONE_REGLES.x, y);
      await page.waitForTimeout(3_000);
      if (EN_TETE_PAYTABLE.test(await lireLEcran())) {
        prises += await feuilleter(page, cliche, numero);
        break;
      }
    }

    return prises;
  },

  /**
   * La boîte d'achat de bonus, **si le jeu en vend une**.
   *
   * On ne ferme pas le panneau avant d'y aller, contrairement aux adaptateurs
   * Pragmatic et BGaming : chez eux le bouton d'achat est dans le jeu, ici
   * c'est une entrée de la colonne d'onglets. Rester dans le panneau évite un
   * aller-retour et, surtout, évite d'avoir à retrouver dans le jeu un bouton
   * « BONUS BUY » dont la position change d'un habillage à l'autre.
   *
   * Le sens de l'erreur est choisi, comme ailleurs : un faux négatif coûte une
   * image ; un faux positif publierait un écran quelconque sous la légende
   * « Buying the feature », sur la fiche d'un jeu qui ne vend peut-être rien.
   * D'où l'exigence du bandeau « Bonus Buy » avant de déclencher la capture.
   */
  async capturerLAchat(page, cliche, lireLEcran) {
    await page.mouse.click(ICONE_REGLES.x, ONGLET_ACHAT);
    await page.waitForTimeout(3_500);
    if (!EN_TETE_ACHAT.test(await lireLEcran())) return false;
    await cliche('achat');
    return true;
  },
};
