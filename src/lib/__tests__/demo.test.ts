/**
 * On n'embarque que ce qui se tient dans un cadre.
 *
 * Un lanceur ouvre le jeu ; une page produit ouvre le site du studio, menu et
 * pied de page compris. Embarquer la seconde afficherait un site dans le
 * site — le test décide, et dans le doute il refuse.
 */
import { describe, it, expect } from 'vitest';

import { estUnLanceurDeDemo } from '../demo';

describe('adresse de démo', () => {
  it('reconnaît un lanceur de jeu', () => {
    expect(estUnLanceurDeDemo('https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=vs20fparty&lang=en&cur=USD')).toBe(true);
  });

  it('refuse une page produit de studio', () => {
    for (const url of [
      'https://www.hacksawgaming.com/games/sun-princess',
      'https://bgaming.com/games/adventures',
      'https://www.pushgaming.com/games/fire-hopper.html',
      'https://www.pragmaticplay.com/en/games/chicken-plus/',
    ]) expect(estUnLanceurDeDemo(url)).toBe(false);
  });

  it('refuse une adresse absente', () => {
    expect(estUnLanceurDeDemo(null)).toBe(false);
    expect(estUnLanceurDeDemo('')).toBe(false);
  });
});
