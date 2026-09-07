import { describe, expect, it } from 'vitest';
import {
  filtrerCasinosParPays,
  nomDuPays,
  normaliserPays,
} from '@/lib/geo/filtrer-casinos';

const casinos = [
  { slug: 'fr-seul', pays: ['FR'] },
  { slug: 'europe', pays: ['FR', 'DE', 'ES'] },
  { slug: 'australie', pays: ['AU'] },
];

describe('le code pays', () => {
  it('accepte un code ISO et normalise la casse', () => {
    expect(normaliserPays('fr')).toBe('FR');
    expect(normaliserPays(' DE ')).toBe('DE');
  });

  it('rejette les marqueurs d’ignorance plutôt que de les prendre pour un pays', () => {
    /*
     * Vercel renvoie « XX » quand l'IP n'est pas localisable et « T1 » derrière
     * Tor. Les traiter comme des pays filtrerait sur un pays inexistant, donc
     * ne montrerait aucun casino — le pire résultat possible.
     */
    for (const brut of ['XX', 'T1', 'ZZ', 'zz', '', null, undefined, 'FRA', '1', 'F']) {
      expect(normaliserPays(brut), String(brut)).toBeNull();
    }
  });
});

describe('le filtrage', () => {
  it('ne filtre pas quand le pays est inconnu', () => {
    const r = filtrerCasinosParPays(casinos, null);
    expect(r.casinos).toHaveLength(3);
    expect(r.filtre).toBe(false);
    expect(r.pays).toBeNull();
  });

  it('ne garde que les casinos couvrant le pays du visiteur', () => {
    const r = filtrerCasinosParPays(casinos, 'FR');
    expect(r.casinos.map((c) => c.slug)).toEqual(['fr-seul', 'europe']);
    expect(r.filtre).toBe(true);
    expect(r.pays).toBe('FR');
  });

  it('montre tout plutôt que rien quand aucun partenaire ne couvre le pays', () => {
    /*
     * Une page sans aucun lien perd la visite, et laisse croire que le jeu est
     * introuvable — alors qu'il est seulement hors de notre sélection là-bas.
     */
    const r = filtrerCasinosParPays(casinos, 'JP');
    expect(r.casinos).toHaveLength(3);
    expect(r.filtre).toBe(false);
    expect(r.pays).toBe('JP');
  });

  it('traite « XX » comme une absence, pas comme un pays sans partenaire', () => {
    const r = filtrerCasinosParPays(casinos, 'XX');
    expect(r.casinos).toHaveLength(3);
    expect(r.pays).toBeNull();
  });

  it('ne réordonne pas ce qu’il garde', () => {
    // L'ordre vient de la base (note décroissante) : le filtre ne doit pas
    // le défaire, sinon le meilleur partenaire cesse d'être en tête.
    const r = filtrerCasinosParPays(
      [{ slug: 'a', pays: ['FR'] }, { slug: 'b', pays: ['FR'] }, { slug: 'c', pays: ['FR'] }],
      'FR',
    );
    expect(r.casinos.map((c) => c.slug)).toEqual(['a', 'b', 'c']);
  });
});

describe('le nom du pays', () => {
  it('rend un nom lisible plutôt qu’un code', () => {
    expect(nomDuPays('FR')).toBe('France');
    expect(nomDuPays('DE')).toBe('Germany');
  });

  it('retombe sur le code plutôt que d’inventer un nom', () => {
    // « QQ » n'est assigné à rien : `Intl` rend `undefined` avec fallback
    // « none », et on préfère afficher le code brut qu'une région imaginaire.
    expect(nomDuPays('QQ')).toBe('QQ');
    // « T1 » fait lever `Intl` — le try/catch doit tenir.
    expect(nomDuPays('T1')).toBe('T1');
  });

  it('n’affiche jamais « Unknown Region » : le code est rejeté en amont', () => {
    expect(normaliserPays('ZZ')).toBeNull();
  });
});
