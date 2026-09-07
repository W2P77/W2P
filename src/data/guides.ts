/**
 * Les guides.
 *
 * ── Pourquoi ces trois-là ─────────────────────────────────────────────────
 *
 * Ils ne sont pas choisis pour remplir un menu : ils racontent ce qu'on a
 * réellement mesuré en constituant le catalogue. Trente-sept fiches
 * annonçaient un RTP différent du leur, et l'arbitrage a montré trois causes
 * distinctes — le palier opérateur pris pour la valeur studio, le RTP d'achat
 * de bonus présenté comme celui du jeu, et des sources qui se recopient.
 *
 * C'est le seul contenu qu'on puisse écrire sans rien inventer, et c'est
 * exactement ce qui manque ailleurs.
 */
export interface Guide {
  slug: string;
  titre: string;
  chapo: string;
  minutes: number;
  sections: { titre: string; paragraphes: string[] }[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-read-an-rtp',
    titre: 'How to read an RTP: studio, operator, bonus buy',
    chapo:
      'The same slot often has three different RTPs, and most sites publish only one of them — sometimes the wrong one.',
    minutes: 4,
    sections: [
      {
        titre: 'A slot does not have one RTP',
        paragraphes: [
          'Most studios ship a game with several RTP configurations. The studio publishes a default — the highest one — and operators may choose a lower tier. Pragmatic Play games typically offer three; Relax Gaming documents versions at 94% and 90% alongside the default.',
          'This is not hidden: it is written in the studio material. But an aggregator that lists a single number cannot tell you which one you are looking at, and the figure you see in a casino may be lower than the one advertised elsewhere.',
        ],
      },
      {
        titre: 'The bonus buy has its own RTP',
        paragraphes: [
          'Buying a bonus usually changes the return. It is frequently higher than the base game — which is why it ends up quoted as if it were the game RTP.',
          'We measured this on our own data: on eight titles from Nolimit City, Hacksaw, ELK and Relax, six carried a figure that was in fact the return of a bonus purchase. On one game the gap was 0.79 points — enough to move it from average to excellent in a comparison table.',
        ],
      },
      {
        titre: 'How to check for yourself',
        paragraphes: [
          'The paytable inside the game is the only figure that applies to the session you are playing. It reflects the tier your operator configured, not the studio default.',
          'On every game page here, the RTP carries an evidence level. Studio-verified means we have the studio page on file and you can open it. When we have not confirmed a figure, we say so rather than presenting it with the same confidence as one we checked.',
        ],
      },
    ],
  },
  {
    slug: 'why-two-sites-show-different-rtps',
    titre: 'Why two sites show two different RTPs for the same slot',
    chapo:
      'It is rarely a typo. The disagreement usually tells you which source each site copied.',
    minutes: 3,
    sections: [
      {
        titre: 'A gap of about one point',
        paragraphes: [
          'When two sites differ by roughly a full point — 96.06% against 95.05%, say — you are almost certainly looking at two different operator tiers of the same game. One site took the studio default, the other took the configuration a particular casino was running.',
          'We found four Red Tiger titles in exactly this situation. The lower values matched one aggregator exactly, which is a strong sign of where they were copied from.',
        ],
      },
      {
        titre: 'A gap of a few tenths',
        paragraphes: [
          'Smaller gaps — 0.2 to 0.8 points — usually point at a bonus buy figure, or at a variant of the game being confused with the base title. Big Bass Hold & Spinner and its Megaways version are separate games with separate numbers, and their figures get swapped regularly.',
        ],
      },
      {
        titre: 'What we do about it',
        paragraphes: [
          'We go to the studio. When the figure is published — a product page, a press release, sometimes the game bundle itself — we record the address alongside the number, and you can open it from the game page.',
          'When no studio source exists, we do not pick the most flattering number. We mark the figure as unverified and leave it visible, so you know exactly what you are reading.',
        ],
      },
    ],
  },
  {
    slug: 'volatility-what-the-number-does-not-tell-you',
    titre: 'Volatility: what the label does not tell you',
    chapo:
      'Low, medium, high — three words for a spectrum that studios measure on their own scales.',
    minutes: 3,
    sections: [
      {
        titre: 'There is no shared scale',
        paragraphes: [
          'Some studios publish a numeric volatility index, others only a word. ELK rates games out of ten; Nolimit City publishes a figure that regularly exceeds twenty on its own scale. A "high" from one studio and a "high" from another do not describe the same experience.',
          'That is why we show the studio label when it exists rather than converting everything to a scale of our own — a conversion would look tidier and mean less.',
        ],
      },
      {
        titre: 'Hit frequency matters more than the label',
        paragraphes: [
          'How often a game pays anything at all shapes a session far more than a volatility word. A game paying on 14% of spins feels nothing like one paying on 32%, even when both are labelled high.',
          'When a studio publishes it, that figure is worth more of your attention than the label.',
        ],
      },
      {
        titre: 'A missing value is not a neutral one',
        paragraphes: [
          'Plenty of catalogues fill an empty volatility field with "medium". It reads as information; it is a guess.',
          'Here, a game with no published volatility shows nothing at all. An empty field is visible and can be fixed; an invented one gets believed.',
        ],
      },
    ],
  },
];

export const guideParSlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
