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
      fr: {
        titre: 'Lire un RTP : studio, opérateur, achat de bonus',
        chapo:
          "La même machine a souvent trois RTP différents, et la plupart des sites n'en publient qu'un — parfois le mauvais.",
        sections: [
          {
            titre: "Une machine n'a pas un seul RTP",
            paragraphes: [
              "La plupart des studios livrent un jeu avec plusieurs configurations de RTP. Le studio publie une valeur par défaut — la plus haute — et l'opérateur peut choisir un palier plus bas. Les jeux Pragmatic Play en proposent généralement trois ; Relax Gaming documente des versions à 94 % et 90 % à côté de la valeur par défaut.",
              "Ce n'est pas caché : c'est écrit dans la documentation du studio. Mais un agrégateur qui n'affiche qu'un seul chiffre ne peut pas te dire lequel tu regardes, et la valeur servie dans un casino peut être plus basse que celle annoncée ailleurs.",
            ],
          },
          {
            titre: "L'achat de bonus a son propre RTP",
            paragraphes: [
              "Acheter un bonus change généralement le taux de retour. Il est souvent plus élevé que celui du jeu de base — c'est pour cela qu'il finit cité comme s'il était le RTP du jeu.",
              "Nous l'avons mesuré sur nos propres données : sur huit titres de Nolimit City, Hacksaw, ELK et Relax, six portaient un chiffre qui était en réalité le retour d'un achat de bonus. Sur un jeu, l'écart atteignait 0,79 point — de quoi le faire passer de moyen à excellent dans un tableau comparatif.",
            ],
          },
          {
            titre: 'Comment vérifier soi-même',
            paragraphes: [
              "La table des gains affichée dans le jeu est le seul chiffre qui s'applique à la session que tu joues. Elle reflète le palier configuré par ton opérateur, pas la valeur par défaut du studio.",
              "Sur chaque fiche de jeu ici, le RTP porte un niveau de preuve. « Vérifié auprès du studio » signifie que nous avons la page du studio en archive et que tu peux l'ouvrir. Quand nous n'avons pas confirmé un chiffre, nous le disons, plutôt que de le présenter avec la même assurance qu'un chiffre vérifié.",
            ],
          },
        ],
      },
      de: {
        titre: 'Einen RTP richtig lesen: Studio, Betreiber, Bonuskauf',
        chapo:
          'Derselbe Slot hat oft drei verschiedene RTP-Werte, und die meisten Seiten veröffentlichen nur einen davon — manchmal den falschen.',
        sections: [
          {
            titre: 'Ein Slot hat nicht nur einen RTP',
            paragraphes: [
              'Die meisten Studios liefern ein Spiel mit mehreren RTP-Konfigurationen aus. Das Studio veröffentlicht einen Standardwert — den höchsten — und Betreiber dürfen eine niedrigere Stufe wählen. Spiele von Pragmatic Play bieten üblicherweise drei; Relax Gaming dokumentiert neben dem Standard Versionen mit 94 % und 90 %.',
              'Das ist nicht versteckt: Es steht in den Unterlagen des Studios. Aber ein Aggregator, der eine einzige Zahl listet, kann dir nicht sagen, welche du gerade siehst — und der Wert in einem Casino kann niedriger sein als der anderswo beworbene.',
            ],
          },
          {
            titre: 'Der Bonuskauf hat seinen eigenen RTP',
            paragraphes: [
              'Ein Bonuskauf verändert in der Regel die Auszahlungsquote. Sie liegt häufig über der des Basisspiels — deshalb wird sie am Ende so zitiert, als wäre sie der RTP des Spiels.',
              'Wir haben das an unseren eigenen Daten gemessen: Von acht Titeln von Nolimit City, Hacksaw, ELK und Relax trugen sechs eine Zahl, die in Wahrheit die Quote eines Bonuskaufs war. Bei einem Spiel betrug der Abstand 0,79 Punkte — genug, um es in einer Vergleichstabelle von durchschnittlich auf ausgezeichnet zu heben.',
            ],
          },
          {
            titre: 'Wie du es selbst prüfst',
            paragraphes: [
              'Die Gewinntabelle im Spiel ist die einzige Zahl, die für deine Sitzung gilt. Sie zeigt die Stufe, die dein Betreiber eingestellt hat, nicht den Standard des Studios.',
              'Auf jeder Spielseite hier trägt der RTP eine Belegstufe. „Vom Studio geprüft“ heißt, dass uns die Studioseite vorliegt und du sie öffnen kannst. Wenn wir eine Zahl nicht bestätigt haben, sagen wir das, statt sie mit derselben Sicherheit zu präsentieren wie eine geprüfte.',
            ],
          },
        ],
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
      fr: {
        titre: 'Pourquoi deux sites affichent deux RTP différents pour la même machine',
        chapo:
          "C'est rarement une faute de frappe. Le désaccord dit en général quelle source chaque site a recopiée.",
        sections: [
          {
            titre: "Un écart d'environ un point",
            paragraphes: [
              "Quand deux sites diffèrent d'à peu près un point entier — 96,06 % contre 95,05 %, par exemple — tu regardes presque à coup sûr deux paliers opérateur différents du même jeu. Un site a pris la valeur par défaut du studio, l'autre la configuration qu'un casino donné faisait tourner.",
              "Nous avons trouvé quatre titres Red Tiger exactement dans cette situation. Les valeurs basses correspondaient exactement à celles d'un agrégateur, ce qui indique assez clairement d'où elles ont été recopiées.",
            ],
          },
          {
            titre: 'Un écart de quelques dixièmes',
            paragraphes: [
              "Les écarts plus petits — 0,2 à 0,8 point — pointent en général vers un chiffre d'achat de bonus, ou vers une variante du jeu confondue avec le titre de base. Big Bass Hold & Spinner et sa version Megaways sont deux jeux distincts avec deux chiffres distincts, et on les intervertit régulièrement.",
            ],
          },
          {
            titre: 'Ce que nous en faisons',
            paragraphes: [
              "Nous allons chez le studio. Quand le chiffre est publié — page produit, communiqué, parfois le paquet du jeu lui-même — nous enregistrons l'adresse à côté du nombre, et tu peux l'ouvrir depuis la fiche.",
              "Quand aucune source studio n'existe, nous ne choisissons pas le chiffre le plus flatteur. Nous marquons la valeur comme non vérifiée et la laissons visible, pour que tu saches exactement ce que tu lis.",
            ],
          },
        ],
      },
      de: {
        titre: 'Warum zwei Seiten zwei verschiedene RTP-Werte für denselben Slot zeigen',
        chapo:
          'Das ist selten ein Tippfehler. Die Abweichung verrät meist, welche Quelle jede Seite abgeschrieben hat.',
        sections: [
          {
            titre: 'Ein Abstand von etwa einem Punkt',
            paragraphes: [
              'Wenn zwei Seiten um rund einen ganzen Punkt auseinanderliegen — etwa 96,06 % gegen 95,05 % — siehst du fast sicher zwei verschiedene Betreiberstufen desselben Spiels. Die eine Seite nahm den Studiostandard, die andere die Konfiguration, die ein bestimmtes Casino betrieb.',
              'Wir haben vier Red-Tiger-Titel in genau dieser Lage gefunden. Die niedrigeren Werte stimmten exakt mit denen eines Aggregators überein — ein deutliches Zeichen dafür, woher sie kopiert wurden.',
            ],
          },
          {
            titre: 'Ein Abstand von wenigen Zehnteln',
            paragraphes: [
              'Kleinere Abstände — 0,2 bis 0,8 Punkte — deuten meist auf einen Bonuskauf-Wert hin oder auf eine Spielvariante, die mit dem Basistitel verwechselt wird. Big Bass Hold & Spinner und seine Megaways-Version sind zwei eigene Spiele mit eigenen Zahlen, und ihre Werte werden regelmäßig vertauscht.',
            ],
          },
          {
            titre: 'Was wir damit machen',
            paragraphes: [
              'Wir gehen zum Studio. Wenn die Zahl veröffentlicht ist — Produktseite, Pressemitteilung, manchmal das Spielpaket selbst — halten wir die Adresse neben der Zahl fest, und du kannst sie von der Spielseite aus öffnen.',
              'Wenn es keine Studioquelle gibt, wählen wir nicht die schmeichelhafteste Zahl. Wir kennzeichnen den Wert als ungeprüft und lassen ihn sichtbar, damit du genau weißt, was du liest.',
            ],
          },
        ],
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
      fr: {
        titre: "Volatilité : ce que l'étiquette ne dit pas",
        chapo:
          'Basse, moyenne, haute — trois mots pour un spectre que chaque studio mesure sur sa propre échelle.',
        sections: [
          {
            titre: "Il n'existe pas d'échelle commune",
            paragraphes: [
              "Certains studios publient un indice de volatilité chiffré, d'autres un simple mot. ELK note ses jeux sur dix ; Nolimit City publie une valeur qui dépasse régulièrement vingt sur sa propre échelle. Une volatilité « haute » chez un studio et une volatilité « haute » chez un autre ne décrivent pas la même expérience.",
              "C'est pourquoi nous affichons l'étiquette du studio quand elle existe, plutôt que de tout convertir sur une échelle maison — une conversion serait plus propre à regarder et dirait moins.",
            ],
          },
          {
            titre: "La fréquence de gain compte plus que l'étiquette",
            paragraphes: [
              "La fréquence à laquelle un jeu paie quelque chose façonne une session bien plus qu'un mot de volatilité. Un jeu qui paie sur 14 % des tours n'a rien à voir avec un jeu qui paie sur 32 %, même si les deux portent l'étiquette haute.",
              "Quand un studio la publie, cette valeur mérite plus d'attention que l'étiquette.",
            ],
          },
          {
            titre: "Une valeur absente n'est pas une valeur neutre",
            paragraphes: [
              "Beaucoup de catalogues remplissent un champ de volatilité vide avec « moyenne ». Cela se lit comme une information ; c'est une supposition.",
              "Ici, un jeu sans volatilité publiée n'affiche rien du tout. Un champ vide se voit et peut être corrigé ; un champ inventé, on le croit.",
            ],
          },
        ],
      },
      de: {
        titre: 'Volatilität: was das Etikett nicht verrät',
        chapo:
          'Niedrig, mittel, hoch — drei Wörter für ein Spektrum, das jedes Studio auf seiner eigenen Skala misst.',
        sections: [
          {
            titre: 'Es gibt keine gemeinsame Skala',
            paragraphes: [
              'Manche Studios veröffentlichen einen Volatilitätsindex als Zahl, andere nur ein Wort. ELK bewertet Spiele auf einer Skala bis zehn; Nolimit City nennt Werte, die auf der eigenen Skala regelmäßig über zwanzig liegen. Ein „hoch“ des einen Studios und ein „hoch“ des anderen beschreiben nicht dieselbe Erfahrung.',
              'Deshalb zeigen wir das Etikett des Studios, wenn es existiert, statt alles auf eine eigene Skala umzurechnen — eine Umrechnung sähe ordentlicher aus und sagte weniger.',
            ],
          },
          {
            titre: 'Die Trefferquote zählt mehr als das Etikett',
            paragraphes: [
              'Wie oft ein Spiel überhaupt etwas auszahlt, prägt eine Sitzung weit stärker als ein Volatilitätswort. Ein Spiel, das auf 14 % der Drehungen zahlt, fühlt sich völlig anders an als eines, das auf 32 % zahlt — auch wenn beide als hoch gelten.',
              'Wenn ein Studio diese Zahl veröffentlicht, verdient sie mehr Aufmerksamkeit als das Etikett.',
            ],
          },
          {
            titre: 'Ein fehlender Wert ist kein neutraler Wert',
            paragraphes: [
              'Viele Kataloge füllen ein leeres Volatilitätsfeld mit „mittel“. Das liest sich wie eine Information; es ist eine Vermutung.',
              'Hier zeigt ein Spiel ohne veröffentlichte Volatilität gar nichts an. Ein leeres Feld ist sichtbar und lässt sich korrigieren; ein erfundenes wird geglaubt.',
            ],
          },
        ],
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
