/**
 * Une capture sans légende est une capture qui ne prouve rien.
 *
 * 5 018 des 6 777 captures sortaient nues du pipeline, et les 1 759 autres
 * étaient en anglais sur les trois versions du site. Ces tests fixent les deux
 * garanties : chaque capture reçoit un texte, et ce texte parle la langue du
 * visiteur.
 */
import { describe, it, expect } from 'vitest';

import { legendeDeCapture, typeDeCapture, LEGENDES_ECRITES } from '../legendes';

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
