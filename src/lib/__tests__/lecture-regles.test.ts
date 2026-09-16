import { describe, expect, it } from 'vitest';

import { extraireLesFaits } from '../captures/lecture-regles';

/*
 * Chaque studio a sa formule. Ces cas viennent de panneaux réellement lus :
 * tant que l'interprétation vivait dans la fonction d'OCR, les vérifier
 * demandait de fabriquer une image et de lancer Tesseract — donc personne ne
 * le faisait, et une formulation inconnue ne se découvrait qu'en production,
 * sous la forme d'un champ resté vide.
 */
describe('le RTP, selon la formule du studio', () => {
  it('lit la formule de Pragmatic', () => {
    expect(extraireLesFaits('The theoretical RTP of this game is 96.07%').rtp).toBe(96.07);
  });

  it('lit la formule de Hacksaw, où RTP est entre parenthèses', () => {
    expect(extraireLesFaits('Theoretical payout (RTP): 96.43%').rtp).toBe(96.43);
  });

  /*
   * Le texte est celui que Tesseract a rendu de la capture d'All-Star Fruits,
   * recopié sans retouche. La phrase suivante annonce deux RTP d'achat, et
   * c'est ce voisinage-là qui fait l'intérêt du cas : le studio publie les
   * trois d'affilée, et seul le premier porte « theoretical ».
   */
  it('lit la formule de BGaming, où « RTP » suit le sigle développé', () => {
    const f = extraireLesFaits(
      'The overall theoretical Return to Player (RTP) is 97.04%. ' +
        'RTP for the Buy Bonus feature is 97.01%. RTP for the Buy Magic Spins feature is 97.03%.',
    );
    expect(f.rtp).toBe(97.04);
  });

  /*
   * Recopié de l'OCR de Snoop Dogg Dollars : un RTP rond, sans décimale, et
   * pas d'espace après le point. La fiche était capturée sans chiffre.
   */
  it('lit un RTP entier quand il est suivi de « % »', () => {
    expect(
      extraireLesFaits('The overall theoretical Return to Player (RTP) is 96%.RTP in the Buy Bonus feature').rtp,
    ).toBe(96);
  });

  it('ne prend pas un nombre entier sans « % » pour un RTP', () => {
    expect(extraireLesFaits('The theoretical RTP of this game uses 20 lines').rtp).toBeNull();
  });

  /*
   * Recopié de l'OCR de Four Lucky Clover. Le premier nombre est le bas : le
   * prendre pour le taux publiait 89,41 % au lieu de 94 %.
   */
  it('lit une plage « A - B % » dans la même phrase par son haut', () => {
    const f = extraireLesFaits(
      "Return to Player The overall theoretical Return to Player (RTP) is 89,41 - 94,00% depending on the player's strategy.",
    );
    expect(f.rtp).toBe(94);
    expect(f.rtpMin).toBe(89.41);
  });

  /*
   * Recopié de l'OCR de Grand Buffalo Hold and Win. Le taux hors jackpot était
   * publié seul, alors que le studio met en avant celui avec jackpot.
   */
  it('lit « X % (without Jackpot) - Y % (with Jackpot) » par son haut', () => {
    const f = extraireLesFaits(
      'Return to Player The overall theoretical Return to Player (RTP) is 96.23% (without Jackpot) - 96.7% (with Jackpot). ' +
        'RTP in Buy Bonus with Free Spins is 96.7%. RTP in Buy Bonus with Fireball Respin is 92.66% (without Jackpot) - 96.7% (with Jackpot).',
    );
    expect(f.rtp).toBe(96.7);
    expect(f.rtpMin).toBe(96.23);
  });

  it('lit une plage comme un défaut et un palier', () => {
    const f = extraireLesFaits(
      'The maximum RTP of this game is 96.03% The minimum RTP of this game is 94.02%',
    );
    expect(f.rtp).toBe(96.03);
    expect(f.rtpMin).toBe(94.02);
  });

  /*
   * Le même panneau annonce le RTP de l'achat de bonus, qui peut **dépasser**
   * celui du jeu de base (Hacksaw : 96,43 contre 96,38). « Prendre le plus
   * bas » et « prendre le premier lu » sont donc tous deux faux : seule la
   * formulation les distingue.
   */
  it('ne prend jamais le RTP de l’achat de bonus pour celui du jeu', () => {
    const f = extraireLesFaits(
      'The RTP of the game when using "BUY FREE SPINS" is 96.50% The theoretical RTP of this game is 96.07%',
    );
    expect(f.rtp).toBe(96.07);
  });

  it('jette une valeur hors des bornes de vraisemblance', () => {
    expect(extraireLesFaits('The theoretical RTP of this game is 12.00%').rtp).toBeNull();
  });

  it('refuse un minimum supérieur au défaut', () => {
    const f = extraireLesFaits(
      'The maximum RTP of this game is 94.00% The minimum RTP of this game is 96.00%',
    );
    expect(f.rtpMin).toBeNull();
  });
});

/*
 * Wazdan n'écrit jamais le sigle « RTP ». La règle exigeait sa présence après
 * le mot-clé, donc elle rendait `null` sur un panneau que Tesseract restitue
 * au mot près : 261 fiches auraient reçu leurs images et aucun chiffre.
 */
describe('la formulation Wazdan, qui n’écrit pas le sigle', () => {
  it('lit le RTP sans le mot RTP', () => {
    expect(extraireLesFaits('Game average return to player: 96.15%').rtp).toBe(96.15);
    expect(extraireLesFaits('game average return to player 95,5%').rtp).toBe(95.5);
  });

  it('lit le gain maximum sans « limited to »', () => {
    expect(extraireLesFaits('The maximum win amount is 750x bet.').gainMax).toBe(750);
  });

  /*
   * Le règlement Wazdan se termine par une section générique « Volatility
   * Levels™ » qui décrit le RÉGLAGE que le joueur peut changer — les trois
   * modes y figurent sur tous les jeux. Y lire une volatilité étiquetterait
   * « haute » 259 fiches sur 261, sur la foi d'un paragraphe qui parle d'autre
   * chose. C'est l'adaptateur qui coupe avant cette section ; ce test fixe ce
   * qu'il doit lui rester à lire.
   */
  it('lit toujours la volatilité quand le jeu l’énonce vraiment', () => {
    expect(extraireLesFaits('This game has high volatility.').volatilite).toBe('HAUTE');
  });
});

/*
 * Evoplay écrit « The overall theoretical return to player is 96.00 % » — sans
 * le sigle après « Return to Player », donc hors de portée de la règle
 * générale. Son bandeau, lui, le porte sur chaque page du panneau : c'est la
 * forme la plus sûre, elle ne dépend pas de la page atteinte.
 */
describe('le bandeau Evoplay', () => {
  it('lit le taux entre parenthèses du bandeau', () => {
    expect(extraireLesFaits('Rules / Fruit Nova (RTP 96.00%)').rtp).toBe(96);
    expect(extraireLesFaits('Rules / Hot Volcano ( RTP 95,92 % )').rtp).toBe(95.92);
  });

  it('ne confond pas le bandeau avec une phrase qui cite le sigle', () => {
    expect(extraireLesFaits('Gamble will not impact the overall RTP').rtp).toBeNull();
  });
});

/*
 * Nolimit City écrit « The theoretical return to the player for this game is
 * 96.10% » — le mot « theoretical » y est, sans le sigle derrière. Et la même
 * page aligne les taux des achats de fonction et du xBoost, dans la même
 * tournure : attraper le premier nombre après « theoretical » publierait le
 * taux d'un achat comme celui du jeu. L'ancre est « for this game is ».
 */
describe('la formulation Nolimit City, au milieu des taux d’achat', () => {
  it('lit le taux du jeu et pas celui d’une fonction achetée', () => {
    const page =
      'xBoost: The theoretical return to the player when using xBoost is 96.30%. ' +
      'Nolimit Bonus: The theoretical return to the player when buying Nolimit Bonus is 96.44%. ' +
      'The theoretical return to the player for this game is 96.10%.';
    expect(extraireLesFaits(page).rtp).toBe(96.1);
  });

  it('ne lit rien quand seule une fonction achetée est chiffrée', () => {
    expect(
      extraireLesFaits('The theoretical return to the player when buying Nolimit Bonus is 96.44%.').rtp,
    ).toBeNull();
  });
});

describe('la formulation Stakelogic, « payback percentage »', () => {
  it('lit le taux malgré « minimum » avant le sigle', () => {
    expect(
      extraireLesFaits('The theoretical minimum payback percentage (RTP) is 96.02%.').rtp,
    ).toBe(96.02);
  });
});

describe('les moteurs Yggdrasil, sans le sigle', () => {
  it('lit GATI, « overall theoretical return to player is »', () => {
    expect(extraireLesFaits('The overall theoretical return to player is 96.0%.').rtp).toBe(96);
  });

  it('lit Reel Play, « Theoretical Average Return to Player is: »', () => {
    expect(extraireLesFaits('The Theoretical Average Return to Player is: 94.0%').rtp).toBe(94);
  });

  it('ne prend pas le taux d’un achat de bonus pour celui du jeu', () => {
    expect(
      extraireLesFaits('The overall theoretical return to player when using BUY BONUS is 96.5%.').rtp,
    ).toBeNull();
  });
});

/*
 * Habanero met le nom du jeu dans la phrase, et ce nom commence parfois par un
 * chiffre : « The theoretical RTP for 5 Lucky Lions is 96.51% - 96.79% ». La
 * règle générale s'arrêtait sur le 5. Et sa plage porte un « % » après chaque
 * nombre, forme que la règle de plage de BGaming ne voit pas : elle rendait le
 * bas. Le haut est le défaut du lanceur, le bas un palier.
 */
describe('la formulation Habanero, avec le nom du jeu dans la phrase', () => {
  it('saute un nom qui commence par un chiffre', () => {
    expect(extraireLesFaits('The theoretical RTP for 12 Zodiacs is 94.10%').rtp).toBe(94.1);
    expect(extraireLesFaits('The theoretical RTP for Zeus 2 is 96.00%').rtp).toBe(96);
  });

  it('lit une plage en gardant le haut pour défaut', () => {
    const f = extraireLesFaits('The theoretical RTP for 5 Lucky Lions is 96.51% - 96.79%');
    expect(f.rtp).toBe(96.79);
    expect(f.rtpMin).toBe(96.51);
  });

  it('ne prend pas le taux d’un jackpot pour celui du jeu', () => {
    expect(extraireLesFaits('The theoretical RTP for MINOR JACKPOT is 0.50%').rtp).toBeNull();
  });
});

describe('la formulation Amusnet, « of the game is »', () => {
  it('lit le RTP sans le sigle', () => {
    expect(extraireLesFaits('The average return to Player of the game is 96.17%.').rtp).toBe(96.17);
  });

  it('ne prend pas le taux « when using » pour celui du jeu', () => {
    expect(extraireLesFaits('The average return to Player when using BUY BONUS is 97.10%.').rtp).toBeNull();
  });
});

describe('le gain maximum, selon la formule du studio', () => {
  it('lit « maximum theoretical win »', () => {
    expect(extraireLesFaits('The maximum theoretical win is 5,000x the bet').gainMax).toBe(5000);
  });

  it('lit « limited to … x bet »', () => {
    expect(extraireLesFaits('the maximum win amount is limited to 10,000x bet').gainMax).toBe(10000);
  });

  it('lit « maximum achievable win », la formule de Hacksaw', () => {
    expect(extraireLesFaits('Maximum achievable win: 25,000x').gainMax).toBe(25000);
  });

  /*
   * BGaming écrit le multiplicateur **avant** le nombre, et l'OCR rend son
   * « × » en « x » ordinaire. Les deux tournures relevées à trois jeux d'écart
   * ne diffèrent que par « in the game », d'où un saut toléré entre le mot-clé
   * et le signe plutôt que deux expressions séparées.
   */
  it('lit la formule de BGaming, où le signe précède le nombre', () => {
    expect(extraireLesFaits('The maximum winning amount is x1500 of the bet.').gainMax).toBe(1500);
    expect(extraireLesFaits('The maximum winning amount in the game is ×10000.').gainMax).toBe(10000);
  });
});

describe('la volatilité, dans les deux sens de lecture', () => {
  it('lit « high volatility »', () => {
    expect(extraireLesFaits('This game has high volatility').volatilite).toBe('HAUTE');
  });

  it('lit « Volatility: High », la forme inversée de Hacksaw', () => {
    expect(extraireLesFaits('Volatility: High').volatilite).toBe('HAUTE');
  });

  /* « very high » doit être essayé avant « high », sinon la seconde l'attrape. */
  it('distingue très haute de haute', () => {
    expect(extraireLesFaits('very high volatility').volatilite).toBe('TRES_HAUTE');
    expect(extraireLesFaits('Volatility: Very High').volatilite).toBe('TRES_HAUTE');
  });

  it('ne devine rien quand le panneau ne dit rien', () => {
    expect(extraireLesFaits('Bets from 0.10 to 250').volatilite).toBeNull();
  });
});

/*
 * Les lignes et la grille : chaque cas est une phrase relevée mot pour mot sur
 * une capture nommée, pas une formulation plausible. Le risque n'est pas de
 * rater une lecture, c'est d'en inventer une — un panneau répète le mot
 * « line » vingt fois sans jamais annoncer le compte.
 */
describe('le nombre de lignes, studio par studio', () => {
  it('lit Spinomenal — « The game is set to 50 fixed lines. »', () => {
    expect(extraireLesFaits('* The game is set to 50 fixed lines.').lignes).toBe('50 fixed lines');
  });

  it('lit Habanero — « Lines are fixed at 88. »', () => {
    expect(extraireLesFaits('Lines are fixed at 88.').lignes).toBe('88 fixed lines');
  });

  it('lit Amusnet, où la phrase porte aussi les rouleaux', () => {
    const t = '10 Bulky Fruits video slot is a 5-reel, 10-line fixed game.';
    expect(extraireLesFaits(t).lignes).toBe('10 fixed lines');
  });

  it('lit 1spin4win — « 243 ways (All Ways) »', () => {
    expect(extraireLesFaits('| 243 ways (All Ways) |').lignes).toBe('243 ways to win');
  });

  it('lit un nombre de façons écrit avec ses séparateurs', () => {
    expect(extraireLesFaits('117,649 ways to win').lignes).toBe('117,649 ways to win');
  });

  /*
   * Le vrai danger : ces trois phrases sont sur tous les panneaux du site, et
   * une formule large en tirerait « 1 ligne », « 5 lignes », « 2 lignes ».
   */
  it('ne prend pas un nombre dans une phrase qui ne compte pas les lignes', () => {
    expect(extraireLesFaits('Wins on different lines are added.').lignes).toBeNull();
    expect(extraireLesFaits('Line wins are multiplied by bet per line.').lignes).toBeNull();
    expect(extraireLesFaits('If any 5 symbols appear on a line, pays are left to right only.').lignes).toBeNull();
    expect(extraireLesFaits('Free games are played at the lines and bet of the triggering game.').lignes).toBeNull();
  });

  it('refuse un compte hors des bornes du plausible', () => {
    expect(extraireLesFaits('The game is set to 500 fixed lines.').lignes).toBeNull();
    expect(extraireLesFaits('12 ways to win').lignes).toBeNull();
  });
});

describe('la grille, seulement quand le panneau la dit en entier', () => {
  it('lit Hacksaw — la phrase qui a corrigé Frkn Bananas', () => {
    const t = "join these unruly fruits in a 6-reel, 5-row paylines game with a max win of 10,000 times your bet!";
    expect(extraireLesFaits(t).grille).toBe('6 reels × 5 rows');
  });

  /* Des rouleaux sans rangées laisseraient deviner la hauteur. On se tait. */
  it('refuse la forme Amusnet, qui donne des rouleaux et des lignes', () => {
    expect(extraireLesFaits('video slot is a 5-reel, 10-line fixed game').grille).toBeNull();
  });

  it('ne devine rien quand le panneau montre la grille sans l\'écrire', () => {
    expect(extraireLesFaits('All symbols pay left to right from the leftmost reel.').grille).toBeNull();
  });
});

/*
 * Le cas qui a failli passer : 5 Lions Slot publie « 243 ways to win », et la
 * lecture rendait « 3,243 » — le chiffre d'à côté, collé par une espace. La
 * fiche portait déjà la bonne valeur, c'est elle qui a arrêté l'erreur ; sur
 * les quatre cents fiches muettes, rien ne l'aurait arrêtée.
 */
describe('le chiffre d\'à côté ne doit pas grossir le nombre', () => {
  it('ne prend pas l\'espace pour un séparateur de milliers', () => {
    expect(extraireLesFaits('Only 3 243 ways to win').lignes).toBe('243 ways to win');
  });

  it('accepte la virgule, qui ne s\'invente pas', () => {
    expect(extraireLesFaits('117,649 ways to win').lignes).toBe('117,649 ways to win');
  });
});

/*
 * Christmas Gift Rush publie « Lines are fixed at 1 - 3. » — le nombre de
 * lignes varie d'un tour à l'autre. La première version de la formule y lisait
 * « 1 » et l'a écrit en base : une fiche qui annonçait une seule ligne pour un
 * jeu qui peut en avoir trois.
 */
describe('une fourchette de lignes se lit comme une fourchette', () => {
  it('lit « Lines are fixed at 1 - 3 »', () => {
    expect(extraireLesFaits('Lines are fixed at 1 - 3.').lignes).toBe('1 to 3 fixed lines');
  });

  it('lit le tiret demi-cadratin que rend parfois l\'OCR', () => {
    expect(extraireLesFaits('Lines are fixed at 10 – 20.').lignes).toBe('10 to 20 fixed lines');
  });

  it('se tait sur un compte isolé trop bas pour être vrai', () => {
    expect(extraireLesFaits('Lines are fixed at 1.').lignes).toBeNull();
  });

  it('accepte toujours un compte ordinaire', () => {
    expect(extraireLesFaits('Lines are fixed at 25.').lignes).toBe('25 fixed lines');
  });
});

/*
 * Nolimit City : 45 panneaux avaient été comptés « muets » alors qu'ils
 * publient tous leur grille et leur compte de façons. Ils l'écrivent
 * simplement autrement — « win ways » plutôt que « ways to win », « up to
 * 6-row » plutôt qu'une hauteur fixe, et parfois rouleau par rouleau.
 */
describe('Nolimit City énonce sa grille autrement', () => {
  it('lit « 1024 win ways by default »', () => {
    const t = '1024 win ways by default (see pay table for more info).';
    expect(extraireLesFaits(t).lignes).toBe('1,024 win ways by default');
  });

  it('garde le « jusqu\'à » d\'une hauteur variable', () => {
    expect(extraireLesFaits('A 5-reel, up to 6-row video slot with 16 symbols.').grille)
      .toBe('5 reels × up to 6 rows');
  });

  it('lit une grille en dents de scie', () => {
    expect(extraireLesFaits('A 5-reel, 3-3-3-3-1 row setup.').grille)
      .toBe('5 reels, rows 3-3-3-3-1');
  });

  it('lit une hauteur fixe comme avant', () => {
    expect(extraireLesFaits('A 5-reel, 3-row video slot with 16 symbols.').grille)
      .toBe('5 reels × 3 rows');
  });
});

/*
 * Le nombre du titre n'est pas le nombre de lignes.
 *
 * Spinomenal 100 Juicy Fruits et 1spin4win Booming Fruits 100 portent tous deux
 * « 100 » dans leur nom, un sélecteur de lignes, et une démo qui s'ouvre à 10 et
 * 20 respectivement. Deux agents l'ont relevé le même jour sur deux studios
 * différents : c'est un piège de famille, pas un cas isolé.
 */
describe('des lignes que le joueur choisit ne sont pas des lignes fixes', () => {
  it('lit « The amount of lines ranges between 10-100 »', () => {
    const t = 'The player can choose how many lines to have active. The amount of lines ranges between 10-100.';
    expect(extraireLesFaits(t).lignes).toBe('10 to 100 selectable lines');
  });

  it('ne confond pas avec un compte fixe', () => {
    expect(extraireLesFaits('The game is set to 10 fixed lines.').lignes).toBe('10 fixed lines');
  });
});

/*
 * Das xBoot : « From 576 ways up to 75712 win ways. » La grille se transforme
 * en cours de partie. La formule attrapait 75 712 et signalait la fiche — qui
 * disait 576, la bonne valeur — comme fausse. Le lecteur avait tort, pas la
 * base : c'est le sens de l'erreur qui compte, et seule la règle « on n'écrit
 * que dans un champ vide » a évité d'écraser du juste par du faux.
 */
describe('une grille qui se transforme annonce deux nombres', () => {
  it('garde le départ et le maximum', () => {
    const t = 'From 576 ways up to 75712 win ways.';
    expect(extraireLesFaits(t).lignes).toBe('576 ways, up to 75,712');
  });

  it('lit toujours un compte simple quand il n\'y a pas de plage', () => {
    expect(extraireLesFaits('1024 win ways by default.').lignes).toBe('1,024 win ways by default');
  });
});

/*
 * Habanero compte ses façons comme ses lignes, et colle la mise dans la même
 * phrase : « Ways are fixed at 178 with total bet in coins fixed at 25. »
 * Ramasser le second nombre donnerait « 25 façons » sur un jeu qui en a 178.
 */
describe('Habanero fixe ses façons comme ses lignes', () => {
  it('lit « Ways are fixed at 178 »', () => {
    const t = 'Ways are fixed at 178 with total bet in coins fixed at 25.';
    expect(extraireLesFaits(t).lignes).toBe('178 ways');
  });

  it('ne confond pas avec le nombre de lignes', () => {
    const t = 'Lines are fixed at 10. Total bet in coins is 15 multiplied by the bet level.';
    expect(extraireLesFaits(t).lignes).toBe('10 fixed lines');
  });

  it('lit un compte de façons à quatre chiffres', () => {
    expect(extraireLesFaits('Ways are fixed at 707.').lignes).toBe('707 ways');
  });
});

/*
 * Aztec Smash est en base comme une grille 5×3 à 20 lignes de paiement. Son
 * panneau dit « The game is played on a 7x7 grid of symbols » et « All symbols
 * pay in blocks of minimum 5 symbols ». Sans cette formule, la confrontation
 * n'avait rien à comparer et la fiche passait pour concordante.
 */
describe('Pragmatic annonce sa grille d\'un bloc', () => {
  it('lit « played on a 7x7 grid of symbols »', () => {
    expect(extraireLesFaits('The game is played on a 7x7 grid of symbols.').grille)
      .toBe('7 reels × 7 rows');
  });

  it('accepte le signe multiplié que rend parfois l\'OCR', () => {
    expect(extraireLesFaits('The game is played on a 6×5 grid of symbols.').grille)
      .toBe('6 reels × 5 rows');
  });
});

/*
 * Crystopia publie « Ways are fixed at 27 - 1,728 » : ses symboles se scindent
 * en deux ou quatre, d'où 12 symboles par rouleau et 12³ = 1 728. La formule
 * n'a gardé que 27 et l'a écrit en base — la fiche décrivait le jeu à son état
 * le plus pauvre. La leçon des fourchettes avait été apprise sur les lignes et
 * ne s'était pas propagée aux façons.
 */
describe('une fourchette de façons se lit comme une fourchette', () => {
  it('lit « Ways are fixed at 27 - 1,728 »', () => {
    const t = 'Ways are fixed at 27 - 1,728 with total bet in coins fixed at 9.';
    expect(extraireLesFaits(t).lignes).toBe('27 to 1,728 ways');
  });

  it('lit toujours un compte unique', () => {
    expect(extraireLesFaits('Ways are fixed at 243.').lignes).toBe('243 ways');
  });
});

/*
 * L'OCR rogne le dernier mot de la phrase d'Amusnet : « …20-line fixed yo » au
 * lieu de « fixed game ». Exiger « game » laissait le champ vide sur une phrase
 * parfaitement lisible à l'image.
 */
describe('la phrase d\'Amusnet survit à un mot rogné', () => {
  it('lit la phrase même quand « game » est mangé', () => {
    const t = '20 Golden Coins - Christmas Edition video slot is a 5-reel, 20-line fixed yo';
    expect(extraireLesFaits(t).lignes).toBe('20 fixed lines');
  });
});
