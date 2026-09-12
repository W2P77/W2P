/**
 * Lire le visiteur sans se tromper de visiteur.
 *
 * Une IP prise au mauvais endroit est celle d'un intermédiaire : tout code qui
 * attribue, déduplique ou score la fraude dessus crédite alors n'importe qui.
 * Ces tests fixent quel en-tête fait foi, et ce qu'on affirme de sa fiabilité.
 */
import { describe, it, expect } from 'vitest';

import { lireVisiteur } from '../tracking/visiteur';

const entetes = (h: Record<string, string>) => ({
  get: (n: string) => h[n.toLowerCase()] ?? null,
});

describe('l’adresse IP', () => {
  it('préfère l’en-tête posé par la plateforme et le déclare fiable', () => {
    const v = lireVisiteur(
      entetes({ 'x-vercel-forwarded-for': '88.173.241.10', 'x-forwarded-for': '1.2.3.4' }),
    );
    expect(v.ip).toBe('88.173.241.10');
    expect(v.estFiable).toBe(true);
  });

  it('retombe sur x-forwarded-for, mais ne le déclare pas fiable', () => {
    const v = lireVisiteur(entetes({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }));
    expect(v.ip).toBe('1.2.3.4');
    expect(v.estFiable).toBe(false);
  });

  it('prend la première adresse de la chaîne, jamais un relais', () => {
    expect(lireVisiteur(entetes({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1, 172.16.0.5' })).ip).toBe('9.9.9.9');
  });

  it('rend null plutôt qu’une chaîne vide quand rien n’est lisible', () => {
    const v = lireVisiteur(entetes({}));
    expect(v.ip).toBeNull();
    expect(v.estFiable).toBe(false);
  });
});

describe('le pays', () => {
  it('reprend le code ISO-2 de la plateforme', () => {
    expect(lireVisiteur(entetes({ 'x-vercel-ip-country': 'fr' })).pays).toBe('FR');
  });

  /* « XX » est le code que Vercel envoie quand il ne sait pas : ce n'est pas
     un pays, et l'afficher comme tel serait inventer une donnée. */
  it('traite XX comme une absence, pas comme un pays', () => {
    expect(lireVisiteur(entetes({ 'x-vercel-ip-country': 'XX' })).pays).toBeNull();
    expect(lireVisiteur(entetes({})).pays).toBeNull();
  });
});

describe('le canal d’arrivée', () => {
  it('reconnaît l’application Discord à son user-agent', () => {
    expect(lireVisiteur(entetes({ 'user-agent': 'Mozilla/5.0 Discord/1.0' })).origine).toBe('discord');
  });

  it('reconnaît un lien cliqué depuis Discord à son referer', () => {
    expect(lireVisiteur(entetes({ referer: 'https://discordapp.com/channels/1' })).origine).toBe('discord');
    expect(lireVisiteur(entetes({ referer: 'https://discord.com/channels/1' })).origine).toBe('discord');
  });

  it('dit « web » par défaut', () => {
    expect(lireVisiteur(entetes({ 'user-agent': 'Mozilla/5.0' })).origine).toBe('web');
    expect(lireVisiteur(entetes({})).origine).toBe('web');
  });
});

describe('le referer', () => {
  it('accepte les deux orthographes de l’en-tête', () => {
    expect(lireVisiteur(entetes({ referer: 'https://a.test/x' })).referer).toBe('https://a.test/x');
    expect(lireVisiteur(entetes({ referrer: 'https://b.test/y' })).referer).toBe('https://b.test/y');
  });
});
