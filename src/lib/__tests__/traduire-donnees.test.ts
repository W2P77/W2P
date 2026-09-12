/**
 * Traduire une donnée ne doit jamais en changer le sens.
 *
 * La règle du projet est « on n'invente rien ». Une traduction par règles
 * peut la violer de deux façons : en déplaçant un chiffre, ou en traduisant
 * un nom propre — « Megaways » rendu par « Mégafaçons » désignerait une
 * mécanique qui n'existe pas. Ce test verrouille les deux.
 */
import { describe, it, expect } from 'vitest';
import { mecaniqueTraduite, offreTraduite } from '../traduire-donnees';
import { LANGUES } from '../../i18n/langues';

/** Tous les nombres d'une chaîne, dans l'ordre. */
function chiffres(s: string): string[] {
  return s.match(/\d+(?:[.,]\d+)?/g) ?? [];
}

describe('mécaniques', () => {
  it('traduit les termes génériques', () => {
    expect(mecaniqueTraduite('Free Spins', 'fr')).toBe('Tours gratuits');
    expect(mecaniqueTraduite('Free Spins', 'de')).toBe('Freispiele');
    expect(mecaniqueTraduite('Stacked Wilds', 'fr')).toBe('Wilds empilés');
    expect(mecaniqueTraduite('Cascading wins', 'de')).toBe('Kaskadengewinne');
  });

  it('garde les noms que les studios ont déposés', () => {
    for (const nom of ['Megaways engine', 'Cluster Pays', 'Hold & Spin', 'Pay Anywhere', 'Powernudge']) {
      expect(mecaniqueTraduite(nom, 'fr')).toBe(nom);
      expect(mecaniqueTraduite(nom, 'de')).toBe(nom);
    }
  });

  it('traduit le terme sans toucher au chiffre', () => {
    expect(mecaniqueTraduite('Bonus buy 100x', 'fr')).toBe('Achat de bonus 100x');
    expect(mecaniqueTraduite('Bonus buy 100x', 'de')).toBe('Bonuskauf 100x');
    expect(mecaniqueTraduite('Multipliers x500', 'fr')).toBe('Multiplicateurs x500');
    expect(mecaniqueTraduite('Free Spins 10 spins', 'fr')).toBe('10 tours gratuits');
    expect(mecaniqueTraduite('243 ways', 'de')).toBe('243 Gewinnwege');
    expect(mecaniqueTraduite('Format 5x4 / 14 paylines', 'fr')).toBe('Format 5x4 / 14 lignes de paiement');
  });

  it('laisse l’anglais intact', () => {
    expect(mecaniqueTraduite('Free Spins', 'en')).toBe('Free Spins');
  });

  it('ne perd ni n’ajoute aucun nombre, quelle que soit la mécanique', () => {
    const echantillon = [
      'Bonus buy 100x', 'Multipliers x500', 'Megaways 117,649 ways', 'Format 5x4 / 14 paylines',
      'Free Spins 10 spins', '243 ways', 'Chance x2', 'Dealer HD 24/7', '20 fixed jackpots',
    ];
    for (const { code } of LANGUES) {
      for (const m of echantillon) {
        expect(chiffres(mecaniqueTraduite(m, code)), `${code} · ${m}`).toEqual(chiffres(m));
      }
    }
  });
});

describe('offres de bienvenue', () => {
  it('traduit la formulation', () => {
    expect(offreTraduite('200% up to €500 + 100 FS', 'fr')).toBe('200% jusqu’à €500 + 100 tours gratuits');
    expect(offreTraduite('100% up to €1,000 + 100 FS on your 1st deposit', 'de')).toBe(
      '100% bis zu €1,000 + 100 Freispiele auf deine 1. Einzahlung',
    );
    expect(offreTraduite('4-deposit package up to €15,000 + 450 free spins', 'fr')).toBe(
      'Pack de 4 dépôts jusqu’à €15,000 + 450 tours gratuits',
    );
  });

  it('ne touche à aucun montant, dans les trois langues', () => {
    const offres = [
      '€5,000 + 500 FS package across 4 deposits',
      '200% up to €20,000 + 75 FS',
      '400% up to €2,150 + 300 FS across your first 5 deposits',
      '100% up to €525 + 100 FS (50/day × 2)',
      '4-deposit package up to 4 BTC + 100 FS',
      '300% up to €2,000 across your first 3 deposits (slots only)',
      '200% crypto bonus up to €1,000 + 10% monthly cashback',
    ];
    for (const { code } of LANGUES) {
      for (const o of offres) {
        expect(chiffres(offreTraduite(o, code)!), `${code} · ${o}`).toEqual(chiffres(o));
      }
    }
  });

  it('garde le symbole de devise et le pourcentage', () => {
    for (const { code } of LANGUES) {
      const t = offreTraduite('200% up to €500 + 100 FS', code)!;
      expect(t, code).toContain('€500');
      expect(t, code).toContain('200%');
    }
  });

  it('rend une valeur vide inchangée', () => {
    expect(offreTraduite(null, 'fr')).toBeNull();
    expect(offreTraduite('', 'de')).toBe('');
  });
});
