/**
 * Ce que la recherche doit garantir, indépendamment de la base.
 *
 * ── Pourquoi tester le classement et pas la requête ───────────────────────
 *
 * La requête Prisma se contente de dire « ce nom contient ce terme » : elle
 * est juste par construction et se vérifie à l'écran. Ce qui casse en silence,
 * c'est l'**ordre** — le seul résultat que la plupart des visiteurs regardent
 * est le premier, et un classement qui se dégrade ne lève aucune erreur. Ces
 * cas sont donc écrits comme des attentes de produit : « bonanza » doit sortir
 * Bonanza, pas Aztec Bonanza.
 */
import { describe, expect, it } from 'vitest';

import { meilleurScore, normaliser, score, scoreTerme } from '../recherche/score';
import { deplacer, LONGUEUR_MINIMALE } from '../recherche/liste';

describe('normalisation', () => {
  it('ignore les accents et la casse', () => {
    expect(normaliser('Démon Fùry')).toBe('demon fury');
  });

  it('coupe sur la ponctuation au lieu de coller les mots', () => {
    // « Big Bass: Hold & Spinner » collé donnerait « bassHold », qu'aucune
    // requête ne retrouve.
    expect(normaliser('Big Bass: Hold & Spinner')).toBe('big bass hold spinner');
  });
});

describe('score d’un terme', () => {
  it('classe l’égalité au-dessus du début de mot, et le début au-dessus du reste', () => {
    const egal = scoreTerme('bonanza', 'bonanza');
    const debut = scoreTerme('bonanza', 'bonanza gold');
    const mot = scoreTerme('bonanza', 'aztec bonanza');
    const dedans = scoreTerme('nanza', 'aztec bonanza');
    expect(egal).toBeGreaterThan(debut);
    expect(debut).toBeGreaterThan(mot);
    expect(mot).toBeGreaterThan(dedans);
  });

  it('ne rend rien quand le terme est absent', () => {
    expect(scoreTerme('gates', 'sweet bonanza')).toBe(0);
  });
});

describe('score d’une requête', () => {
  it('fait gagner le titre exact sur le titre qui le contient', () => {
    // Le cas qui a motivé le classement maison : trier par nom aurait mis
    // « Aztec Bonanza » devant « Bonanza » pour la requête « bonanza ».
    expect(score('bonanza', 'Bonanza')).toBeGreaterThan(score('bonanza', 'Aztec Bonanza'));
  });

  it('refuse un résultat auquel la moitié des mots manque', () => {
    expect(score('sweet bonanza', 'Sweet Alchemy')).toBe(0);
  });

  it('préfère les mots dans l’ordre de la requête', () => {
    expect(score('big bass', 'Big Bass Bonanza')).toBeGreaterThan(
      score('big bass', 'Bass Fishing Big Catch'),
    );
  });

  it('trouve un jeu malgré les accents et la ponctuation de son titre', () => {
    expect(score('demon', 'Démon')).toBeGreaterThan(0);
    expect(score('hold and spinner', 'Big Bass: Hold & Spinner')).toBeGreaterThan(0);
  });
});

describe('pondération entre plusieurs textes', () => {
  it('laisse le studio derrière le titre sur la même requête', () => {
    // « pragmatic » ne doit pas faire remonter sept cents jeux au-dessus du
    // studio lui-même : le nom du studio compte moins que le titre du jeu.
    const studio = score('pragmatic', 'Pragmatic Play');
    const unJeuDeCeStudio = meilleurScore('pragmatic', [
      ['Gates of Olympus', 1],
      ['Pragmatic Play', 0.45],
    ]);
    expect(studio).toBeGreaterThan(unJeuDeCeStudio);
  });
});

describe('navigation au clavier', () => {
  it('descend depuis « rien de sélectionné » vers la première ligne', () => {
    expect(deplacer(-1, 1, 5)).toBe(0);
  });

  it('remonte depuis « rien de sélectionné » vers la dernière', () => {
    expect(deplacer(-1, -1, 5)).toBe(4);
  });

  it('boucle aux deux extrémités', () => {
    expect(deplacer(4, 1, 5)).toBe(0);
    expect(deplacer(0, -1, 5)).toBe(4);
  });

  it('ne sélectionne rien quand la liste est vide', () => {
    expect(deplacer(-1, 1, 0)).toBe(-1);
  });
});

describe('seuil de déclenchement', () => {
  it('ne part pas en base sur une seule lettre', () => {
    // Une lettre correspond à un tiers du catalogue : la requête coûte cher et
    // la liste n'apprend rien.
    expect(LONGUEUR_MINIMALE).toBeGreaterThanOrEqual(2);
  });
});
