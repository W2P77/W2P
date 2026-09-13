import type { Langue } from '@/i18n/langues';

/**
 * Le texte sous une capture, dans la langue du visiteur.
 *
 * ── Pourquoi il est calculé et non stocké ─────────────────────────────────
 *
 * 6 777 captures existent, dont **5 018 sans légende** : le pipeline n'en
 * écrivait que pour trois cas — le jeu de base, la page qui porte les
 * chiffres, l'achat de bonus. Les autres sortaient nues, et les légendes
 * écrites l'étaient en anglais, donc affichées telles quelles en français et
 * en allemand.
 *
 * Les écrire à la main, c'est 5 018 textes en trois langues. Les stocker,
 * c'est les figer : une capture refaite avec de nouveaux chiffres laisserait
 * une légende périmée. On les **dérive** donc de ce que la capture est et de
 * ce que le jeu déclare — juste par construction, traduit par construction.
 *
 * ── Ce qu'une légende dit, et ne dit pas ──────────────────────────────────
 *
 * Elle décrit ce que la capture montre et reprend les chiffres écrits en gros
 * dans le jeu. Elle ne transcrit pas les valeurs de symboles ligne à ligne :
 * recopier vingt-sept petits nombres lus dans une image est exactement la
 * manière dont une erreur entre dans une fiche. La capture montre, le texte
 * situe.
 */

export interface FaitsDeCapture {
  nom: string;
  rtp: number | null;
  gainMax: number | null;
  /** L'énoncé du jeu, jamais notre verdict : voir la note sur la volatilité. */
  volatilite: string | null;
}

export type TypeDeCapture =
  | 'base'
  | 'chiffres'
  | 'achat'
  | 'plafond'
  | 'symboles'
  | 'mecanique'
  | 'commandes'
  | 'reglages'
  | 'auto'
  | 'regles';

/** Les formules que le pipeline pose lui-même : régénérables, donc remplaçables. */
const DU_PIPELINE = [
  /as the demo opens it, before any spin\.?$/i,
  /^Stated by the game itself:/i,
  /^The purchase confirmation as the game presents it/i,
];

export function typeDeCapture(titre: string): TypeDeCapture {
  const t = (titre ?? '').toLowerCase();
  if (t.includes('base game')) return 'base';
  if (t.includes('buy')) return 'achat';
  if (t.includes('rtp')) return 'chiffres';
  if (t.includes('max win')) return 'plafond';
  if (t.includes('symbol') || t.includes('pay table') || t.includes('paytable')) return 'symboles';
  if (t.includes('how to play')) return 'commandes';
  if (t.includes('setting')) return 'reglages';
  if (t.includes('autoplay')) return 'auto';
  if (/free spins|bonus|feature|tumble|multiplier|wild|scatter|respin|hold/.test(t)) return 'mecanique';
  return 'regles';
}

const LOCALE: Record<Langue, string> = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE' };

const VOLATILITE: Record<Langue, Record<string, string>> = {
  en: { BASSE: 'low', MOYENNE: 'medium', HAUTE: 'high', TRES_HAUTE: 'very high' },
  fr: { BASSE: 'basse', MOYENNE: 'moyenne', HAUTE: 'haute', TRES_HAUTE: 'très haute' },
  de: { BASSE: 'niedrig', MOYENNE: 'mittel', HAUTE: 'hoch', TRES_HAUTE: 'sehr hoch' },
};

/** Les chiffres que le jeu affiche en grand, dans l'écriture de la langue. */
function phraseDesFaits(faits: FaitsDeCapture, l: Langue): string | null {
  const nombre = (n: number, decimales = 0) =>
    new Intl.NumberFormat(LOCALE[l], { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n);
  const morceaux: string[] = [];
  if (faits.rtp != null) morceaux.push(`RTP ${nombre(faits.rtp, 2)} %`);
  if (faits.gainMax != null) {
    const plafond = `${nombre(faits.gainMax)}×`;
    morceaux.push(
      l === 'en' ? `max win ${plafond}` : l === 'fr' ? `gain maximum ${plafond}` : `Höchstgewinn ${plafond}`,
    );
  }
  if (faits.volatilite) {
    const mot = VOLATILITE[l][faits.volatilite] ?? faits.volatilite.toLowerCase();
    morceaux.push(
      l === 'en'
        ? `volatility stated as ${mot}`
        : l === 'fr'
          ? `volatilité annoncée ${mot}`
          : `Volatilität als ${mot} angegeben`,
    );
  }
  if (morceaux.length === 0) return null;
  const liste = morceaux.join(' · ');
  return l === 'en'
    ? `Stated by the game itself: ${liste}.`
    : l === 'fr'
      ? `Annoncé par le jeu lui-même : ${liste}.`
      : `Vom Spiel selbst angegeben: ${liste}.`;
}

const MODELES: Record<Langue, Record<Exclude<TypeDeCapture, 'chiffres'>, (nom: string) => string>> = {
  en: {
    base: (nom) => `${nom} as the demo opens it, before any spin.`,
    achat: () => 'The purchase confirmation as the game presents it, before any spin is committed.',
    plafond: () => 'The page where the game announces its own ceiling.',
    symboles: () => 'The pay table as the game displays it, at the bet shown on screen.',
    mecanique: () => 'The feature explained by the game itself, in its own words.',
    commandes: () => 'The controls page of the rules panel — how the game says it is played.',
    reglages: () => 'The settings menu as the game offers it.',
    auto: () => 'The autoplay menu and its limits, as the game offers them.',
    regles: () => 'A page of the rules panel, as the game shows it.',
  },
  fr: {
    base: (nom) => `${nom} à l'ouverture de la démo, avant le moindre tour.`,
    achat: () => "La confirmation d'achat telle que le jeu la présente, avant d'engager le moindre tour.",
    plafond: () => 'La page où le jeu annonce lui-même son plafond de gain.',
    symboles: () => "La table de gains telle que le jeu l'affiche, à la mise visible à l'écran.",
    mecanique: () => 'La mécanique expliquée par le jeu lui-même, dans ses propres termes.',
    commandes: () => 'La page des commandes du panneau de règles — comment le jeu dit qu\'il se joue.',
    reglages: () => 'Le menu des réglages tel que le jeu le propose.',
    auto: () => 'Le menu de jeu automatique et ses limites, tels que le jeu les propose.',
    regles: () => 'Une page du panneau de règles, telle que le jeu l\'affiche.',
  },
  de: {
    base: (nom) => `${nom} beim Öffnen der Demo, vor dem ersten Spin.`,
    achat: () => 'Die Kaufbestätigung, wie das Spiel sie zeigt, bevor ein Spin eingesetzt wird.',
    plafond: () => 'Die Seite, auf der das Spiel seinen eigenen Höchstgewinn nennt.',
    symboles: () => 'Die Gewinntabelle, wie das Spiel sie beim angezeigten Einsatz darstellt.',
    mecanique: () => 'Die Mechanik, vom Spiel selbst erklärt, in seinen eigenen Worten.',
    commandes: () => 'Die Bedienseite des Regelwerks — wie das Spiel sagt, dass es gespielt wird.',
    reglages: () => 'Das Einstellungsmenü, wie das Spiel es anbietet.',
    auto: () => 'Das Autoplay-Menü und seine Grenzen, wie das Spiel sie anbietet.',
    regles: () => 'Eine Seite des Regelwerks, wie das Spiel sie zeigt.',
  },
};

/**
 * Les légendes écrites à la main, quand elles disent mieux que le modèle.
 *
 * Gates of Olympus est la fiche de référence du site : ses six légendes
 * décrivent des mécaniques que rien d'automatique ne saurait résumer. Elles
 * sont donc traduites, pas régénérées. Toute autre fiche peut en recevoir :
 * une entrée ici l'emporte sur le modèle.
 */
export const LEGENDES_ECRITES: Record<string, Record<string, Record<Langue, string>>> = {
  'gates-of-olympus': {
    'The base game': {
      en: 'Six reels, five rows, and no paylines: symbols pay anywhere on the screen, and the count of matching symbols sets the win. The free spins purchase sits top left, priced at 100× the current bet.',
      fr: "Six rouleaux, cinq rangées et aucune ligne de paiement : les symboles paient n'importe où à l'écran, et c'est leur nombre qui fait le gain. L'achat des tours gratuits est en haut à gauche, à 100× la mise en cours.",
      de: 'Sechs Walzen, fünf Reihen, keine Gewinnlinien: Symbole zahlen an beliebiger Stelle, und ihre Anzahl bestimmt den Gewinn. Der Freispielkauf sitzt oben links, zum 100-fachen des aktuellen Einsatzes.',
    },
    'Symbol values': {
      en: 'The full pay table at a €2.00 bet, from the crown down to the blue gem, in three bands — 8 to 9, 10 to 11, and 12 to 30 matching symbols. The scatter pays on any position and is present on all reels.',
      fr: "La table de gains complète pour une mise de 2,00 €, de la couronne à la gemme bleue, en trois paliers — 8 à 9, 10 à 11, puis 12 à 30 symboles identiques. Le scatter paie sur n'importe quelle position et figure sur tous les rouleaux.",
      de: 'Die vollständige Gewinntabelle bei 2,00 € Einsatz, von der Krone bis zum blauen Edelstein, in drei Stufen — 8 bis 9, 10 bis 11 und 12 bis 30 gleiche Symbole. Der Scatter zahlt an jeder Position und liegt auf allen Walzen.',
    },
    'Tumble and multipliers': {
      en: 'Winning symbols disappear and are replaced from above until no new win forms. Multiplier symbols land randomly in both the base game and free spins, from 2× to 500×, and the values on screen are added together and applied at the end of the tumble sequence.',
      fr: "Les symboles gagnants disparaissent et sont remplacés par le haut jusqu'à ce qu'aucun gain ne se forme. Les symboles multiplicateurs tombent au hasard, en jeu de base comme en tours gratuits, de 2× à 500× : les valeurs présentes à l'écran s'additionnent et s'appliquent à la fin de la cascade.",
      de: 'Gewinnsymbole verschwinden und werden von oben ersetzt, bis kein neuer Gewinn entsteht. Multiplikatorsymbole fallen zufällig — im Grundspiel wie in Freispielen — von 2× bis 500×; die Werte auf dem Bildschirm werden addiert und am Ende der Kaskade angewandt.',
    },
    'Free spins and ante bet': {
      en: 'Four or more scatters award 15 free spins. During the round, every multiplier symbol that lands on a win is added to a running total. The ante bet raises the stake to 25× and doubles the chance of a natural trigger — and it disables the buy feature.',
      fr: "Quatre scatters ou plus donnent 15 tours gratuits. Pendant la série, chaque multiplicateur qui tombe sur un gain s'ajoute à un total courant. L'ante bet porte la mise à 25× et double les chances de déclenchement naturel — et il désactive l'achat de bonus.",
      de: 'Vier oder mehr Scatter bringen 15 Freispiele. Während der Runde wird jeder Multiplikator, der auf einem Gewinn landet, einer laufenden Summe zugeschlagen. Der Ante-Einsatz hebt den Einsatz auf das 25-fache und verdoppelt die Chance auf einen natürlichen Auslöser — und deaktiviert den Kauf.',
    },
    'The studio states its own RTP': {
      en: 'The rules panel gives 96.50% for the base game, 96.50% with the ante bet, and 96.50% with the bought feature — three figures, one value. Minimum bet €0.20, maximum €300.00, volatility stated as medium by the studio.',
      fr: "Le panneau de règles donne 96,50 % en jeu de base, 96,50 % avec l'ante bet et 96,50 % avec l'achat — trois chiffres, une seule valeur. Mise minimale 0,20 €, maximale 300,00 €, volatilité annoncée moyenne par le studio.",
      de: 'Das Regelwerk nennt 96,50 % im Grundspiel, 96,50 % mit Ante-Einsatz und 96,50 % mit gekauftem Feature — drei Angaben, ein Wert. Mindesteinsatz 0,20 €, Höchsteinsatz 300,00 €, Volatilität vom Studio als mittel angegeben.',
    },
    'Buying the feature': {
      en: 'At a €2.00 bet the purchase costs €200 — the 100× multiple the rules announce. The confirmation step is shown here as the game presents it, before any spin is committed.',
      fr: "Pour une mise de 2,00 €, l'achat coûte 200 € — le multiple de 100× annoncé par les règles. L'étape de confirmation est montrée ici telle que le jeu la présente, avant d'engager le moindre tour.",
      de: 'Bei 2,00 € Einsatz kostet der Kauf 200 € — das 100-fache, das die Regeln nennen. Der Bestätigungsschritt ist hier so gezeigt, wie das Spiel ihn darstellt, bevor ein Spin eingesetzt wird.',
    },
  },
};

/**
 * Le titre d'une capture, dans la langue du visiteur.
 *
 * Les titres viennent du pipeline et sont écrits en anglais — « The base
 * game », « Game rules, page 2 », « Settings menu ». Ils s'affichaient tels
 * quels sur les trois versions du site : un lecteur français lisait une
 * légende française sous un titre anglais.
 *
 * Ce qui est traduit ici, ce sont les écrans **génériques** d'une démo. Les
 * noms de mécaniques — Hold & Win, Powernudge, Megaways — restent tels quels :
 * ce sont les noms que le studio leur donne, et les traduire reviendrait à
 * inventer un nom qui n'existe nulle part.
 */
const TITRES: Record<string, { fr: string; de: string }> = {
  'the base game': { fr: 'Le jeu de base', de: 'Das Basisspiel' },
  'game rules': { fr: 'Règles du jeu', de: 'Spielregeln' },
  'a game rules': { fr: 'Règles du jeu', de: 'Spielregeln' },
  '- game rules': { fr: 'Règles du jeu', de: 'Spielregeln' },
  'how to play': { fr: 'Comment jouer', de: 'So wird gespielt' },
  'settings menu': { fr: 'Le menu des réglages', de: 'Das Einstellungsmenü' },
  'autoplay': { fr: 'Le jeu automatique', de: 'Der Autoplay-Modus' },
  'max win': { fr: 'Le gain maximum', de: 'Der Maximalgewinn' },
  'buying the feature': { fr: "L'achat de bonus", de: 'Der Bonuskauf' },
  'bonus buy': { fr: "L'achat de bonus", de: 'Der Bonuskauf' },
  'buy free spins': { fr: "L'achat de tours gratuits", de: 'Der Freispielkauf' },
  'free spins': { fr: 'Les tours gratuits', de: 'Die Freispiele' },
  'free games': { fr: 'Les parties gratuites', de: 'Die Gratisrunden' },
  'free spins rules': { fr: 'Les règles des tours gratuits', de: 'Die Freispielregeln' },
  'free spins feature': { fr: 'La fonction tours gratuits', de: 'Die Freispielfunktion' },
  'free spins options': { fr: 'Les options de tours gratuits', de: 'Die Freispieloptionen' },
  'collect free spins': { fr: 'La collecte de tours gratuits', de: 'Das Sammeln von Freispielen' },
  'features': { fr: 'Les fonctionnalités', de: 'Die Funktionen' },
  'general': { fr: 'Généralités', de: 'Allgemeines' },
  'special symbols': { fr: 'Les symboles spéciaux', de: 'Die Spezialsymbole' },
  'golden symbols': { fr: 'Les symboles dorés', de: 'Die goldenen Symbole' },
  'colossal symbols': { fr: 'Les symboles géants', de: 'Die Kolossalsymbole' },
  'symbol values': { fr: 'La valeur des symboles', de: 'Die Symbolwerte' },
  'ways to win': { fr: 'Les façons de gagner', de: 'Die Gewinnwege' },
  'wild': { fr: 'Le symbole Wild', de: 'Das Wild-Symbol' },
  'scatter': { fr: 'Le symbole Scatter', de: 'Das Scatter-Symbol' },
  'sticky wilds': { fr: 'Les Wilds collants', de: 'Die klebenden Wilds' },
  'expanding wild': { fr: 'Le Wild extensible', de: 'Das expandierende Wild' },
  'expanding wilds': { fr: 'Les Wilds extensibles', de: 'Die expandierenden Wilds' },
  'special wilds': { fr: 'Les Wilds spéciaux', de: 'Die speziellen Wilds' },
  'bonus': { fr: 'Le bonus', de: 'Der Bonus' },
  'bonus game': { fr: 'Le jeu bonus', de: 'Das Bonusspiel' },
  'bonus rules': { fr: 'Les règles du bonus', de: 'Die Bonusregeln' },
  'bonus feature': { fr: 'La fonction bonus', de: 'Die Bonusfunktion' },
  'bonus feature rules': { fr: 'Les règles de la fonction bonus', de: 'Die Regeln der Bonusfunktion' },
  'a medium volatility': { fr: 'Une volatilité moyenne', de: 'Eine mittlere Volatilität' },
  'medium volatility': { fr: 'Une volatilité moyenne', de: 'Eine mittlere Volatilität' },
  'a high volatility': { fr: 'Une volatilité haute', de: 'Eine hohe Volatilität' },
  'high volatility': { fr: 'Une volatilité haute', de: 'Eine hohe Volatilität' },
  'low volatility': { fr: 'Une volatilité basse', de: 'Eine niedrige Volatilität' },
  'the studio states its own rtp': { fr: 'Le studio annonce son propre RTP', de: 'Das Studio nennt seinen eigenen RTP' },
  'tumble and multipliers': { fr: 'Les cascades et les multiplicateurs', de: 'Kaskaden und Multiplikatoren' },
  'free spins and ante bet': { fr: 'Les tours gratuits et la mise Ante', de: 'Freispiele und Ante-Einsatz' },
  'modifiers': { fr: 'Les modificateurs', de: 'Die Modifikatoren' },
  'spin modifiers': { fr: 'Les modificateurs de tour', de: 'Die Dreh-Modifikatoren' },
};

/** « Game rules, page 7 » : la pagination se traduit, le numéro se garde. */
const PAGE_DE_REGLES = /^(?:a\s+)?game rules,?\s*page\s*(\d+)$/i;

export function titreDeCapture(titre: string, langue: Langue): string {
  const brut = (titre ?? '').trim();
  if (langue === 'en' || !brut) return brut;

  const page = brut.match(PAGE_DE_REGLES);
  if (page) {
    return langue === 'fr' ? `Règles du jeu, page ${page[1]}` : `Spielregeln, Seite ${page[1]}`;
  }

  const connu = TITRES[brut.toLowerCase()];
  return connu ? connu[langue] : brut;
}

/* ════════════════════════════════════════════════════════════════════════════
 * Ce que la page de règles dit, dans la langue du visiteur
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ── Pourquoi ce n'est pas un enrichissement de confort ────────────────────
 *
 * Les captures sont prises en **anglais** : le pipeline force `lang=en` parce
 * que le lecteur de règles cherche des mots anglais. Un visiteur français ou
 * allemand regarde donc une image dont il ne lit pas le contenu. Pour deux
 * tiers de l'audience, la légende n'est pas un commentaire de l'image : c'est
 * le **seul accès** à ce qu'elle explique.
 *
 * Et une légende dérivée du seul **type** de la capture répète la même phrase
 * d'une page à l'autre : 16 791 légendes sur 31 152 sont des doublons à
 * l'intérieur de leur propre fiche, dont 82 % sur les pages de règles. Sept
 * pages de Bell Wizard portent la même phrase.
 *
 * ── Pourquoi une liste fermée d'énoncés, et non une traduction du texte ───
 *
 * Traduire le texte OCR reviendrait à publier sur des milliers de fiches une
 * prose que personne n'a relue — avec les « 96.02" », les mots avalés et les
 * « Qganvie rullo » que le moteur produit régulièrement. C'est la faute que
 * `lecture-regles.ts` a déjà payée sur les titres : une quinzaine de titres
 * sur soixante-trois étaient du charabia, publiés en clair et recopiés dans
 * l'attribut `alt`.
 *
 * On procède donc à l'envers. On reconnaît dans le texte les **formulations
 * que les studios écrivent**, une par une, et chaque formulation porte sa
 * phrase écrite à la main dans les trois langues. La traduction est faite une
 * fois, relue une fois, rejouée à l'identique partout. Ce qui n'est pas
 * reconnu n'est pas dit.
 *
 * ── Les chiffres viennent de la base, pas de cette lecture-ci ─────────────
 *
 * Le RTP, le plafond et la volatilité affichés dans la légende sont ceux que
 * la fiche porte déjà, validés par `lecture-regles.ts` et ses bornes de
 * vraisemblance. L'OCR ne sert ici qu'à savoir **quelle page** les porte. Un
 * seul chiffre est lu à neuf — le nombre de tours gratuits — et seulement
 * s'il est **unanime** dans la page : deux valeurs différentes, et on se tait.
 *
 * ── La règle de l'aveu ────────────────────────────────────────────────────
 *
 * Aucun énoncé reconnu, ou trop peu : la légende générique reste. Une page
 * dont l'OCR est trop dégradé pour qu'on sache de quoi elle parle ne mérite
 * pas qu'on devine.
 */

/** Ce dont une page de panneau parle. Liste fermée : rien n'est déduit hors d'elle. */
export type SujetDePage =
  | 'chiffresDuJeu'
  | 'toursGratuits'
  | 'achatDeBonus'
  | 'multiplicateurs'
  | 'holdAndWin'
  | 'cascades'
  | 'symbolesSpeciaux'
  | 'tableDeGains'
  | 'formationDesGains'
  | 'lignesDePaiement'
  | 'gamble'
  | 'jeuAutomatique'
  | 'commandes'
  | 'reglages'
  | 'mentionsLegales';

/**
 * Par ordre d'intérêt pour le lecteur, et c'est cet ordre qui départage.
 *
 * Une page mélange souvent plusieurs sujets — le schéma des lignes, le RTP,
 * le bouton de lancement et la clause de dysfonctionnement tiennent sur la
 * même page chez Pragmatic. Compter les énoncés ferait gagner le sujet le plus
 * bavard, qui est presque toujours le moins utile : le menu de jeu automatique
 * occupe dix lignes, le RTP une seule.
 */
const SUJETS_PAR_INTERET: SujetDePage[] = [
  'chiffresDuJeu',
  'toursGratuits',
  'achatDeBonus',
  'multiplicateurs',
  'holdAndWin',
  'cascades',
  'symbolesSpeciaux',
  'tableDeGains',
  'formationDesGains',
  'lignesDePaiement',
  'gamble',
  'jeuAutomatique',
  'commandes',
  'reglages',
  'mentionsLegales',
];

interface Enonce {
  code: string;
  sujet: SujetDePage;
  /** Les formulations des studios, au mot près. */
  motifs: RegExp[];
  /** Combien de fois le motif doit apparaître. Sert aux preuves de structure. */
  occurrences?: number;
  /**
   * Ce que l'énoncé pèse dans le choix du sujet. Un énoncé faible (un mot
   * isolé, « paylines ») ne suffit jamais seul ; un énoncé signature, oui.
   */
  poids: number;
  /**
   * Ce que l'énoncé dit, écrit à la main dans les trois langues.
   *
   * Absent quand l'énoncé ne sert qu'à reconnaître le sujet : la volatilité
   * lue dans le panneau, par exemple, décrit chez Wazdan un **réglage** et non
   * le jeu — la reconnaître aide à situer la page, la répéter serait faux.
   */
  dit?: Record<Langue, string>;
}

/**
 * Le vocabulaire des panneaux, relevé au mot près chez Pragmatic, Wazdan,
 * Hacksaw et BGaming.
 *
 * Chaque entrée a été vue dans une capture réelle. En ajouter une demande la
 * même chose : une formulation observée, pas supposée.
 */
const ENONCES: Enonce[] = [
  // ── Ce que le jeu déclare de lui-même ──────────────────────────────────
  {
    code: 'rtp-annonce',
    sujet: 'chiffresDuJeu',
    poids: 3,
    motifs: [
      /theoretical\s+RTP/i,
      /game\s+average\s+return\s+to\s+player/i,
      /maximum\s+RTP\s+of\s+this\s+game/i,
      /theoretical\s+payout\s*\(\s*RTP\s*\)/i,
      /Return\s+to\s+Player\s*\(\s*RTP\s*\)/i,
    ],
  },
  {
    code: 'gain-max-annonce',
    sujet: 'chiffresDuJeu',
    poids: 3,
    /*
     * « The maximum win amount is 5000x bet. » — la dernière page de chaque
     * Wazdan, avec la clause de nullité et la note d'indépendance des parties.
     * Pas de `dit` : le chiffre est celui de la fiche, vérifié à la campagne,
     * et c'est `phraseDesFaits` qui l'écrit — jamais celui lu dans l'image.
     */
    motifs: [/maximum\s+win\s+amount\s+is\s+\d/i],
  },
  {
    code: 'table-suit-la-mise',
    sujet: 'chiffresDuJeu',
    poids: 1,
    motifs: [/paytable\s+reflects\s+current\s+bet\s+configuration/i],
    dit: {
      en: 'The pay table follows the bet currently set.',
      fr: 'La table de gains suit la mise en cours.',
      de: 'Die Gewinntabelle folgt dem aktuell eingestellten Einsatz.',
    },
  },
  {
    code: 'plage-de-rtp',
    sujet: 'chiffresDuJeu',
    poids: 2,
    motifs: [/minimum\s+RTP\s+of\s+this\s+game/i],
    dit: {
      en: 'The studio publishes a range rather than a single figure: the rate depends on the tier the operator selects.',
      fr: "Le studio publie une plage plutôt qu'un chiffre unique : le taux dépend du palier retenu par l'opérateur.",
      de: 'Das Studio nennt eine Spanne statt eines einzelnen Werts: die Quote hängt von der vom Betreiber gewählten Stufe ab.',
    },
  },
  {
    code: 'mises-min-max',
    sujet: 'chiffresDuJeu',
    poids: 2,
    motifs: [
      /minimum\s+bet\s*:/i,
      /maximum\s+bet\s*:/i,
      /allowed\s+bet\s+levels\s+for\s+this\s+game\s+are\s+between/i,
      // 1spin4win : « MIN. BET 10 - MAX. BET 5000 », en bas de sa table de gains.
      /MIN\.?\s*BET\s+\d+\s*[-–]\s*MAX\.?\s*BET\s+\d+/i,
    ],
    dit: {
      en: 'The same page gives the minimum and maximum bet the game accepts.',
      fr: 'La même page donne la mise minimale et la mise maximale acceptées par le jeu.',
      de: 'Dieselbe Seite nennt den Mindest- und den Höchsteinsatz des Spiels.',
    },
  },
  {
    code: 'volatilite-enoncee',
    sujet: 'chiffresDuJeu',
    poids: 1,
    // Reconnue pour situer la page, jamais répétée : chez Wazdan, une section
    // « Volatility Levels » décrit un réglage du joueur et non le jeu. L'y
    // lire aurait étiqueté 259 fiches sur 261 en « volatilité haute ».
    motifs: [/(?:very\s+high|medium\s*-?\s*high|high|medium|low)\s+volatility/i],
  },

  // ── Les tours gratuits ─────────────────────────────────────────────────
  {
    code: 'declenchement-de-la-fonction',
    sujet: 'toursGratuits',
    poids: 3,
    /*
     * Aucun `dit` : la phrase qui porte le déclenchement est écrite plus bas,
     * avec le nombre de Scatters — et seulement s'il est unanime dans la page.
     * Ici on ne fait que reconnaître que la page parle bien de ça.
     */
    motifs: [
      /land\s+\d\s+(?:FS\s+)?scatter[^.]{0,90}(?:activate|trigger|award)/i,
      /\d\s+(?:or\s+more\s+)?scatters?[^.]{0,60}(?:award|trigger)s?\s+\d+\s+free\s+spins/i,
      /scatter\s+symbols?\s+triggers?\s+(?:the\s+)?BONUS\s+FEATURE/i,
      /\d+\s+free\s+spins\s+are\s+awarded/i,
    ],
  },
  /*
   * Le déclenchement, dit à la façon de Pragmatic : « 3, 4 or 5 SCATTER
   * symbols hit in the base game awards the FREE SPINS feature ». Les deux
   * motifs ci-dessus attendaient « land » ou un nombre de tours dans la même
   * phrase, que ce studio n'écrit jamais.
   */
  {
    code: 'declenchement-scatters',
    sujet: 'toursGratuits',
    poids: 3,
    // Pas de `dit` non plus : le nombre est relu plus bas, et seulement s'il
    // est unanime dans la page.
    motifs: [
      /scatter\s+symbols?\s+hit\s+in\s+the\s+base\s+game\s+awards?\s+the\s+FREE\s+SPINS/i,
      /to\s+trigger\s+the\s+FREE\s+SPINS\s+feature/i,
    ],
  },
  {
    code: 'declenchement-scatters-nommes',
    sujet: 'toursGratuits',
    poids: 3,
    // Sans `dit` : le nombre est relu plus bas, s'il est unanime dans la page.
    motifs: [/scatter\s+symbols?[^.]{0,60}will\s+trigger[^.]{0,40}free\s+spins/i, /\d\+?\s+scatter\s+symbols?\s+trigger\s+free\s+spins/i],
  },
  {
    code: 'declenchement-aleatoire',
    sujet: 'toursGratuits',
    poids: 3,
    motifs: [/random\s+chance\s+that\s+the\s+FREE\s+SPINS\s+feature\s+will\s+trigger/i],
    dit: {
      en: 'The free spins can trigger at random when the special symbols land, without a fixed count.',
      fr: 'Les tours gratuits peuvent se déclencher au hasard à la chute des symboles spéciaux, sans nombre fixe.',
      de: 'Die Freispiele können beim Landen der Spezialsymbole zufällig auslösen, ohne feste Anzahl.',
    },
  },
  {
    code: 'formule-tiree-au-sort',
    sujet: 'toursGratuits',
    poids: 3,
    motifs: [/one\s+of\s+the\s+following\s+types\s+is\s+randomly\s+chosen/i],
    dit: {
      en: 'The type of free spins played is drawn at random among several.',
      fr: 'Le type de tours gratuits joué est tiré au sort parmi plusieurs.',
      de: 'Die gespielte Freispiel-Variante wird zufällig aus mehreren gezogen.',
    },
  },
  {
    code: 'wilds-ajoutes-au-hasard',
    sujet: 'toursGratuits',
    poids: 2,
    motifs: [/WILD\s+symbols\s+are\s+added\s+in\s+random\s+positions/i],
    dit: {
      en: 'Wilds are added at random positions during the spins.',
      fr: 'Des Wilds sont ajoutés à des positions aléatoires pendant les tours.',
      de: 'Während der Drehungen werden Wilds an zufälligen Positionen hinzugefügt.',
    },
  },
  {
    code: 'choix-de-la-formule',
    sujet: 'toursGratuits',
    poids: 3,
    motifs: [/choose\s+one\s+out\s+of\s+\w+\s+(?:possible\s+)?options/i, /option\s+to\s+choose\s+one\s+out\s+of/i],
    dit: {
      en: 'Before the round begins, the player picks one of several free-spin formats.',
      fr: 'Avant le début de la série, le joueur choisit entre plusieurs formules de tours gratuits.',
      de: 'Vor Beginn der Runde wählt der Spieler zwischen mehreren Freispiel-Varianten.',
    },
  },
  {
    code: 'sans-relance',
    sujet: 'toursGratuits',
    poids: 2,
    motifs: [/feature\s+cannot\s+be\s+retriggered/i],
    dit: {
      en: 'The feature cannot be retriggered once it has started.',
      fr: 'La fonction ne peut pas être relancée une fois commencée.',
      de: 'Die Funktion kann nach dem Start nicht erneut ausgelöst werden.',
    },
  },
  {
    code: 'gain-verse-en-fin-de-serie',
    sujet: 'toursGratuits',
    poids: 2,
    motifs: [/free\s+spins?\s+win\s+is\s+awarded[^.]{0,40}after\s+the\s+round\s+completes/i],
    dit: {
      en: 'The free spins win is paid to the player once the round is over.',
      fr: 'Le gain des tours gratuits est versé au joueur une fois la série terminée.',
      de: 'Der Freispielgewinn wird dem Spieler ausgezahlt, sobald die Runde beendet ist.',
    },
  },
  {
    code: 'tours-supplementaires',
    sujet: 'toursGratuits',
    poids: 2,
    motifs: [/awards?\s+extra\s+free\s+spins/i, /awards?\s+\d+\s+additional\s+spins/i],
    dit: {
      en: 'Further scatters landed during the feature award extra spins.',
      fr: 'Des Scatters obtenus pendant la fonction ajoutent des tours supplémentaires.',
      de: 'Weitere Scatter während der Funktion bringen zusätzliche Spins.',
    },
  },

  // ── L'achat de la fonction ─────────────────────────────────────────────
  {
    code: 'achat-propose',
    sujet: 'achatDeBonus',
    /*
     * Faible exprès. « BUY FREE SPINS » est un **bouton permanent** de
     * l'habillage Pragmatic : il est peint sur des pages qui ne parlent pas
     * d'achat du tout. Sur 3 Buzzing Wilds, l'indice à lui seul faisait passer
     * la page « Expanding wilds » pour une page d'achat. Il lui faut donc un
     * second énoncé pour atteindre le seuil.
     */
    poids: 1,
    motifs: [/buy\s+free\s+spins/i, /bonus\s+buy/i, /buy\s+feature/i, /feature\s+buy/i],
    dit: {
      en: 'The game offers to buy entry into the feature instead of waiting for it.',
      fr: "Le jeu propose d'acheter l'entrée dans la fonction plutôt que de l'attendre.",
      de: 'Das Spiel bietet an, den Einstieg in die Funktion zu kaufen, statt auf sie zu warten.',
    },
  },
  {
    code: 'achat-direct-depuis-le-jeu',
    sujet: 'achatDeBonus',
    poids: 2,
    motifs: [/purchase\s+bonus\s+game\s+features\s+directly/i, /FeatureSpins/i],
    dit: {
      en: 'A dedicated button buys the bonus straight from the main game.',
      fr: 'Un bouton dédié achète le bonus directement depuis le jeu principal.',
      de: 'Eine eigene Taste kauft den Bonus direkt aus dem Hauptspiel.',
    },
  },
  {
    code: 'rtp-achat-distinct',
    sujet: 'achatDeBonus',
    // Le piège le mieux documenté du secteur : sur huit titres mesurés, six
    // portaient en base le retour de l'achat au lieu de celui du jeu. Quand le
    // panneau distingue les deux, le dire est le plus utile de la page.
    poids: 3,
    motifs: [/RTP\s+of\s+the\s+game\s+when\s+using/i, /RTP\s+when\s+buying/i],
    dit: {
      en: 'The panel states a separate RTP for the bought feature: it is not the base game figure.',
      fr: "Le panneau annonce un RTP distinct pour la partie achetée : ce n'est pas celui du jeu de base.",
      de: 'Das Regelwerk nennt einen eigenen RTP für das gekaufte Feature: es ist nicht der Wert des Grundspiels.',
    },
  },

  // ── Multiplicateurs, cascades, Hold & Win ──────────────────────────────
  {
    code: 'multiplicateurs-enumeres',
    sujet: 'multiplicateurs',
    poids: 2,
    motifs: [/possible\s+values\s+for/i, /multiplier\s+values/i],
    dit: {
      en: 'The page lists the multiplier values the feature can award; they are read in the image.',
      fr: "La page énumère les valeurs de multiplicateur que la fonction peut donner ; elles se lisent dans l'image.",
      de: 'Die Seite listet die Multiplikatorwerte auf, die die Funktion vergeben kann; sie stehen im Bild.',
    },
  },
  {
    code: 'multiplicateurs-cumules',
    sujet: 'multiplicateurs',
    poids: 2,
    motifs: [/added\s+or\s+multiplied/i, /values\s+are\s+added\s+together/i],
    dit: {
      en: 'The values collected on screen are combined before the win is settled.',
      fr: "Les valeurs réunies à l'écran se cumulent avant le règlement du gain.",
      de: 'Die auf dem Bildschirm gesammelten Werte werden vor der Gewinnabrechnung zusammengeführt.',
    },
  },
  {
    code: 'cascades',
    sujet: 'cascades',
    poids: 3,
    motifs: [/tumble\s+feature/i, /cascading\s+(?:reels|wins)/i, /symbols?\s+(?:disappear|are\s+removed)[^.]{0,60}replaced/i],
    dit: {
      en: 'Winning symbols disappear and are replaced from above for as long as a new win forms.',
      fr: "Les symboles gagnants disparaissent et sont remplacés par le haut tant qu'un nouveau gain se forme.",
      de: 'Gewinnsymbole verschwinden und werden von oben ersetzt, solange ein neuer Gewinn entsteht.',
    },
  },
  {
    code: 'hold-and-win',
    sujet: 'holdAndWin',
    poids: 3,
    // Aucun `dit` : le nom de la mécanique est celui du studio, l'ouverture le
    // reprend, et en décrire le fonctionnement sans que la page le dise serait
    // une extrapolation.
    motifs: [/hold\s*(?:&|and)\s*win/i, /respin\s+feature/i],
  },

  /*
   * ── La famille « Hold the Jackpot » de Wazdan ──────────────────────────
   *
   * Wazdan pèse 2 207 des 8 951 pages de panneau du site, un quart, et la
   * quasi-totalité de ses jeux à jackpot rejouent le même texte au mot près —
   * seuls le chiffre du déclenchement (« 4 … on the middle row », « at least
   * 6 ») et le nombre de rouleaux changent. Ces pages étaient muettes à 60-70 %
   * alors que leur OCR est parfaitement lisible : ce n'était pas un problème
   * d'image mais un trou de vocabulaire, `hold-and-win` ne reconnaissant que
   * « hold & win » et « respin feature ».
   *
   * Aucun de ces énoncés ne cite un chiffre : ils varient d'un jeu à l'autre
   * dans la même famille, et les recopier publierait un déclenchement faux sur
   * les fiches voisines.
   */
  {
    code: 'hold-the-jackpot',
    sujet: 'holdAndWin',
    poids: 3,
    motifs: [
      /activates?\s+the\s+Hold\s+the\s+Jackpot/i,
      /Hold\s+the\s+Jackpot\s*(?:™)?\s+Bonus\s+Game/i,
      // Un retour à la ligne entre « Hold » et « the Jackpot » suffit à
      // l'OCR pour y glisser un mot parasite ; « the Jackpot™ Bonus Game »
      // reste, et n'appartient qu'à cette famille.
      /the\s+Jackpot\s*™?\s+Bonus\s+Game/i,
    ],
    dit: {
      en: 'Bonus symbols landing in sufficient number open the Hold the Jackpot bonus game.',
      fr: 'Les symboles Bonus, en nombre suffisant, ouvrent le jeu bonus Hold the Jackpot.',
      de: 'Bonussymbole öffnen in ausreichender Zahl das Hold-the-Jackpot-Bonusspiel.',
    },
  },
  {
    code: 'aucun-symbole-ordinaire',
    sujet: 'holdAndWin',
    poids: 3,
    motifs: [/no\s+regular\s+symbols\s+in\s+the\s+base\s+game/i],
    dit: {
      en: 'The base game holds no regular symbols: every prize is won inside the bonus game.',
      fr: "Le jeu de base ne contient aucun symbole ordinaire : tous les gains se remportent dans le jeu bonus.",
      de: 'Das Basisspiel enthält keine regulären Symbole: Alle Gewinne fallen im Bonusspiel.',
    },
  },
  {
    code: 'bonus-payes-en-bonus',
    sujet: 'holdAndWin',
    poids: 2,
    motifs: [/Bonus\s+symbols\s+pay\s+only\s+in\s+the\s+Bonus\s+Game/i],
    dit: {
      en: 'Bonus symbols pay only inside the bonus game.',
      fr: 'Les symboles Bonus ne paient que dans le jeu bonus.',
      de: 'Bonussymbole zahlen nur im Bonusspiel.',
    },
  },
  {
    code: 'matrice-des-cloches',
    sujet: 'holdAndWin',
    poids: 3,
    // 9 Bells, 12 Bells, Sizzling Bells : chaque cloche tirée remplit une
    // case, et la matrice pleine ouvre le jeu bonus des cloches.
    motifs: [/\d+\s+Bells\s+Matrix/i],
    dit: {
      en: 'Every bell landed fills a slot in a matrix; once it is full, the bells bonus game opens.',
      fr: 'Chaque cloche obtenue remplit une case d’une matrice ; pleine, elle ouvre le jeu bonus des cloches.',
      de: 'Jede erzielte Glocke füllt ein Feld einer Matrix; ist sie voll, öffnet sich das Glocken-Bonusspiel.',
    },
  },
  {
    code: 'symboles-collants',
    sujet: 'holdAndWin',
    poids: 3,
    motifs: [/stick\s+to\s+the\s+reels/i, /locked\s+in\s+place\s+while\s+other\s+symbols\s+are\s+spun/i],
    dit: {
      en: 'Certain symbols stick to the reels and stay locked there while the others keep spinning.',
      fr: 'Certains symboles se collent aux rouleaux et y restent verrouillés pendant que les autres tournent.',
      de: 'Bestimmte Symbole haften an den Walzen und bleiben dort fixiert, während die übrigen weiterdrehen.',
    },
  },
  {
    code: 'respins-relances',
    sujet: 'holdAndWin',
    poids: 3,
    motifs: [/Re-?Spins?\s+are\s+granted/i, /resets\s+the\s+number\s+of\s+Re-?Spins/i],
    dit: {
      en: 'Each new bonus symbol resets the re-spin counter.',
      fr: 'Chaque nouveau symbole Bonus relance le compteur de re-spins.',
      de: 'Jedes neue Bonussymbol setzt den Re-Spin-Zähler zurück.',
    },
  },
  {
    code: 'fin-du-jeu-bonus',
    sujet: 'holdAndWin',
    poids: 2,
    motifs: [
      /Bonus\s+Game\s+continues\s+until\s+Re-?Spins\s+are\s+finished/i,
      /all\s+reels\s+are\s+filled\s+with\s+Bonus\s+symbols/i,
    ],
    dit: {
      en: 'The bonus game runs until the re-spins are exhausted or every reel is filled.',
      fr: "Le jeu bonus se poursuit jusqu'à épuisement des re-spins, ou jusqu'à ce que tous les rouleaux soient remplis.",
      de: 'Das Bonusspiel läuft, bis die Re-Spins aufgebraucht sind oder alle Walzen gefüllt wurden.',
    },
  },
  {
    code: 'jackpots-fixes',
    sujet: 'holdAndWin',
    poids: 3,
    motifs: [/MINI,?\s+MINOR,?\s+and\s+MAJOR\s+Jackpot\s+symbols/i],
    dit: {
      en: 'MINI, MINOR and MAJOR jackpot symbols can appear during the bonus game and pay the matching jackpot.',
      fr: 'Les symboles Jackpot MINI, MINOR et MAJOR peuvent apparaître pendant le jeu bonus et versent le jackpot correspondant.',
      de: 'MINI-, MINOR- und MAJOR-Jackpot-Symbole können im Bonusspiel erscheinen und zahlen den jeweiligen Jackpot.',
    },
  },
  {
    code: 'grand-jackpot',
    sujet: 'holdAndWin',
    poids: 3,
    motifs: [/GRAND\s+Jackpot\s+is\s+the\s+maximum\s+prize/i, /Collecting\s+all\s+\d+\s+Bonus\s+symbols/i],
    dit: {
      en: 'Filling the whole grid with bonus symbols awards the GRAND jackpot, the top prize of the game.',
      fr: 'Remplir toute la grille de symboles Bonus décroche le GRAND Jackpot, le gain le plus élevé du jeu.',
      de: 'Wer das gesamte Feld mit Bonussymbolen füllt, gewinnt den GRAND Jackpot, den Höchstgewinn des Spiels.',
    },
  },
  {
    code: 'symbole-collecteur',
    sujet: 'symbolesSpeciaux',
    poids: 3,
    // Le facteur varie — 1-20x sur 12 Bells, 1-10x sur Mighty Wild: Panther —
    // donc il n'est pas dit.
    motifs: [/Collector\s+symbol\s+accumulates/i],
    dit: {
      en: 'A collector symbol gathers the values shown on screen and multiplies them at random.',
      fr: "Un symbole Collecteur réunit les valeurs présentes à l'écran et les multiplie au hasard.",
      de: 'Ein Collector-Symbol sammelt die auf dem Bildschirm gezeigten Werte und multipliziert sie zufällig.',
    },
  },
  {
    code: 'symbole-mystere',
    sujet: 'symbolesSpeciaux',
    poids: 3,
    motifs: [/Mystery\s+symbol\s+can\s+(?:only\s+)?transform\s+into/i],
    dit: {
      en: 'A mystery symbol turns into another bonus symbol, revealed at the end of the round.',
      fr: 'Un symbole Mystère se transforme en un autre symbole Bonus, révélé à la fin de la partie.',
      de: 'Ein Mystery-Symbol verwandelt sich in ein anderes Bonussymbol, das am Ende der Runde aufgedeckt wird.',
    },
  },

  /*
   * ── Les classiques de Wazdan ───────────────────────────────────────────
   *
   * L'autre moitié du catalogue du studio : des machines à fruits dont le
   * panneau tient en sept pages, lisibles sauf la table de gains elle-même,
   * qui n'est faite que d'images et de nombres.
   */
  {
    code: 'gains-pour-mise-minimale',
    sujet: 'tableDeGains',
    poids: 3,
    motifs: [/Paytable\s+shows\s+the\s+win\s+for\s+minimal\s+bet/i],
    dit: {
      en: 'The paytable shows the wins for the minimum bet.',
      fr: 'La table de gains affiche les gains pour la mise minimale.',
      de: 'Die Gewinntabelle zeigt die Gewinne für den Mindesteinsatz.',
    },
  },
  {
    code: 'wild-etend-les-lignes',
    sujet: 'lignesDePaiement',
    poids: 3,
    // « WILD on any position changes 7 winning lines into 81 in current game » :
    // les deux nombres changent d'un jeu à l'autre, la regle non.
    motifs: [/changes?\s+\d+\s+winning\s+lines?\s+into\s+\d+/i],
    dit: {
      en: 'A wild anywhere on the reels extends the number of winning lines for that spin.',
      fr: "Un Wild, où qu'il tombe, étend le nombre de lignes gagnantes pour ce tour.",
      de: 'Ein Wild erweitert – wo immer es landet – die Anzahl der Gewinnlinien für diesen Dreh.',
    },
  },

  // ── Les symboles ───────────────────────────────────────────────────────
  {
    code: 'wild-substitue',
    sujet: 'symbolesSpeciaux',
    poids: 3,
    motifs: [
      // « ©xcept » : Tesseract prend le e ornementé de cette police pour ©.
      /wild[^.]{0,60}substitutes?\s+for\s+all\s+symbols\s+.xcept/i,
      // Play'n GO : « The WILD symbol substitutes for any other reel symbols
      // except the bonus SCATTER », et sur l'habillage graphique « WILDS
      // substitute for all other symbols, except SCATTERS. »
      /wilds?[^.]{0,40}substitutes?\s+for\s+a(?:ny|ll)\s+other\s+(?:reel\s+)?symbols?,?\s+except/i,
      // Hacksaw : « The Wild symbols substitutes for all symbols in the
      // paytable » — sans exception nommée, donc hors de portée des deux
      // motifs ci-dessus.
      /wild\s+symbols?\s+substitutes?\s+for\s+all\s+symbols\s+in\s+the\s+paytable/i,
      // 1spin4win écrit « The WILD symbol substitutes all symbols except
      // SCATTER », sans la préposition.
      /wild\s+symbol\s+substitutes\s+all\s+symbols\s+except/i,
    ],
    dit: {
      en: 'The wild substitutes for every symbol except the scatter.',
      fr: 'Le Wild remplace tous les symboles sauf le Scatter.',
      de: 'Das Wild ersetzt alle Symbole außer dem Scatter.',
    },
  },
  {
    code: 'wild-empile',
    sujet: 'symbolesSpeciaux',
    poids: 2,
    motifs: [/is\s+stacked\s+and\s+present\s+on\s+all\s+reels/i],
    dit: {
      en: 'The wild comes stacked and is present on every reel in the base game.',
      fr: 'Le Wild est empilé et présent sur tous les rouleaux en jeu de base.',
      de: 'Das Wild ist gestapelt und im Basisspiel auf allen Walzen vorhanden.',
    },
  },
  {
    code: 'scatter-sur-certains-rouleaux',
    sujet: 'symbolesSpeciaux',
    poids: 2,
    // « SCATTER symbol appears on reels 1, 3 and 5 » : lesquels change d'un
    // jeu à l'autre, donc on ne les nomme pas.
    motifs: [/scatter\s+symbol\s+appears\s+on\s+reels\s+\d/i],
    dit: {
      en: 'The scatter only appears on certain reels.',
      fr: 'Le Scatter n’apparaît que sur certains rouleaux.',
      de: 'Der Scatter erscheint nur auf bestimmten Walzen.',
    },
  },
  {
    code: 'scatter-sur-tous-les-rouleaux',
    sujet: 'symbolesSpeciaux',
    poids: 2,
    motifs: [/(?:scatter|it)\s+(?:symbol\s+)?appears\s+on\s+all\s+reels/i],
    dit: {
      en: 'The scatter appears on all reels.',
      fr: 'Le Scatter apparaît sur tous les rouleaux.',
      de: 'Der Scatter erscheint auf allen Walzen.',
    },
  },
  /*
   * ── La page « SPECIAL WILDS » de Pragmatic ─────────────────────────────
   *
   * Trois variantes du même symbole y sont décrites l'une après l'autre, en
   * majuscules suivies d'un tiret. Chacune est une information que l'image
   * seule ne donne pas au lecteur francophone ou germanophone.
   */
  {
    code: 'wilds-aleatoires',
    sujet: 'symbolesSpeciaux',
    poids: 3,
    motifs: [/RANDOM\s+WILDS?\s*[-–—]/i, /WILD\s+symbols\s+can\s+appear\s+on\s+random\s+positions/i],
    dit: {
      en: 'On random base-game spins, wild symbols can appear anywhere on the grid.',
      fr: 'Sur des tours de jeu de base tirés au hasard, des Wilds peuvent apparaître à toute position de la grille.',
      de: 'Bei zufälligen Drehungen im Basisspiel können Wild-Symbole an beliebiger Stelle des Rasters erscheinen.',
    },
  },
  {
    code: 'wilds-extensibles',
    sujet: 'symbolesSpeciaux',
    poids: 3,
    motifs: [/EXPANDING\s+WILDS?\s*[-–—]/i, /expand\s+to\s+fill\s+the\s+whole\s+reel/i],
    dit: {
      en: 'An expanding wild stretches to cover its whole reel.',
      fr: "Un Wild extensible s'étire pour couvrir tout son rouleau.",
      de: 'Ein expandierendes Wild dehnt sich über die gesamte Walze aus.',
    },
  },
  {
    code: 'wild-entourant',
    sujet: 'symbolesSpeciaux',
    poids: 3,
    motifs: [/SURROUNDING\s+WILD/i],
    dit: {
      en: 'The surrounding wild turns every position around it into a wild as well.',
      fr: "Le Wild entourant transforme en Wild toutes les positions qui l'entourent.",
      de: 'Das umgebende Wild verwandelt auch alle Positionen um sich herum in Wilds.',
    },
  },
  {
    code: 'wilds-collants',
    sujet: 'symbolesSpeciaux',
    poids: 3,
    motifs: [/sticky\s+and\s+stay\s+on\s+the\s+grid/i, /wilds?[^.]{0,60}become\s+sticky/i],
    dit: {
      en: 'The wilds become sticky and stay on the grid until the feature ends.',
      fr: "Les Wilds deviennent collants et restent en place jusqu'à la fin de la fonction.",
      de: 'Die Wilds werden klebend und bleiben bis zum Ende der Funktion auf dem Raster.',
    },
  },

  // ── La table de gains ──────────────────────────────────────────────────
  {
    code: 'grille-des-paiements',
    sujet: 'tableDeGains',
    poids: 3,
    /*
     * Une preuve de **structure**, pas de vocabulaire : « 5 - $100.00 » chez
     * Pragmatic, « X5 90.00 FUN » chez Wazdan. Six occurrences au moins, parce
     * qu'une table de gains en aligne des dizaines et qu'une ligne isolée peut
     * venir d'un chiffre happé ailleurs.
     *
     * Ces valeurs ne sont jamais recopiées dans la légende : vingt-sept petits
     * nombres lus dans une image, c'est la façon la plus sûre d'y introduire
     * une erreur. La capture montre, le texte situe.
     */
    motifs: [
      /(?:[345]\s*[-–]\s*[$€£]\s?\d|[xX×]\s?[345]\s+\d)/g,
      // BGaming aligne « 13+ 100.00 FUN » — le nombre de symboles, le gain,
      // la devise de la démo. Deux pages de table de gains par jeu, sur 122
      // fiches, que ni le vocabulaire ni la structure ci-dessus ne voyaient.
      /\b\d{1,2}\+?\s+\d+[.,]\d{2}\s+(?:FUN|EUR|USD|CAD)\b/g,
      // 1spin4win aligne « 5. 100 », « 4. 25 », « 3. 10 » — le nombre de
      // symboles, un point, le gain. Le seuil commun de six lignes s'applique :
      // une table de gains en aligne des dizaines.
      /\b[345]\.\s+\d{1,4}\b/g,
    ],
    occurrences: 6,
    dit: {
      en: 'The pay table, symbol by symbol, at the bet shown at the bottom of the screen.',
      fr: "La table de gains, symbole par symbole, à la mise affichée en bas de l'écran.",
      de: 'Die Gewinntabelle, Symbol für Symbol, beim unten angezeigten Einsatz.',
    },
  },

  // ── Comment un gain se forme ───────────────────────────────────────────
  {
    code: 'gauche-droite-adjacents',
    sujet: 'formationDesGains',
    poids: 3,
    motifs: [
      /pay\s+from\s+left\s+to\s+right\s+on\s+adjacent\s+reels/i,
      /predefined\s+lines\s+on\s+adjacent\s+reels\s+from\s+left\s+to\s+right/i,
    ],
    dit: {
      en: 'Symbols pay from left to right on adjacent reels, starting from the leftmost reel.',
      fr: 'Les symboles paient de gauche à droite sur des rouleaux adjacents, à partir du rouleau le plus à gauche.',
      de: 'Symbole zahlen von links nach rechts auf benachbarten Walzen, beginnend mit der Walze ganz links.',
    },
  },
  {
    code: 'gauche-droite-lignes',
    sujet: 'formationDesGains',
    poids: 3,
    motifs: [
      /pay\s+from\s+left\s+to\s+right\s+on\s+(?:selected|active)\s+(?:pay)?lines?/i,
      /on\s+active\s+line,?\s+from\s+left\s+to\s+right/i,
    ],
    dit: {
      en: 'Wins are formed from left to right on the active paylines.',
      fr: 'Les gains se forment de gauche à droite sur les lignes actives.',
      de: 'Gewinne entstehen von links nach rechts auf den aktiven Gewinnlinien.',
    },
  },
  {
    code: 'scatter-paie-partout',
    sujet: 'formationDesGains',
    poids: 2,
    motifs: [/scatter[^.]{0,80}pays\s+at\s+any\s+position/i, /pays?\s+anywhere\s+on\s+the\s+(?:screen|reels)/i],
    dit: {
      en: 'The scatter is the exception: it pays from any position on the reels.',
      fr: "Le Scatter fait exception : il paie quelle que soit sa position sur les rouleaux.",
      de: 'Der Scatter ist die Ausnahme: er zahlt von jeder Position auf den Walzen.',
    },
  },
  /*
   * La page « Information » de Play'n GO, présente sur ses 113 fiches. Les
   * coquilles de l'OCR sont dans les motifs parce qu'elles sont systématiques
   * dans cette police : « pald out », « wviinnings ».
   */
  {
    code: 'gains-additionnes',
    sujet: 'formationDesGains',
    poids: 3,
    motifs: [
      /w\w*innings\s+are\s+added\s+together/i,
      /winning\s+combinations\s+are\s+pa\w{1,3}\s+out\s+at\s+the\s+end\s+of\s+a\s+game\s+round/i,
    ],
    dit: {
      en: 'Wins on several paylines in one round are added together and paid when the round ends.',
      fr: "Les gains obtenus sur plusieurs lignes dans un même tour s'additionnent et sont versés à la fin du tour.",
      de: 'Gewinne auf mehreren Linien einer Runde werden addiert und am Ende der Runde ausgezahlt.',
    },
  },
  /*
   * Hacksaw répète ces deux paragraphes sur ses 108 fiches, dans la section
   * « WAYS TO WIN » puis « BONUS BUY ». Le second porte son propre poids parce
   * que `achat-propose` est volontairement faible : « BONUS BUY » seul est un
   * bouton d'habillage, pas une page d'achat.
   */
  /*
   * ── 1spin4win ──────────────────────────────────────────────────────────
   *
   * 647 pages, et un piège qu'on s'est tendu tout seul : ce studio n'imprime
   * pas son RTP, donc on reconnaît son panneau à la clause « MALFUNCTION VOIDS
   * ALL PAYS AND PLAYS » — qui est peinte sur **chaque** page. Tant que rien
   * d'autre n'y était reconnu, cette clause emportait la décision partout et
   * six tables de gains sortaient légendées « Les mentions de fin du panneau ».
   * D'où le poids 1 sur `dysfonctionnement`, et ces énoncés-ci pour que les
   * vrais sujets gagnent.
   */
  {
    code: 'bonus-spins-gagnes',
    sujet: 'toursGratuits',
    poids: 3,
    // « 15 BONUSSPINS are won with 3,4 or 5 SCATTER symbols on any position. »
    // Le nombre n'est pas recopié : il est relu plus bas, s'il est unanime.
    motifs: [/bonus\s?spins\s+are\s+won\s+with/i],
  },
  {
    code: 'gains-de-gauche-a-droite',
    sujet: 'formationDesGains',
    poids: 3,
    motifs: [/wins\s+pay\s+only\s+from\s+left\s+to\s+right/i],
    dit: {
      en: 'Wins pay from left to right only.',
      fr: 'Les gains ne paient que de gauche à droite.',
      de: 'Gewinne zahlen ausschließlich von links nach rechts.',
    },
  },
  {
    code: 'plafond-de-l-achat',
    sujet: 'achatDeBonus',
    poids: 2,
    motifs: [/MAX\.?\s*BONUS\s*BUY\s*BET/i],
    dit: {
      en: 'The panel gives the ceiling of the bet the bonus can be bought at.',
      fr: "Le panneau donne le plafond de mise auquel le bonus peut être acheté.",
      de: 'Das Regelwerk nennt die Einsatzobergrenze, zu der sich der Bonus kaufen lässt.',
    },
  },
  {
    code: 'wild-double-le-gain',
    sujet: 'symbolesSpeciaux',
    poids: 3,
    motifs: [/doubles?\s+the\s+win\s+when\s+substituting/i],
    dit: {
      en: 'When the wild completes a win, it multiplies that win — more so during the bonus spins.',
      fr: "Quand le Wild complète un gain, il le multiplie — davantage pendant les tours bonus.",
      de: 'Vervollständigt das Wild einen Gewinn, vervielfacht es ihn — in den Bonusrunden stärker.',
    },
  },

  /*
   * ── BGaming ────────────────────────────────────────────────────────────
   *
   * 1 173 pages de panneau, dont beaucoup de prose propre à chaque jeu — des
   * héros, des boss, des coffres — qu'on ne cherche pas à reconnaître. Ces
   * trois-là, en revanche, reviennent d'un jeu à l'autre au mot près.
   */
  {
    code: 'gains-selon-le-nombre-de-symboles',
    sujet: 'formationDesGains',
    poids: 3,
    motifs: [
      /w\w*ins?\s+are\s+formed\s+depending\s+on\s+the\s+number\s+of\s+symbols/i,
      /payouts\s+are\s+made\s+according\s+to\s+the\s+(?:number\s+of\s+symbols|paytable)/i,
    ],
    dit: {
      en: 'Wins depend on how many matching symbols land, and are paid according to the pay table.',
      fr: 'Les gains dépendent du nombre de symboles obtenus et sont payés selon la table de gains.',
      de: 'Die Gewinne richten sich nach der Anzahl der erzielten Symbole und werden gemäß Gewinntabelle ausgezahlt.',
    },
  },
  {
    code: 'tour-rapide',
    sujet: 'reglages',
    poids: 2,
    motifs: [
      /quick\s+spin\s*-\s*(?:if\s+enabled\s+)?the\s+speed\s+of\s+(?:the\s+)?spinning\s+reels\s+increases/i,
      /settings\s+button\s+opens\s+a\s+panel\s+with\s+game\s+speed\s+and\s+volume/i,
    ],
    dit: {
      en: 'The panel sets the reel speed and the volume, with a quick-spin option the licence may withhold.',
      fr: "Le panneau règle la vitesse des rouleaux et le volume, avec un tour rapide que la licence peut interdire.",
      de: 'Das Panel regelt Walzentempo und Lautstärke, samt Schnelldreh-Option, die die Lizenz untersagen kann.',
    },
  },
  {
    code: 'bareme-des-tours-gratuits',
    sujet: 'toursGratuits',
    poids: 3,
    /*
     * Une preuve de structure : BGaming aligne « 5x 15 free spins », « 4x 12
     * free spins », « 3x 10 free spins » en colonne, sans une phrase autour.
     * Trois lignes au moins, et les nombres ne sont pas recopiés — ils
     * changent à chaque jeu et se lisent dans l'image.
     */
    motifs: [/\d\s*[x×]\s+\d+\s+free\s+spins/gi],
    occurrences: 3,
    dit: {
      en: 'The scatter count decides how many free spins are awarded, on the scale shown here.',
      fr: 'Le nombre de Scatters décide du nombre de tours gratuits, selon le barème affiché ici.',
      de: 'Die Anzahl der Scatter bestimmt die Zahl der Freispiele, nach der hier gezeigten Staffel.',
    },
  },
  {
    code: 'combinaisons-valables-partout',
    sujet: 'formationDesGains',
    poids: 3,
    motifs: [/requirements\s+for\s+a\s+winning\s+combination\s+in\s+the\s+base\s+game\s+are\s+also\s+used/i],
    dit: {
      en: 'The winning combinations of the base game also apply during the bonus features and the free spins.',
      fr: 'Les combinaisons gagnantes du jeu de base valent aussi pendant les fonctions bonus et les tours gratuits.',
      de: 'Die Gewinnkombinationen des Basisspiels gelten auch während der Bonusfunktionen und Freispiele.',
    },
  },
  {
    code: 'plus-haut-gain-par-ligne',
    sujet: 'formationDesGains',
    poids: 2,
    motifs: [/only\s+the\s+highest\s+win\s+is\s+paid/i, /only\s+higher\s+win\s+is\s+paid/i],
    dit: {
      en: 'On a given line, only the highest win is paid.',
      fr: 'Sur une même ligne, seul le gain le plus élevé est payé.',
      de: 'Auf einer Linie wird nur der höchste Gewinn ausgezahlt.',
    },
  },
  {
    code: 'gains-cumules',
    sujet: 'formationDesGains',
    poids: 2,
    motifs: [
      /all\s+wins\s+are\s+added\s+to\s+the\s+total\s+win/i,
      // BGaming : « In case of multiple winning combinations the sum of the
      // win is added. »
      /multiple\s+winning\s+combinations\s+the\s+sum\s+of\s+the\s+win\s+is\s+added/i,
    ],
    dit: {
      en: 'Wins landed on several paylines are added together.',
      fr: "Les gains obtenus sur plusieurs lignes s'additionnent.",
      de: 'Gewinne auf mehreren Linien werden addiert.',
    },
  },
  {
    code: 'multiplie-par-mise-par-ligne',
    sujet: 'formationDesGains',
    poids: 2,
    motifs: [/wins\s+are\s+multiplied\s+by\s+bet\s+per\s+line/i],
    dit: {
      en: 'Wins are multiplied by the bet per line, and the values shown are expressed in coins.',
      fr: 'Les gains sont multipliés par la mise par ligne, et les valeurs affichées sont exprimées en jetons.',
      de: 'Gewinne werden mit dem Einsatz pro Linie multipliziert, und die angezeigten Werte sind in Münzen angegeben.',
    },
  },
  {
    code: 'une-mise-par-tour',
    sujet: 'formationDesGains',
    poids: 2,
    motifs: [/each\s+new\s+game\s+costs\s+one\s+stake/i],
    dit: {
      en: 'Each new spin costs one stake.',
      fr: 'Chaque nouveau tour coûte une mise.',
      de: 'Jede neue Runde kostet einen Einsatz.',
    },
  },
  {
    code: 'scatter-ajoute-aux-lignes',
    sujet: 'formationDesGains',
    poids: 2,
    motifs: [
      /wins?\s+for\s+scatters?\s+are\s+added\s+to\s+active\s+line\s+wins/i,
      /scatter\s+wins\s+are\s+added\s+to\s+the\s+payline\s+win/i,
    ],
    dit: {
      en: 'Scatter wins are added to the active line wins.',
      fr: "Les gains de Scatter s'ajoutent à ceux des lignes actives.",
      de: 'Scatter-Gewinne werden zu den Liniengewinnen addiert.',
    },
  },
  {
    code: 'lignes-de-paiement',
    sujet: 'lignesDePaiement',
    // Faible exprès : le mot seul ne prouve rien, il faut qu'il revienne.
    poids: 1,
    motifs: [/paylines?/gi],
    occurrences: 2,
  },

  // ── Gamble, jeu automatique, commandes, réglages ───────────────────────
  {
    code: 'gamble',
    sujet: 'gamble',
    poids: 3,
    motifs: [/risk\s+your\s+win\s+for\s+a\s+chance\s+to\s+double/i, /gamble\s+feature/i],
    dit: {
      en: 'The gamble feature: risking a win for the chance to double it.',
      fr: 'La fonction Gamble : risquer un gain pour tenter de le doubler.',
      de: 'Die Gamble-Funktion: einen Gewinn riskieren, um ihn zu verdoppeln.',
    },
  },
  {
    code: 'autoplay-menu',
    sujet: 'jeuAutomatique',
    poids: 3,
    motifs: [/autoplay\s+settings/i, /number\s+of\s+games\s*:\s*select\s+the\s+amount\s+of\s+spins/i],
    dit: {
      en: 'The autoplay menu, where the number of spins to chain is chosen.',
      fr: 'Le menu de jeu automatique, où se choisit le nombre de tours à enchaîner.',
      de: 'Das Autoplay-Menü, in dem die Anzahl der Runden gewählt wird.',
    },
  },
  {
    code: 'autoplay-limites',
    sujet: 'jeuAutomatique',
    poids: 2,
    motifs: [
      /stops?\s+autoplay\s+(?:at|if)/gi,
      // BGaming dit « autospin will stop after you win », « autospin will stop
      // when a bonus game is triggered » : même menu, autre verbe.
      /autospins?\s+will\s+stop\s+(?:after|when)/gi,
    ],
    occurrences: 2,
    dit: {
      en: 'It can stop the run on any win, when free spins begin, or as soon as the balance moves by a set amount.',
      fr: "Il peut arrêter la série sur un gain, à l'entrée des tours gratuits, ou dès que le solde varie d'un montant fixé.",
      de: 'Sie kann die Serie bei jedem Gewinn stoppen, beim Beginn der Freispiele oder sobald sich das Guthaben um einen festgelegten Betrag ändert.',
    },
  },
  {
    code: 'changer-la-mise',
    sujet: 'commandes',
    poids: 3,
    motifs: [
      /you\s+can\s+change\s+the\s+bet\s+value\s+by/i,
      /buttons\s+to\s+change\s+the\s+bet\s+value\s+and\s+open\s+the\s+bet\s+menu/i,
    ],
    dit: {
      en: 'How the bet is changed: the value buttons, the plus and minus, or a long press to jump to the minimum or the maximum.',
      fr: "Comment se change la mise : les boutons de valeur, le plus et le moins, ou un appui maintenu pour aller au minimum ou au maximum.",
      de: 'Wie der Einsatz geändert wird: die Wertetasten, Plus und Minus, oder langes Drücken für Minimum oder Maximum.',
    },
  },
  {
    code: 'bouton-de-tour',
    sujet: 'commandes',
    poids: 2,
    motifs: [
      /click\s+to\s+start\s+playing\s+at\s+the\s+current\s+bet/i,
      /play\s+button/i,
      /press\s+the\s+SPIN\s+button\s+to\s+play/i,
    ],
    dit: {
      en: 'The spin button, which plays at the bet level currently set.',
      fr: 'Le bouton de lancement, qui joue au niveau de mise en cours.',
      de: 'Die Starttaste, die mit dem aktuell eingestellten Einsatz spielt.',
    },
  },
  {
    code: 'vitesses-de-tour',
    sujet: 'commandes',
    poids: 2,
    motifs: [/cycles\s+through\s+spin\s+speed\s+settings/i, /normal\s+speed,\s+quick\s+spin\s+and\s+turbo\s+spin/i],
    dit: {
      en: 'Three spin speeds: normal, quick and turbo.',
      fr: 'Trois vitesses de tour : normale, rapide et turbo.',
      de: 'Drei Drehgeschwindigkeiten: normal, schnell und Turbo.',
    },
  },
  {
    code: 'jetons-ou-argent',
    sujet: 'commandes',
    poids: 1,
    motifs: [/switch\s+between\s+coins\s+view\s+and\s+cash\s+view/i],
    dit: {
      en: 'The balance and bet can be shown in coins or in cash.',
      fr: 'Le solde et la mise peuvent s’afficher en jetons ou en argent.',
      de: 'Guthaben und Einsatz lassen sich in Münzen oder in Geld anzeigen.',
    },
  },
  {
    code: 'raccourcis-clavier',
    sujet: 'commandes',
    poids: 2,
    motifs: [
      /space\s+and\s+enter\s+buttons\s+on\s+the\s+keyboard/i,
      /spacebar\s+to\s+spin/i,
    ],
    dit: {
      en: 'The space and enter keys start and stop the spin.',
      fr: "Les touches Espace et Entrée lancent et arrêtent le tour.",
      de: 'Die Leer- und Eingabetaste starten und stoppen den Spin.',
    },
  },
  {
    code: 'compteurs',
    sujet: 'commandes',
    poids: 2,
    motifs: [
      /active\s+counters/i,
      /total\s+bet\s*-\s*current\s+bet/i,
      /current\s+balance\s+is\s+shown\s+in\s+the\s+BALANCE\s+display/i,
      /CREDIT\s+and\s+BET\s+labels\s+show\s+the\s+current\s+balance/i,
    ],
    dit: {
      en: 'The counters on screen: current win, total bet, balance.',
      fr: "Les compteurs de l'écran : gain en cours, mise totale, solde.",
      de: 'Die Zähler auf dem Bildschirm: aktueller Gewinn, Gesamteinsatz, Guthaben.',
    },
  },
  {
    code: 'son-et-musique',
    sujet: 'reglages',
    poids: 2,
    motifs: [/sound\s+volume/i, /music\s+volume/i],
    dit: {
      en: 'The settings page: sound and music, and the shortcuts to the rules and the pay table.',
      fr: 'La page des réglages : son et musique, et les raccourcis vers les règles et la table de gains.',
      de: 'Die Einstellungsseite: Ton und Musik sowie die Verknüpfungen zu Regeln und Gewinntabelle.',
    },
  },
  {
    code: 'historique-des-parties',
    sujet: 'reglages',
    poids: 2,
    motifs: [/click\s+to\s+view\s+your\s+latest\s+game\s+history/i],
    dit: {
      en: 'The game history, which the game says is only available when playing for money.',
      fr: "L'historique des parties, que le jeu dit accessible seulement en argent réel.",
      de: 'Der Spielverlauf, der laut Spiel nur im Echtgeldmodus verfügbar ist.',
    },
  },
  {
    code: 'plein-ecran',
    sujet: 'reglages',
    poids: 1,
    motifs: [/close\s+full\s+screen/i],
  },

  /*
   * ── Le menu de réglages de Pragmatic ───────────────────────────────────
   *
   * Pragmatic pèse 4 276 des 9 057 pages de panneau du site, et cette page-là
   * revient dans presque tous ses jeux : trois des six pages muettes tirées au
   * sort en portaient le texte, au mot près. `son-et-musique` ne la voyait pas
   * — ce studio n'écrit ni « sound volume » ni « music volume », mais des
   * lignes de menu en majuscules suivies d'un tiret.
   */
  {
    code: 'menu-reglages',
    sujet: 'reglages',
    poids: 3,
    motifs: [/INTRO\s+SCREEN\s*[-–—]\s*toggles/i, /SOUND\s+FX\s*[-–—]\s*toggles/i],
    dit: {
      // Formulée sans nommer le menu : quand le studio a titré la page
      // « Settings menu », le modèle du type l'a déjà nommé, et la légende
      // sortait « Le menu des réglages tel que le jeu le propose. Le menu des
      // réglages : … ».
      en: 'It toggles the intro screen, the ambient sound and the sound effects, and opens the game history.',
      fr: "On y règle l'écran d'accueil, l'ambiance sonore et les effets, et on y ouvre l'historique des parties.",
      de: 'Dort lassen sich Startbildschirm, Hintergrundton und Soundeffekte schalten sowie der Spielverlauf öffnen.',
    },
  },
  {
    code: 'menu-de-mise',
    sujet: 'reglages',
    poids: 2,
    motifs: [/bet\s+menu\s+shows\s+the[^.]{0,120}in\s+both\s+coins\s+and\s+cash/i],
    dit: {
      en: 'The bet menu, which shows the total bet in both coins and cash.',
      fr: 'Le menu de mise, qui affiche la mise totale en jetons et en argent.',
      de: 'Das Einsatzmenü, das den Gesamteinsatz sowohl in Münzen als auch in Geld anzeigt.',
    },
  },

  // ── Les mentions de fin de panneau ─────────────────────────────────────
  {
    code: 'dysfonctionnement',
    sujet: 'mentionsLegales',
    /*
     * Faible exprès, et pour la même raison que `achat-propose`.
     *
     * La clause de nullité n'est pas toujours au bas d'une page de mentions :
     * 1spin4win la peint sur **chaque** page de son panneau — c'est d'ailleurs
     * à elle qu'on reconnaît ce panneau, faute de RTP imprimé. Au poids 2 elle
     * atteignait le seuil toute seule, et les six pages d'All Ways Egypt, qui
     * sont des tables de gains et des pages de symboles, sortaient toutes
     * légendées « Les mentions de fin du panneau de règles ». Une phrase
     * fausse est pire qu'une phrase générique.
     *
     * Au poids 1 il lui faut un second énoncé — le sort des parties
     * interrompues, la version de l'aide — qui, lui, ne figure que sur la
     * vraie page de mentions.
     */
    poids: 1,
    /*
     * « volds », « vaids » : Tesseract confond le i et le l dans cette police,
     * et la clause est le témoin le plus répandu du site. Le verbe est donc lu
     * large — « malfunction v???s all pays » ne peut être rien d'autre.
     */
    motifs: [/malfunction\s+v\w{2,4}s\s+all\s+pays/i],
    dit: {
      en: 'The clause voiding all pays and plays in the event of a malfunction.',
      fr: 'La clause qui annule gains et parties en cas de dysfonctionnement.',
      de: 'Die Klausel, die bei einer Störung alle Gewinne und Runden für ungültig erklärt.',
    },
  },
  {
    code: 'parties-independantes',
    sujet: 'mentionsLegales',
    poids: 2,
    motifs: [/outcome\s+of\s+each\s+and\s+every\s+game\s+is\s+completely\s+independent/i],
    dit: {
      en: 'Each round is independent of the last, as the game states.',
      fr: 'Chaque partie est indépendante de la précédente, comme le jeu le stipule.',
      de: 'Jede Runde ist von der vorherigen unabhängig, wie das Spiel festhält.',
    },
  },
  {
    code: 'collant-sans-effet',
    sujet: 'mentionsLegales',
    poids: 1,
    motifs: [/outcome\s+of\s+remaining\s+non-sticky\s+symbols\s+is\s+entirely\s+random/i],
    dit: {
      en: 'A sticky symbol changes nothing to the draw of the others.',
      fr: 'Un symbole collant ne change rien au tirage des autres.',
      de: 'Ein haftendes Symbol ändert nichts an der Ziehung der übrigen.',
    },
  },
  {
    code: 'parties-interrompues',
    sujet: 'mentionsLegales',
    poids: 2,
    motifs: [
      /unfinished\s+game\s+rounds/i,
      /interrupted\s+rounds/i,
      // Play'n GO titre la page « Unfinished Games » et ouvre par « If your
      // game round is disrupted » : c'est la page 1 de chacun de ses jeux.
      /unfinished\s+games/i,
      /game\s+round\s+is\s+disrupted/i,
    ],
    dit: {
      en: 'What becomes of interrupted rounds, and how long an inactive session lasts.',
      fr: "Le sort des parties interrompues, et la durée au bout de laquelle une session inactive prend fin.",
      de: 'Was mit unterbrochenen Runden geschieht und wann eine inaktive Sitzung endet.',
    },
  },
  {
    code: 'version-de-laide',
    sujet: 'mentionsLegales',
    poids: 1,
    motifs: [/help\s+version/i],
  },
];

/** L'entrée en matière d'un sujet, quand le sujet mérite d'être nommé. */
const OUVERTURES: Partial<Record<SujetDePage, Record<Langue, string>>> = {
  chiffresDuJeu: {
    en: 'The page where the game states its own figures.',
    fr: 'La page où le jeu énonce ses propres chiffres.',
    de: 'Die Seite, auf der das Spiel seine eigenen Zahlen nennt.',
  },
  toursGratuits: {
    en: 'The page the game devotes to its free spins.',
    fr: 'La page que le jeu consacre à ses tours gratuits.',
    de: 'Die Seite, die das Spiel seinen Freispielen widmet.',
  },
  achatDeBonus: {
    en: 'The page the game devotes to buying the feature.',
    fr: "La page que le jeu consacre à l'achat de la fonction.",
    de: 'Die Seite, die das Spiel dem Kauf der Funktion widmet.',
  },
  multiplicateurs: {
    en: 'The page the game devotes to its multipliers.',
    fr: 'La page que le jeu consacre à ses multiplicateurs.',
    de: 'Die Seite, die das Spiel seinen Multiplikatoren widmet.',
  },
  holdAndWin: {
    en: 'The page where the game explains its Hold & Win mechanic.',
    fr: 'La page où le jeu explique sa mécanique Hold & Win.',
    de: 'Die Seite, auf der das Spiel seine Hold-&-Win-Mechanik erklärt.',
  },
  cascades: {
    en: 'The page where the game explains its tumbling reels.',
    fr: 'La page où le jeu explique ses cascades.',
    de: 'Die Seite, auf der das Spiel seine Kaskaden erklärt.',
  },
  symbolesSpeciaux: {
    en: 'The special symbols, as the game defines them.',
    fr: 'Les symboles spéciaux, tels que le jeu les définit.',
    de: 'Die Spezialsymbole, wie das Spiel sie definiert.',
  },
  formationDesGains: {
    en: 'How a win is formed, as the game explains it.',
    fr: "Comment un gain se forme, tel que le jeu l'explique.",
    de: 'Wie ein Gewinn entsteht, wie das Spiel es erklärt.',
  },
  lignesDePaiement: {
    en: 'The paylines, drawn one by one as the game lays them out.',
    fr: 'Les lignes de paiement, dessinées une à une comme le jeu les dispose.',
    de: 'Die Gewinnlinien, einzeln gezeichnet, wie das Spiel sie anordnet.',
  },
  commandes: {
    en: 'The controls page of the rules panel.',
    fr: 'La page des commandes du panneau de règles.',
    de: 'Die Bedienseite des Regelwerks.',
  },
  mentionsLegales: {
    en: 'The closing notices of the rules panel.',
    fr: 'Les mentions de fin du panneau de règles.',
    de: 'Die abschließenden Hinweise des Regelwerks.',
  },
};

/**
 * Un nombre lu dans la page — et seulement s'il est **unanime**.
 *
 * « Land 3 FS scatter symbols » et « Land 4 FS scatter symbols » cohabitent sur
 * la même page chez Hacksaw : deux bonus distincts. Choisir le premier
 * publierait un déclenchement faux. Deux valeurs différentes, on se tait.
 */
function nombreUnanime(texte: string, motif: RegExp, bas: number, haut: number): number | null {
  const vues = new Set<number>();
  for (const m of texte.matchAll(motif)) {
    // Le motif peut offrir plusieurs groupes — une formulation par groupe ;
    // un seul est renseigné à la fois.
    const n = Number.parseInt(m.slice(1).find(Boolean) ?? '', 10);
    if (!Number.isFinite(n) || n < bas || n > haut) return null;
    vues.add(n);
  }
  return vues.size === 1 ? [...vues][0] : null;
}

/**
 * La phrase où le panneau décrit un déclenchement — s'il n'y en a qu'une.
 *
 * Une page décrit souvent **plusieurs** fonctions. La page 4 de 2 Wild 2 Die
 * en décrit trois : un bonus à 4 Scatters doté de 10 tours gratuits, un bonus
 * à 3 Scatters, et les tours ajoutés en cours de série. Lire les chiffres sur
 * la page entière rattachait « 10 tours gratuits » à l'ensemble, c'est-à-dire
 * à deux fonctions sur trois pour lesquelles c'est faux.
 *
 * On n'écrit donc un chiffre de déclenchement que quand la page n'en décrit
 * qu'un seul. Deux, et on se tait : c'est la même règle que l'unanimité, un
 * cran plus tôt.
 */
function phraseDeDeclenchementUnique(texte: string): string | null {
  const phrases = texte
    .split(/(?<=[.!])\s+/)
    .filter((p) => /scatter/i.test(p) && /activate|trigger|awards?|free\s+spins/i.test(p));
  return phrases.length === 1 ? phrases[0] : null;
}

/** Combien de tours gratuits le panneau attribue, quand il n'en annonce qu'un chiffre. */
function toursGratuitsAnnonces(texte: string): number | null {
  const phrase = phraseDeDeclenchementUnique(texte);
  if (!phrase) return null;
  return nombreUnanime(phrase, /(?:awards?|with|of)\s+(\d{1,3})\s+free\s+spins/gi, 3, 500);
}

/**
 * Combien de Scatters simultanés déclenchent la fonction, si la page est unanime.
 *
 * Les deux formulations comptent, et c'est le point : sur la page 4 de
 * 2 Wild 2 Die, Hacksaw écrit « Land 4 FS scatter symbols » pour un bonus puis
 * « When 3 FS scatter symbols land » pour un autre, plus bas. Ne chercher que
 * la première forme faisait passer la page pour unanime à 4, et publiait un
 * déclenchement faux pour la moitié de ce qu'elle décrit.
 */
function scattersDeDeclenchement(texte: string): number | null {
  const phrase = phraseDeDeclenchementUnique(texte);
  if (!phrase) return null;
  return nombreUnanime(
    phrase,
    /(?:land\s+(\d)\s+(?:FS\s+)?scatter|(\d)\s+(?:FS\s+)?scatter\s+symbols?\s+land)/gi,
    2,
    6,
  );
}

export interface LectureDePage {
  sujet: SujetDePage;
  /** Les codes d'énoncés du sujet retenu, dans l'ordre de la liste. */
  enonces: string[];
  /**
   * Tous les énoncés reconnus, sujet dominant ou non.
   *
   * Une page de Pragmatic porte à la fois le schéma des lignes, la règle de
   * formation des gains, le RTP et la clause de dysfonctionnement. Le sujet
   * dominant y est « comment un gain se forme » — et le RTP, qui est la chose
   * la plus rare du site, disparaissait de la légende. Il se rattrape ici.
   */
  tous: string[];
  poids: number;
}

/** Le minimum de preuves avant de nommer un sujet. En dessous, on se tait. */
const SEUIL_DE_CERTITUDE = 2;

/**
 * De quoi cette page parle, d'après ce que l'OCR en a lu.
 *
 * Rend `null` quand rien n'est assez sûr — c'est le cas attendu sur une page
 * illisible, et c'est ce qui laisse la légende générique en place.
 */
export function lirePageDeRegles(texte: string | null | undefined): LectureDePage | null {
  const t = (texte ?? '').replace(/\s+/g, ' ');
  if (t.length < 40) return null;

  const parSujet = new Map<SujetDePage, { poids: number; enonces: string[] }>();
  for (const e of ENONCES) {
    const trouve = e.motifs.some((motif) => {
      if (!e.occurrences) return motif.test(t);
      const global = motif.flags.includes('g') ? motif : new RegExp(motif.source, motif.flags + 'g');
      return [...t.matchAll(global)].length >= e.occurrences;
    });
    if (!trouve) continue;
    const entree = parSujet.get(e.sujet) ?? { poids: 0, enonces: [] };
    entree.poids += e.poids;
    entree.enonces.push(e.code);
    parSujet.set(e.sujet, entree);
  }

  const tous = [...parSujet.values()].flatMap((e) => e.enonces);
  let meilleur: LectureDePage | null = null;
  for (const sujet of SUJETS_PAR_INTERET) {
    const entree = parSujet.get(sujet);
    if (!entree || entree.poids < SEUIL_DE_CERTITUDE) continue;
    // À poids égal, l'ordre d'intérêt tranche : il est parcouru en premier.
    if (!meilleur || entree.poids > meilleur.poids) {
      meilleur = { sujet, enonces: entree.enonces, tous, poids: entree.poids };
    }
  }
  return meilleur;
}

/**
 * Ce qu'on garde d'une page lue — et pourquoi ce n'est pas son texte.
 *
 * La reconnaissance se fait **à l'écriture**, une fois, et c'est son résultat
 * qui part en base : le sujet, les codes d'énoncés, et les deux seuls chiffres
 * qui se relisent dans la page. Une centaine d'octets par capture.
 *
 * Ranger le texte OCR serait plus simple et coûterait une dizaine de kilooctets
 * par fiche, expédiés au navigateur — neuf pages de panneau à 1 200 caractères,
 * pour trois langues qui n'en affichent aucune. Le projet frère a déjà payé
 * cette facture, à 11,4 Mo de bundle. Et l'OCR brut n'a rien à faire dans une
 * page publique : personne ne l'a relu, et c'est tout l'intérêt de ne pas le
 * traduire.
 */
export interface LectureDeCapture extends LectureDePage {
  /** Combien de Scatters simultanés déclenchent la fonction, si la page est unanime. */
  scatters?: number | null;
  /** Combien de tours gratuits elle attribue, même règle d'unanimité. */
  tours?: number | null;
}

/**
 * La lecture d'une page, sous la forme qui sera rangée dans la capture.
 *
 * Les deux chiffres ne sont relus qu'ici, au moment où le texte est encore
 * sous la main. Ils ne sont cherchés que sur les deux sujets qui les portent :
 * un déclenchement annoncé sous une page de réglages serait un contresens, et
 * les chercher partout multiplierait les occasions de se tromper sans rien
 * apporter.
 */
export function lireCapture(texte: string | null | undefined): LectureDeCapture | null {
  const lecture = lirePageDeRegles(texte);
  if (!lecture) return null;
  if (lecture.sujet !== 'toursGratuits' && lecture.sujet !== 'achatDeBonus') return lecture;

  const t = (texte ?? '').replace(/\s+/g, ' ');
  const scatters = scattersDeDeclenchement(t);
  const tours = toursGratuitsAnnonces(t);
  return {
    ...lecture,
    ...(scatters != null ? { scatters } : {}),
    ...(tours != null ? { tours } : {}),
  };
}

/**
 * Ce qu'une valeur venue de la colonne JSON vaut vraiment.
 *
 * Le champ est écrit par un script et relu par le site ; entre les deux, rien
 * ne garantit sa forme. Les 10 384 captures d'avant ce chantier ne l'ont pas du
 * tout, et un sujet retiré de la liste fermée laisserait en base des lignes qui
 * le nomment encore. Une forme inattendue vaut « pas de lecture », donc légende
 * générique — le repli honnête déjà en place, plutôt qu'une fiche en 500.
 */
export function lectureStockee(valeur: unknown): LectureDeCapture | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null;
  const v = valeur as Record<string, unknown>;
  if (typeof v.sujet !== 'string' || !SUJETS_PAR_INTERET.includes(v.sujet as SujetDePage)) return null;

  const codes = (x: unknown) =>
    Array.isArray(x) ? x.filter((c): c is string => typeof c === 'string') : [];
  const nombre = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  return {
    sujet: v.sujet as SujetDePage,
    enonces: codes(v.enonces),
    tous: codes(v.tous),
    poids: nombre(v.poids) ?? 0,
    scatters: nombre(v.scatters),
    tours: nombre(v.tours),
  };
}

/** Au plus trois énoncés : au-delà, la légende cesse d'être une légende. */
const ENONCES_PAR_LEGENDE = 3;

/**
 * Le plafond de la légende entière, chiffres compris.
 *
 * Une page de Pragmatic réunit le schéma des lignes, quatre règles de
 * formation des gains, la plage de RTP et le RTP de l'achat : la légende
 * sortait à sept phrases, soit plus de texte que la vignette qu'elle
 * commente. Ce qu'on coupe, ce sont les énoncés — jamais les chiffres, qui
 * sont ce que la fiche a de plus rare.
 */
const PHRASES_PAR_LEGENDE = 5;

/**
 * La légende d'une page de règles, construite de ce qu'elle dit.
 *
 * L'ordre est celui de la lecture : de quoi parle la page, puis ce qu'elle en
 * dit, puis les chiffres que la fiche a déjà validés si c'est cette page qui
 * les porte.
 */
export function legendeDeLecture(
  lecture: LectureDeCapture | null | undefined,
  faits: FaitsDeCapture,
  langue: Langue,
): string | null {
  if (!lecture) return null;

  const morceaux: string[] = [];
  const ouverture = OUVERTURES[lecture.sujet]?.[langue];
  if (ouverture) morceaux.push(ouverture);

  const dits: string[] = [];
  for (const code of lecture.enonces.slice(0, ENONCES_PAR_LEGENDE)) {
    const dit = ENONCES.find((e) => e.code === code)?.dit?.[langue];
    if (dit) dits.push(dit);
  }

  if (lecture.sujet === 'toursGratuits' || lecture.sujet === 'achatDeBonus') {
    const { scatters, tours } = lecture;
    if (scatters != null) {
      morceaux.push(
        langue === 'en'
          ? `The panel states that ${scatters} scatters landing together open the feature.`
          : langue === 'fr'
            ? `Le panneau indique que ${scatters} Scatters simultanés ouvrent la fonction.`
            : `Das Regelwerk nennt ${scatters} gleichzeitige Scatter als Auslöser der Funktion.`,
      );
    }
    if (tours != null) {
      morceaux.push(
        langue === 'en'
          ? `It awards ${tours} free spins.`
          : langue === 'fr'
            ? `Elle est dotée de ${tours} tours gratuits.`
            : `Sie ist mit ${tours} Freispielen ausgestattet.`,
      );
    }
  }

  /*
   * Les chiffres se disent même quand ils ne font pas le sujet de la page.
   *
   * Chez Pragmatic, le RTP, la plage de paliers et le RTP de l'achat tiennent
   * sur la même page que le schéma des lignes et la règle de formation des
   * gains : le sujet dominant y est « comment un gain se forme », et le RTP —
   * la donnée la plus rare du site, celle sur laquelle repose la promesse —
   * disparaissait de la légende.
   *
   * Ces chiffres ne sont jamais relus ici : ce sont ceux que la fiche porte
   * déjà, bornés et vérifiés à la campagne. L'OCR dit seulement quelle page
   * les affiche.
   */
  const chiffres: string[] = [];
  if (lecture.sujet !== 'chiffresDuJeu') {
    // Un seul des deux : « le RTP de l'achat n'est pas celui du jeu » passe
    // avant la plage de paliers, parce que c'est le contresens que le secteur
    // commet le plus souvent.
    const code = ['rtp-achat-distinct', 'plage-de-rtp'].find(
      (x) => !lecture.enonces.includes(x) && lecture.tous.includes(x),
    );
    const dit = code ? ENONCES.find((e) => e.code === code)?.dit?.[langue] : null;
    if (dit) chiffres.push(dit);
  }
  if (lecture.tous.includes('rtp-annonce') || lecture.tous.includes('gain-max-annonce')) {
    const phrase = phraseDesFaits(faits, langue);
    if (phrase) chiffres.push(phrase);
  }

  const place = Math.max(0, PHRASES_PAR_LEGENDE - morceaux.length - chiffres.length);
  morceaux.push(...dits.slice(0, place), ...chiffres);

  // Une ouverture seule ne vaut pas mieux que la légende générique : elle dit
  // de quoi la page parle sans rien en restituer. On la garde quand même si
  // elle nomme un sujet précis, mais jamais si elle est tout ce qu'on a et que
  // le sujet est vague.
  if (morceaux.length === 0) return null;
  if (morceaux.length === 1 && ouverture && !OUVERTURES_SUFFISANTES.has(lecture.sujet)) return null;

  return morceaux.join(' ');
}

/**
 * La même légende, mais à partir du texte brut — le chemin de l'écriture.
 *
 * Le site ne passe jamais par ici : il lit la reconnaissance déjà rangée dans
 * la capture. Cette porte sert aux scripts, qui ont le texte OCR sous la main,
 * et aux tests, qui vérifient la chaîne entière d'un bout à l'autre — c'est ce
 * qui garantit que ce que le script écrit et ce que le site affiche sont bien
 * la même phrase.
 */
export function legendeDuTexte(
  texte: string | null | undefined,
  faits: FaitsDeCapture,
  langue: Langue,
): string | null {
  return legendeDeLecture(lireCapture(texte), faits, langue);
}

/**
 * Les sujets dont le seul énoncé du sujet apprend déjà quelque chose.
 *
 * « La page où le jeu explique sa mécanique Hold & Win » est une information :
 * le lecteur francophone ne pouvait pas la tirer de l'image. « Les mentions de
 * fin du panneau de règles » toute seule n'en est pas une.
 */
const OUVERTURES_SUFFISANTES = new Set<SujetDePage>([
  'holdAndWin',
  'cascades',
  'lignesDePaiement',
  'symbolesSpeciaux',
  'multiplicateurs',
]);

/**
 * Une capture telle que les deux bouts de la chaîne la voient.
 *
 * `lecture` est ce que la base porte — la reconnaissance faite à la capture.
 * `texte` est l'OCR brut, que seuls les scripts ont : il n'est jamais publié.
 */
export interface CaptureALegender {
  titre: string;
  legende?: string | null;
  texte?: string | null;
  lecture?: unknown;
}

/**
 * La reconnaissance d'une capture, d'où qu'elle vienne.
 *
 * Le champ rangé en base gagne sur l'OCR : quand les deux sont là, c'est un
 * script qui compare ce qu'il vient de lire à ce qui est déjà écrit, et le site
 * doit afficher la seconde — sinon la simulation ne montrerait pas ce que le
 * visiteur verra.
 */
function lectureDe(capture: CaptureALegender): LectureDeCapture | null {
  return capture.lecture != null ? lectureStockee(capture.lecture) : lireCapture(capture.texte);
}

export function legendeDeCapture(
  capture: CaptureALegender,
  faits: FaitsDeCapture & { slug: string },
  langue: Langue,
): string {
  const ecrite = LEGENDES_ECRITES[faits.slug]?.[capture.titre]?.[langue];
  if (ecrite) return ecrite;

  const stockee = (capture.legende ?? '').trim();
  // Une légende écrite ailleurs qu'ici est gardée : elle vaut mieux qu'un
  // modèle. Celles que le pipeline pose, en revanche, se régénèrent.
  if (stockee && !DU_PIPELINE.some((r) => r.test(stockee))) return stockee;

  const type = typeDeCapture(capture.titre);

  /*
   * Ce que la page dit passe avant ce que son type suggère — mais seulement
   * quand le type ne dit rien.
   *
   * Le titre de sept pages de règles sur dix est « Game rules, page N » : ces
   * pages recevaient toutes la même phrase, et elles portent 82 % des doublons
   * du site. Le texte lu dans la page les distingue — et, pour un visiteur
   * français ou allemand qui regarde une capture en anglais, c'est le seul
   * accès à ce qu'elle explique.
   *
   * Quand le panneau a nommé sa page lui-même — « Expanding wilds », « Free
   * spins » — ce nom vaut mieux qu'une déduction : il vient du studio. Et il
   * évite une contradiction affichée, du genre d'une page « Expanding wilds »
   * légendée comme une page d'achat parce que le bouton « BUY FREE SPINS » est
   * peint en permanence dans l'habillage Pragmatic.
   *
   * `legendeDuTexte` rend `null` dès qu'elle n'est pas sûre, et le modèle
   * générique reprend la main : un repli, pas un échec.
   */
  if (type === 'regles') {
    const lue = legendeDeLecture(lectureDe(capture), faits, langue);
    if (lue) return lue;
  }

  if (type === 'chiffres') {
    return phraseDesFaits(faits, langue) ?? MODELES[langue].regles(faits.nom);
  }

  /*
   * Le titre du studio ouvre, ce que la page dit complète.
   *
   * Le nom donné par le panneau reste ce qui décide du sujet — c'est la
   * précaution du paragraphe précédent, et elle ne bouge pas. Mais il ne
   * suffit pas : « Special wilds » et « Expanding wilds » sont deux pages
   * différentes qui recevaient la **même** phrase, « La mécanique expliquée
   * par le jeu lui-même », parce que le modèle du type ignore le titre autant
   * que le contenu. 488 captures de mécanique et 213 d'achat étaient dans ce
   * cas, à un cinquième de doublons.
   *
   * Deux énoncés au plus : le modèle a déjà dit de quoi il s'agit, le
   * complément n'est là que pour dire quoi.
   */
  const modele = MODELES[langue][type](faits.nom);
  const complement = ditsDeLecture(lectureDe(capture), langue, 2);
  return complement ? `${modele} ${complement}` : modele;
}

/**
 * Ce que la page dit, sans l'ouverture qui annonce son sujet.
 *
 * Sert aux captures que le studio a nommées : leur titre tient déjà lieu
 * d'ouverture, et la répéter ferait « La mécanique expliquée par le jeu
 * lui-même. La page où le jeu explique sa mécanique Hold & Win. »
 */
function ditsDeLecture(
  lecture: LectureDeCapture | null,
  langue: Langue,
  combien: number,
): string | null {
  if (!lecture) return null;
  const dits = lecture.enonces
    .slice(0, combien)
    .map((code) => ENONCES.find((e) => e.code === code)?.dit?.[langue])
    .filter((d): d is string => Boolean(d));
  return dits.length ? dits.join(' ') : null;
}

/**
 * Les légendes d'une fiche entière, dédoublonnées.
 *
 * ── Pourquoi ce passage collectif est nécessaire ──────────────────────────
 *
 * `legendeDeCapture` ne voit qu'une capture : elle ne peut pas savoir que la
 * page précédente disait déjà la même chose. Or une table de gains tient
 * couramment sur deux ou trois pages — Bell Wizard en a deux — et chacune
 * recevrait à bon droit la phrase « La table de gains, symbole par symbole ».
 * C'est vrai, et c'est quand même un doublon dans la page.
 *
 * La suite est signalée plutôt que réécrite : elle **est** la suite, le dire
 * est exact et ça rend la série lisible.
 */
const SUITE: Record<Langue, string> = {
  en: 'Continued from the previous page.',
  fr: 'Suite de la page précédente.',
  de: 'Fortsetzung der vorherigen Seite.',
};

export function legendesDeCaptures(
  captures: CaptureALegender[],
  faits: FaitsDeCapture & { slug: string },
  langue: Langue,
): string[] {
  const vues = new Set<string>();
  return captures.map((capture) => {
    const legende = legendeDeCapture(capture, faits, langue);
    /*
     * Seules les légendes tirées de la page se voient marquées « suite ». Les
     * modèles génériques se répètent aussi, mais deux pages qu'on n'a pas su
     * lire ne sont pas la suite l'une de l'autre : l'écrire serait faux.
     *
     * On compare la phrase rendue à celle que la lecture produit, plutôt que de
     * se contenter de constater qu'une lecture existe : une légende écrite à la
     * main — celles de Gates of Olympus — ou reprise de la base n'est la suite
     * de rien, même sur une page qu'on sait lire.
     */
    const lue =
      typeDeCapture(capture.titre) === 'regles' &&
      legendeDeLecture(lectureDe(capture), faits, langue) === legende;
    if (lue && vues.has(legende)) return `${legende} ${SUITE[langue]}`;
    vues.add(legende);
    return legende;
  });
}
