import { describe, expect, it } from 'vitest';
import {
  analyserRapport,
  estAbsent,
  formeComparable,
  niveauDePreuve,
  slugifier,
} from '@/lib/veille/analyser-rapport';

/** Un bloc minimal, complété au cas par cas. */
function bloc(champs: Record<string, string>): string {
  return Object.entries(champs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

describe('les mots qui disent « je ne sais pas »', () => {
  it('reconnaît les absences dans les deux langues et sans accents', () => {
    for (const mot of ['INCONNUE', 'inconnue', 'NON_PUBLIE', 'AUCUNE', 'INTROUVABLE', 'N/A', '-', '']) {
      expect(estAbsent(mot), mot).toBe(true);
    }
    expect(estAbsent('96.50')).toBe(false);
    expect(estAbsent('Cluster Pays')).toBe(false);
  });

  it('ne recopie jamais un mot d’absence dans un champ texte', () => {
    const [f] = analyserRapport(bloc({ NOM: 'Test', GRILLE: 'INCONNUE', LIGNES: 'INCONNUES' }));
    expect(f.grille).toBeNull();
    expect(f.lignesPaiement).toBeNull();
  });
});

describe('le RTP n’entre qu’avec sa provenance', () => {
  it('refuse un RTP sans URL de source, et le dit', () => {
    const [f] = analyserRapport(bloc({ NOM: 'Sans source', RTP: '96.50', RTP_SOURCE: 'AUCUNE' }));
    expect(f.rtpStudio).toBeNull();
    expect(f.reserves.join(' ')).toMatch(/sans URL de source/);
  });

  it('accepte un RTP accompagné de son URL', () => {
    const [f] = analyserRapport(
      bloc({ NOM: 'Avec source', RTP: '96,50 %', RTP_SOURCE: 'https://www.pragmaticplay.com/en/games/x/' }),
    );
    expect(f.rtpStudio).toBe(96.5);
    expect(f.rtpSource).toBe('https://www.pragmaticplay.com/en/games/x/');
  });

  it('refuse un RTP hors de la plage plausible plutôt que de l’écrire', () => {
    const [f] = analyserRapport(
      bloc({ NOM: 'Aberrant', RTP: '9650', RTP_SOURCE: 'https://www.pragmaticplay.com/x' }),
    );
    expect(f.rtpStudio).toBeNull();
    expect(f.reserves.join(' ')).toMatch(/hors plage/);
  });
});

describe('les paliers d’opérateur', () => {
  it('les range du plus haut au plus bas', () => {
    const [f] = analyserRapport(
      bloc({
        NOM: 'Paliers',
        RTP: '96.50',
        RTP_PALIERS: '94.50 / 96.50 / 95.50',
        RTP_SOURCE: 'https://www.pragmaticplay.com/x',
      }),
    );
    expect(f.rtpPaliers).toEqual([96.5, 95.5, 94.5]);
  });

  it('refuse tout le lot quand un palier dépasse le RTP annoncé', () => {
    /*
     * C'est la signature d'un RTP d'achat de bonus pris pour celui du jeu.
     * Écrire quand même reviendrait à publier la valeur haute d'un autre mode.
     */
    const [f] = analyserRapport(
      bloc({
        NOM: 'Contradictoire',
        RTP: '94.20',
        RTP_PALIERS: '96.20 / 94.20',
        RTP_SOURCE: 'https://nolimitcity.com/games/x',
      }),
    );
    expect(f.rtpStudio).toBeNull();
    expect(f.rtpPaliers).toEqual([]);
    expect(f.rtpSource).toBeNull();
    expect(f.reserves.join(' ')).toMatch(/dépasse le RTP annoncé/);
  });
});

describe('le niveau de preuve', () => {
  const site = 'https://www.pragmaticplay.com';

  it('exige le domaine du studio pour le niveau STUDIO', () => {
    expect(niveauDePreuve('https://www.pragmaticplay.com/en/games/x/', site)).toBe('STUDIO');
    expect(niveauDePreuve('https://static.pragmaticplay.com/x.json', site)).toBe('STUDIO');
  });

  it('classe la presse spécialisée en RECOUPE', () => {
    expect(niveauDePreuve('https://slotbeats.com/news/x', site)).toBe('RECOUPE');
  });

  it('ne se laisse pas prendre à un domaine sosie', () => {
    /* La sous-chaîne « pragmaticplay.com » est bien présente, le domaine non. */
    expect(niveauDePreuve('https://pragmaticplay.com.exemple.net/x', site)).toBe('RECOUPE');
  });

  it('retombe à AUCUNE sans source, et sur une URL illisible', () => {
    expect(niveauDePreuve(null, site)).toBe('AUCUNE');
    expect(niveauDePreuve('pas une url', site)).toBe('AUCUNE');
  });
});

describe('le gain maximum', () => {
  it('lit les écritures usuelles du multiple', () => {
    const cas: Array<[string, number]> = [
      ['5000', 5000], ['5 000', 5000], ['5,000', 5000], ['x5000', 5000],
      ['60000x', 60000], ['12.500', 12500],
    ];
    for (const [ecrit, attendu] of cas) {
      const [f] = analyserRapport(bloc({ NOM: 'G', GAIN_MAX: ecrit }));
      expect(f.gainMaxMultiple, ecrit).toBe(attendu);
    }
  });

  it('refuse une valeur exprimée sur une autre base plutôt que de convertir', () => {
    for (const ecrit of ['500 000 €', '75 EUR', '10000x par ligne', '2000 per line']) {
      const [f] = analyserRapport(bloc({ NOM: 'G', GAIN_MAX: ecrit }));
      expect(f.gainMaxMultiple, ecrit).toBeNull();
      expect(f.reserves.join(' '), ecrit).toMatch(/autre base|illisible/);
    }
  });
});

describe('la date de sortie', () => {
  it('accepte une date normalisée', () => {
    const [f] = analyserRapport(bloc({ NOM: 'D', SORTIE: '2026-07-24' }));
    expect(f.sortieLe).toBe('2026-07-24');
  });

  it('refuse une date invraisemblable ou mal formée', () => {
    for (const ecrit of ['juillet 2026', '24/07/2026', '2031-01-01', '1970-01-01']) {
      const [f] = analyserRapport(bloc({ NOM: 'D', SORTIE: ecrit }));
      expect(f.sortieLe, ecrit).toBeNull();
      expect(f.reserves.length, ecrit).toBeGreaterThan(0);
    }
  });
});

describe('la démo', () => {
  it('refuse une URL d’agrégateur — elle enverrait le visiteur chez un concurrent', () => {
    const [f] = analyserRapport(bloc({ NOM: 'X', DEMO: 'https://slotcatalog.com/en/slots/x' }));
    expect(f.demoUrl).toBeNull();
    expect(f.reserves.join(' ')).toMatch(/agrégateur/);
  });

  it('garde une démo officielle', () => {
    const [f] = analyserRapport(bloc({ NOM: 'X', DEMO: 'https://demogamesfree.pragmaticplay.net/x' }));
    expect(f.demoUrl).toBe('https://demogamesfree.pragmaticplay.net/x');
  });
});

describe('la lecture du rapport', () => {
  it('découpe plusieurs blocs et retient le studio de chacun', () => {
    const rapport = [
      'Voici ce que j’ai trouvé :',
      '',
      'STUDIO: Nolimit City',
      'NOM: Fire in the Hole 3',
      'VOLATILITE: TRES_HAUTE',
      '',
      'STUDIO: Hacksaw Gaming',
      'NOM: Le Pharaoh 2',
      'VOLATILITE: VERY_HIGH',
      '',
      'Synthèse : 2 jeux trouvés.',
    ].join('\n');

    const fiches = analyserRapport(rapport);
    expect(fiches).toHaveLength(2);
    expect(fiches[0].nom).toBe('Fire in the Hole 3');
    expect(fiches[0].volatilite).toBe('TRES_HAUTE');
    expect(fiches[1].studio).toBe('Hacksaw Gaming');
    expect(fiches[1].volatilite).toBe('TRES_HAUTE');
  });

  it('n’attribue pas au bloc suivant un champ resté du précédent', () => {
    const rapport = ['NOM: Premier', 'GAIN_MAX: 5000', '', 'NOM: Second'].join('\n');
    const fiches = analyserRapport(rapport);
    expect(fiches[0].gainMaxMultiple).toBe(5000);
    expect(fiches[1].gainMaxMultiple).toBeNull();
  });

  it('garde le studio annoncé une seule fois pour toute une série', () => {
    /*
     * Un rapport mono-studio annonce « STUDIO: » en tête, puis enchaîne les
     * jeux. Repartir de zéro à chaque `NOM:` ferait perdre le studio à tous
     * les jeux sauf le premier — sans erreur, juste des fiches orphelines.
     */
    const rapport = ['STUDIO: Pragmatic Play', 'NOM: Premier', '', 'NOM: Deuxième', '', 'NOM: Troisième'].join('\n');
    const fiches = analyserRapport(rapport);
    expect(fiches.map((f) => f.studio)).toEqual(['Pragmatic Play', 'Pragmatic Play', 'Pragmatic Play']);
  });

  it('ne crée pas de fiche pour un « STUDIO: » de synthèse sans jeu', () => {
    const fiches = analyserRapport('STUDIO: Play\u2019n GO\nSynthèse : aucun jeu trouvé.');
    expect(fiches).toEqual([]);
  });

  it('applique le studio par défaut quand le rapport ne porte que sur un studio', () => {
    const [f] = analyserRapport('NOM: Gates of Olympus 3', 'Pragmatic Play');
    expect(f.studio).toBe('Pragmatic Play');
    expect(f.slug).toBe('gates-of-olympus-3');
  });

  it('ignore le texte libre autour des blocs', () => {
    expect(analyserRapport('Bonjour, rien à signaler.')).toEqual([]);
  });
});

describe('les slugs', () => {
  it('translittère et développe l’esperluette', () => {
    expect(slugifier('Stars & Stripes: Hold and Win')).toBe('stars-and-stripes-hold-and-win');
    expect(slugifier('Récif Doré')).toBe('recif-dore');
  });

  it('rapproche deux écritures du même jeu', () => {
    expect(formeComparable('The Dog House')).toBe(formeComparable('the-dog-house'));
    expect(formeComparable('Big Bass Bonanza')).not.toBe(formeComparable('Big Bass Bonanza 2'));
  });
});

describe('l’achat de bonus', () => {
  it('lit oui, non, et l’ignorance', () => {
    const oui = analyserRapport(bloc({ NOM: 'A', ACHAT_BONUS: 'OUI' }))[0];
    const non = analyserRapport(bloc({ NOM: 'B', ACHAT_BONUS: 'NON' }))[0];
    const rien = analyserRapport(bloc({ NOM: 'C', ACHAT_BONUS: 'INCONNU' }))[0];
    expect(oui.achatBonus).toBe(true);
    expect(non.achatBonus).toBe(false);
    expect(rien.achatBonus).toBeNull();
  });
});
