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
function enTete(texte: string): string {
  for (const ligne of texte.split('\n').map((l) => l.trim()).slice(0, 6)) {
    const propre = ligne.replace(/[^A-Za-z0-9 &'-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (propre.length < 4 || propre.length > 40) continue;
    const lettres = propre.replace(/[^A-Za-z]/g, '');
    if (lettres.length < 4) continue;
    const capitales = (propre.match(/[A-Z]/g) ?? []).length;
    if (capitales / lettres.length > 0.8) {
      return propre.charAt(0) + propre.slice(1).toLowerCase();
    }
  }
  return '';
}

const VOLATILITES: Array<[RegExp, FaitsLus['volatilite']]> = [
  [/very\s+high\s+volatility/i, 'TRES_HAUTE'],
  [/high\s+volatility/i, 'HAUTE'],
  [/medium\s*-?\s*high\s+volatility/i, 'HAUTE'],
  [/medium\s+volatility/i, 'MOYENNE'],
  [/low\s+volatility/i, 'BASSE'],
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
 */
let ouvrierPartage: Awaited<ReturnType<typeof createWorker>> | null = null;

/**
 * Lit la **bande haute** d'une capture. Sert à reconnaître ce qui est ouvert.
 *
 * Le recadrage n'est pas une économie de confort : lire les 1280×800 coûtait
 * une quinzaine de secondes, et on appelle cette fonction jusqu'à quatre fois
 * par jeu pendant la recherche de l'icône — soit près de quatre heures
 * ajoutées sur le catalogue Pragmatic. La bande suffit : tout ce qu'on
 * cherche s'y trouve, l'en-tête « GAME RULES » (y≈62 sur l'habillage large,
 * y≈96 sur l'étroit) comme le bouton « BUY FREE SPINS » (y≈165).
 */
export async function lireLEcran(cheminPng: string): Promise<string> {
  ouvrierPartage ??= await createWorker('eng');
  const prepare = await sharp(cheminPng)
    .extract({ left: 0, top: 30, width: 1280, height: 190 })
    .grayscale()
    .normalise()
    .resize({ width: 1920 })
    .png()
    .toBuffer();
  const { data } = await ouvrierPartage.recognize(prepare);
  return data.text;
}

/** Libère le moteur partagé. À appeler en fin de campagne. */
export async function fermerLeLecteur(): Promise<void> {
  if (!ouvrierPartage) return;
  await ouvrierPartage.terminate();
  ouvrierPartage = null;
}

/**
 * L'en-tête qui prouve qu'on est entré dans le panneau de règles.
 *
 * Partagé entre la recherche (ci-dessus) et le contrôle final du script :
 * c'est le même critère, il ne doit pas diverger.
 */
export const EN_TETE_PANNEAU = /RTP|GAME RULES|PAYTABLE/i;

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
  const lire = (mot: string) =>
    new RegExp(`${mot}\\s+RTP${jusquAuNombre}${CHIFFRE}`, 'i').exec(t)?.[1] ?? null;

  const brutHaut = lire('theoretical') ?? lire('maximum');
  const brutBas = lire('minimum');
  const rtp = nombre(brutHaut ?? '');
  const rtpMin = brutBas ? nombre(brutBas) : null;

  const minLu = /MINIMUM\s+BET[^0-9]{0,12}([\d.,]+)/i.exec(t);
  const maxLu = /MAXIMUM\s+BET[^0-9]{0,12}([\d.,]+)/i.exec(t);
  // Deux formulations, là encore : « maximum theoretical win is 5,000x » et
  // « the maximum win amount is limited to 5,000x bet ».
  const gainLu =
    /maximum\s+theoretical\s+win[^0-9]{0,40}([\d.,]+)\s*x/i.exec(t) ??
    /maximum\s+win\s+amount\s+is\s+limited\s+to\s+([\d.,]+)\s*x/i.exec(t);
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
