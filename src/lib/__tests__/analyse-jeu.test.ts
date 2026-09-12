/**
 * Le texte d'analyse ne doit jamais dire plus que la base.
 *
 * C'est un générateur de prose posé sur des faits : le risque n'est pas qu'il
 * plante, c'est qu'il écrive une phrase bien tournée et fausse. Ces tests
 * tiennent les trois endroits où ça s'est produit — un champ absent qui
 * produit quand même une phrase, un multiple de table live présenté comme un
 * multiple de mise totale, et une FAQ qui pose une question dont elle n'a pas
 * la réponse.
 */
import { describe, expect, it } from 'vitest';

import {
  sectionsAnalyse,
  questionsFrequentes,
  baliseFaq,
  estUneTableLive,
  type FaitsDuJeu,
} from '../analyse-jeu';
import { LANGUES } from '../../i18n/langues';

const VIDE: FaitsDuJeu = {
  nom: 'Test Slot',
  studio: 'Test Studio',
  rtp: null,
  paliers: [],
  rtpAchatBonus: null,
  rtpSource: null,
  rtpConfiance: 'AUCUNE',
  volatilite: null,
  gainMax: null,
  grille: null,
  lignes: null,
  mecaniques: [],
  achatBonus: null,
  sortieLe: null,
  capturesLe: null,
  nbCaptures: 0,
  nbCasinos: 0,
  demo: false,
  estLive: false,
};

const texte = (f: FaitsDuJeu, l: 'en' | 'fr' | 'de') =>
  sectionsAnalyse(f, l)
    .flatMap((s) => [s.titre, ...s.paragraphes])
    .join(' ');

describe('les sections dérivées', () => {
  it('n’écrit aucun chiffre quand la base n’en a aucun', () => {
    for (const { code } of LANGUES) {
      const t = texte(VIDE, code);
      expect(t, code).not.toMatch(/\d/);
    }
  });

  it('dit l’absence de volatilité au lieu de la supposer', () => {
    const fr = texte(VIDE, 'fr');
    expect(fr).toContain('n’a pas de volatilité publiée');
    expect(fr).not.toMatch(/volatilité moyenne/i);
  });

  it('reprend le RTP et sa source sans les arrondir', () => {
    const f = { ...VIDE, rtp: 96.07, rtpConfiance: 'STUDIO' as const, rtpSource: 'https://www.pragmaticplay.com/x' };
    expect(texte(f, 'fr')).toContain('96,07 %');
    expect(texte(f, 'fr')).toContain('pragmaticplay.com');
    expect(texte(f, 'en')).toContain('96.07%');
  });

  it('signale un RTP non confirmé plutôt que de le présenter comme sûr', () => {
    const f = { ...VIDE, rtp: 96, rtpConfiance: 'AUCUNE' as const };
    expect(texte(f, 'fr')).toContain('Nous n’avons pas confirmé');
  });

  /*
   * Une cote de blackjack porte sur une case de mise, pas sur le tapis : la
   * phrase « 25 000x la mise totale » y serait fausse avec un chiffre juste.
   */
  it('ne parle pas de mise totale sur une table live', () => {
    const live = { ...VIDE, gainMax: 25000, estLive: true, grille: 'Live Studio' };
    for (const { code } of LANGUES) {
      const t = texte(live, code);
      expect(t, code).not.toMatch(/25[\s,.]?000/);
      expect(t, code).not.toMatch(/Live Studio/);
    }
    // Intl.NumberFormat sépare les milliers par une espace fine insécable.
    const sansFines = (x: string) => x.replace(/[\u202f\u00a0]/g, ' ');
    expect(sansFines(texte({ ...live, estLive: false }, 'fr'))).toContain('25 000x la mise totale');
  });

  it('reconnaît une table live à ce que la base en dit', () => {
    expect(estUneTableLive('Live Studio', [])).toBe(true);
    expect(estUneTableLive(null, ['Dealer HD 24/7'])).toBe(true);
    expect(estUneTableLive('6x5', ['Tumble', 'Ante Bet'])).toBe(false);
  });

  it('n’appelle pas « lignes de paiement » ce qui n’est pas un nombre', () => {
    const f = { ...VIDE, grille: '6x5', lignes: 'Pay Anywhere (8+ symbols)' };
    expect(texte(f, 'fr')).not.toContain('Pay Anywhere (8+ symbols) lignes');
    expect(texte({ ...VIDE, grille: '5x3', lignes: '20' }, 'fr')).toContain('20 lignes de paiement');
  });

  it('fléchit l’adjectif allemand', () => {
    const f = { ...VIDE, volatilite: 'HAUTE' as const };
    expect(texte(f, 'de')).toContain('eine hohe Volatilität');
    expect(texte(f, 'de')).not.toContain('hoche');
    expect(texte({ ...VIDE, volatilite: 'MOYENNE' as const }, 'de')).toContain('eine mittlere Volatilität');
  });
});

describe('la FAQ', () => {
  it('ne pose aucune question quand rien n’est su', () => {
    for (const { code } of LANGUES) expect(questionsFrequentes(VIDE, code), code).toEqual([]);
  });

  it('ne pose que les questions dont elle a la réponse', () => {
    const f = { ...VIDE, rtp: 96.5, rtpConfiance: 'STUDIO' as const, rtpSource: 'https://x.com/a' };
    const q = questionsFrequentes(f, 'fr');
    expect(q).toHaveLength(1);
    expect(q[0].question).toContain('RTP');
  });

  it('n’interroge pas sur le gain maximum d’une table live', () => {
    const q = questionsFrequentes({ ...VIDE, gainMax: 25000, estLive: true }, 'fr');
    expect(q).toEqual([]);
  });

  it('produit un FAQPage valide, ou rien', () => {
    expect(baliseFaq([])).toBeNull();
    const balise = baliseFaq(questionsFrequentes({ ...VIDE, rtp: 96, demo: true }, 'en')) as {
      '@type': string;
      mainEntity: Array<{ '@type': string; acceptedAnswer: { text: string } }>;
    };
    expect(balise['@type']).toBe('FAQPage');
    expect(balise.mainEntity).toHaveLength(2);
    expect(balise.mainEntity[0]['@type']).toBe('Question');
    expect(balise.mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(10);
  });

  it('répond dans les trois langues sans laisser de gabarit', () => {
    const f = { ...VIDE, rtp: 96.5, gainMax: 5000, achatBonus: true, volatilite: 'HAUTE' as const, demo: true, nbCasinos: 30 };
    for (const { code } of LANGUES) {
      for (const q of questionsFrequentes(f, code)) {
        expect(q.question, code).not.toMatch(/\{|\}|undefined/);
        expect(q.reponse, code).not.toMatch(/\{|\}|undefined/);
      }
    }
  });
});
