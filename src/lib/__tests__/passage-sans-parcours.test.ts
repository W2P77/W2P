/**
 * Le 19/09/2026, 202 des 207 clics de la semaine venaient d'un robot hébergé
 * chez OVH, qui appelait l'écran de sortie sans jamais charger une page. Ce test
 * verrouille la frontière : un vrai clic (referer where2spin, ou Discord) passe ;
 * un appel direct est consigné à part.
 */
import { describe, it, expect } from 'vitest';
import { estUnPassageSansParcours } from '../tracking/visiteur';

const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

describe('passage sans parcours humain', () => {
  it('laisse passer un clic venu d’une fiche where2spin', () => {
    expect(estUnPassageSansParcours({ referer: 'https://www.where2spin.com/fr/slot/pragmatic-play/sweet-bonanza', origine: 'web', userAgent: chrome })).toBe(false);
    expect(estUnPassageSansParcours({ referer: 'https://where2spin.com/en', origine: 'web', userAgent: chrome })).toBe(false);
  });

  it('laisse passer un clic venu de Discord, même sans referer', () => {
    expect(estUnPassageSansParcours({ referer: null, origine: 'discord', userAgent: 'Mozilla/5.0 Discord/1.0' })).toBe(false);
  });

  it('écarte l’appel direct du robot, sans referer', () => {
    expect(estUnPassageSansParcours({ referer: null, origine: 'web', userAgent: chrome })).toBe(true);
  });

  it('écarte un referer étranger, y compris un faux sous-domaine', () => {
    expect(estUnPassageSansParcours({ referer: 'https://exemple.com/?u=where2spin.com', origine: 'web', userAgent: chrome })).toBe(true);
    expect(estUnPassageSansParcours({ referer: 'https://where2spin.com.pirate.net/', origine: 'web', userAgent: chrome })).toBe(true);
  });

  it('écarte un outil, même avec un bon referer', () => {
    expect(estUnPassageSansParcours({ referer: 'https://www.where2spin.com/en', origine: 'web', userAgent: 'curl/8.7.1' })).toBe(true);
    expect(estUnPassageSansParcours({ referer: 'https://www.where2spin.com/en', origine: 'web', userAgent: null })).toBe(true);
  });
});
