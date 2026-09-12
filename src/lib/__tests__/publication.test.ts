/**
 * Ce qui mérite d'être proposé aux moteurs.
 *
 * Le seuil a longtemps été « un RTP présent ». Il laissait passer 5 831 pages,
 * dont 3 901 sans la moindre image — ni jaquette ni capture. Ces tests fixent
 * le seuil actuel et, surtout, ce qu'il ne doit pas laisser passer.
 */
import { describe, it, expect } from 'vitest';

import { estPublieable, nombreDeCaptures } from '../publication';

const capture = { fichier: 'x.webp', titre: 'The base game' };

describe('le seuil de publication', () => {
  it('accepte une fiche qui a un RTP et une capture', () => {
    expect(estPublieable({ rtpStudio: 96.5, captures: [capture] })).toBe(true);
  });

  it('refuse une fiche sans RTP, même illustrée', () => {
    expect(estPublieable({ rtpStudio: null, captures: [capture, capture] })).toBe(false);
  });

  /*
   * Le cas qui a motivé le durcissement : un taux annoncé, et rien à montrer
   * du jeu. Publier ces pages par milliers dessert les quelques centaines qui
   * sont complètes.
   */
  it('refuse une fiche qui annonce un taux sans rien montrer', () => {
    expect(estPublieable({ rtpStudio: 96.5, captures: [] })).toBe(false);
    expect(estPublieable({ rtpStudio: 96.5, captures: null })).toBe(false);
    expect(estPublieable({ rtpStudio: 96.5 })).toBe(false);
  });

  /*
   * Un tableau vide n'est pas `null`, et c'est tout le piège : une condition
   * « captures non nulles » laisserait passer exactement les fiches à exclure.
   */
  it('ne confond pas un tableau vide avec une absence', () => {
    expect(nombreDeCaptures([])).toBe(0);
    expect(nombreDeCaptures(null)).toBe(0);
    expect(nombreDeCaptures(undefined)).toBe(0);
    expect(nombreDeCaptures([capture])).toBe(1);
  });

  it('ne se laisse pas tromper par une valeur qui n’est pas un tableau', () => {
    expect(nombreDeCaptures('trois')).toBe(0);
    expect(nombreDeCaptures({ longueur: 3 })).toBe(0);
    expect(estPublieable({ rtpStudio: 96.5, captures: 'oui' })).toBe(false);
  });

  it('traite un RTP de zéro comme une valeur, pas comme une absence', () => {
    expect(estPublieable({ rtpStudio: 0, captures: [capture] })).toBe(true);
  });
});
