import { describe, expect, it } from 'vitest';

import { estUneLimiteDeDebit } from '../captures/limite-de-debit';

describe('la page de ban d’un serveur de démo', () => {
  /* Recopié de la page servie par demo.bgaming-network.com le 11/09/2026. */
  it('reconnaît la page Cloudflare 1015', () => {
    expect(
      estUneLimiteDeDebit(
        'Error 1015 Ray ID: a397e7312e0a0051 • 2026-09-11 16:03:32 UTC You are being rate limited ' +
          'What happened? The owner of this website (demo.bgaming-network.com) has banned you temporarily',
      ),
    ).toBe(true);
  });

  it('ne se déclenche pas sur un message d’erreur embarqué dans le code d’un jeu', () => {
    expect(estUneLimiteDeDebit('<script>const e = { 429: "Too Many Requests" };</script>')).toBe(false);
  });

  it('ne se déclenche pas sur un gain maximum qui vaut 1015', () => {
    expect(estUneLimiteDeDebit('The maximum winning amount is x1015 of the bet.')).toBe(false);
  });
});
