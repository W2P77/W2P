import type { Langue } from '@/i18n/langues';

/**
 * Traduire ce qui vient de la base : mécaniques de jeu et offres de bienvenue.
 *
 * ── Pourquoi par règles, et pas en base ───────────────────────────────────
 *
 * 5 805 mécaniques distinctes et 44 offres, dans trois langues : les stocker
 * traduites, ce sont 17 000 lignes à maintenir, et une offre qui change chez
 * le partenaire laisse deux traductions périmées derrière elle. On les
 * dérive donc au rendu, comme les légendes de captures.
 *
 * ── Ce qu'on traduit, et ce qu'on laisse ──────────────────────────────────
 *
 * Seulement les termes **génériques**. Megaways, Cluster Pays, Hold & Spin,
 * Pay Anywhere, Powernudge sont les noms que les studios donnent à leurs
 * fonctionnalités : les traduire inventerait un nom qui n'existe nulle part,
 * et un joueur qui cherche « Megaways » ne trouverait plus rien.
 *
 * **Aucun chiffre n'est touché.** Les montants, les pourcentages, le nombre
 * de tours et les devises traversent la traduction tels quels — c'est la
 * seule règle qui compte ici, et les tests la vérifient.
 */

type Paire = { fr: string; de: string };

/** Les mécaniques génériques, en entier. La clé est en minuscules. */
const MECANIQUES: Record<string, Paire> = {
  'free spins': { fr: 'Tours gratuits', de: 'Freispiele' },
  'no free spins': { fr: 'Pas de tours gratuits', de: 'Keine Freispiele' },
  'bonus buy': { fr: 'Achat de bonus', de: 'Bonuskauf' },
  'buy bonus': { fr: 'Achat de bonus', de: 'Bonuskauf' },
  'buy feature': { fr: 'Achat de fonctionnalité', de: 'Funktionskauf' },
  'bonus buy available': { fr: 'Achat de bonus disponible', de: 'Bonuskauf verfügbar' },
  'bonus buy disponible': { fr: 'Achat de bonus disponible', de: 'Bonuskauf verfügbar' },
  'no bonus buy': { fr: 'Pas d’achat de bonus', de: 'Kein Bonuskauf' },
  'buy free spins': { fr: 'Achat de tours gratuits', de: 'Freispielkauf' },
  multipliers: { fr: 'Multiplicateurs', de: 'Multiplikatoren' },
  multiplier: { fr: 'Multiplicateur', de: 'Multiplikator' },
  'free spins multipliers': { fr: 'Multiplicateurs en tours gratuits', de: 'Multiplikatoren in Freispielen' },
  'multipliers fs': { fr: 'Multiplicateurs en tours gratuits', de: 'Multiplikatoren in Freispielen' },
  wilds: { fr: 'Wilds', de: 'Wilds' },
  'stacked wilds': { fr: 'Wilds empilés', de: 'Gestapelte Wilds' },
  'sticky wilds': { fr: 'Wilds collants', de: 'Klebende Wilds' },
  'expanding wilds': { fr: 'Wilds extensibles', de: 'Expandierende Wilds' },
  'walking wilds': { fr: 'Wilds mobiles', de: 'Wandernde Wilds' },
  'stacked symbols': { fr: 'Symboles empilés', de: 'Gestapelte Symbole' },
  'money symbols': { fr: 'Symboles monétaires', de: 'Geldsymbole' },
  'money symbols collect': { fr: 'Collecte de symboles monétaires', de: 'Sammeln von Geldsymbolen' },
  'cascading wins': { fr: 'Gains en cascade', de: 'Kaskadengewinne' },
  'cascading reels': { fr: 'Rouleaux en cascade', de: 'Kaskadierende Walzen' },
  cascades: { fr: 'Cascades', de: 'Kaskaden' },
  'tumble cascading': { fr: 'Cascades Tumble', de: 'Tumble-Kaskaden' },
  'free spins retrigger': { fr: 'Tours gratuits relançables', de: 'Freispiele erneut auslösbar' },
  'fixed jackpots': { fr: 'Jackpots fixes', de: 'Feste Jackpots' },
  'progressive jackpot': { fr: 'Jackpot progressif', de: 'Progressiver Jackpot' },
  'bonus game': { fr: 'Jeu bonus', de: 'Bonusspiel' },
  'bonus round': { fr: 'Tour bonus', de: 'Bonusrunde' },
  'respin feature': { fr: 'Fonction de relance', de: 'Respin-Funktion' },
  respins: { fr: 'Relances', de: 'Respins' },
  scatters: { fr: 'Scatters', de: 'Scatters' },
  'scatter pays': { fr: 'Gains Scatter', de: 'Scatter-Gewinne' },
  'gamble feature': { fr: 'Option quitte ou double', de: 'Gamble-Funktion' },
  'both ways': { fr: 'Gains dans les deux sens', de: 'Gewinne in beide Richtungen' },
};

/** Les thèmes : un mot devant « theme ». */
const THEMES: Record<string, Paire> = {
  asian: { fr: 'asiatique', de: 'asiatisch' },
  egyptian: { fr: 'égyptien', de: 'ägyptisch' },
  christmas: { fr: 'de Noël', de: 'weihnachtlich' },
  irish: { fr: 'irlandais', de: 'irisch' },
  western: { fr: 'western', de: 'Western' },
  mythology: { fr: 'mythologique', de: 'mythologisch' },
  pirate: { fr: 'pirate', de: 'Piraten' },
  fishing: { fr: 'de pêche', de: 'Angel' },
  fruit: { fr: 'fruité', de: 'Früchte' },
  horror: { fr: 'horreur', de: 'Horror' },
  space: { fr: 'spatial', de: 'Weltraum' },
  adventure: { fr: 'aventure', de: 'Abenteuer' },
  animal: { fr: 'animalier', de: 'Tier' },
  sports: { fr: 'sportif', de: 'Sport' },
  fantasy: { fr: 'fantastique', de: 'Fantasy' },
  sea: { fr: 'marin', de: 'Meeres' },
  ocean: { fr: 'océanique', de: 'Ozean' },
  aztec: { fr: 'aztèque', de: 'Azteken' },
  greek: { fr: 'grec', de: 'griechisch' },
  norse: { fr: 'nordique', de: 'nordisch' },
  jungle: { fr: 'jungle', de: 'Dschungel' },
  magic: { fr: 'magique', de: 'Magie' },
  mining: { fr: 'minier', de: 'Bergbau' },
  farm: { fr: 'fermier', de: 'Bauernhof' },
  arabian: { fr: 'arabe', de: 'arabisch' },
  mystic: { fr: 'mystique', de: 'mystisch' },
  halloween: { fr: 'Halloween', de: 'Halloween' },
  medieval: { fr: 'médiéval', de: 'mittelalterlich' },
  dragon: { fr: 'dragon', de: 'Drachen' },
  viking: { fr: 'viking', de: 'Wikinger' },
  japanese: { fr: 'japonais', de: 'japanisch' },
  chinese: { fr: 'chinois', de: 'chinesisch' },
  mexican: { fr: 'mexicain', de: 'mexikanisch' },
  candy: { fr: 'sucré', de: 'Süßigkeiten' },
  safari: { fr: 'safari', de: 'Safari' },
  circus: { fr: 'de cirque', de: 'Zirkus' },
  gold: { fr: 'doré', de: 'Gold' },
  treasure: { fr: 'de trésor', de: 'Schatz' },
  steampunk: { fr: 'steampunk', de: 'Steampunk' },
  party: { fr: 'festif', de: 'Party' },
  music: { fr: 'musical', de: 'Musik' },
  movie: { fr: 'de cinéma', de: 'Film' },
  luxury: { fr: 'de luxe', de: 'Luxus' },
  crime: { fr: 'policier', de: 'Krimi' },
  jewel: { fr: 'de pierres précieuses', de: 'Juwelen' },
  food: { fr: 'culinaire', de: 'Essens' },
  sweet: { fr: 'sucré', de: 'Süßigkeiten' },
  war: { fr: 'guerrier', de: 'Kriegs' },
  ice: { fr: 'glacé', de: 'Eis' },
  desert: { fr: 'désertique', de: 'Wüsten' },
  forest: { fr: 'forestier', de: 'Wald' },
  city: { fr: 'urbain', de: 'Stadt' },
  retro: { fr: 'rétro', de: 'Retro' },
};

/**
 * Une mécanique dans la langue du visiteur, l'originale en repli.
 *
 * Le repli n'est pas un échec : c'est ce qui protège les noms propres.
 */
export function mecaniqueTraduite(brut: string, langue: Langue): string {
  const m = (brut ?? '').trim();
  if (langue === 'en' || !m) return m;

  const exact = MECANIQUES[m.toLowerCase()];
  if (exact) return exact[langue];

  // « Bonus buy 100x », « Free Spins 10 spins » : le terme se traduit, le
  // chiffre ne bouge pas.
  const achat = m.match(/^(?:bonus buy|buy bonus)\s+(\d+(?:[.,]\d+)?x)$/i);
  if (achat) {
    return langue === 'fr' ? `Achat de bonus ${achat[1]}` : `Bonuskauf ${achat[1]}`;
  }
  const mult = m.match(/^multipliers?\s+(x[\d.,]+(?:-x[\d.,]+)?)$/i);
  if (mult) {
    return langue === 'fr' ? `Multiplicateurs ${mult[1]}` : `Multiplikatoren ${mult[1]}`;
  }
  const tours = m.match(/^free spins\s+(\d+)\s+spins$/i);
  if (tours) {
    return langue === 'fr' ? `${tours[1]} tours gratuits` : `${tours[1]} Freispiele`;
  }
  // « Asian theme », mais aussi « Greek mythology theme » : on ne traduit que
  // si CHAQUE mot du thème est connu. Un « Thème Sea » vaudrait moins que
  // l'anglais qu'il remplace.
  const theme = m.match(/^(.+?)\s+theme$/i);
  if (theme) {
    const mots = theme[1].split(/\s+/).map((x) => THEMES[x.toLowerCase()]);
    if (mots.every(Boolean)) {
      const f = (mots as Paire[]).map((x) => x.fr).join(' ');
      const d = (mots as Paire[]).map((x) => x.de).join('-');
      return langue === 'fr' ? `Thème ${f}` : `${d}-Thema`;
    }
  }
  const facons = m.match(/^([\d\s,.]+)\s*ways$/i);
  if (facons) {
    return langue === 'fr' ? `${facons[1].trim()} façons de gagner` : `${facons[1].trim()} Gewinnwege`;
  }
  const format = m.match(/^format\s+(.+?)\s*\/\s*(\d+)\s+paylines$/i);
  if (format) {
    return langue === 'fr'
      ? `Format ${format[1]} / ${format[2]} lignes de paiement`
      : `Format ${format[1]} / ${format[2]} Gewinnlinien`;
  }
  const lignes = m.match(/^(\d+)\s+paylines$/i);
  if (lignes) {
    return langue === 'fr' ? `${lignes[1]} lignes de paiement` : `${lignes[1]} Gewinnlinien`;
  }

  /*
   * Le terme générique se traduit, le reste est gardé tel quel.
   *
   * « Free Spins via scatters » devient « Tours gratuits via scatters » : le
   * mot que tout le monde comprend passe en français, et ce qui suit — souvent
   * un nom de symbole ou une condition chiffrée — n'est pas retouché.
   */
  const PREFIXES: Array<[RegExp, Paire]> = [
    [/^free spins\b/i, { fr: 'Tours gratuits', de: 'Freispiele' }],
    [/^multipliers\b/i, { fr: 'Multiplicateurs', de: 'Multiplikatoren' }],
    [/^multiplier\b/i, { fr: 'Multiplicateur', de: 'Multiplikator' }],
    [/^(?:bonus buy|buy bonus)\b/i, { fr: 'Achat de bonus', de: 'Bonuskauf' }],
    [/^mystery symbols?\b/i, { fr: 'Symboles mystère', de: 'Mystery-Symbole' }],
    [/^expanding symbols?\b/i, { fr: 'Symboles extensibles', de: 'Expandierende Symbole' }],
    [/^cash out at any time$/i, { fr: 'Retrait à tout moment', de: 'Jederzeit auszahlen' }],
  ];
  for (const [motif, par] of PREFIXES) {
    if (motif.test(m)) return m.replace(motif, par[langue]);
  }

  const SUFFIXES: Array<[RegExp, Paire]> = [
    [/\bways to win$/i, { fr: 'façons de gagner', de: 'Gewinnwege' }],
    [/\bfixed jackpots$/i, { fr: 'jackpots fixes', de: 'feste Jackpots' }],
    [/\bpaylines$/i, { fr: 'lignes de paiement', de: 'Gewinnlinien' }],
  ];
  for (const [motif, par] of SUFFIXES) {
    if (motif.test(m)) return m.replace(motif, par[langue]);
  }

  return m;
}

/**
 * L'offre de bienvenue d'un partenaire, dans la langue du visiteur.
 *
 * Les montants, les devises et les pourcentages ne sont pas touchés : seule
 * la formulation change. « FS » devient « tours gratuits » parce que le sigle
 * n'est lisible que pour un joueur déjà rodé.
 */
export function offreTraduite(brut: string | null, langue: Langue): string | null {
  const o = (brut ?? '').trim();
  if (!o) return brut;
  if (langue === 'en') return o;

  let s = o;
  const fr = langue === 'fr';

  // L'ordre compte : les formules longues avant les mots qu'elles contiennent.
  const regles: Array<[RegExp, string]> = fr
    ? [
        [/(\d+)-deposit package up to /gi, 'Pack de $1 dépôts jusqu’à '],
        [/ package across (\d+) deposits/gi, ' réparti sur $1 dépôts'],
        [/ across your first (\d+) deposits/gi, ' sur tes $1 premiers dépôts'],
        [/ across (\d+) deposits/gi, ' sur $1 dépôts'],
        [/ on your 1st deposit/gi, ' sur ton 1er dépôt'],
        [/ up to /gi, ' jusqu’à '],
        [/(\d+)\s*free spins/gi, '$1 tours gratuits'],
        [/(\d+)\s*FS\b/g, '$1 tours gratuits'],
        [/ monthly cashback/gi, ' de cashback mensuel'],
        [/crypto bonus/gi, 'bonus crypto'],
        [/\(slots only\)/gi, '(machines à sous uniquement)'],
        [/(\d+)\/day × (\d+)/gi, '$1/jour × $2'],
      ]
    : [
        [/(\d+)-deposit package up to /gi, 'Paket über $1 Einzahlungen bis zu '],
        [/ package across (\d+) deposits/gi, ' verteilt auf $1 Einzahlungen'],
        [/ across your first (\d+) deposits/gi, ' auf deine ersten $1 Einzahlungen'],
        [/ across (\d+) deposits/gi, ' auf $1 Einzahlungen'],
        [/ on your 1st deposit/gi, ' auf deine 1. Einzahlung'],
        [/ up to /gi, ' bis zu '],
        [/(\d+)\s*free spins/gi, '$1 Freispiele'],
        [/(\d+)\s*FS\b/g, '$1 Freispiele'],
        [/ monthly cashback/gi, ' monatliches Cashback'],
        [/crypto bonus/gi, 'Krypto-Bonus'],
        [/\(slots only\)/gi, '(nur Slots)'],
        [/(\d+)\/day × (\d+)/gi, '$1/Tag × $2'],
      ];

  for (const [motif, par] of regles) s = s.replace(motif, par);
  return s;
}
