import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

/**
 * Lit les faits du jeu dans les captures de son panneau de règles.
 *
 * ── Pourquoi lire une image plutôt qu'appeler une API ─────────────────────
 *
 * Le panneau est dessiné dans un `<canvas>` : aucun texte dans le DOM. Trois
 * autres voies ont été essayées et écartées, et il vaut mieux les connaître
 * que les refaire :
 *
 * · **Le réseau** : les réponses ne contiennent que les gabarits de phrase
 *   (`"The theoretical RTP of this game is {0}%"`), jamais la valeur — elle
 *   est injectée à l'exécution.
 * · **Le graphe de scène** : le jeu tourne dans une iframe et n'expose aucun
 *   global portant un `stage`. Rien à parcourir.
 * · **Le fichier `logo_info.js`** de Pragmatic publie bien des RTP, mais tous
 *   suffixés `_cv` : ce sont les **paliers opérateur**, pas le défaut studio.
 *
 * Reste l'image. Elle n'est pas un pis-aller : c'est la seule chose que le
 * studio affiche vraiment au joueur, donc la seule qu'on puisse citer.
 *
 * ── Ce qui est refusé, et pourquoi ────────────────────────────────────────
 *
 * L'OCR se trompe. Un « 96.50 » lu « 9650 » ou « 06.50 » deviendrait une
 * donnée fausse **publiée en source studio**, c'est-à-dire le pire résultat
 * possible sur ce site. Chaque valeur est donc bornée à ce qui est physiquement
 * possible, et une lecture hors bornes est jetée plutôt que corrigée : on ne
 * devine pas ce que le studio a écrit.
 */
export interface FaitsLus {
  /** Le RTP par défaut du studio — le plus haut quand une plage est publiée. */
  rtp: number | null;
  /** Le bas de la plage, quand le jeu en annonce une. */
  rtpMin: number | null;
  miseMin: number | null;
  miseMax: number | null;
  volatilite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'TRES_HAUTE' | null;
  gainMax: number | null;
  /** 1 chance sur N d'atteindre le gain maximum, quand le studio le publie. */
  frequenceGainMax: number | null;
  /**
   * Ce que le panneau dit du **nombre de lignes**, tel qu'il l'écrit.
   *
   * Texte libre et pas un entier : « 25 fixed lines » et « 243 ways (All
   * Ways) » sont deux réponses valides à la même question, et forcer un nombre
   * effacerait la seconde. Chaque studio a sa phrase, on ne retient que celles
   * relevées mot pour mot sur des captures nommées.
   */
  lignes: string | null;
  /**
   * Ce que le panneau dit de la **grille**, quand il l'écrit en toutes lettres.
   *
   * Rare : la plupart des studios la montrent sans la dire. On n'accepte donc
   * que la formule qui donne rouleaux **et** rangées ensemble — un nombre de
   * rouleaux seul laisserait deviner la hauteur, et deviner est interdit.
   */
  grille: string | null;
  /** Le texte brut, conservé pour pouvoir vérifier une lecture douteuse. */
  brut: string;
  /**
   * Le texte lu sur chaque page, dans l'ordre.
   *
   * Sert à titrer les captures avec l'en-tête que le panneau affiche
   * lui-même — « GAME RULES », « TUMBLE FEATURE », « FREE SPINS RULES ». Un
   * titre générique répété sur 598 fiches serait du contenu dupliqué ; celui
   * du jeu est exact par construction.
   */
  pages: Array<{ titre: string; texte: string }>;
}

/**
 * L'en-tête d'une page de règles : la première ligne en capitales.
 *
 * Les panneaux commencent tous par un titre en majuscules. On le prend tel
 * quel plutôt que de le deviner — et on le refuse s'il n'a pas l'allure d'un
 * titre, auquel cas la capture gardera un intitulé neutre.
 */
/*
 * Le vocabulaire des en-têtes de panneau, chez Pragmatic.
 *
 * ── Pourquoi une liste fermée plutôt qu'un dictionnaire ───────────────────
 *
 * Un titre était retenu dès qu'une ligne était en capitales, sans jamais
 * vérifier que c'étaient des mots. L'OCR, lui, rend volontiers des capitales
 * sur du décor : sur les 45 premiers jeux publiés, **une quinzaine de titres
 * sur soixante-trois étaient du charabia** — « Qganvie rullo », « Mve nvlld »,
 * « Itvividll tt lmt vinl », « K 9 7 a xr fo » — affichés en clair au lecteur
 * et recopiés dans l'attribut `alt` des images, donc dans la surface SEO.
 *
 * Le sens de l'erreur compte : un titre inventé se publie, un titre refusé
 * retombe sur « Game rules, page N », qui est vrai. On refuse donc tout ce
 * qu'on ne reconnaît pas, quitte à perdre un intitulé correct mais rare —
 * « Caishen random award » y passera, et ce n'est pas cher payé.
 */
const MOTS_DEN_TETE = new Set([
  'a', 'and', 'ante', 'as', 'autoplay', 'award', 'bar', 'base', 'bet', 'bonus',
  'buy', 'buying', 'cascading', 'collect', 'collection', 'colossal', 'expanding',
  'feature', 'features', 'free', 'game', 'games', 'general', 'golden', 'hold',
  'how', 'high', 'its', 'jackpot', 'jackpots', 'line', 'lines', 'low', 'machine',
  'max', 'medium', 'mega', 'menu', 'mini', 'modifiers', 'money', 'multiplier',
  'multipliers', 'nudge', 'options', 'own', 'page', 'pay', 'paylines', 'paytable',
  'play', 'powernudge', 'purchase', 'random', 'reel', 'reels', 'respin', 'rtp',
  'rules', 'scatter', 'settings', 'shape', 'slot', 'smash', 'special', 'spin',
  'spins', 'states', 'sticky', 'studio', 'super', 'symbol', 'symbols', 'the',
  'to', 'top', 'tumble', 'values', 'very', 'volatility', 'ways', 'wild', 'wilds',
  'win', 'wins',
]);

/** Vrai si **chaque** mot est reconnu. Un seul inconnu disqualifie le titre. */
function vocabulaireTenu(phrase: string): boolean {
  const mots = phrase.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return mots.length > 0 && mots.every((mot) => MOTS_DEN_TETE.has(mot));
}

function enTete(texte: string): string {
  for (const ligne of texte.split('\n').map((l) => l.trim()).slice(0, 6)) {
    const propre = ligne.replace(/[^A-Za-z0-9 &'-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (propre.length < 4 || propre.length > 40) continue;
    // Un chiffre dans un en-tête trahit une ligne de contenu happée au vol
    // (« 25 free spins 20 free spins »), pas un intitulé de section.
    if (/\d/.test(propre)) continue;
    const lettres = propre.replace(/[^A-Za-z]/g, '');
    if (lettres.length < 4) continue;
    const capitales = (propre.match(/[A-Z]/g) ?? []).length;
    if (capitales / lettres.length > 0.8 && vocabulaireTenu(propre)) {
      return propre.charAt(0) + propre.slice(1).toLowerCase();
    }
  }
  return '';
}

/** Le même filtre, applicable à un titre déjà publié. */
export function titreFiable(titre: string): boolean {
  return vocabulaireTenu(titre);
}

/*
 * L'ordre compte : « very high » doit être essayé avant « high », sinon la
 * seconde règle l'attrape et rend HAUTE. Et la forme inversée
 * « Volatility: High » de Hacksaw ne ressemble à aucune des précédentes.
 */
const VOLATILITES: Array<[RegExp, FaitsLus['volatilite']]> = [
  [/very\s+high\s+volatility/i, 'TRES_HAUTE'],
  [/volatility\s*:?\s*very\s+high/i, 'TRES_HAUTE'],
  [/medium\s*-?\s*high\s+volatility/i, 'HAUTE'],
  [/high\s+volatility/i, 'HAUTE'],
  [/volatility\s*:?\s*high/i, 'HAUTE'],
  [/medium\s+volatility/i, 'MOYENNE'],
  [/volatility\s*:?\s*medium/i, 'MOYENNE'],
  [/low\s+volatility/i, 'BASSE'],
  [/volatility\s*:?\s*low/i, 'BASSE'],
];

/** Un nombre écrit par un moteur d'OCR : virgules, espaces, points parasites. */
function nombre(brut: string): number | null {
  const n = Number.parseFloat(brut.replace(/[\s,](?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/*
 * Un moteur partagé, pour la *recherche* du panneau.
 *
 * `lireLesRegles` recadre sur l'emplacement du panneau : c'est ce qui rend sa
 * lecture fiable, mais cela suppose le panneau déjà ouvert et à sa place.
 * Pendant qu'on le cherche, on ne sait pas encore s'il y en a un — donc on lit
 * l'écran entier, et on se contente d'y reconnaître un en-tête.
 *
 * Le moteur est gardé entre les appels : son initialisation coûte plus cher
 * que la reconnaissance elle-même, et on l'appelle une fois par position
 * essayée.
 *
 * ── C'est la **promesse** qui est mémorisée, pas le moteur ────────────────
 *
 * Le script capture deux jeux en parallèle. Avec `moteur ??= await créer()`,
 * les deux appels voient `null` pendant l'attente et en créent chacun un :
 * le second écrase le premier, qui reste en vie avec son processus fils.
 * `terminate()` n'en ferme alors qu'un, et **node ne rend jamais la main** —
 * le script paraissait figé après avoir tout capturé, à 0 % de processeur.
 *
 * Mémoriser la promesse la publie **avant** le premier `await` : le second
 * appel la trouve et l'attend au lieu d'ouvrir un second moteur.
 */
let ouvrierPartage: ReturnType<typeof createWorker> | null = null;

type Bande = 'haut' | 'bas';

const BANDES: Record<Bande, { left: number; top: number; width: number; height: number }> = {
  haut: { left: 0, top: 30, width: 1280, height: 190 },
  bas: { left: 0, top: 630, width: 1280, height: 170 },
};

/**
 * Lit la **bande haute** d'une capture. Sert à reconnaître ce qui est ouvert.
 *
 * Le recadrage n'est pas une économie de confort : lire les 1280×800 coûtait
 * une quinzaine de secondes, et on appelle cette fonction jusqu'à quatre fois
 * par jeu pendant la recherche de l'icône — soit près de quatre heures
 * ajoutées sur le catalogue Pragmatic. La bande suffit : tout ce qu'on
 * cherche s'y trouve, l'en-tête « GAME RULES » (y≈62 sur l'habillage large,
 * y≈96 sur l'étroit) comme le bouton « BUY FREE SPINS » (y≈165).
 *
 * La bande basse sert à autre chose : reconnaître la barre de commandes de
 * l'habillage historique, qui n'a pas de panneau de règles du tout.
 */
export async function lireLEcran(
  cheminPng: string,
  bande: Bande = 'haut',
): Promise<string> {
  ouvrierPartage ??= createWorker('eng');
  const ouvrier = await ouvrierPartage;
  const prepare = await sharp(cheminPng)
    .extract(BANDES[bande])
    .grayscale()
    .normalise()
    .resize({ width: 1920 })
    .png()
    .toBuffer();
  const { data } = await ouvrier.recognize(prepare);
  return data.text;
}

/** Libère le moteur partagé. À appeler en fin de campagne. */
export async function fermerLeLecteur(): Promise<void> {
  const en_cours = ouvrierPartage;
  if (!en_cours) return;
  ouvrierPartage = null;
  await (await en_cours).terminate();
}

/**
 * L'en-tête qui prouve qu'on est entré dans le panneau de règles.
 *
 * Partagé entre la recherche (ci-dessus) et le contrôle final du script :
 * c'est le même critère, il ne doit pas diverger.
 *
 * La clause de nullité — « MALFUNCTION VOIDS ALL PAYS AND PLAYS. » — est là
 * pour les studios qui **n'impriment pas leur RTP dans le jeu**. Chez
 * 1spin4win, 2 panneaux sur 10 seulement portent la ligne « RTP - 97.40% » ;
 * les huit autres s'ouvraient correctement, se faisaient photographier, et
 * étaient jetés faute de témoin, puis rechargés à la campagne suivante pour
 * le même sort. La mention, elle, est peinte sur **chaque** page de leur
 * panneau. Élargir une alternance ne peut que faire correspondre davantage :
 * la recherche d'icône de Pragmatic ne lit que la bande haute (y 30–220), où
 * cette phrase ne figure jamais.
 *
 * « RETURN TO PLAYER » est là pour Amusnet, qui n'écrit ni RTP ni GAME RULES
 * ni PAYTABLE, et dont la clause de nullité se **replie sur deux lignes** au
 * milieu du panneau : l'OCR intercale le bruit des boutons latéraux entre ses
 * deux moitiés (« voids (= all »), et la phrase ne correspond jamais. Le titre
 * « Return to Player », lui, ferme chaque panneau du studio, sur sa propre
 * ligne, dans la dernière vue. Un mot-témoin n'est fiable que sur une ligne à
 * lui.
 */
export const EN_TETE_PANNEAU =
  /RTP|GAME RULES|PAYTABLE|MALFUNCTION VOIDS ALL PAYS|RETURN TO PLAYER/i;

/**
 * La barre de commandes de l'habillage **historique** de Pragmatic.
 *
 * Ces classiques n'ont pas de panneau de règles : la table de gains est
 * peinte en permanence à côté des rouleaux, et l'engrenage n'ouvre que le son
 * et le tour rapide. Il n'y a donc **aucun RTP à lire dans le jeu**.
 *
 * Les reconnaître n'est pas un confort. Sans ça, ils échouent à l'ouverture
 * du panneau, repartent en file, et sont rechargés à chaque campagne pour
 * échouer encore — alors que leur capture de base contient déjà toute leur
 * table de gains.
 */
export const BARRE_HISTORIQUE = /COIN VALUE|TOTAL BET|SELECT LINES|BET MAX/i;

export async function lireLesRegles(cheminsPng: string[]): Promise<FaitsLus> {
  const ouvrier = await createWorker('eng');
  const pages: FaitsLus['pages'] = [];
  let texte = '';
  try {
    for (const chemin of cheminsPng) {
      /*
       * Recadrage sur le panneau, puis agrandissement ×2 en niveaux de gris.
       * Sans le recadrage, le moteur passe son temps sur les rouleaux du jeu,
       * qui ne contiennent que du bruit ; sans l'agrandissement, le texte fait
       * 11 px de haut et la lecture des décimales devient hasardeuse — or
       * c'est exactement la décimale qui distingue 96,5 de 96,06.
       *
       * La hauteur va jusqu'à 680 px, et pas 620 : sur l'habillage étroit
       * le panneau descend plus bas, et c'est justement en bas que se
       * trouve la ligne du RTP.
       */
      const prepare = await sharp(chemin)
        .extract({ left: 130, top: 60, width: 1020, height: 620 })
        .grayscale()
        .normalise()
        .resize({ width: 2040 })
        .png()
        .toBuffer();
      const { data } = await ouvrier.recognize(prepare);
      pages.push({ titre: enTete(data.text), texte: data.text.replace(/\s+/g, ' ').slice(0, 1200) });
      texte += ' ' + data.text;
    }
  } finally {
    await ouvrier.terminate();
  }

  return extraireLesFaits(texte, pages);
}

/**
 * Les faits, à partir du texte brut — sans OCR ni fichier.
 *
 * Séparer la lecture de l'interprétation est ce qui rend l'interprétation
 * testable. Tant qu'elle vivait à l'intérieur de `lireLesRegles`, vérifier
 * qu'on sait lire « Theoretical payout (RTP): 96.43% » demandait de fabriquer
 * une image PNG et de faire tourner Tesseract : personne ne le faisait, et les
 * formulations d'un nouveau studio n'étaient découvertes qu'en production.
 */
export function extraireLesFaits(texte: string, pages: FaitsLus['pages'] = []): FaitsLus {
  const t = texte.replace(/\s+/g, ' ');

  /*
   * Deux formulations coexistent chez un même studio, et l'ignorer coûtait
   * une lecture sur deux :
   *
   * · « The theoretical RTP of this game is 96.00% » — une valeur unique ;
   * · « The maximum RTP of this game is 96.03% » suivi de « The minimum RTP
   *   of this game is 96.02% » — une **plage**.
   *
   * Quand une plage est publiée, le haut est le défaut studio et le bas un
   * palier. C'est la distinction que porte le schéma, et l'aplatir perdrait
   * l'information la plus rare du site.
   *
   * ── Comment on écarte le RTP d'achat de bonus ──────────────────────────
   *
   * Le même panneau annonce « The RTP of the game **when using** "BUY FREE
   * SPINS" » — un autre mode de jeu, que le secteur confond régulièrement
   * avec celui du jeu de base.
   *
   * Une première version découpait le texte en phrases pour écarter celles
   * qui parlent de l'achat. Elle effaçait **tout** : l'OCR ne restitue aucun
   * point entre les phrases, donc « jusqu'au point suivant » signifiait
   * « jusqu'à la fin ». On s'appuie donc sur la formulation, qui distingue
   * les deux sans ponctuation : « of **this game** is » contre « when
   * **using** ». Le refus se fait caractère par caractère entre le mot-clé et
   * le nombre.
   */
  /*
   * Un RTP rond s'écrit sans décimale. BGaming annonce « The overall
   * theoretical Return to Player (RTP) is 96%. » sur Snoop Dogg Dollars : exiger
   * une virgule laissait la fiche capturée, publiée, et sans chiffre — sur 28
   * jeux d'une même campagne. L'entier n'est accepté que **suivi de « % »** :
   * sans ce signe, « 20 lines » ou « 25 free spins » passeraient pour un taux,
   * et les bornes 80-99,9 n'arrêteraient ni 96 lignes ni 90 tours.
   */
  const CHIFFRE = '(\\d{2}\\s?[.,]\\s?\\d{1,2}|\\d{2}(?=\\s?%))';
  const jusquAuNombre = '(?:(?!BUY|using|USING)[^0-9]){0,40}';
  /*
   * Chaque studio a sa formule, et le mot « RTP » n'y est pas toujours nu.
   * Pragmatic écrit « The theoretical RTP of this game is 96.00% », Hacksaw
   * « Theoretical payout (RTP): 96.43% ». Exiger `RTP` juste après le mot-clé
   * rendait donc **null** sur un panneau Hacksaw parfaitement lisible.
   *
   * BGaming intercale le sigle développé : « The overall theoretical **Return
   * to Player** (RTP) is 97.04% ». Relevé au mot près sur Adventures (97,1),
   * All-Star Fruits (97,04) et Alice Wonderluck (97,03), et lu sans faute par
   * l'OCR — c'est bien l'interprétation qui rendait `null`, pas la lecture.
   * Trois fiches enrichies d'images et d'aucun chiffre : le mode d'échec le
   * plus coûteux, puisqu'il ne signale rien.
   */
  const APRES_LE_MOT = '\\s+(?:payout\\s*)?(?:Return\\s+to\\s+Player\\s*)?\\(?\\s*RTP\\s*\\)?';
  const lire = (mot: string) =>
    new RegExp(`${mot}${APRES_LE_MOT}${jusquAuNombre}${CHIFFRE}`, 'i').exec(t)?.[1] ?? null;

  /*
   * Wazdan n'écrit jamais le sigle : « Game average return to player: 96.15% ».
   * `lire` exige `RTP` après le mot-clé, donc il rendait `null` sur un panneau
   * parfaitement lisible — Tesseract restitue la phrase au mot près, c'est
   * l'interprétation qui jetait la valeur. Sans cette ligne, 261 fiches
   * sortaient avec leurs images et aucun chiffre en source studio : le mode
   * d'échec le plus coûteux, puisqu'il ne signale rien.
   */
  const formulationWazdan =
    new RegExp(`game\\s+average\\s+return\\s+to\\s+player\\s*:?\\s*${CHIFFRE}`, 'i').exec(t)?.[1] ??
    null;

  /*
   * Evoplay affiche le taux dans le **bandeau** de son panneau, présent sur
   * chaque page : « Rules / Fruit Nova (RTP 96.00%) ». Son corps de texte, lui,
   * écrit « The overall theoretical return to player is 96.00 % » — sans le
   * sigle après « Return to Player », donc hors de portée de `lire`. Le
   * bandeau est la forme la plus sûre : il ne dépend pas de la page atteinte.
   */
  const bandeauEvoplay =
    new RegExp(`\\(\\s*RTP\\s+${CHIFFRE}\\s*%`, 'i').exec(t)?.[1] ?? null;

  /*
   * 1spin4win écrit « RTP - 97.40% » en tout petit dans l'angle haut-gauche de
   * sa table de gains, sans verbe et sans « return to player » : aucune des
   * règles ci-dessus ne l'attrape. Ce n'est pas ce qui débloque le studio —
   * ses 226 fiches ont déjà leur taux en source studio — c'est un contrôle :
   * là où le panneau a pu être lu, il confirmait la base au centième.
   */
  const bandeau1spin4win =
    new RegExp(`RTP\\s*[-–—:]\\s*${CHIFFRE}\\s*%`, 'i').exec(t)?.[1] ?? null;

  /*
   * Nolimit City : « The theoretical return to the player for this game is
   * 96.10% ». Le mot « theoretical » y est, mais sans le sigle RTP derrière —
   * et la même page aligne six autres taux, ceux des achats de fonction et
   * du xBoost. Attraper le premier nombre après « theoretical » publierait le
   * taux d'un achat comme celui du jeu. L'ancre est donc « for this game is »,
   * qui n'accompagne que le taux de base.
   */
  const formulationNolimit =
    new RegExp(`return\\s+to\\s+the\\s+player\\s+for\\s+this\\s+game\\s+is\\s*${CHIFFRE}`, 'i').exec(t)?.[1] ??
    null;

  /*
   * Stakelogic : « The theoretical minimum payback percentage (RTP) is
   * 96.02% ». Le sigle est là, entre parenthèses, mais « minimum » précède
   * « payback » et la règle générale s'arrête avant. Relevé conforme à la
   * base sur quatre jeux (96,02 · 95,30 · 94,00 · 96,01).
   */
  const formulationStakelogic =
    new RegExp(`payback\\s+percentage\\s*\\(\\s*RTP\\s*\\)\\s+is\\s*${CHIFFRE}`, 'i').exec(t)?.[1] ?? null;

  /*
   * Yggdrasil est une fédération de moteurs, et deux d'entre eux écrivent le
   * taux sans le sigle : GATI, « The overall theoretical return to player is
   * 96.0% » — mot pour mot le corps de texte d'Evoplay, que seul son bandeau
   * sauvait — et Reel Play, « The Theoretical Average Return to Player is:
   * 94.0% ». Ni l'une ni l'autre n'attrape « when using BUY BONUS is … », qui
   * ne contient pas « return to player is ».
   */
  const formulationGati =
    new RegExp(`overall\\s+theoretical\\s+return\\s+to\\s+player\\s+is\\s*${CHIFFRE}\\s?%`, 'i').exec(t)?.[1] ??
    null;
  const formulationReelPlay =
    new RegExp(`theoretical\\s+average\\s+return\\s+to\\s+player\\s+is\\s*:?\\s*${CHIFFRE}\\s?%`, 'i').exec(t)?.[1] ??
    null;

  /*
   * Habanero : « The theoretical RTP for 5 Lucky Lions is 96.51% - 96.79% ».
   * Le nom du jeu est dans la phrase et commence parfois par un chiffre —
   * 5 Lucky Lions, 12 Zodiacs, Zeus 2 — où `jusquAuNombre` s'arrête, attend
   * le taux, et rend null. Le nom est donc sauté jusqu'au « is ». Et la plage
   * s'écrit avec « % » après chaque nombre, forme que la règle de plage
   * ci-dessous (celle de BGaming) ne voit pas : la règle générale rendait
   * alors le BAS. Le haut est le défaut — c'est le `GameRTP` du lanceur —, le
   * bas un palier. « for MINOR JACKPOT is 0.50% » ne passe pas `CHIFFRE`.
   */
  const formulationHabanero = new RegExp(
    `theoretical\\s+RTP\\s+for\\s+.{1,60}?\\s+is\\s*:?\\s*${CHIFFRE}\\s?%(?:\\s*[-–—]\\s*${CHIFFRE}\\s?%)?`,
    'i',
  ).exec(t);

  /*
   * Amusnet : « The average return to Player of the game is 96.17%. », sans le
   * sigle — et la variante Wazdan exige « Game average… ». La ligne voisine du
   * même panneau, « The average return to Player when using <feature> is … »,
   * est le taux d'un achat : « of the game » suffit à l'écarter.
   */
  const formulationAmusnet =
    new RegExp(`average\\s+return\\s+to\\s+player\\s+of\\s+the\\s+game\\s+is\\s*:?\\s*${CHIFFRE}\\s?%`, 'i').exec(t)?.[1] ??
    null;

  let brutHaut =
    lire('theoretical') ??
    lire('maximum') ??
    formulationWazdan ??
    formulationAmusnet ??
    bandeauEvoplay ??
    bandeau1spin4win ??
    formulationNolimit ??
    formulationStakelogic ??
    formulationGati ??
    formulationReelPlay ??
    formulationHabanero?.[1] ??
    null;
  let brutBas = lire('minimum');

  /*
   * Une plage dans la même phrase.
   *
   * BGaming écrit, pour ses jeux à stratégie : « The overall theoretical Return
   * to Player (RTP) is 89,41 - 94,00% depending on the player's strategy »
   * (Four Lucky Clover). `lire` s'arrête au premier nombre, qui est le **bas**
   * de la plage : la fiche annonçait 89,41 % pour un jeu qui rend 94 % joué
   * correctement. La double lecture ne l'a pas vu — ses deux lectures passent
   * par cette même interprétation. Le haut est le défaut, le bas un palier :
   * la convention de « maximum RTP / minimum RTP ».
   */
  const plage = new RegExp(
    `theoretical${APRES_LE_MOT}${jusquAuNombre}${CHIFFRE}\\s*[-–—]\\s*${CHIFFRE}\\s?%`,
    'i',
  ).exec(t);
  if (plage) {
    const [a, b] = [plage[1], plage[2]];
    const hautEnPremier = (nombre(a) ?? 0) >= (nombre(b) ?? 0);
    brutHaut = hautEnPremier ? a : b;
    brutBas = hautEnPremier ? b : a;
  } else if (formulationHabanero?.[2]) {
    // La plage Habanero, « 96.51% - 96.79% » : même convention, haut en défaut.
    const [a, b] = [formulationHabanero[1], formulationHabanero[2]];
    const hautEnPremier = (nombre(a) ?? 0) >= (nombre(b) ?? 0);
    brutHaut = hautEnPremier ? a : b;
    brutBas = hautEnPremier ? b : a;
  }

  /*
   * Le jackpot, entre parenthèses.
   *
   * BGaming écrit, sur ses jeux à jackpot : « The overall theoretical Return to
   * Player (RTP) is 96.23% (without Jackpot) - 96.7% (with Jackpot) » (Grand
   * Buffalo Hold and Win, Olympus Trueways…). La règle de plage ci-dessus ne
   * l'attrape pas — une parenthèse sépare le premier nombre du tiret — et
   * `lire` rendait 96,23 : le taux **hors** jackpot, publié sans le dire, alors
   * que la page produit du studio met en avant 96,70. Même convention que les
   * autres plages : le haut est le défaut, le bas un palier. La distinction
   * « avec / hors jackpot » ne tient pas dans ces deux champs ; la légende de
   * la capture la conserve.
   */
  const jackpot = new RegExp(
    `theoretical${APRES_LE_MOT}${jusquAuNombre}${CHIFFRE}\\s?%\\s*\\(\\s*without\\s+jackpot\\s*\\)\\s*[-–—]\\s*${CHIFFRE}\\s?%\\s*\\(\\s*with\\s+jackpot\\s*\\)`,
    'i',
  ).exec(t);
  if (!plage && jackpot) {
    const [a, b] = [jackpot[1], jackpot[2]];
    const hautEnPremier = (nombre(a) ?? 0) >= (nombre(b) ?? 0);
    brutHaut = hautEnPremier ? a : b;
    brutBas = hautEnPremier ? b : a;
  }
  const rtp = nombre(brutHaut ?? '');
  const rtpMin = brutBas ? nombre(brutBas) : null;

  const minLu = /MINIMUM\s+BET[^0-9]{0,12}([\d.,]+)/i.exec(t);
  const maxLu = /MAXIMUM\s+BET[^0-9]{0,12}([\d.,]+)/i.exec(t);
  /*
   * Quatre formulations : « maximum theoretical win is 5,000x » et « the
   * maximum win amount is limited to 5,000x bet » chez Pragmatic, « Maximum
   * achievable win: 10,000x » chez Hacksaw.
   *
   * BGaming met le signe **avant** le nombre — « The maximum winning amount is
   * ×1500 of the bet » (All-Star Fruits), « …amount in the game is ×10000 »
   * (Alice Wonderluck) — donc aucune des trois premières, qui cherchent toutes
   * un `x` suffixe, ne pouvait l'attraper. L'OCR rend le `×` en `x` ordinaire,
   * d'où les deux caractères acceptés.
   */
  const gainLu =
    /maximum\s+theoretical\s+win[^0-9]{0,40}([\d.,]+)\s*x/i.exec(t) ??
    /maximum\s+win\s+amount\s+is\s+limited\s+to\s+([\d.,]+)\s*x/i.exec(t) ??
    /maximum\s+achievable\s+win[^0-9]{0,40}([\d.,]+)\s*x/i.exec(t) ??
    /maximum\s+winning\s+amount[^0-9]{0,20}[x×]\s*([\d.,]+)/i.exec(t) ??
    // Wazdan écrit « The maximum win amount **is** 750x bet », sans le
    // « limited to » qu'attend la formule Pragmatic juste au-dessus.
    /maximum\s+win\s+amount\s+is\s+([\d.,]+)\s*x/i.exec(t);
  const freqLu = /chance\s+to\s+hit\s+of\s+1\s+in\s+([\d.,]+)/i.exec(t);

  const volatilite = VOLATILITES.find(([r]) => r.test(t))?.[1] ?? null;

  // Bornes de vraisemblance. Hors de ces plages, la lecture est jetée : une
  // valeur inventée serait publiée en « source studio », le pire cas possible.
  const dansPlage = (v: number | null, bas: number, haut: number) =>
    v != null && v >= bas && v <= haut ? v : null;

  const defaut = dansPlage(rtp, 80, 99.9);
  const bas = dansPlage(rtpMin, 80, 99.9);

  return {
    rtp: defaut,
    /*
     * Un « minimum » supérieur au défaut est impossible : le second est le
     * plafond du premier. Quand ça arrive, la lecture est fausse quelque part,
     * et publier deux chiffres incohérents est pire que n'en publier qu'un.
     */
    rtpMin: bas != null && defaut != null && bas <= defaut ? bas : null,
    miseMin: dansPlage(minLu ? nombre(minLu[1]) : null, 0.01, 10),
    miseMax: dansPlage(maxLu ? nombre(maxLu[1]) : null, 1, 100_000),
    volatilite,
    gainMax: dansPlage(gainLu ? nombre(gainLu[1]) : null, 10, 1_000_000),
    frequenceGainMax: dansPlage(freqLu ? nombre(freqLu[1]) : null, 1000, 100_000_000_000),
    brut: t.slice(0, 4000),
    lignes: lireLesLignes(t),
    grille: lireLaGrille(t),
    pages,
  };
}

/*
 * Le nombre de lignes, studio par studio.
 *
 * ── Pourquoi une liste fermée de phrases ──────────────────────────────────
 *
 * Un panneau de règles répète le mot « line » vingt fois — « Wins on different
 * lines are added », « Line wins are multiplied by bet per line », « Highest
 * win only on each line ». Une formule large attraperait ces phrases-là et
 * publierait le premier nombre venu. On ne retient donc que les tournures qui
 * **annoncent** le nombre, relevées mot pour mot sur des captures nommées :
 *
 * · Spinomenal (412 fiches) « The game is set to 50 fixed lines. »
 *   — demi-gods-v-a-moonlit-oath, demi-gods-v-hold-hit
 * · Amusnet (214) « 10 Bulky Fruits video slot is a 5-reel, 10-line fixed game. »
 *   — 10-bulky-fruits, 10-burning-heart, 10-glossy-hot
 * · Habanero (198) « Lines are fixed at 88. » — 5-lucky-lions, dont la fiche
 *   portait déjà 88 : la formule se vérifie contre une valeur connue.
 * · 1spin4win (219) « 243 ways (All Ways) » — all-ways-egypt.
 *
 * Les bornes disent le reste : une ligne se compte entre 1 et 100, un nombre
 * de façons de gagner monte à 250 000 (117 649 chez Megaways, 262 144 ailleurs)
 * mais ne descend pas sous 20. Hors de là, c'est qu'on a lu autre chose.
 */
function lireLesLignes(t: string): string | null {
  /*
   * La fourchette d'abord, la valeur unique ensuite.
   *
   * Christmas Gift Rush publie « Lines are fixed at **1 - 3**. » : le nombre de
   * lignes change d'un tour à l'autre. Une formule qui ne cherche qu'un nombre
   * y lit « 1 », et la fiche annonce une ligne de paiement pour un jeu qui peut
   * en avoir trois. C'est le même piège que les paliers de RTP chez Nolimit
   * City, et il se règle pareil : on lit la plage telle qu'elle est écrite.
   */
  const plage =
    /\bLines are fixed at\s+(\d{1,3})\s*[-–]\s*(\d{1,3})\b/i.exec(t) ??
    /\bThe game is set to\s+(\d{1,3})\s*[-–]\s*(\d{1,3})\s+fixed lines/i.exec(t);
  if (plage) {
    const [bas, haut] = [Number(plage[1]), Number(plage[2])];
    if (bas >= 1 && haut <= 100 && bas < haut) return `${bas} to ${haut} fixed lines`;
  }

  /*
   * Le joueur choisit lui-même son nombre de lignes.
   *
   * Spinomenal écrit « The amount of lines ranges between **10-100**. » sur ses
   * jeux « 100 xxx » — et la démo s'ouvre réglée sur 10, pas sur 100. Écrire
   * « 100 lignes » parce que le titre dit 100 serait faux deux fois : ce n'est
   * ni fixe, ni la valeur par défaut. Le même piège existe chez 1spin4win, où
   * Booming Fruits 100 s'ouvre à 20 lignes.
   */
  const choisies = /\bamount of lines ranges between\s*(\d{1,3})\s*[-–]\s*(\d{1,3})/i.exec(t);
  if (choisies) {
    const [bas, haut] = [Number(choisies[1]), Number(choisies[2])];
    if (bas >= 1 && haut <= 100 && bas < haut) return `${bas} to ${haut} selectable lines`;
  }

  const lignesFixes =
    /\bThe game is set to\s+(\d{1,3})\s+fixed lines/i.exec(t) ??
    /\bLines are fixed at\s+(\d{1,3})\b/i.exec(t) ??
    /*
     * « …is a 5-reel, 20-line fixed **game** » — sauf que l'OCR rend souvent
     * « fixed yo » ou « fixed ga », le mot final rogne par le cadre. Sur
     * 20 Golden Coins Christmas Edition, exiger « game » laissait le champ vide
     * alors que la phrase etait parfaitement lisible a l'image. « fixed » suffit
     * a lever l'ambiguite.
     */
    /\bis a\s+\d{1,2}-reel,\s*(\d{1,3})-line fixed\b/i.exec(t);
  if (lignesFixes) {
    const n = Number(lignesFixes[1]);
    /*
     * Une seule ligne de paiement existe, mais c'est si rare qu'un « 1 » isolé
     * est presque toujours une fourchette mal lue ou un chiffre attrapé
     * ailleurs. On préfère se taire : un champ vide se remplit plus tard, une
     * fiche fausse se publie tout de suite.
     */
    if (n >= 3 && n <= 100) return `${n} fixed lines`;
  }

  /*
   * Le séparateur de milliers est la virgule, **jamais l'espace**.
   *
   * Sur 5 Lions Slot, un panneau qui publie « 243 ways to win » a été lu
   * « 3,243 ways » : le chiffre d'avant, séparé par une espace, s'était
   * agrégé au nombre. L'OCR sème des espaces partout, donc les accepter comme
   * séparateur revient à laisser n'importe quel chiffre voisin multiplier la
   * valeur par dix. Une virgule, elle, ne s'invente pas.
   */
  /*
   * Nolimit City compte à l'envers : « 1024 **win ways** by default », l'adjectif
   * devant le nom. La formule d'en dessous cherche « ways to win » et rendait
   * donc `null` sur les 134 fiches du studio — 45 panneaux annoncés « muets »
   * alors qu'ils publient tous leur compte. « by default » est important : ces
   * jeux montent plus haut en cours de partie, et le nombre annoncé est celui
   * du jeu de base.
   */
  /*
   * « From 576 ways **up to** 75712 win ways. »
   *
   * Das xBoot change de grille en cours de partie : 576 façons au départ,
   * 75 712 au maximum. La formule d'en dessous attrapait le second nombre et
   * signalait la fiche — pourtant juste — comme fausse. C'est mon propre outil
   * qui avait tort, et seule la règle « on n'écrit que dans un champ vide » a
   * empêché d'écraser une bonne valeur par une mauvaise. On lit donc la plage
   * entière, et le départ vient en premier.
   */
  const deTelleATelle =
    /\bFrom\s+(\d{1,3}(?:,\d{3})+|\d{2,6})\s+ways\s+up to\s+(\d{1,3}(?:,\d{3})+|\d{2,6})\s+win\s+ways/i.exec(t);
  if (deTelleATelle) {
    const [debut, max] = [deTelleATelle[1], deTelleATelle[2]].map((x) => Number(x.replace(/,/g, '')));
    if (debut >= 20 && max <= 250_000 && debut < max) {
      return `${debut.toLocaleString('en-GB')} ways, up to ${max.toLocaleString('en-GB')}`;
    }
  }

  const faconsNolimit = /\b(\d{1,3}(?:,\d{3})+|\d{2,6})\s+win\s+ways/i.exec(t);
  if (faconsNolimit) {
    const n = Number(faconsNolimit[1].replace(/,/g, ''));
    if (n >= 20 && n <= 250_000) return `${n.toLocaleString('en-GB')} win ways by default`;
  }

  /*
   * Habanero compte ses façons comme ses lignes : « **Ways are fixed at 178**
   * with total bet in coins fixed at 25. » Le studio distingue bien les deux
   * — « Lines are fixed at N » ailleurs — et la seconde moitié de la phrase
   * porte un autre nombre, la mise, qu'il ne faut surtout pas ramasser. D'où
   * la capture bornée au premier nombre.
   */
  /*
   * La fourchette avant la valeur unique, ici aussi.
   *
   * Crystopia publie « Ways are fixed at **27 - 1,728** » : ses symboles se
   * scindent en deux ou quatre, d'ou douze symboles par rouleau et 12³ = 1 728.
   * La formule ne gardait que le 27 et l'a ecrit en base — la fiche decrivait
   * le jeu a son etat le plus pauvre. Meme piege que « Lines are fixed at
   * 1 - 3 », corrige pour les lignes et pas pour les facons : une lecon apprise
   * sur une formule ne se propage pas toute seule aux autres.
   */
  const faconsEnPlage =
    /\bWays are fixed at\s+(\d{1,3}(?:,\d{3})*)\s*[-–]\s*(\d{1,3}(?:,\d{3})*)/i.exec(t);
  if (faconsEnPlage) {
    const [bas, haut] = [faconsEnPlage[1], faconsEnPlage[2]].map((x) => Number(x.replace(/,/g, '')));
    if (bas >= 20 && haut <= 250_000 && bas < haut) {
      return `${bas.toLocaleString('en-GB')} to ${haut.toLocaleString('en-GB')} ways`;
    }
  }

  const faconsFixes = /\bWays are fixed at\s+(\d{1,3}(?:,\d{3})*)\b/i.exec(t);
  if (faconsFixes) {
    const n = Number(faconsFixes[1].replace(/,/g, ''));
    if (n >= 20 && n <= 250_000) return `${n.toLocaleString('en-GB')} ways`;
  }

  const facons = /\b(\d{1,3}(?:,\d{3})+|\d{2,6})\s+ways(?:\s+to win|\s*\(All Ways\))/i.exec(t);
  if (facons) {
    const n = Number(facons[1].replace(/[,\s]/g, ''));
    if (n >= 20 && n <= 250_000) return `${n.toLocaleString('en-GB')} ways to win`;
  }
  return null;
}

/*
 * La grille, uniquement quand le panneau donne rouleaux **et** rangées.
 *
 * Hacksaw l'écrit dans son bloc « ABOUT THE GAME » : « join these unruly
 * fruits in a 6-reel, 5-row paylines game ». C'est cette phrase qui a permis
 * de corriger frkn-bananas, en base comme une grille 5×4. Amusnet écrit
 * « a 5-reel, 10-line fixed game » — des rouleaux et des lignes, pas de
 * rangées : cette forme-là est refusée ici, elle est lue par `lireLesLignes`.
 */
function lireLaGrille(t: string): string | null {
  /*
   * Une grille qui respire se dit « A 5-reel, **up to** 6-row video slot » —
   * la hauteur varie en cours de partie. L'écrire « 5 × 6 » serait faux : on
   * garde le « jusqu'à », qui est ce que le studio annonce.
   */
  const variable = /\b(\d{1,2})-reel,\s*up to\s*(\d{1,2})-row\b/i.exec(t);
  if (variable) {
    const [r, h] = [Number(variable[1]), Number(variable[2])];
    if (r >= 3 && r <= 9 && h >= 2 && h <= 9) return `${r} reels × up to ${h} rows`;
  }

  /*
   * Et une grille en dents de scie se dit rouleau par rouleau : « A 5-reel,
   * 3-3-3-3-1 row setup ». Punk Toilet a son cinquième rouleau à une seule
   * case — c'est ce qui donne 81 façons et non 243, et une fiche qui annonçait
   * « 20 paylines » ne décrivait pas ce jeu.
   */
  const dentelee = /\b(\d{1,2})-reel,\s*((?:\d-){2,7}\d)\s*row setup\b/i.exec(t);
  if (dentelee) return `${dentelee[1]} reels, rows ${dentelee[2]}`;

  /*
   * Pragmatic annonce sa grille d'un bloc : « The game is **played on a 7x7
   * grid** of symbols. » Sans cette formule, Aztec Smash — en base comme une
   * grille 5×3 à 20 lignes alors qu'il se joue en 7×7 par blocs — passait pour
   * concordant, faute d'avoir quoi que ce soit à comparer.
   */
  const dUnBloc = /\bplayed on a\s+(\d{1,2})\s*[x×]\s*(\d{1,2})\s+grid\b/i.exec(t);
  if (dUnBloc) {
    const [r, h] = [Number(dUnBloc[1]), Number(dUnBloc[2])];
    if (r >= 3 && r <= 9 && h >= 2 && h <= 9) return `${r} reels × ${h} rows`;
  }

  const m = /\b(\d{1,2})-reel,\s*(\d{1,2})-row\b/i.exec(t);
  if (!m) return null;
  const [rouleaux, rangees] = [Number(m[1]), Number(m[2])];
  if (rouleaux < 3 || rouleaux > 9 || rangees < 2 || rangees > 9) return null;
  return `${rouleaux} reels × ${rangees} rows`;
}
