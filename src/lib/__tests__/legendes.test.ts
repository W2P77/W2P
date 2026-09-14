/**
 * Une capture sans légende est une capture qui ne prouve rien.
 *
 * 5 018 des 6 777 captures sortaient nues du pipeline, et les 1 759 autres
 * étaient en anglais sur les trois versions du site. Ces tests fixent les deux
 * garanties : chaque capture reçoit un texte, et ce texte parle la langue du
 * visiteur.
 */
import { describe, it, expect } from 'vitest';

import {
  legendeDeCapture,
  legendesDeCaptures,
  lireCapture,
  lirePageDeRegles,
  lectureStockee,
  legendesEcrites,
  typeDeCapture,
  LEGENDES_ECRITES,
} from '../legendes';

const FAITS = { slug: 'sweet-bonanza', nom: 'Sweet Bonanza', rtp: 96.51, gainMax: 21100, volatilite: 'TRES_HAUTE' };

describe('légendes de captures', () => {
  it('reconnaît ce que montre la capture', () => {
    expect(typeDeCapture('The base game')).toBe('base');
    expect(typeDeCapture('How to play')).toBe('commandes');
    expect(typeDeCapture('Settings menu')).toBe('reglages');
    expect(typeDeCapture('Autoplay')).toBe('auto');
    expect(typeDeCapture('Max win')).toBe('plafond');
    expect(typeDeCapture('Symbol values')).toBe('symboles');
    expect(typeDeCapture('Free spins and ante bet')).toBe('mecanique');
    expect(typeDeCapture('Game rules, page 3')).toBe('regles');
    expect(typeDeCapture('The studio states its own RTP')).toBe('chiffres');
  });

  it('ne laisse aucune capture sans texte, dans les trois langues', () => {
    for (const titre of ['The base game', 'How to play', 'Settings menu', 'Autoplay', 'Game rules, page 2', 'Max win']) {
      for (const langue of ['en', 'fr', 'de'] as const) {
        const texte = legendeDeCapture({ titre, legende: '' }, FAITS, langue);
        expect(texte.length).toBeGreaterThan(20);
      }
    }
  });

  /*
   * Les espaces des nombres formatés sont des espaces fines insécables
   * (U+202F en français, U+00A0 ailleurs) : on compare sur une base
   * normalisée plutôt que de recopier des caractères invisibles dans le test.
   */
  const sansEspacesFines = (t: string) => t.replace(/[\u202f\u00a0]/g, ' ');

  it('écrit les chiffres dans la langue du visiteur', () => {
    const titre = 'The studio states its own RTP';
    expect(sansEspacesFines(legendeDeCapture({ titre }, FAITS, 'en'))).toBe(
      'Stated by the game itself: RTP 96.51 % · max win 21,100× · volatility stated as very high.',
    );
    expect(sansEspacesFines(legendeDeCapture({ titre }, FAITS, 'fr'))).toBe(
      'Annoncé par le jeu lui-même : RTP 96,51 % · gain maximum 21 100× · volatilité annoncée très haute.',
    );
    expect(sansEspacesFines(legendeDeCapture({ titre }, FAITS, 'de'))).toBe(
      'Vom Spiel selbst angegeben: RTP 96,51 % · Höchstgewinn 21.100× · Volatilität als sehr hoch angegeben.',
    );
  });

  it('attribue la volatilité au jeu plutôt que de l’affirmer', () => {
    const texte = legendeDeCapture({ titre: 'The studio states its own RTP' }, FAITS, 'fr');
    expect(texte).toContain('volatilité annoncée');
  });

  it('sans chiffres connus, la page des chiffres reste décrite', () => {
    const sans = { ...FAITS, rtp: null, gainMax: null, volatilite: null };
    expect(legendeDeCapture({ titre: 'The studio states its own RTP' }, sans, 'fr')).toContain('panneau de règles');
  });

  it('régénère les formules du pipeline, garde ce qui est écrit', () => {
    const canned = 'Sweet Bonanza as the demo opens it, before any spin.';
    expect(legendeDeCapture({ titre: 'The base game', legende: canned }, FAITS, 'fr')).toBe(
      "Sweet Bonanza à l'ouverture de la démo, avant le moindre tour.",
    );
    const ecrite = 'Une phrase écrite à la main pour cette capture précise.';
    expect(legendeDeCapture({ titre: 'Game rules, page 1', legende: ecrite }, FAITS, 'fr')).toBe(ecrite);
  });

  it('préfère la légende écrite à la main, traduite', () => {
    const faits = { ...FAITS, slug: 'gates-of-olympus', nom: 'Gates of Olympus' };
    const fr = legendeDeCapture({ titre: 'The base game', legende: 'peu importe' }, faits, 'fr');
    expect(fr).toContain('Six rouleaux, cinq rangées');
    const de = legendeDeCapture({ titre: 'Tumble and multipliers' }, faits, 'de');
    expect(de).toContain('Gewinnsymbole verschwinden');
  });

  it('les six légendes de référence existent dans les trois langues', () => {
    const goo = LEGENDES_ECRITES['gates-of-olympus'];
    expect(Object.keys(goo)).toHaveLength(6);
    for (const par of Object.values(goo)) for (const langue of ['en', 'fr', 'de'] as const) {
      expect(par[langue].length).toBeGreaterThan(60);
    }
  });
});

/**
 * Ce que la page de règles dit, dans la langue du visiteur.
 *
 * Les captures sont prises en anglais : un visiteur français ou allemand
 * regarde une image dont il ne lit pas le contenu. Ces tests fixent les trois
 * garanties qui rendent la restitution acceptable — elle ne parle que de ce
 * qu'elle a reconnu, elle se tait quand elle doute, et elle ne recopie aucun
 * chiffre lu dans l'image.
 *
 * Les extraits ci-dessous sont des relevés d'OCR **réels**, pris sur les
 * captures en ligne de Bell Wizard (Wazdan) et 3 Buzzing Wilds (Pragmatic).
 */
describe('légendes tirées du texte de la page', () => {
  const PAGE_FORMATION_DES_GAINS =
    'GAME RULES All wins are paid for combinations of the same symbol on active line, ' +
    'from left to right, except SCATTER, which pays at any position on the reels. ' +
    'Each new game costs one stake. On active line only higher win is paid.';

  const PAGE_TABLE_DE_GAINS =
    'GAME RULES X5 90.00 FUN X4 6.00 FUN X3 0.90 FUN X5 24.00 FUN X4 2.40 FUN ' +
    'X3 0.45 FUN X5 12.00 FUN X4 2.10 FUN X3 0.36 FUN';

  const PAGE_RTP =
    'GAME RULES Malfunction voids all pays and plays. Game average return to player: 96.50% ' +
    'MAIN GAME Play Button Click to start playing at the current bet level.';

  const PAGE_ILLISIBLE = 'Qganvie rullo Mve nvlld K 9 7 a xr fo Itvividll tt lmt vinl';

  it('reconnaît le sujet de la page dans le texte du studio', () => {
    expect(lirePageDeRegles(PAGE_FORMATION_DES_GAINS)?.sujet).toBe('formationDesGains');
    expect(lirePageDeRegles(PAGE_TABLE_DE_GAINS)?.sujet).toBe('tableDeGains');
    expect(lirePageDeRegles(PAGE_RTP)?.sujet).toBe('chiffresDuJeu');
  });

  it('se tait quand elle ne reconnaît rien', () => {
    expect(lirePageDeRegles(PAGE_ILLISIBLE)).toBeNull();
    expect(lirePageDeRegles('')).toBeNull();
    expect(lirePageDeRegles(null)).toBeNull();
    // Et la capture retombe alors sur la légende générique, qui est vraie.
    expect(legendeDeCapture({ titre: 'Game rules, page 4', texte: PAGE_ILLISIBLE }, FAITS, 'fr')).toBe(
      "Une page du panneau de règles, telle que le jeu l'affiche.",
    );
  });

  it('restitue dans les trois langues ce que la page explique', () => {
    const attendu: Record<'en' | 'fr' | 'de', string> = {
      fr: 'de gauche à droite sur les lignes actives',
      en: 'from left to right on the active paylines',
      de: 'von links nach rechts auf den aktiven Gewinnlinien',
    };
    for (const langue of ['en', 'fr', 'de'] as const) {
      const texte = legendeDeCapture({ titre: 'Game rules, page 2', texte: PAGE_FORMATION_DES_GAINS }, FAITS, langue);
      expect(texte).toContain(attendu[langue]);
      // Le Scatter qui paie partout est dit, parce que le panneau le dit.
      expect(texte.length).toBeGreaterThan(80);
    }
  });

  /*
   * Le cœur de la règle « on n'invente rien » : la table de gains est montrée,
   * jamais transcrite. Vingt-sept petits nombres recopiés d'une image, c'est la
   * façon la plus sûre d'introduire une erreur — et elle serait publiée sous la
   * signature du site, dans trois langues.
   */
  it('ne recopie aucune valeur de symbole lue dans la table de gains', () => {
    for (const langue of ['en', 'fr', 'de'] as const) {
      const texte = legendeDeCapture({ titre: 'Game rules, page 1', texte: PAGE_TABLE_DE_GAINS }, FAITS, langue);
      expect(texte).not.toMatch(/90|24|12|0[.,]45|0[.,]36|FUN/);
    }
  });

  it('les chiffres de la légende viennent de la fiche, pas de cette lecture-ci', () => {
    // Le panneau lu annonce 96,50 % ; la fiche porte 96,51 %, vérifié à la
    // campagne et borné. C'est la fiche qui parle : une seconde lecture d'OCR
    // n'a pas à contredire en légende ce que la page affiche en grand.
    const texte = legendeDeCapture({ titre: 'Game rules, page 4', texte: PAGE_RTP }, FAITS, 'fr');
    expect(texte).toContain('96,51');
    expect(texte).not.toContain('96,50');
  });

  it('un nom de page donné par le studio l’emporte sur la déduction', () => {
    /*
     * « BUY FREE SPINS » est un bouton permanent de l'habillage Pragmatic : il
     * figure sur des pages qui ne parlent pas d'achat. Sur 3 Buzzing Wilds, il
     * faisait passer la page « Expanding wilds » pour une page d'achat.
     */
    const texte = legendeDeCapture(
      { titre: 'Expanding wilds', texte: 'GAME RULES BUY FREE SPINS expanding wild symbol' },
      FAITS,
      'fr',
    );
    expect(texte).toBe('La mécanique expliquée par le jeu lui-même, dans ses propres termes.');
  });

  it('ne dépasse pas cinq phrases, chiffres compris', () => {
    const pragmatic =
      'GAME RULES LOW VOLATILITY All symbols pay from left to right on selected paylines. ' +
      'All wins are multiplied by bet per line. Only the highest win is paid per line. ' +
      'When winning on multiple paylines, all wins are added to the total win. ' +
      'The maximum RTP of this game is 96.03% The minimum RTP of this game is 96.02% ' +
      'The maximum RTP of the game when using "BUY FREE SPINS" is 96.02% ' +
      'MINIMUM BET: $0.20 MAXIMUM BET: $240.00 Malfunction voids all pays and plays.';
    for (const langue of ['en', 'fr', 'de'] as const) {
      const texte = legendeDeCapture({ titre: 'Game rules, page 4', texte: pragmatic }, FAITS, langue);
      expect(texte.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(5);
      // Le RTP de l'achat n'est pas celui du jeu : c'est le contresens le plus
      // fréquent du secteur, il ne doit jamais être la phrase qu'on coupe.
      expect(texte).toMatch(/bought feature|partie achetée|gekaufte Feature/);
    }
  });

  it('signale la suite plutôt que de répéter la même phrase', () => {
    const lot = [
      { titre: 'Game rules, page 1', texte: PAGE_TABLE_DE_GAINS },
      { titre: 'Game rules, page 2', texte: PAGE_TABLE_DE_GAINS },
    ];
    const [premiere, seconde] = legendesDeCaptures(lot, FAITS, 'fr');
    expect(premiere).not.toContain('Suite');
    expect(seconde).toContain('Suite de la page précédente.');
    expect(seconde.startsWith(premiere)).toBe(true);
  });

  it('deux pages illisibles ne sont pas « la suite » l’une de l’autre', () => {
    const lot = [
      { titre: 'Game rules, page 6', texte: PAGE_ILLISIBLE },
      { titre: 'Game rules, page 7', texte: PAGE_ILLISIBLE },
    ];
    expect(legendesDeCaptures(lot, FAITS, 'fr').every((l) => !l.includes('Suite'))).toBe(true);
  });

  /*
   * « Land 3 FS scatter symbols » et « Land 4 FS scatter symbols » cohabitent
   * sur la même page chez Hacksaw : deux bonus distincts. Retenir le premier
   * publierait un déclenchement faux.
   */
  it('ne lit un nombre neuf que si la page est unanime', () => {
    const unique = 'BONUS Land 3 FS scatter symbols at the same time in the base game to activate the bonus feature with 10 free spins.';
    expect(legendeDeCapture({ titre: 'Game rules, page 2', texte: unique }, FAITS, 'fr')).toContain(
      '3 Scatters simultanés',
    );
    const contradictoire = `${unique} Land 4 FS scatter symbols at the same time to activate the second bonus feature.`;
    expect(legendeDeCapture({ titre: 'Game rules, page 2', texte: contradictoire }, FAITS, 'fr')).not.toContain(
      'Scatters simultanés',
    );
  });

  it('la volatilité lue dans le panneau n’est jamais republiée telle quelle', () => {
    /*
     * Chez Wazdan, une section « Volatility Levels » décrit un **réglage** du
     * joueur, pas le jeu : l'y lire aurait étiqueté 259 fiches sur 261 en
     * « volatilité haute ». La reconnaître aide à situer la page ; la répéter
     * serait faux. Seule la valeur de la fiche a le droit d'être dite.
     */
    const page = 'GAME RULES VOLATILITY LEVELS High volatility Low volatility Medium volatility';
    const sans = { ...FAITS, rtp: null, gainMax: null, volatilite: null };
    const texte = legendeDeCapture({ titre: 'Game rules, page 3', texte: page }, sans, 'fr');
    expect(texte).not.toMatch(/volatilité (?:haute|basse|moyenne)/);
  });

  /*
   * ── Ce que la base porte, et ce que le site en fait ─────────────────────
   *
   * La reconnaissance se fait une fois, au moment de la capture, et c'est son
   * verdict qui est rangé dans la fiche — pas le texte OCR, qui coûterait une
   * dizaine de kilooctets par fiche envoyés au navigateur pour n'être affiché
   * dans aucune des trois langues.
   *
   * Deux chemins, donc, et une seule phrase attendue au bout : ce qu'un script
   * montre en simulation doit être exactement ce que le visiteur lira.
   */
  describe('la lecture rangée dans la capture', () => {
    it('donne la même phrase que le texte dont elle est tirée', () => {
      for (const page of [PAGE_FORMATION_DES_GAINS, PAGE_TABLE_DE_GAINS, PAGE_RTP]) {
        for (const langue of ['en', 'fr', 'de'] as const) {
          const parLeTexte = legendeDeCapture({ titre: 'Game rules, page 2', texte: page }, FAITS, langue);
          // Le passage par JSON n'est pas décoratif : c'est le voyage réel du
          // champ, de la colonne `captures` jusqu'au composant.
          const parLaLecture = legendeDeCapture(
            { titre: 'Game rules, page 2', lecture: JSON.parse(JSON.stringify(lireCapture(page))) },
            FAITS,
            langue,
          );
          expect(parLaLecture).toBe(parLeTexte);
        }
      }
    });

    it('emporte les chiffres de déclenchement, seul endroit où ils se lisent', () => {
      const page =
        'BONUS Land 3 FS scatter symbols at the same time in the base game to activate ' +
        'the bonus feature with 10 free spins.';
      const lecture = lireCapture(page);
      expect(lecture?.scatters).toBe(3);
      expect(lecture?.tours).toBe(10);
      expect(legendeDeCapture({ titre: 'Game rules, page 2', lecture }, FAITS, 'fr')).toContain(
        '3 Scatters simultanés',
      );
    });

    /*
     * Le champ vient d'une colonne JSON écrite par un script : entre l'écriture
     * et la lecture, rien ne garantit sa forme. Une fiche ne tombe pas pour
     * autant — la légende générique reprend la main, comme sur une page
     * illisible.
     */
    it('retombe sur le modèle générique devant une forme inattendue', () => {
      for (const valeur of [null, 'tableDeGains', 42, {}, { sujet: 'cequejeveux' }, []]) {
        expect(lectureStockee(valeur)).toBeNull();
        expect(legendeDeCapture({ titre: 'Game rules, page 5', lecture: valeur }, FAITS, 'fr')).toBe(
          "Une page du panneau de règles, telle que le jeu l'affiche.",
        );
      }
    });

    /*
     * « Lue, rien de sûr » et « pas encore lue » sont deux états distincts :
     * c'est ce qui permet au rattrapage de reprendre une passe de quatre heures
     * sans relire ce qui l'a déjà été. Les deux affichent la même phrase.
     */
    it('ne dit rien de plus quand la page a été lue sans rien donner', () => {
      expect(lireCapture(PAGE_ILLISIBLE)).toBeNull();
      expect(legendeDeCapture({ titre: 'Game rules, page 6', lecture: null }, FAITS, 'de')).toBe(
        'Eine Seite des Regelwerks, wie das Spiel sie zeigt.',
      );
    });
  });

  /*
   * ── La famille « Hold the Jackpot » de Wazdan ──────────────────────────
   *
   * Un quart des pages de panneau du site. Les extraits ci-dessous sont l'OCR
   * réel de 12 Bells et de Mighty Wild: Panther, recopié tel quel, coquilles
   * de Tesseract comprises : c'est ce que la passe voit, et le test ne vaut
   * que s'il lit la même chose qu'elle.
   */
  /*
   * Les légendes écrites à la main, rangées dans la capture.
   *
   * Elles doivent gagner sur tout le reste — y compris sur une page que l'OCR
   * sait parfaitement lire — parce que quelqu'un a regardé l'image. Et une
   * forme inattendue ne doit jamais faire tomber une fiche : le champ vient
   * d'une colonne JSON qu'un script remplit.
   */
  describe('une légende écrite à la main', () => {
    const REGLES = 'Game rules, page 2';
    const ECRITE = {
      fr: 'La grille en 6×5 sans ligne de paiement, et le bouton d’achat à 100× la mise.',
      en: 'The 6×5 grid with no paylines, and the buy button at 100× the bet.',
      de: 'Das 6×5-Raster ohne Gewinnlinien und die Kauftaste zum 100-fachen Einsatz.',
    };

    it('passe avant la lecture de la page, dans chaque langue', () => {
      const capture = { titre: REGLES, lecture: lireCapture('GAME RULES. Wins pay only from left to right, on adjacent reels.'), legendes: ECRITE };
      expect(legendeDeCapture(capture, FAITS, 'fr')).toBe(ECRITE.fr);
      expect(legendeDeCapture(capture, FAITS, 'en')).toBe(ECRITE.en);
      expect(legendeDeCapture(capture, FAITS, 'de')).toBe(ECRITE.de);
    });

    /* Le texte doit dépasser les 40 caractères qu'exige le lecteur : en deçà,
       il rend `null` plutôt que de juger une page sur trois mots. */
    it('laisse la lecture reprendre la main sur une langue pas encore écrite', () => {
      const capture = { titre: REGLES, lecture: lireCapture('GAME RULES. Wins pay only from left to right, on adjacent reels.'), legendes: { fr: ECRITE.fr } };
      expect(legendeDeCapture(capture, FAITS, 'fr')).toBe(ECRITE.fr);
      expect(legendeDeCapture(capture, FAITS, 'de')).toContain('von links nach rechts');
    });

    it('ignore une forme inattendue plutôt que de faire tomber la fiche', () => {
      for (const valeur of [null, 'texte', 42, [], { fr: 42 }, { fr: '   ' }, { xx: 'bonjour' }]) {
        expect(legendesEcrites(valeur)).toEqual({});
        expect(legendeDeCapture({ titre: REGLES, legendes: valeur }, FAITS, 'fr')).toBe(
          "Une page du panneau de règles, telle que le jeu l'affiche.",
        );
      }
    });

    /*
     * Deux pages voisines écrites à la main disent deux choses différentes :
     * les marquer « Suite de la page précédente » serait faux.
     */
    it('n’est jamais marquée comme la suite de la précédente', () => {
      const memes = [
        { titre: 'Game rules, page 1', legendes: { fr: 'La même phrase.' } },
        { titre: 'Game rules, page 2', legendes: { fr: 'La même phrase.' } },
      ];
      expect(legendesDeCaptures(memes, FAITS, 'fr')).toEqual(['La même phrase.', 'La même phrase.']);
    });
  });

  describe('le panneau de Wazdan', () => {
    const DECLENCHEMENT =
      "Drawing at least 6 Hold the Jackpot Bonus symbols activates the Hold the Jackpot Bonus Game. " +
      'There are no regular symbols in the base game and prizes can only be won in the Bonus Game.';
    const RESPINS =
      'All Bonus symbols stick to the reels during the Bonus Game. ' +
      '3 Re-Spins are granted at the beginning of the Bonus Game. ' +
      'Each new Bonus symbol resets the number of Re-Spins to 3. ' +
      'The Bonus Game continues until Re-Spins are finished, or all reels are filled with Bonus symbols.';

    const WAZDAN = { slug: '12-bells', nom: '12 Bells', rtp: null, gainMax: null, volatilite: null };

    it('reconnaît la mécanique là où le vocabulaire « hold & win » ne voyait rien', () => {
      expect(lirePageDeRegles(DECLENCHEMENT)?.sujet).toBe('holdAndWin');
      expect(lirePageDeRegles(RESPINS)?.sujet).toBe('holdAndWin');
    });

    /*
     * C'est tout l'objet du chantier : deux pages du même panneau ne peuvent
     * pas recevoir la même phrase. Avant, elles en recevaient une seule pour
     * sept pages.
     */
    it('donne deux phrases différentes à deux pages différentes', () => {
      const a = legendeDeCapture({ titre: 'Game rules, page 1', lecture: lireCapture(DECLENCHEMENT) }, WAZDAN, 'fr');
      const b = legendeDeCapture({ titre: 'Game rules, page 3', lecture: lireCapture(RESPINS) }, WAZDAN, 'fr');
      expect(a).not.toBe(b);
      expect(a).toContain('jeu bonus Hold the Jackpot');
      expect(b).toContain('compteur de re-spins');
    });

    /*
     * Le chiffre du déclenchement change à l'intérieur de la même famille —
     * « at least 6 » sur Mighty Wild: Panther, « 4 … on the middle row » sur
     * 12 Bells. Le recopier publierait un déclenchement faux sur la fiche
     * voisine, qui rejoue le même texte au mot près.
     */
    it('ne recopie aucun chiffre lu dans l\'image', () => {
      for (const langue of ['fr', 'en', 'de'] as const) {
        const legende = legendeDeCapture(
          { titre: 'Game rules, page 1', lecture: lireCapture(DECLENCHEMENT) },
          WAZDAN,
          langue,
        );
        expect(legende).not.toMatch(/\d/);
      }
    });
  });
});
