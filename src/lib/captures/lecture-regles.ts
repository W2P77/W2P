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
 */
export const EN_TETE_PANNEAU = /RTP|GAME RULES|PAYTABLE/i;

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
  const CHIFFRE = '(\\d{2}\\s?[.,]\\s?\\d{1,2})';
  const jusquAuNombre = '(?:(?!BUY|using|USING)[^0-9]){0,40}';
  /*
   * Chaque studio a sa formule, et le mot « RTP » n'y est pas toujours nu.
   * Pragmatic écrit « The theoretical RTP of this game is 96.00% », Hacksaw
   * « Theoretical payout (RTP): 96.43% ». Exiger `RTP` juste après le mot-clé
   * rendait donc **null** sur un panneau Hacksaw parfaitement lisible.
   */
  const APRES_LE_MOT = '\\s+(?:payout\\s*)?\\(?\\s*RTP\\s*\\)?';
  const lire = (mot: string) =>
    new RegExp(`${mot}${APRES_LE_MOT}${jusquAuNombre}${CHIFFRE}`, 'i').exec(t)?.[1] ?? null;

  const brutHaut = lire('theoretical') ?? lire('maximum');
  const brutBas = lire('minimum');
  const rtp = nombre(brutHaut ?? '');
  const rtpMin = brutBas ? nombre(brutBas) : null;

  const minLu = /MINIMUM\s+BET[^0-9]{0,12}([\d.,]+)/i.exec(t);
  const maxLu = /MAXIMUM\s+BET[^0-9]{0,12}([\d.,]+)/i.exec(t);
  // Trois formulations : « maximum theoretical win is 5,000x » et « the
  // maximum win amount is limited to 5,000x bet » chez Pragmatic, « Maximum
  // achievable win: 10,000x » chez Hacksaw.
  const gainLu =
    /maximum\s+theoretical\s+win[^0-9]{0,40}([\d.,]+)\s*x/i.exec(t) ??
    /maximum\s+win\s+amount\s+is\s+limited\s+to\s+([\d.,]+)\s*x/i.exec(t) ??
    /maximum\s+achievable\s+win[^0-9]{0,40}([\d.,]+)\s*x/i.exec(t);
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
    pages,
  };
}
