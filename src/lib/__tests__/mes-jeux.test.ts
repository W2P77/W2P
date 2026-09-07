/**
 * La liste « mes jeux », gardée sur l'appareil.
 *
 * Elle n'a pas de serveur derrière : si elle se corrompt, personne ne peut la
 * réparer, et le visiteur perd ce qu'il avait mis de côté sans comprendre
 * pourquoi. D'où ces tests sur des cas qu'on rencontre vraiment — stockage
 * refusé en navigation privée, contenu illisible laissé par une version
 * précédente.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const jeu = (slug: string) => ({
  slug,
  nom: slug,
  rtpStudio: 96,
  rtpConfiance: 'STUDIO',
  studio: { nom: 'Studio', slug: 'studio' },
});

function faireStockage(initial = '') {
  let valeur = initial;
  return {
    getItem: () => valeur || null,
    setItem: (_c: string, v: string) => { valeur = v; },
    lire: () => valeur,
  };
}

describe('mes jeux', () => {
  beforeEach(() => vi.resetModules());

  it('ajoute puis retire le même jeu', async () => {
    const s = faireStockage();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', s);
    const { basculerJeu, lireMesJeux } = await import('../../components/MesJeux');

    expect(basculerJeu(jeu('a'))).toBe(true);
    expect(lireMesJeux()).toHaveLength(1);
    // Un second clic retire : c'est un interrupteur, pas un ajout répété.
    expect(basculerJeu(jeu('a'))).toBe(false);
    expect(lireMesJeux()).toHaveLength(0);
  });

  it('conserve plusieurs jeux', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', faireStockage());
    const { basculerJeu, lireMesJeux } = await import('../../components/MesJeux');
    basculerJeu(jeu('a'));
    basculerJeu(jeu('b'));
    expect(lireMesJeux().map((j) => j.slug)).toEqual(['a', 'b']);
  });

  it('survit à un contenu illisible', async () => {
    // Une version précédente a pu écrire autre chose. La liste doit repartir
    // vide plutôt que faire tomber la page.
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', faireStockage('ceci nest pas du json'));
    const { lireMesJeux } = await import('../../components/MesJeux');
    expect(lireMesJeux()).toEqual([]);
  });

  it('n’explose pas quand le stockage est refusé', async () => {
    // Navigation privée : `setItem` lève. Le geste échoue, la page tient.
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: () => '[]',
      setItem: () => { throw new Error('QuotaExceededError'); },
    });
    const { basculerJeu } = await import('../../components/MesJeux');
    expect(() => basculerJeu(jeu('a'))).not.toThrow();
  });

  it('rend une liste vide côté serveur', async () => {
    // Aucun `window` au rendu serveur : lire doit répondre vide, pas planter.
    vi.stubGlobal('window', undefined);
    const { lireMesJeux } = await import('../../components/MesJeux');
    expect(lireMesJeux()).toEqual([]);
  });
});
