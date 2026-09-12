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

export function legendeDeCapture(
  capture: { titre: string; legende?: string | null },
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
  if (type === 'chiffres') {
    return phraseDesFaits(faits, langue) ?? MODELES[langue].regles(faits.nom);
  }
  return MODELES[langue][type](faits.nom);
}
