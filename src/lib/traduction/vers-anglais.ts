/**
 * Passe en anglais les faits factuels repris de BetsRank.
 *
 * ── Deux pièges, payés trois fois chacun ──────────────────────────────────
 *
 * 1. **`\b` ne marque pas de frontière après une lettre accentuée.** En regex
 *    JavaScript sans le drapeau `u`, « é » n'est pas un caractère de mot : un
 *    motif comme `/difficult[ée]\b/` ne correspond donc *jamais* au singulier.
 *    Le motif paraît juste, ne lève aucune erreur, et ne remplace rien. Ça a
 *    coûté « jusqu'à », « difficulté » et « extensible à ». D'où `FIN`,
 *    utilisé partout où un motif peut se terminer sur un accent.
 *
 * 2. **Une traduction partielle est pire que pas de traduction.** Les données
 *    d'origine sont déjà bilingues (« Multiplicateurs x500 » côtoie
 *    « Multipliers x500 »), donc traduire mot à mot produit facilement
 *    « Multipliers cumulés » ou « expanding à 5x5 » : une phrase qui a l'air
 *    relue et ne l'est pas. Le détecteur de résidu est donc volontairement
 *    brutal — **tout accent** disqualifie, plus une liste de mots-outils — et
 *    la fonction renvoie `null` au moindre doute. Un refus laisse la chaîne
 *    intacte et remonte au rapport ; un entre-deux part en production.
 *
 * Et les nombres ne bougent jamais : vérifiés avant écriture.
 */

/**
 * La fin d'un motif, à utiliser à la place de `\b` final.
 *
 * Voir le piège n° 1 : `\b` est inutilisable dès que le motif peut se terminer
 * par une lettre accentuée.
 */
const FIN = '(?=\\s|$|[),.;:%])';

/** Construit un motif insensible à la casse, terminé proprement. */
function m(corps: string): RegExp {
  return new RegExp(corps + FIN, 'gi');
}

/**
 * Le vocabulaire, du plus spécifique au plus général.
 *
 * L'ordre est le fond du sujet : « extensible à » doit être consommé avant
 * « extensible », sinon il reste un « à » orphelin greffé sur un mot déjà
 * traduit — c'est exactement comme « expanding à 5x5 » est né.
 */
const TERMES: Array<[RegExp, string]> = [
  // ── Achat de bonus, et ses négations ──────────────────────────────────
  [m('\\b(?:aucun|pas d[e’\']?)\\s*achat\\s*(?:de\\s*)?bonus'), 'No bonus buy'],
  [m('\\bachat\\s*(?:de\\s*)?bonus\\s+disponible'), 'Bonus buy available'],
  [m('\\bachat\\s*(?:de\\s*)?bonus\\s+[àa]\\s+(\\d+)x\\s+la\\s+mise'), 'Bonus buy at $1x bet'],
  [m('\\bachat\\s*(?:de\\s*)?bonus'), 'Bonus buy'],
  [m('\\bbonus\\s+achetable'), 'Bonus buy'],

  // ── Tours gratuits ────────────────────────────────────────────────────
  [m('\\b(?:aucun\\s+tour\\s+gratuit|pas\\s+de\\s+tours?\\s+gratuits?)'), 'No free spins'],
  [m('\\b(?:pas\\s+de|sans)\\s+free\\s*spins?'), 'No free spins'],
  [m('\\bsans\\s+tours?\\s+gratuits?'), 'No free spins'],
  [m('\\btours?\\s+gratuits?'), 'Free spins'],
  [m('\\bfree\\s*spins?\\s+relan[çc]ables?'), 'Retriggerable free spins'],

  // ── Wilds, avant la règle générale sur « extensible » ─────────────────
  [m('\\bwilds?\\s+extensibles?'), 'Expanding wilds'],
  [m('\\bwilds?\\s+collants?'), 'Sticky wilds'],
  [m('\\bwilds?\\s+empil[ée]s?'), 'Stacked wilds'],
  [m('\\bwilds?\\s+de\\s+substitution'), 'Substituting wilds'],
  [m('\\bwilds?\\s+multiplicateurs?'), 'Multiplier wilds'],
  [m('\\bwilds?\\s+verrouill[ée]s?'), 'Locked wilds'],

  // ── Clusters, avant la règle générale sur « symboles » ────────────────
  [m('\\bclusters?\\s+de\\s+(\\d+)\\s+symboles?\\s+ou\\s+plus'), 'Clusters of $1 or more symbols'],
  [m('\\bclusters?\\s+de\\s+(\\d+)\\s+symboles?\\s+adjacents?\\s+minimum'), 'Clusters of at least $1 adjacent symbols'],
  [m('\\bclusters?\\s+de'), 'Clusters of'],

  // ── Symboles ──────────────────────────────────────────────────────────
  [m('\\bsymboles?\\s+empil[ée]s?'), 'Stacked symbols'],
  [m('\\bsymboles?\\s+extensibles?'), 'Expanding symbols'],
  [m('\\bsymboles?\\s+myst[èe]res?'), 'Mystery symbols'],
  [m('\\bsymboles?\\s+collants?'), 'Sticky symbols'],
  [m('\\bsymboles?\\s+identiques?'), 'identical symbols'],
  [m('\\bsymboles?\\s+suppl[ée]mentaires?'), 'additional symbols'],
  [m('\\bsymboles?'), 'symbols'],

  // ── Multiplicateurs ───────────────────────────────────────────────────
  [m('\\bmultiplicateurs?\\s+cumul(?:atifs?|[ée]s?|ables?)'), 'Cumulative multipliers'],
  // Et la même chose une fois la moitié déjà traduite, pour les lignes
  // que le premier passage a laissées en « Multipliers cumulés ».
  [m('\\bmultipliers\\s+cumul(?:atifs?|[ée]s?|ables?|ative)'), 'Cumulative multipliers'],
  [m('\\bmultiplicateurs?\\s+al[ée]atoires?'), 'Random multipliers'],
  [m('\\bmultiplicateurs?\\s+progressifs?'), 'Progressive multipliers'],
  [m('\\bmultiplicateurs?'), 'Multipliers'],
  [m('\\bapparition\\s+al[ée]atoire'), 'random trigger'],
  [m('\\bal[ée]atoires?'), 'random'],

  // ── Cascades et relances ──────────────────────────────────────────────
  [m('\\bcascades?\\s+illimit[ée]es?'), 'Unlimited cascades'],
  [m('\\bcascades?\\s+sur\\s+(?:chaque\\s+)?gains?'), 'Cascades on every win'],
  [m('\\br[ée]actions?'), 'Reactions'],
  [m('\\brelances?\\s+illimit[ée]es?'), 'Unlimited respins'],
  [m('\\brelances?'), 'Respins'],

  // ── La grille ─────────────────────────────────────────────────────────
  [m('\\bgrille\\s+[ée]tendue'), 'Expanded grid'],
  [m('\\bgrille\\s+dynamique'), 'Dynamic grid'],
  [m('\\bgrille'), 'Grid'],
  [m('\\bpar\\s+rouleau'), 'per reel'],
  [m('\\bpar\\s+ligne'), 'per payline'],
  [m('\\brouleaux'), 'reels'],
  [m('\\brouleau'), 'reel'],
  [m('\\brang[ée]es?'), 'rows'],
  [m('\\bbandeau\\s+sup[ée]rieur'), 'top row'],
  [m('\\baffichant'), 'showing'],
  [m('\\bau-dessus\\s+des'), 'above'],
  [m('\\bsous\\s+les'), 'under'],
  [m('\\bwagon\\s+de'), 'wagon of'],

  // ── Les lignes ────────────────────────────────────────────────────────
  [m('\\bpas\\s+de\\s+paylines'), 'no paylines'],
  [m('\\blignes?\\s+de\\s+paiement\\s+fixes?'), 'fixed paylines'],
  [m('\\blignes?\\s+de\\s+paiement'), 'paylines'],
  [m('\\blignes?\\s+fixes?'), 'fixed paylines'],
  [m('\\blignes?\\s+actives?'), 'active paylines'],
  [m('\\blignes?'), 'paylines'],
  [m('\\bfa[çc]ons?\\s+de\\s+gagner'), 'ways to win'],
  [m('\\bfa[çc]ons?'), 'ways'],

  // ── Les formes relevées sur les données réelles ───────────────────────
  //
  // Elles ne sortent pas d'un dictionnaire : ce sont les refus et les
  // demi-traductions constatés sur les 1 951 fiches, repris un par un. C'est
  // la seule façon honnête d'élargir un vocabulaire — sur ce qui bloque
  // réellement, pas sur ce qu'on imagine rencontrer.
  [m('\\bpaliers?\\s+de\\s+RTP'), 'RTP tiers'],
  [m('\\bRTP\\s+variable\\s+selon\\s+le\\s+casino'), 'RTP varies by operator'],
  [m('\\bselon\\s+(?:l[e’\']\\s*)?op[ée]rateur'), 'operator-dependent'],
  [m('\\bselon\\s+le\\s+casino'), 'operator-dependent'],
  [m('\\bselon\\s+(?:la\\s+)?position'), 'by position'],
  [m('\\b(\\d+)\\s+niveaux?\\s+de\\s+difficult[ée]'), '$1 difficulty tiers'],
  [m('\\b(\\d+)\\s+niveaux?\\s+de\\s+risque'), '$1 risk tiers'],
  [m('\\bjackpots?\\s+progressifs?'), 'Progressive jackpot'],
  [m('\\bjackpots?\\s+fixes?'), 'fixed jackpots'],
  [m('\\bau\\s+choix'), '(player choice)'],
  [m('\\bchoix\\s+du\\s+nombre\\s+de'), 'choice of'],
  [m('\\bextensible\\s+[àa]'), 'expanding to'],
  [m('\\bextensibles?'), 'expanding'],
  [m('\\bapr[èe]s\\s+chaque\\s+gain'), 'after every win'],
  [m('\\bjeu\\s+de\\s+(?:double|risque)'), 'gamble'],
  [m('\\bcumulatifs?'), 'cumulative'],
  [m('\\bcumul[ée]s?'), 'cumulative'],
  [m('\\bcumulables?'), 'cumulative'],
  [m('\\br[ée]glables?\\s+par\\s+le\\s+joueur'), 'player-adjustable'],
  [m('\\br[ée]glables?'), 'adjustable'],
  [m('\\bsuppl[ée]mentaires?'), 'additional'],
  [m('\\bidentiques?'), 'identical'],
  [m('\\bcroissants?'), 'increasing'],
  [m('\\bd[ée]croissants?'), 'decreasing'],
  [m('\\bprogressifs?'), 'progressive'],
  [m('\\br[ée]initialis[ée]e?s?'), 'reset'],
  [m('\\bremis?\\s+[àa]\\s+z[ée]ro'), 'reset'],
  [m('\\bn[’\']importe\\s+o[ùu]'), 'anywhere'],
  [m('\\bnon\\s+communiqu[ée]'), 'Not published'],
  [m('\\billimit[ée]e?s?'), 'unlimited'],
  [m('\\badjacents?'), 'adjacent'],
  [m('\\bdifficult[ée]'), 'difficulty'],
  [m('\\bmise'), 'bet'],
  [m('\\bniveaux?'), 'tiers'],
  [m('\\binterdit\\s+UK'), 'not available in the UK'],
  [m('\\ben\\s+base'), 'in the base game'],
  [m('\\bavec'), 'with'],
  [m('\\bvariables?'), 'variable'],
  [m('\\bpositions?'), 'positions'],
  [/^Aucune?\b/i, 'None'],

  // ── Réparation des demi-traductions ───────────────────────────────────
  //
  // Ces règles ne servent pas à traduire du français : elles rattrapent des
  // chaînes déjà passées une fois, où un mot français est resté greffé sur
  // un mot anglais. Elles existent parce que le premier passage en a produit
  // 464 avant que le détecteur ne soit durci — la trace de l'erreur reste
  // ici, dans le code qui la répare.
  [m('\\bexpanding\\s+[àa]'), 'expanding to'],
  [m('\\breels\\s+[àa]\\s+cascades'), 'cascading reels'],
  [m('\\bfree\\s*spins?\\s+[àa]\\s+multipliers'), 'free spins with multipliers'],
  [/\s[àa]\s+(\d+)\s+tiers\b/gi, ' across $1 tiers'],
  [m('\\ben\\s+free\\s*spins?'), 'in free spins'],
  [m('\\ben\\s+FS'), 'in FS'],
  [m('\\ben\\s+jeu'), 'in play'],

  // ── Liaisons et quantificateurs, en dernier ───────────────────────────
  [m('\\bjusqu[’\']?\\s*[àa]'), 'Up to'],
  [/\bsur\s+(\d+)\s+tiers\b/gi, 'across $1 tiers'],
  [/\bde\s+(\d[\d\s  ]*)\s+[àa]\s+(\d)/gi, '$1 to $2'],
  [/(\d)\s+[àa]\s+(x?\d)/gi, '$1 to $2'],
  [/\b(x\d+)\s+[àa]\s+(x\d+)/gi, '$1 to $2'],
];

/**
 * Ce qui trahit qu'il reste du français.
 *
 * **Tout accent disqualifie.** C'est brutal et c'est voulu : dans ce domaine,
 * un « é » ou un « à » ne survit à aucune traduction réussie, et cette seule
 * règle attrape « cumulés », « réglables », « supplémentaires »,
 * « réinitialisé » — toute la famille de mots qu'une liste manuelle aurait
 * oubliés un par un.
 *
 * Le reste couvre les mots-outils, qui n'ont pas d'accent et qui sont la
 * seconde signature d'une phrase à moitié faite.
 */
const ACCENT = /[éèêëàâäçùûüôöîïÉÈÊÀÂÇÔÎ]/;

const MOTS_OUTILS = new RegExp(
  [
    'rouleaux?', 'lignes?', 'gratuits?', 'achat', 'jusqu', 'grille',
    'de', 'du', 'des', 'la', 'les', 'un', 'une', 'aux?', 'dans', 'avec',
    'sous', 'pour', 'entre', 'selon', 'sans', 'chaque', 'toutes?', 'tous',
    'leurs?', 'aucune?', 'dessus', 'permet', 'donne', 'gros', 'petit',
    'nombre', 'manche', 'vue', 'fin', 'cycle', 'choix', 'depuis', 'par',
  ].map((x) => '\\b' + x + '\\b').join('|'),
  'i',
);

function resteFrancais(t: string): boolean {
  return ACCENT.test(t) || MOTS_OUTILS.test(t);
}

/** Les nombres d'un texte, séparateurs de milliers retirés. */
export function nombresDe(texte: string): string {
  return (texte.replace(/[\s ,](?=\d{3}\b)/g, '').match(/\d+(?:[.,]\d+)?/g) ?? [])
    .map((n) => n.replace(',', '.'))
    .join('|');
}

/**
 * Traduit une chaîne, ou renvoie `null` si la traduction resterait partielle
 * ou si un nombre a bougé.
 */
export function versAnglais(source: string): string | null {
  let t = source;
  for (const [motif, remplacement] of TERMES) t = t.replace(motif, remplacement);

  // Le séparateur de milliers passe de l'espace fine à la virgule, et la
  // virgule décimale au point : « 96,41 % » se lit « 9641 » en anglais.
  t = t.replace(/(\d)[\s ](?=\d{3}\b)/g, '$1,');
  t = t.replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2');

  t = t.replace(/\s{2,}/g, ' ').replace(/\s+([,.)])/g, '$1').trim();

  if (resteFrancais(t)) return null;
  if (nombresDe(t) !== nombresDe(source)) return null;
  if (t === source) return null; // Rien à faire : la chaîne était déjà anglaise.

  /*
   * Les remplacements portent leur majuscule parce qu'ils sont écrits comme
   * s'ils ouvraient la chaîne. En milieu de phrase, « (Up to 6 symbols) » se
   * lit comme une faute de frappe.
   */
  t = t.replace(
    /(?!^)\b(Up to|Free spins|Bonus buy|No bonus buy|No free spins|Multipliers|Respins|Reactions|Clusters of|Grid|None|Not published)\b/g,
    (x) => x[0].toLowerCase() + x.slice(1),
  );

  if (/^[a-z]/.test(source) && /^[A-Z]/.test(t)) t = t[0].toLowerCase() + t.slice(1);
  return t;
}

/** Y a-t-il du français là-dedans ? Sert à mesurer, pas à décider. */
export function sembleFrancais(texte: string): boolean {
  return resteFrancais(texte);
}
