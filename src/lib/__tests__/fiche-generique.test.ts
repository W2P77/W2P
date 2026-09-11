import { describe, expect, it } from 'vitest';

import { lireFicheGenerique as lire } from '../fiches-produit/lecteurs';

/* Chaque cas est recopié d'une page produit réelle, relevée le 11/09/2026. */
describe('le lecteur générique de fiche produit', () => {
  it('garde le haut d’une liste croissante (Spinomenal)', () => {
    const f = lire('<p>Paylines 1 RTP 88.85% | 91.55% | 93.61%| 95.42% Supported Devices</p>');
    expect(f.rtp).toBe(95.42);
    expect(f.paliers).toEqual([93.61, 91.55, 88.85]);
  });

  it('garde le haut d’une liste croissante sans séparateur (Elbet)', () => {
    expect(lire('<p>RTP 92.67% 94.47% 96.34% 97.31% WinCap (max exposure) 5000 x</p>').rtp).toBe(97.31);
  });

  it('garde le haut d’une liste décroissante (Gaming Corps)', () => {
    expect(lire('<p>Platforms: Desktop RTP: 95.81%, 93.83%, 91.85% Volatility: 4.5/5</p>').rtp).toBe(95.81);
  });

  it('lit « A or B » (Comtrade)', () => {
    expect(lire('<p>Temple of Riches RTP 94.00% or 96.00% Play Now</p>').rtp).toBe(96);
  });

  it('écarte le RTP d’achat de bonus (Print Studios)', () => {
    const f = lire('<p>RTP RTP 96.31% 96.31% RTP w. Bonus Buy RTP w. Bonus Buy 96.24% 96.24% Volatility</p>');
    expect(f.rtp).toBe(96.31);
    expect(f.paliers).toBeUndefined();
  });

  it('écarte une valeur liée à un jackpot (Dragon Gaming)', () => {
    expect(lire('<p>trigger the Grand Jackpot Set at 94.36% RTP, the game builds toward a 10,000x max win</p>').rtp).toBeNull();
  });

  it('lit « Default RTP » (Peter & Sons) et « Fixed RTP » (Amusnet)', () => {
    expect(lire('<p>Release Date 24-09-2026 Default RTP 96.09% Volatility HIGH</p>').rtp).toBe(96.09);
    expect(lire('<p>Paylines: 40 Fixed RTP: 96.52% Volatility: 1 / 5 Max-win: 3000 x bet per line</p>').rtp).toBe(96.52);
  });

  it('lit le nombre avant le sigle (Red Tiger, 1spin4win)', () => {
    expect(lire('<title>1942: Sky Warrior Slot - Play | 95.68% RTP, 999 xBet MAX WIN</title>').rtp).toBe(95.68);
    expect(lire('<p>Lucky Spins Slot - Free Demo, 97.2% RTP, Max Win 1000x</p>').rtp).toBe(97.2);
  });

  it('lit la virgule décimale et l’espace avant « % » (Slotopia, Wazdan)', () => {
    expect(lire('<p>Arctic Spins RTP 95,94% MAX WIN i 384000</p>').rtp).toBe(95.94);
    expect(lire('<p>Game type: Table Games RTP: 99.22 % Theme: Casino</p>').rtp).toBe(99.22);
  });

  it('ne lit ni un gain en euros ni une volatilité', () => {
    const f = lire('<p>Fruit Fusion: Three Pots RTP 95.97% MAX WIN i € 254953 VOLATILITY High</p>');
    expect(f).toEqual({ rtp: 95.97, volatilite: null, gainMax: null });
  });

  it('ne prend pas un nombre sans le sigle', () => {
    expect(lire('<p>Hit Frequency 26.10% Max Payout x5000</p>').rtp).toBeNull();
  });
});
