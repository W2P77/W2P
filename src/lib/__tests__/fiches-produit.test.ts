import { describe, expect, it } from 'vitest';

import { LECTEURS } from '../fiches-produit/lecteurs';

/* Extraits recopiés des pages produit servies le 11/09/2026. */
describe('BGaming', () => {
  const lire = LECTEURS.bgaming;

  it('lit le bloc « Game Details » et ignore le titre', () => {
    const f = lire(
      '<title>Snoop Dogg Dollars Demo | Free Spins, 96% RTP</title>' +
        '<div>Game Type Slots Volatility Very-high RTP 96.00 % Release Date Oct 30, 2024</div>' +
        '<div>Lines Cluster Pays Max.multiplier x 10000 Volatility Very-high Max Win € 250,000</div>' +
        '<div>Real-Time RTP Insights Find out which games are Hot or Cold.</div>',
    );
    expect(f).toEqual({ rtp: 96, volatilite: 'TRES_HAUTE', gainMax: 10000 });
  });

  /*
   * « x 10.490 » : le point sépare les milliers. Lu comme une décimale, le gain
   * maximum de Lucky Lager tombait à 10,49 fois la mise.
   */
  it('lit un point séparateur de milliers comme tel', () => {
    expect(lire('<p>Lines 10 Max.multiplier x 10.490 Volatility Very-high</p>').gainMax).toBe(10490);
  });

  it('ne prend jamais le gain en euros', () => {
    expect(lire('<p>Max Win € 250,000 RTP 96.10 %</p>').gainMax).toBeNull();
  });
});

describe('NetEnt', () => {
  const lire = LECTEURS.netent;

  it('lit le RTP dans le JSON de la page, et le gain maximum en clair', () => {
    const f = lire(
      '<script>{"rtp":95.62,"volatility":5.1}</script>' +
        '<p>10-11-2006 Release Date 95.62% RTP Volatility 39.00% Hit Frequency 1 700 x bet Max payout 5x3 Reels/Rows</p>',
    );
    expect(f).toEqual({ rtp: 95.62, volatilite: null, gainMax: 1700 });
  });

  it('laisse la volatilité vide plutôt que de convertir une note chiffrée', () => {
    expect(lire('<script>{"rtp":96.08,"volatility":6.8}</script>').volatilite).toBeNull();
  });
});

describe('Endorphina', () => {
  const lire = LECTEURS.endorphina;

  it('lit « RTP: » et « Volatility: »', () => {
    expect(
      lire('<p>Game Details RTP: 94.76% Volatility: High Lines: 21 Reels and Rows: 5x3 Bet Range: 0.2</p>'),
    ).toEqual({ rtp: 94.76, volatilite: 'HAUTE', gainMax: null });
  });

  it('rend null sur une page sans chiffre', () => {
    expect(lire('<p>Game Details Lines: 21</p>').rtp).toBeNull();
  });
});
