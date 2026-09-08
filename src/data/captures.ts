/**
 * Les captures faites dans la démo officielle du studio.
 *
 * ── Pourquoi elles valent plus qu'une jaquette ────────────────────────────
 *
 * Une jaquette est fournie par le studio et se retrouve à l'identique sur
 * trente sites. Une capture de la table de gains, elle, n'existe nulle part
 * ailleurs — et surtout elle **fait autorité** : sur Gates of Olympus, le
 * panneau de règles affiche « The theoretical RTP of the game is 96.50% ».
 * C'est le jeu lui-même qui le dit, ce qui vaut mieux qu'un communiqué.
 *
 * ── Ce que les légendes disent, et ne disent pas ──────────────────────────
 *
 * Elles reprennent les chiffres écrits **en gros** dans le jeu : RTP, mises
 * minimale et maximale, plage de multiplicateurs, coût de l'achat de bonus.
 * Elles ne transcrivent pas les valeurs de symboles ligne à ligne : recopier
 * vingt-sept petits nombres lus dans une image est exactement la manière dont
 * une erreur entre dans une fiche. La capture montre, le texte résume.
 */
export interface Capture {
  fichier: string;
  titre: string;
  legende: string;
}

export interface CapturesDeJeu {
  /** Le jour de la capture : une donnée de jeu peut changer d'une version à l'autre. */
  faitesLe: string;
  source: string;
  captures: Capture[];
}

export const CAPTURES: Record<string, CapturesDeJeu> = {
  'gates-of-olympus': {
    faitesLe: '2026-09-08',
    source: 'demogamesfree.pragmaticplay.net',
    captures: [
      {
        fichier: 'gates-of-olympus-base.webp',
        titre: 'The base game',
        legende:
          'Six reels, five rows, and no paylines: symbols pay anywhere on the screen, and the count of matching symbols sets the win. The free spins purchase sits top left, priced at 100× the current bet.',
      },
      {
        fichier: 'gates-of-olympus-regles-1.webp',
        titre: 'Symbol values',
        legende:
          'The full pay table at a €2.00 bet, from the crown down to the blue gem, in three bands — 8 to 9, 10 to 11, and 12 to 30 matching symbols. The scatter pays on any position and is present on all reels.',
      },
      {
        fichier: 'gates-of-olympus-regles-2.webp',
        titre: 'Tumble and multipliers',
        legende:
          'Winning symbols disappear and are replaced from above until no new win forms. Multiplier symbols land randomly in both the base game and free spins, from 2× to 500×, and the values on screen are added together and applied at the end of the tumble sequence.',
      },
      {
        fichier: 'gates-of-olympus-regles-3.webp',
        titre: 'Free spins and ante bet',
        legende:
          'Four or more scatters award 15 free spins. During the round, every multiplier symbol that lands on a win is added to a running total. The ante bet raises the stake to 25× and doubles the chance of a natural trigger — and it disables the buy feature.',
      },
      {
        fichier: 'gates-of-olympus-regles-4.webp',
        titre: 'The studio states its own RTP',
        legende:
          'The rules panel gives 96.50% for the base game, 96.50% with the ante bet, and 96.50% with the bought feature — three figures, one value. Minimum bet €0.20, maximum €300.00, volatility stated as medium by the studio.',
      },
      {
        fichier: 'gates-of-olympus-achat.webp',
        titre: 'Buying the feature',
        legende:
          'At a €2.00 bet the purchase costs €200 — the 100× multiple the rules announce. The confirmation step is shown here as the game presents it, before any spin is committed.',
      },
    ],
  },
};
