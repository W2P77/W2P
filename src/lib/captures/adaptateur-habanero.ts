/**
 * L'adaptateur de capture du studio **Habanero**.
 *
 * Il vit dans son propre fichier plutôt que dans `adaptateurs.ts` : plusieurs
 * studios se câblent en parallèle, et un fichier commun aurait fait de chaque
 * ajout un conflit. Le branchement se fait dans la table `ADAPTATEURS`.
 *
 * ── Ce que la base contient ────────────────────────────────────────────────
 *
 * Les 222 `demoUrl` ont toutes la même forme, le lanceur du studio :
 * `app-test.insvr.com/games/?brandid=…&keyname=<clé>&mode=fun&locale=en&
 * nofunplaymessage=1&ifrm=1`. La clé dit le type de jeu : `SG…` pour les
 * 202 machines à sous, `TG…` pour 4 tables (blackjack, war, dragon tiger,
 * three card poker) et **sans préfixe** pour 16 vidéo-pokers, baccarats,
 * roulette et sic bo. Seules les `SG` sont prises : les autres n'ont ni menu
 * ni section RTP (vérifié sur War et Jacks or Better — 90 s d'attente pour
 * rien, puis « SECTION ABSENTE »), et leur modèle de faits n'est pas celui
 * d'une machine à sous. `demoExploitable` les écarte, le runner le dit en
 * clair (« 20 écartés ») au lieu de les faire échouer un par un.
 *
 * Relevé du 14/09/2026 sur les 222 lanceurs, lus en HTML brut à 1,2 s
 * d'intervalle : 222 réponses 200 en 47–198 ms, **aucun refus**. Chromium
 * **sans tête** reçoit le jeu, rouleaux et mise compris — le piège Wazdan
 * (une fiche marketing servie à un User-Agent « Headless ») a été cherché et
 * n'existe pas ici.
 *
 * ── Un code 200 ne prouve rien, ici non plus ──────────────────────────────
 *
 * Une clé inconnue (`SGKoiGate` au lieu de `SGTheKoiGate`) rend une page
 * blanche « Keyname 'SGKoiGate' is not found/active in configured games… |
 * GENERAL ERROR », en **200**, sans `#ui` ni canvas de jeu. Une sonde l'a
 * prise pour un jeu qui ne chargeait pas : elle attendait un témoin qui ne
 * viendrait jamais. L'adaptateur lit cette page et la nomme.
 *
 * ── Où est le RTP : dans le Help, et c'est du HTML ────────────────────────
 *
 * Le jeu est peint dans `canvas#canvas`. Mais l'engrenage en bas à gauche
 * (140, 786) ouvre un menu **HTML** (Help · More Games · Sound · Quick Spin),
 * et « Help » ouvre `#uiModal` : un panneau plein écran, blanc sur noir, dont
 * le texte défile dans `div.uiScroller` (y 67–784, 1034 px de large, de
 * 4 500 à 6 800 px de haut selon le jeu). Ses sections portent une classe,
 * et la dernière avant l'horodatage est **`section.rtpSection`** :
 *
 *   « Return To Player (RTP) »
 *   « The theoretical RTP for Hot Hot Fruit is 96.84% »
 *   « RTP calculation is based on the statistical analysis of the game
 *     logic and can not be affected by the player strategy (unless stated
 *     otherwise) »
 *   « RTP calculation is based on the average results of 2 x 500,000,000
 *     game cycles. »
 *
 * Relevé au mot près sur neuf jeux. Trois variantes de la première ligne,
 * toutes vues à l'écran :
 *
 * · **une plage** : « The theoretical RTP for 5 Lucky Lions is 96.51% -
 *   96.79% » (aussi Wizards Want War!, 95.18% - 96.59%) ;
 * · **des lignes conditionnelles à la suite** : « … is 96.66% if Feature Buy
 *   is enabled. », « … is 96.54% if Super Bet is enabled. », « … is 96.68%
 *   for normal play when NO GAMBLE is chosen for the Free Games Feature. »
 *   (Genie's Showtime, Gladiator Royal) ;
 * · **des jackpots** : « The theoretical RTP for MINOR JACKPOT is 0.50% »,
 *   « The theoretical RTP for JACKPOT RACE™ is 1.00% » — des taux de
 *   fonction, que les bornes 80–99,9 de `lecture-regles.ts` rejettent.
 *
 * L'OCR lit la ligne sans faute (vérifié sur quatre captures). C'est
 * l'**interprétation** qui manque quand le nom du jeu commence par un
 * chiffre : « for 5 Lucky Lions is 96.51% » rend `null` chez
 * `extraireLesFaits`, parce que sa règle générale s'arrête au premier chiffre
 * après le mot-clé et y attend le taux. Neuf jeux `SG` sont dans ce cas (5
 * Lucky Lions, 5 Mariachis, 12 Zodiacs, Queen of Queens 243/1024, Shaolin
 * Fortunes 100/243, Jump 2, Zeus 2). La règle à ajouter est dans le rapport
 * de reconnaissance ; ce fichier n'y peut rien.
 *
 * ── Le taux qu'on n'écrira pas : celui d'un mode ──────────────────────────
 *
 * Cinq jeux n'ont **aucune ligne inconditionnelle** : Cake Valley ouvre sa
 * section sur « … is 96.03% if Green Jelly Mode is selected », Indian Cash
 * Catcher sur « … is 95.61% if 3 ways is played », MX Mania sur le taux du
 * vélo bleu. Le premier nombre lu serait publié en source studio comme le
 * taux du jeu, alors que c'est celui d'un réglage — et le lanceur lui-même
 * déclare autre chose (`_settings.GameRTP` : 96,29, 96,78, 96,40).
 *
 * D'où le garde-fou : la première ligne de la section est relue dans le DOM,
 * et le jeu est **refusé, en le disant**, si le taux que le lanceur déclare
 * n'y figure pas. `GameRTP` n'est jamais écrit — seul l'OCR du panneau l'est,
 * c'est la règle du site — il sert de témoin de cohérence entre deux sources
 * du même studio. Sur une plage, il est toujours le haut (96,79 pour 96,51 -
 * 96,79) : c'est la convention « le haut est le défaut » de
 * `lecture-regles.ts`, confirmée par le studio.
 *
 * ── La table de gains a deux générations ──────────────────────────────────
 *
 * L'API de pont ouvre la table (`_on_openPaytable`), et ce qui s'ouvre dépend
 * du jeu :
 *
 * · **Paginée** (Hot Hot Fruit, Koi Gate, 5 Lucky Lions, Genie's Showtime) :
 *   `#desktopPayTable`, de 7 à 11 `div.page` superposées à (133, 27) en
 *   1013 × 520, une seule à `opacity: 1`. Les flèches et la maison sont
 *   peintes **dans le canvas** à une place qui suit l'habillage — (712, 661)
 *   tourne la page sur Hot Hot Fruit et ne fait rien sur Koi Gate. La
 *   flèche « suivante » est donc cherchée à l'image, dans la bande à droite
 *   de la maison, et chaque clic est **vérifié** sur l'opacité des pages.
 *
 *   La voie facile a été essayée et elle ment : rendre visible la page n
 *   dans le DOM. L'image obtenue montrait la page n **et** le symbole animé
 *   de la page 0, que le jeu peint dans le canvas par-dessus sa page HTML,
 *   avec les points de navigation restés sur la première — un écran que
 *   personne ne voit dans le jeu. Seule la flèche fait redessiner le canvas.
 * · **Empilée** (5 Mariachis) : le même `#desktopPayTable`, mais ses six
 *   `div.page` sont **toutes** à `opacity: 1`, posées les unes sous les
 *   autres dans `div.pagesContainer` (`overflow: scroll`, 3 496 px pour 429
 *   visibles). Il n'y a pas de flèche, seulement une maison. On le reconnaît
 *   à ce qu'aucune page n'est seule visible, et on fait défiler le
 *   conteneur — `scrollTop` s'y écrit et s'y relit.
 * · **Modale** (Flying High, Arcane Elements, 12 Zodiacs — les habillages
 *   plus anciens) : le même `#uiModal` que le Help, titré « Pay Table », qui
 *   défile. Une fois le Help ouvert puis fermé, son défileur reste dans le
 *   DOM, caché, **devant** celui de la table : `querySelector` le rendait,
 *   son `scrollTop` n'acceptait rien, et la table n'avait qu'une vue. On
 *   vise le défileur qui a une hauteur.
 *
 * ── La cadence ────────────────────────────────────────────────────────────
 *
 * Aucun refus en 222 lectures HTML et une trentaine de chargements de jeu.
 * Le seuil, s'il existe, n'est pas publié ; `pauseEntreJeuxMs` est une
 * précaution, `--pause=` la remplace.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/** Le lanceur du studio, et seulement les machines à sous (`keyname=SG…`). */
const LANCEUR_SLOT = /^https:\/\/app-test\.insvr\.com\/games\/\?(?:[^#]*&)?keyname=SG[A-Za-z0-9]+(?:&|$)/;

/** La page « Keyname … is not found/active … GENERAL ERROR », servie en 200. */
const PAGE_D_ERREUR = /not found\/active|GENERAL ERROR/i;

/**
 * Le panneau modal (Help et table de gains modale), son texte, sa croix.
 * `#uiModal` est dans le DOM dès le chargement, vide et sans taille : c'est
 * sa taille qui dit qu'il est ouvert.
 */
const MODALE = '#uiModal';
const DEFILEUR = '#uiModal .uiScroller';
const TEXTE_HELP = '#uiModal .slotUIExternalHelp';
const SECTION_RTP = '#uiModal section.rtpSection';
const CROIX = '#uiModal span.closeBtn';

/** La table de gains paginée, ses pages, et son conteneur quand il défile. */
const TABLE_PAGINEE = '#desktopPayTable';
const PAGES = '#desktopPayTable .page';
const CONTENEUR_PAGES = '#desktopPayTable .pagesContainer';

/**
 * Un cran du conteneur empilé : 429 px visibles, des lignes de 25 px.
 * Avec un pas inférieur à 429 − 25, toute ligne est entière sur au moins
 * un cran.
 */
const CRAN_EMPILE = 380;

/**
 * L'engrenage de la barre du bas, peint dans le canvas, et « Help » dans le
 * menu HTML qu'il ouvre. Deuxième voie, si l'API de pont ne répond pas.
 */
const ENGRENAGE = { x: 140, y: 786 };
const MENU_HELP = '#ui span.icon.help';

/**
 * Un cran de défilement de la modale : 717 px visibles, 50 px par ligne.
 * Avec un pas inférieur à 717 − 50, toute ligne est entière sur au moins
 * un cran — le garde-fou du contrôle direct de `ligneRtpVisible`.
 */
const CRAN = 640;

/** Le nombre de vues de table de gains au plus : au-delà, la fiche se noie. */
const VUES_TABLE_MAX = 6;

/**
 * Là où vit la flèche « page suivante » de la table paginée : à droite de la
 * maison, elle-même centrée sur x = 640. Mesuré à (709, 659) sur 5 Lucky
 * Lions, (712, 661) sur Hot Hot Fruit, (748, 636) sur Genie's Showtime. La
 * fenêtre commence à 690 pour laisser la maison dehors : son bord droit
 * (x ≈ 664) est une tache vive de 300 px, et la cliquer **ferme la table**.
 */
const BANDE_FLECHE = { left: 690, top: 600, width: 120, height: 100 };

/** Une tache vive est un bouton si elle tient dans ce carré. */
const COTE_BOUTON = 90;

/**
 * L'écran d'introduction de certains jeux, et son bouton « ›› ».
 *
 * 5 Mariachis n'ouvre pas sur ses rouleaux mais sur un carrousel peint dans
 * le canvas — « MARIACHI WILD MULTIPLIERS », quatre points, un bouton « ›› »
 * dans une pilule jaune pâle à (635, 650), une case « Don't show again ».
 * Rien dans le DOM, rien dans `_settings` (`ShowPaytableOnLaunch` est faux
 * là comme ailleurs) : la première simulation l'a photographié en « jeu de
 * base », puis a pris la table de gains **par-dessus**. Deux clics sur « ›› »
 * l'ont fermé, mesurés ; le troisième tombe sur le décor, au-dessus du
 * bouton de tour.
 *
 * ── Reconnue à ses couleurs, et pourquoi pas à sa forme ──────────────────
 *
 * Une recherche de tache vive (comme pour la flèche) ne marche pas ici : le
 * ciel pastel de l'intro est lui-même « vif » et noie la pilule dans une
 * tache de toute la fenêtre. Un comptage de pixels orange non plus : le
 * village des rouleaux de ce même jeu en compte davantage.
 *
 * Ce qui tient, mesuré sur l'intro et sur les rouleaux de dix jeux : la
 * pilule est un aplat jaune pâle (≈ 250/230/135) sur 133 × 54 px, avec les
 * chevrons orange (≈ 242/118/16) en son centre. On demande les deux
 * ensemble, en six points de l'aplat et un du chevron. Aucun des dix jeux
 * au repos ne les a tous — 5 Mariachis lui-même, rouleaux ouverts, a du
 * jaune pâle à gauche de ce point et du brun à droite.
 *
 * Un autre jeu avec une intro d'une autre couleur passerait au travers, et
 * son « jeu de base » serait l'intro — ce que la simulation montre, et
 * qu'une seconde signature réglera le jour où on le verra.
 */
const SUIVANT_INTRO = { x: 635, y: 650 };
const APLAT_INTRO = [
  [580, 650],
  [600, 650],
  [670, 650],
  [690, 650],
  [600, 635],
  [670, 665],
] as const;
const CHEVRON_INTRO = [
  [635, 650],
  [650, 650],
] as const;

/** Le centre de l'écran, que seul un changement d'écran entier modifie en grand. */
const CENTRE = { left: 200, top: 120, width: 880, height: 480 };

/**
 * En dessous, l'image n'a pas bougé.
 *
 * Mesuré seconde par seconde sur cinq jeux : l'écran de titre (« HABANERO »)
 * pèse de 91 à 159 quand il remplace la page blanche, les rouleaux de 39 à
 * 67 quand ils remplacent l'écran de titre, puis 0,0 à 0,5 au repos — sauf
 * Santa's Inn, dont les guirlandes clignotent à 4,3–5,0. Le seuil passe
 * au-dessus des guirlandes et loin sous tout changement d'écran.
 */
const SEUIL_AU_REPOS = 6;

/** Le corps du panneau va de y=67 à y=784 ; le recadrage OCR lit y 60–680. */
const FENETRE_LISIBLE = { haut: 70, bas: 670 };

async function empreinte(page: Page): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract(CENTRE)
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

/** Vrai si un élément est dans le DOM avec une taille et sans `display: none`. */
async function visible(page: Page, selecteur: string): Promise<boolean> {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none';
  }, selecteur);
}

/**
 * Appelle une fonction de l'API de pont, et dit si elle existait.
 *
 * `braggBridgeAPI` est l'un des dix objets que le lanceur expose aux
 * opérateurs (everyMatrix, pokerstars, pariplay…) ; c'est le seul à porter
 * les quatre verbes ouvrir/fermer × Help/table. Un appel qui lève — l'objet
 * absent, la page d'erreur — rend faux, et l'appelant passe à la voie
 * suivante au lieu de cliquer dans le vide.
 */
async function pont(page: Page, verbe: string): Promise<boolean> {
  return page
    .evaluate((v) => {
      const api = (window as unknown as { braggBridgeAPI?: Record<string, () => void> }).braggBridgeAPI;
      if (!api || typeof api[v] !== 'function') return false;
      api[v]();
      return true;
    }, verbe)
    .catch(() => false);
}

/**
 * Fait défiler le défileur **visible** de la modale d'un pas, et dit s'il a
 * bougé. `scrollTop` est écrit et relu : quand il ne bouge plus, on est en
 * bas — ou on tient le mauvais défileur, ce qui revient au même pour la
 * boucle et se voit dans le journal au nombre de vues.
 */
async function defiler(page: Page, pas: number): Promise<boolean> {
  return page.evaluate(
    ({ sel, pas }) => {
      const boite = [...document.querySelectorAll(sel)].find(
        (e) => e.getBoundingClientRect().height > 0,
      ) as HTMLElement | undefined;
      if (!boite) return false;
      const avant = boite.scrollTop;
      boite.scrollTop = avant + pas;
      return boite.scrollTop !== avant;
    },
    { sel: DEFILEUR, pas },
  );
}

/**
 * Les taches vives et compactes d'une fenêtre, de la plus grosse à la plus
 * petite : les candidates au rôle de flèche.
 *
 * « Vive » veut dire un canal haut **et** de la couleur (max − min > 40) :
 * les flèches sont dorées ou jaunes, et un blanc pur ou un gris clair du
 * décor n'est pas un bouton. « Compacte » écarte les liserés du cadre, qui
 * traversent la fenêtre — c'est le tri par la forme de l'adaptateur
 * 1spin4win. La liste est rendue entière : c'est le clic vérifié qui décide,
 * pas la taille.
 */
interface Tache {
  x: number;
  y: number;
  n: number;
  /** La boîte englobante, dans le repère de la fenêtre. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

async function tachesVives(
  page: Page,
  fenetre: { left: number; top: number; width: number; height: number },
  cote = COTE_BOUTON,
): Promise<Tache[]> {
  const { data, info } = await sharp(await page.screenshot())
    .extract(fenetre)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const largeur = info.width;
  const hauteur = info.height;
  const vif = new Uint8Array(largeur * hauteur);
  for (let p = 0, i = 0; p < largeur * hauteur; p++, i += info.channels) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    if (max > 170 && max - min > 40) vif[p] = 1;
  }
  const vu = new Uint8Array(largeur * hauteur);
  const pile: number[] = [];
  const taches: Tache[] = [];
  for (let depart = 0; depart < largeur * hauteur; depart++) {
    if (!vif[depart] || vu[depart]) continue;
    pile.length = 0;
    pile.push(depart);
    vu[depart] = 1;
    let n = 0;
    let sx = 0;
    let sy = 0;
    let xMin = largeur;
    let xMax = 0;
    let yMin = hauteur;
    let yMax = 0;
    while (pile.length) {
      const p = pile.pop()!;
      const x = p % largeur;
      const y = (p / largeur) | 0;
      n++;
      sx += x;
      sy += y;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
      const voisins = [
        x > 0 ? p - 1 : -1,
        x < largeur - 1 ? p + 1 : -1,
        y > 0 ? p - largeur : -1,
        y < hauteur - 1 ? p + largeur : -1,
      ];
      for (const q of voisins) if (q >= 0 && vif[q] && !vu[q]) { vu[q] = 1; pile.push(q); }
    }
    const compacte = xMax - xMin <= cote && yMax - yMin <= cote;
    if (n >= 30 && compacte) {
      taches.push({
        x: Math.round(fenetre.left + sx / n),
        y: Math.round(fenetre.top + sy / n),
        n,
        x0: xMin,
        x1: xMax,
        y0: yMin,
        y1: yMax,
      });
    }
  }
  return taches.sort((a, b) => b.n - a.n);
}

/** Vrai si la pilule « ›› » d'un écran d'introduction est à l'écran. */
async function introAffichee(page: Page): Promise<boolean> {
  const { data, info } = await sharp(await page.screenshot()).raw().toBuffer({ resolveWithObject: true });
  const pixel = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };
  const jaunePale = ([r, g, b]: readonly [number, number, number]) =>
    r >= 215 && g >= 195 && b <= 170 && r >= g && g >= b;
  const orange = ([r, g, b]: readonly [number, number, number]) => r >= 220 && g >= 90 && g <= 200 && b <= 80;
  return (
    APLAT_INTRO.every(([x, y]) => jaunePale(pixel(x, y))) &&
    CHEVRON_INTRO.some(([x, y]) => orange(pixel(x, y)))
  );
}

/** Le nombre de pages de la table à `opacity: 1` : une seule si elle est paginée. */
async function pagesVisibles(page: Page): Promise<number> {
  return page.evaluate(
    (sel) => [...document.querySelectorAll(sel)].filter((p) => getComputedStyle(p).opacity === '1').length,
    PAGES,
  );
}

/** Fait défiler le conteneur empilé d'un pas ; vrai s'il a bougé. */
async function defilerLesPages(page: Page, pas: number): Promise<boolean> {
  return page.evaluate(
    ({ sel, pas }) => {
      const boite = document.querySelector(sel) as HTMLElement | null;
      if (!boite) return false;
      const avant = boite.scrollTop;
      boite.scrollTop = avant + pas;
      return boite.scrollTop !== avant;
    },
    { sel: CONTENEUR_PAGES, pas },
  );
}

/** L'index de la page affichée de la table paginée (celle à `opacity: 1`), ou −1. */
async function pageAffichee(page: Page): Promise<number> {
  return page.evaluate(
    (sel) => [...document.querySelectorAll(sel)].findIndex((p) => getComputedStyle(p).opacity === '1'),
    PAGES,
  );
}

/** Le premier mot du panneau modal — « Hot Hot Fruit - Help » ou « Pay Table ». */
async function titreDeLaModale(page: Page): Promise<string> {
  return page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null;
    return (el?.innerText ?? '').trim().split('\n')[0].slice(0, 60);
  }, MODALE);
}

/**
 * Vrai si la ligne du taux est entière dans la fenêtre que l'OCR recadre.
 *
 * On cherche l'élément le plus profond qui porte « theoretical RTP » : la
 * ligne vit dans un `li` sans enfant, mais rien ne garantit qu'un habillage
 * n'y mette pas un `<br>` — c'est le piège payé chez Stakelogic.
 */
async function ligneRtpVisible(page: Page): Promise<boolean> {
  return page.evaluate(
    ({ section, haut, bas }) => {
      const boite = document.querySelector(section);
      if (!boite) return false;
      const motif = /theoretical RTP/i;
      const candidats = [...boite.querySelectorAll('*')].filter(
        (el) =>
          motif.test(el.textContent ?? '') &&
          ![...el.children].some((c) => motif.test(c.textContent ?? '')),
      );
      return candidats.some((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.top >= haut && r.bottom <= bas;
      });
    },
    { section: SECTION_RTP, ...FENETRE_LISIBLE },
  );
}

/**
 * La première ligne de la section RTP, et ce que le lanceur déclare.
 *
 * Les taux sont lus au centième dans le DOM, pas à l'OCR : ici on décide,
 * on ne publie pas. Rend `null` quand la section manque.
 */
async function coherenceDuTaux(page: Page): Promise<{ ligne: string; taux: number[]; declare: number | null } | null> {
  return page.evaluate((section) => {
    const li = document.querySelector(`${section} li`) as HTMLElement | null;
    if (!li) return null;
    const ligne = (li.innerText ?? '').replace(/\s+/g, ' ').trim();
    const taux = [...ligne.matchAll(/(\d{2}\.\d{1,2})\s?%/g)].map((m) => Number(m[1]));
    const brut = (window as unknown as { _settings?: { GameRTP?: unknown } })._settings?.GameRTP;
    const declare = typeof brut === 'number' ? brut : typeof brut === 'string' ? Number.parseFloat(brut) : null;
    return { ligne, taux, declare: declare != null && Number.isFinite(declare) ? declare : null };
  }, SECTION_RTP);
}

/** Ferme la modale, par l'API puis par la croix ; vrai si elle est partie. */
async function fermerLaModale(page: Page, verbe: 'closeHelp' | 'closePaytable'): Promise<boolean> {
  await pont(page, `_on_${verbe}`);
  await page.waitForTimeout(1_200);
  if (!(await visible(page, MODALE))) return true;
  await page.locator(CROIX).first().click({ timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(1_200);
  return !(await visible(page, MODALE));
}

/**
 * Descend la modale cran par cran en photographiant, jusqu'au bas ou au
 * plafond. Le bas se lit dans `scrollTop` (voir `defiler`) : c'est la
 * question que l'adaptateur BGaming a trouvée sans réponse sur son
 * panneau ; elle ne se suppose jamais.
 */
async function feuilleterLaModale(
  page: Page,
  cliche: (nom: string) => Promise<void>,
  prisesDeja: number,
  plafond: number,
): Promise<number> {
  let prises = prisesDeja;
  for (let n = 0; n < plafond; n++) {
    if (!(await defiler(page, CRAN))) break;
    await page.waitForTimeout(700);
    await cliche(`regles-${++prises}`);
  }
  return prises;
}

export const HABANERO: Adaptateur = {
  studio: 'habanero',

  demoExploitable: (url) => LANCEUR_SLOT.test(url),

  /**
   * Deux secondes, et c'est volontairement trop peu pour un jeu : `load`
   * arrive en 0,5 s sur une page qui ne contient encore que le canvas. Le
   * vrai chargement est attendu dans `ouvrirLeJeu`, par ses témoins.
   */
  chargementMs: 2_000,

  /*
   * Pas de `avecTete` : vérifié sur onze jeux, la démo se charge, se peint
   * et répond à l'API en Chromium sans tête. Le déclarer coûterait une
   * fenêtre ouverte sur le poste pour chacun des 202 jeux.
   */

  /** Une précaution, pas un seuil mesuré : le studio n'a rien refusé. */
  pauseEntreJeuxMs: 5_000,

  /**
   * Attend le jeu, sans écran d'accueil à fermer : `nofunplaymessage=1` dans
   * la `demoUrl` supprime la boîte « FUN PLAY MODE » des tables, et les
   * machines à sous ouvrent directement sur leurs rouleaux.
   *
   * ── Trois témoins, mesurés ──────────────────────────────────────────────
   *
   * 1. La page d'erreur, d'abord — elle a un `load` et rien d'autre.
   * 2. `html.load-success` (posé à ~2,5 s) et `#ui` qui prend une taille
   *    (~3 s) : le lanceur a fini de charger l'habillage. L'écran de titre
   *    « HABANERO » est avant, les rouleaux après.
   * 3. Le `POST gs-test.insvr.com/pf` (~3,8–4,6 s), lu dans `performance`
   *    parce que le runner a navigué avant de nous appeler et qu'aucune
   *    oreille n'était posée : c'est la session de jeu, le seul échange avec
   *    le serveur de jeu. Sans lui, la démo est un décor.
   *
   * Puis l'image doit être au repos : les rouleaux tombent en scène, et une
   * capture pendant le mouvement serait à moitié montée.
   */
  async ouvrirLeJeu(page) {
    if (await page.evaluate((m) => new RegExp(m, 'i').test(document.body.innerText), PAGE_D_ERREUR.source)) {
      throw new Error('lanceur : clé inconnue (page « Keyname … not found/active »)');
    }
    const pret = await page
      .waitForFunction(
        () => {
          const ui = document.querySelector('#ui');
          return (
            document.documentElement.classList.contains('load-success') &&
            !!ui &&
            ui.getBoundingClientRect().width > 0 &&
            getComputedStyle(ui).display !== 'none'
          );
        },
        null,
        { timeout: 90_000 },
      )
      .then(() => true)
      .catch(() => false);
    if (!pret) {
      if (await page.evaluate((m) => new RegExp(m, 'i').test(document.body.innerText), PAGE_D_ERREUR.source)) {
        throw new Error('lanceur : clé inconnue (page « Keyname … not found/active »)');
      }
      throw new Error("l'habillage Habanero n'a pas chargé en 90 s");
    }
    const session = await page
      .waitForFunction(
        () => performance.getEntriesByType('resource').some((e) => /insvr\.com\/pf(\?|$)/.test(e.name)),
        null,
        { timeout: 60_000 },
      )
      .then(() => true)
      .catch(() => false);
    if (!session) throw new Error("le jeu n'a pas ouvert sa session (/pf) en 60 s");

    let precedente = await empreinte(page);
    for (let s = 0; s < 20; s++) {
      await page.waitForTimeout(1_000);
      const actuelle = await empreinte(page);
      const calme = ecartMoyen(precedente, actuelle) < SEUIL_AU_REPOS;
      precedente = actuelle;
      if (calme) break;
    }

    // L'écran d'introduction, s'il y en a un : « ›› » tant que la pilule est là.
    for (let tour = 0; tour < 4 && (await introAffichee(page)); tour++) {
      await page.mouse.click(SUIVANT_INTRO.x, SUIVANT_INTRO.y);
      await page.waitForTimeout(1_500);
    }
    await page.waitForTimeout(2_000);
  },

  /**
   * Le Help (haut, puis section RTP), puis la table de gains.
   *
   * ── Ce qu'on photographie, et pourquoi pas tout ────────────────────────
   *
   * Le Help fait de 4 500 à 6 800 px, et l'essentiel est du texte de
   * plateforme identique d'un jeu à l'autre (Game Interface, Auto Play,
   * Disconnection Policy…). On en prend deux vues : le haut — mise, lignes,
   * niveaux, ce qui est propre au jeu — et la section RTP, la raison d'être
   * de la capture. La table de gains, elle, est propre au jeu : jusqu'à six
   * vues.
   *
   * ── Pourquoi 0 et jamais `SANS_PANNEAU` ────────────────────────────────
   *
   * Tous les jeux `SG` ont ce Help et cette section. Un échec ici veut dire
   * qu'on n'a pas su l'ouvrir, pas qu'il n'existe pas.
   */
  async capturerLesRegles(page, cliche) {
    /*
     * L'API de pont d'abord, l'engrenage ensuite.
     *
     * L'API évite de chercher un bouton peint dans le canvas ; l'engrenage
     * est la voie du joueur, gardée pour le jour où l'API changerait de nom.
     * Le Help s'ouvre aussi pendant l'écran de titre : c'est `ouvrirLeJeu`
     * qui garantit qu'on est sur les rouleaux, pas ce clic.
     */
    let ouvert = false;
    await pont(page, '_on_showHelp');
    await page.waitForTimeout(2_500);
    ouvert = (await visible(page, MODALE)) && (await visible(page, SECTION_RTP));
    if (!ouvert) {
      await page.mouse.click(ENGRENAGE.x, ENGRENAGE.y);
      await page.waitForTimeout(1_500);
      await page.locator(MENU_HELP).first().click({ timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(2_500);
      ouvert = (await visible(page, MODALE)) && (await visible(page, SECTION_RTP));
    }
    if (!ouvert) return 0;

    const taux = await coherenceDuTaux(page);
    if (taux && taux.declare != null && taux.taux.length && !taux.taux.some((v) => Math.abs(v - taux.declare!) < 0.005)) {
      await fermerLaModale(page, 'closeHelp');
      // Soixante caractères : c'est ce que le journal du runner garde.
      throw new Error(`RTP d'un mode (${taux.taux.join('/')}), lanceur ${taux.declare} : pas de défaut`);
    }

    /*
     * Le texte commence à x = 131 et `lireLesRegles` recadre à partir de
     * x = 130 : un pixel de marge, l'OCR perdrait la première lettre de
     * chaque ligne. On décale le contenu, pas le panneau.
     */
    await page.addStyleTag({ content: `${TEXTE_HELP} { margin-left: 40px !important; }` });
    await page.waitForTimeout(500);

    let prises = 0;
    await cliche(`regles-${++prises}`);

    // La section RTP en haut de la fenêtre. En bas du texte, le défileur
    // bute avant : la section reste alors plus bas, mais dans la fenêtre.
    await page.evaluate(
      ({ defileur, section }) => {
        const s = [...document.querySelectorAll(defileur)].find(
          (e) => e.getBoundingClientRect().height > 0,
        ) as HTMLElement | undefined;
        const h = document.querySelector(section) as HTMLElement | null;
        if (!s || !h) return;
        s.scrollTop += h.getBoundingClientRect().top - s.getBoundingClientRect().top - 20;
      },
      { defileur: DEFILEUR, section: SECTION_RTP },
    );
    await page.waitForTimeout(800);
    if (!(await ligneRtpVisible(page))) {
      await page.evaluate((section) => {
        document.querySelector(`${section} li`)?.scrollIntoView({ block: 'center' });
      }, SECTION_RTP);
      await page.waitForTimeout(800);
    }
    if (await ligneRtpVisible(page)) await cliche(`regles-${++prises}`);

    if (!(await fermerLaModale(page, 'closeHelp'))) return prises;

    /*
     * La table de gains, sous l'une de ses deux formes.
     *
     * Paginée : chaque `div.page` est du HTML superposé ; on rend visible la
     * page n et invisible les autres, ce que la flèche du jeu fait aussi. On
     * ne cherche pas la flèche, peinte dans le canvas à une place qui suit
     * l'habillage. Modale : le même défileur que le Help.
     */
    await pont(page, '_on_openPaytable');
    await page.waitForTimeout(2_500);
    if (await visible(page, TABLE_PAGINEE)) {
      const nbPages = await page.evaluate((s) => document.querySelectorAll(s).length, PAGES);
      await cliche(`regles-${++prises}`);
      if (nbPages > 1 && (await pagesVisibles(page)) === nbPages) {
        // Empilée : pas de flèche à chercher, le conteneur défile.
        for (let vue = 1; vue < VUES_TABLE_MAX; vue++) {
          if (!(await defilerLesPages(page, CRAN_EMPILE))) break;
          await page.waitForTimeout(700);
          await cliche(`regles-${++prises}`);
        }
        await fermerLaModale(page, 'closePaytable');
        return prises;
      }
      /*
       * La flèche, une fois trouvée, est gardée pour les pages suivantes :
       * elle ne bouge pas dans un même jeu. Chaque clic est jugé sur l'index
       * de page — un clic sur le décor ne change rien, un clic sur la maison
       * ferme la table (index −1), et dans les deux cas on s'arrête.
       */
      let fleche: { x: number; y: number } | null = null;
      let index = await pageAffichee(page);
      for (let vue = 1; vue < Math.min(nbPages, VUES_TABLE_MAX) && index >= 0; vue++) {
        const candidats: Array<{ x: number; y: number }> = fleche
          ? [fleche]
          : await tachesVives(page, BANDE_FLECHE);
        let tournee = false;
        for (const c of candidats) {
          await page.mouse.click(c.x, c.y);
          await page.waitForTimeout(1_200);
          const apres = await pageAffichee(page);
          if (apres === index + 1) {
            fleche = c;
            index = apres;
            tournee = true;
            break;
          }
          if (apres !== index) {
            index = apres;
            break;
          }
        }
        if (!tournee) break;
        await cliche(`regles-${++prises}`);
      }
      await fermerLaModale(page, 'closePaytable');
    } else if ((await visible(page, MODALE)) && /pay\s*table/i.test(await titreDeLaModale(page))) {
      await cliche(`regles-${++prises}`);
      prises = await feuilleterLaModale(page, cliche, prises, VUES_TABLE_MAX - 1);
      await fermerLaModale(page, 'closePaytable');
    }
    return prises;
  },

  /**
   * Rien n'est acheté.
   *
   * Le bouton « Buy Feature » existe — Genie's Showtime le peint en haut à
   * gauche des rouleaux, avec son prix — mais dans le canvas, à une place qui
   * suit l'habillage, et la base ne sait pas quels jeux vendent leur
   * fonction (`achatBonus` est `null` sur 216 fiches). Le Help, lui, le dit
   * en clair (« … if Feature Buy is enabled ») : c'est cette ligne, dans la
   * capture de la section RTP, qui documente l'achat. Un clic à l'aveugle
   * publierait le jeu de base sous la légende « Buying the feature » ; un
   * faux négatif coûte une image, on le préfère.
   */
  async capturerLAchat() {
    return false;
  },
};
