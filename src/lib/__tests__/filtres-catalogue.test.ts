/**
 * Les filtres décident de ce que le visiteur voit.
 *
 * Une erreur ici ne provoque aucune panne : la page s'affiche, avec les
 * mauvais jeux — ou avec aucun. C'est le genre de défaut qu'on ne remarque
 * qu'en cherchant un titre précis et en ne le trouvant pas.
 */
import { describe, it, expect } from 'vitest';
import { construireOu } from '../donnees/catalogue';

describe('filtres du catalogue', () => {
  it('sans filtre, ne restreint rien', () => {
    // Un objet vide, pas une clause qui exclurait tout par accident.
    expect(construireOu({})).toEqual({});
  });

  it('cherche à la fois dans le nom du jeu et celui du studio', () => {
    // « pragmatic » doit trouver les jeux du studio, pas seulement ceux dont
    // le titre contient le mot.
    const ou = construireOu({ q: 'pragmatic' }) as { AND: { OR: unknown[] }[] };
    expect(ou.AND[0].OR).toHaveLength(2);
    expect(JSON.stringify(ou)).toContain('insensitive');
  });

  it('ignore une recherche vide ou faite d’espaces', () => {
    expect(construireOu({ q: '' })).toEqual({});
    expect(construireOu({ q: '   ' })).toEqual({});
  });

  it('cumule les filtres au lieu de les remplacer', () => {
    // Choisir un studio puis une volatilité doit resserrer, pas repartir de
    // zéro sur le dernier critère.
    const ou = construireOu({ studio: 'netent', volatilite: 'HAUTE', rtpMin: 96 }) as {
      AND: unknown[];
    };
    expect(ou.AND).toHaveLength(3);
  });

  it('traite le RTP minimum comme un seuil, pas une égalité', () => {
    const ou = construireOu({ rtpMin: 96.5 }) as { AND: { rtpStudio: { gte: number } }[] };
    expect(ou.AND[0].rtpStudio.gte).toBe(96.5);
  });

  it('filtre sur le niveau de preuve', () => {
    // C'est l'argument du site : pouvoir ne voir que ce qui est sourcé.
    const ou = construireOu({ preuve: 'STUDIO' }) as { AND: { rtpConfiance: string }[] };
    expect(ou.AND[0].rtpConfiance).toBe('STUDIO');
  });
});
