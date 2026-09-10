import type { Langue } from '@/i18n/langues';

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
export interface SectionGuide {
  titre: string;
  paragraphes: string[];
  /**
   * Les jeux du catalogue que cette section cite, par slug.
   *
   * ── Pourquoi une liste et pas des liens dans le texte ──────────────────
   *
   * Un guide qui affirme « les jeux de table rendent 98 % » doit pouvoir le
   * montrer. La page va chercher ces fiches en base et affiche leur RTP réel
   * à côté de leur nom : l'affirmation et sa preuve tiennent dans le même
   * écran, et le lecteur peut vérifier d'un clic.
   *
   * Des liens noyés dans le paragraphe donneraient le même maillage sans la
   * preuve — et obligeraient à écrire du HTML dans des chaînes de texte.
   */
  jeux?: string[];
}

export interface ContenuGuide {
  titre: string;
  chapo: string;
  sections: SectionGuide[];
}

export interface Guide {
  slug: string;
  minutes: number;
  /**
   * Le contenu par langue.
   *
   * L'anglais est obligatoire et sert de repli : un guide traduit à moitié
   * vaut mieux qu'un guide absent dans deux langues sur trois, et le repli se
   * voit — il est écrit dans une autre langue que la page.
   */
  contenu: { en: ContenuGuide } & Partial<Record<Langue, ContenuGuide>>;
}

export const GUIDES: Guide[] = [
  {
    slug: 'why-table-games-return-more-than-slots',
    minutes: 5,
    contenu: {
      en: {
        titre: 'Why table games return more than slots',
        chapo:
          'Blackjack, roulette and baccarat are published at returns a slot almost never reaches. The reason is arithmetic, not generosity.',
        sections: [
          {
            titre: 'The house edge is a rule, not a setting',
            paragraphes: [
              'A slot decides its return through its reel weightings — the studio picks a target and builds the maths to hit it. A table game does not work that way: its return falls out of the rules themselves. European roulette pays 35 to 1 on a number that lands once in 37, and that single gap is the whole edge.',
              'Because the edge comes from the rules, it does not move. A studio cannot ship a roulette at 94% without changing the game — it would have to alter the payouts or add a pocket, and the player would see it on the layout.',
            ],
          },
          {
            titre: 'Which is why the numbers cluster',
            paragraphes: [
              'Look at any catalogue of table games and the returns bunch together: roughly 97.3% for European roulette, near 98.9% for baccarat on the banker bet, and higher still for blackjack played correctly. The variation between studios is small because they are all implementing the same rules.',
              'Slots are the opposite. Two games from the same studio, released the same month, can sit two points apart — and the same game can ship in three configurations at once.',
            ],
            jeux: ['lightning-blackjack', 'power-blackjack', 'free-bet-blackjack'],
          },
          {
            titre: 'Blackjack’s number assumes you play it right',
            paragraphes: [
              'A published blackjack return is calculated on optimal play. Every hand played differently costs something, and the cost is real: standing on a soft 17 or refusing to split eights moves the number down by a measurable amount.',
              'That makes blackjack the one table game where the advertised figure is a ceiling rather than an expectation. Roulette and baccarat have no such gap — there is no way to play a roulette number badly.',
            ],
          },
          {
            titre: 'Side bets are a different game',
            paragraphes: [
              'The headline return covers the main bet only. Side bets — perfect pairs, 21+3, lightning multipliers — carry their own maths, and it is usually far worse than the base game.',
              'This is not a trap so much as a separate product sold on the same table. The number you read applies to the bet it was calculated for, and to no other.',
            ],
            jeux: ['lightning-baccarat', 'xxxtreme-lightning-roulette'],
          },
          {
            titre: 'What we verify, and what we do not',
            paragraphes: [
              'Every figure in our catalogue carries the level of proof behind it. A number read in the game’s own rules panel is marked as studio-sourced; one taken from a secondary source says so.',
              'On live table games we are honest about the state of it: most of our figures are not yet confirmed at the source, and they are labelled that way rather than dressed up. A guide is not the place to launder an unverified number.',
            ],
            jeux: ['speed-baccarat', 'european-roulette-pro', 'mega-roulette'],
          },
        ],
      },
      fr: {
        titre: 'Pourquoi les jeux de table rendent plus que les machines',
        chapo:
          'Blackjack, roulette et baccarat affichent des taux qu’une machine à sous n’atteint presque jamais. La raison est arithmétique, pas généreuse.',
        sections: [
          {
            titre: 'L’avantage de la maison est une règle, pas un réglage',
            paragraphes: [
              'Une machine à sous fixe son rendement par la pondération de ses rouleaux : le studio vise un chiffre et construit les maths pour l’atteindre. Un jeu de table ne fonctionne pas ainsi — son rendement découle des règles elles-mêmes. La roulette européenne paie 35 contre 1 un numéro qui sort une fois sur 37, et cet écart-là est tout l’avantage.',
              'Comme l’avantage vient des règles, il ne bouge pas. Un studio ne peut pas livrer une roulette à 94 % sans changer le jeu : il faudrait modifier les gains ou ajouter une case, et le joueur le verrait sur le tapis.',
            ],
          },
          {
            titre: 'D’où le fait que les chiffres se ressemblent',
            paragraphes: [
              'Ouvre n’importe quel catalogue de jeux de table et les taux se regroupent : environ 97,3 % pour la roulette européenne, près de 98,9 % pour le baccarat sur la banque, davantage encore au blackjack joué correctement. L’écart entre studios est faible parce qu’ils appliquent tous les mêmes règles.',
              'Les machines, c’est l’inverse. Deux jeux du même studio, sortis le même mois, peuvent être séparés de deux points — et un même jeu peut exister en trois configurations à la fois.',
            ],
            jeux: ['lightning-blackjack', 'power-blackjack', 'free-bet-blackjack'],
          },
          {
            titre: 'Le chiffre du blackjack suppose que tu joues juste',
            paragraphes: [
              'Un rendement publié au blackjack se calcule sur un jeu optimal. Chaque main jouée autrement coûte quelque chose, et ce coût est réel : rester sur un 17 souple ou refuser de séparer deux 8 fait baisser le chiffre de façon mesurable.',
              'C’est le seul jeu de table où la valeur affichée est un plafond plutôt qu’une espérance. La roulette et le baccarat n’ont pas cet écart — on ne joue pas mal un numéro de roulette.',
            ],
          },
          {
            titre: 'Les paris annexes sont un autre jeu',
            paragraphes: [
              'Le taux annoncé ne couvre que le pari principal. Les paris annexes — paires parfaites, 21+3, multiplicateurs éclair — ont leurs propres maths, et elles sont généralement bien moins favorables.',
              'Ce n’est pas tant un piège qu’un produit distinct vendu sur la même table. Le chiffre que tu lis vaut pour le pari sur lequel il a été calculé, et pour aucun autre.',
            ],
            jeux: ['lightning-baccarat', 'xxxtreme-lightning-roulette'],
          },
          {
            titre: 'Ce qu’on vérifie, et ce qu’on ne vérifie pas',
            paragraphes: [
              'Chaque chiffre de notre catalogue porte son niveau de preuve. Une valeur lue dans le panneau de règles du jeu est marquée comme venant du studio ; une valeur prise ailleurs le dit aussi.',
              'Sur les jeux de table en direct, on est franc sur l’état des choses : la plupart de nos chiffres ne sont pas encore confirmés à la source, et ils sont étiquetés comme tels plutôt que maquillés. Un guide n’est pas l’endroit où blanchir une donnée non vérifiée.',
            ],
            jeux: ['speed-baccarat', 'european-roulette-pro', 'mega-roulette'],
          },
        ],
      },
      de: {
        titre: 'Warum Tischspiele mehr ausschütten als Slots',
        chapo:
          'Blackjack, Roulette und Baccarat werden mit Quoten veröffentlicht, die ein Slot fast nie erreicht. Der Grund ist Arithmetik, nicht Großzügigkeit.',
        sections: [
          {
            titre: 'Der Hausvorteil ist eine Regel, keine Einstellung',
            paragraphes: [
              'Ein Slot legt seine Ausschüttung über die Gewichtung der Walzen fest: Das Studio setzt ein Ziel und baut die Mathematik dahin. Ein Tischspiel funktioniert anders — seine Ausschüttung ergibt sich aus den Regeln selbst. Europäisches Roulette zahlt 35 zu 1 auf eine Zahl, die einmal von 37 fällt, und genau diese Lücke ist der ganze Vorteil.',
              'Weil der Vorteil aus den Regeln kommt, bewegt er sich nicht. Ein Studio kann kein Roulette mit 94 % ausliefern, ohne das Spiel zu ändern: Es müsste die Auszahlungen anpassen oder ein Fach hinzufügen — und der Spieler sähe es auf dem Tableau.',
            ],
          },
          {
            titre: 'Deshalb liegen die Zahlen so eng beieinander',
            paragraphes: [
              'Öffne einen beliebigen Katalog mit Tischspielen, und die Quoten drängen sich zusammen: rund 97,3 % beim europäischen Roulette, knapp 98,9 % beim Baccarat auf die Bank, und noch höher beim korrekt gespielten Blackjack. Der Unterschied zwischen Studios ist klein, weil alle dieselben Regeln umsetzen.',
              'Bei Slots ist es umgekehrt. Zwei Spiele desselben Studios, im selben Monat erschienen, können zwei Punkte auseinanderliegen — und dasselbe Spiel kann in drei Konfigurationen zugleich existieren.',
            ],
            jeux: ['lightning-blackjack', 'power-blackjack', 'free-bet-blackjack'],
          },
          {
            titre: 'Die Blackjack-Zahl setzt voraus, dass du richtig spielst',
            paragraphes: [
              'Eine veröffentlichte Blackjack-Quote wird auf optimales Spiel gerechnet. Jede anders gespielte Hand kostet etwas, und diese Kosten sind messbar: Bei Soft 17 stehen zu bleiben oder zwei Achten nicht zu teilen drückt die Zahl spürbar.',
              'Blackjack ist damit das einzige Tischspiel, bei dem der angegebene Wert eher eine Obergrenze als eine Erwartung ist. Roulette und Baccarat kennen diese Lücke nicht — eine Roulettezahl kann man nicht schlecht spielen.',
            ],
          },
          {
            titre: 'Nebenwetten sind ein anderes Spiel',
            paragraphes: [
              'Die genannte Quote gilt nur für die Hauptwette. Nebenwetten — Perfect Pairs, 21+3, Blitz-Multiplikatoren — haben ihre eigene Mathematik, und die ist meist deutlich ungünstiger.',
              'Das ist weniger eine Falle als ein eigenes Produkt am selben Tisch. Die Zahl, die du liest, gilt für die Wette, für die sie berechnet wurde — und für keine andere.',
            ],
            jeux: ['lightning-baccarat', 'xxxtreme-lightning-roulette'],
          },
          {
            titre: 'Was wir prüfen, und was nicht',
            paragraphes: [
              'Jede Zahl in unserem Katalog trägt ihren Nachweisgrad. Ein Wert, der im Regelfenster des Spiels selbst gelesen wurde, ist als Studio-Quelle markiert; ein Wert aus zweiter Hand sagt das ebenfalls.',
              'Bei Live-Tischspielen sind wir offen: Die meisten unserer Zahlen sind an der Quelle noch nicht bestätigt, und sie sind entsprechend gekennzeichnet statt aufgehübscht. Ein Ratgeber ist nicht der Ort, an dem man eine ungeprüfte Zahl weißwäscht.',
            ],
            jeux: ['speed-baccarat', 'european-roulette-pro', 'mega-roulette'],
          },
        ],
      },
    },
  },
  {
    slug: 'how-to-read-an-rtp',
    minutes: 4,
    contenu: {
      en: {
        titre: 'How to read an RTP: studio, operator, bonus buy',
        chapo:
          'The same slot often has three different RTPs, and most sites publish only one of them — sometimes the wrong one.',
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
          },],
      },
    },
  },
  {
    slug: 'why-two-sites-show-different-rtps',
    minutes: 3,
    contenu: {
      en: {
        titre: 'Why two sites show two different RTPs for the same slot',
        chapo:
          'It is rarely a typo. The disagreement usually tells you which source each site copied.',
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
          },],
      },
    },
  },
  {
    slug: 'volatility-what-the-number-does-not-tell-you',
    minutes: 3,
    contenu: {
      en: {
        titre: 'Volatility: what the label does not tell you',
        chapo:
          'Low, medium, high — three words for a spectrum that studios measure on their own scales.',
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
          },],
      },
    },
  },
];

export const guideParSlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

/**
 * Le contenu d'un guide dans une langue, anglais en repli.
 *
 * Un guide pas encore traduit s'affiche en anglais plutôt que de disparaître :
 * dans les deux cas le lecteur ne l'a pas dans sa langue, mais dans l'un il
 * peut au moins le lire. Et le repli se voit — c'est ce qui rappelle qu'il
 * reste à traduire.
 */
export function contenuDuGuide(g: Guide, l: Langue): ContenuGuide {
  return g.contenu[l] ?? g.contenu.en;
}
