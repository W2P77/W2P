/**
 * On ne déclare à Google que ce qu'on peut défendre.
 *
 * Le RTP affiché sur la page est accompagné de son niveau de preuve : le
 * visiteur sait à quoi s'en tenir. Dans le balisage, ce contexte disparaît —
 * il ne reste qu'une affirmation. Déclarer un chiffre non vérifié reviendrait
 * à demander à être cité dessus.
 */
import { describe, it, expect } from 'vitest';
import { baliseJeu } from '../donnees-structurees';

const base = {
  slug: 'fire-hot-20',
  nom: 'Fire Hot 20',
  rtpStudio: 96.29,
  volatilite: 'HAUTE',
  gainMaxMultiple: 1000,
  visuelUrl: '/images/slots/fire-hot-20.webp',
  studio: { nom: 'Pragmatic Play', slug: 'pragmatic-play' },
};

const rtpDeclare = (b: ReturnType<typeof baliseJeu>) =>
  (b.additionalProperty ?? []).find((p) => p.name === 'RTP');

describe('données structurées', () => {
  it('déclare le RTP sourcé auprès du studio', () => {
    expect(rtpDeclare(baliseJeu({ ...base, rtpConfiance: 'STUDIO' }))?.value).toBe('96.29%');
  });

  it('déclare aussi un RTP recoupé', () => {
    expect(rtpDeclare(baliseJeu({ ...base, rtpConfiance: 'RECOUPE' }))).toBeDefined();
  });

  it('tait un RTP non vérifié', () => {
    // Le chiffre reste affiché sur la page, avec sa mention d'incertitude.
    // C'est au robot qu'on ne le déclare pas, faute de pouvoir le nuancer.
    expect(rtpDeclare(baliseJeu({ ...base, rtpConfiance: 'AUCUNE' }))).toBeUndefined();
    expect(rtpDeclare(baliseJeu({ ...base, rtpConfiance: 'UNIQUE' }))).toBeUndefined();
  });

  it('garde volatilité et gain max quel que soit le niveau de preuve', () => {
    // Ils ne sont pas des affirmations chiffrées sur un retour d'argent :
    // l'enjeu n'est pas le même.
    const b = baliseJeu({ ...base, rtpConfiance: 'AUCUNE' });
    expect((b.additionalProperty ?? []).map((p) => p.name)).toEqual(['Volatility', 'Max win']);
  });

  it('n’émet aucun tableau vide', () => {
    const b = baliseJeu({
      ...base, rtpConfiance: 'AUCUNE', volatilite: null, gainMaxMultiple: null,
    });
    expect(b.additionalProperty).toBeUndefined();
  });

  it('pointe vers l’URL canonique du jeu', () => {
    expect(baliseJeu({ ...base, rtpConfiance: 'STUDIO' }).url).toContain(
      '/slot/pragmatic-play/fire-hot-20',
    );
  });
});
