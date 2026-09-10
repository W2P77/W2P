/**
 * L'origine d'un lead se joue au clic, et une seule fois.
 *
 * Si le préfixe est absent ou mal formé au premier clic, l'information n'existe
 * nulle part ailleurs : le postback arrive sur un déploiement qu'on ne modifie
 * pas, et les clics expirent à 90 jours alors que les conversions sont
 * permanentes. Rien ne serait rattrapable après coup.
 */
import { describe, it, expect } from 'vitest';
import {
  nouveauClickId,
  nouveauClickIdManuel,
  origineDuClickId,
  PREFIXE_W2P,
} from '../tracking/click-id';

describe('clickId where2spin', () => {
  it('porte le préfixe et un UUID complet', () => {
    const id = nouveauClickId();
    expect(id.startsWith(PREFIXE_W2P)).toBe(true);
    // Le corps doit rester un UUID v4 : c'est ce format que les réseaux
    // acceptent déjà en production.
    const corps = id.slice(PREFIXE_W2P.length);
    expect(corps).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('reste sous les limites de longueur rencontrées', () => {
    // Le seul endroit qui tronque dans la chaîne existante coupe à 200.
    expect(nouveauClickId().length).toBeLessThan(60);
  });

  it('ne produit jamais deux fois le même', () => {
    const lot = new Set(Array.from({ length: 500 }, () => nouveauClickId()));
    expect(lot.size).toBe(500);
  });

  it('applique un seul invariant : tout identifiant w2p commence par le préfixe', () => {
    // Écrit après coup : la première version nommait les saisies manuelles
    // `manual-w2p-…`, et elles retombaient du côté de BetsRank. Une règle
    // unique vaut mieux qu'une liste de cas particuliers.
    expect(nouveauClickIdManuel().startsWith(PREFIXE_W2P)).toBe(true);
  });

  it('reconnaît son origine', () => {
    expect(origineDuClickId(nouveauClickId())).toBe('W2P');
    expect(origineDuClickId(nouveauClickIdManuel())).toBe('W2P');
  });

  it('attribue à BetsRank tout ce qui n’est pas préfixé', () => {
    // Ce n'est pas un défaut par défaut : tout ce qui existait avant
    // where2spin vient de BetsRank. L'historique s'étiquette donc seul.
    expect(origineDuClickId('550e8400-e29b-41d4-a716-446655440000')).toBe('BR');
    expect(origineDuClickId('manual-discord-1757000000000-ab12cd')).toBe('BR');
    expect(origineDuClickId('')).toBe('BR');
    expect(origineDuClickId(null)).toBe('BR');
  });

  it('ne confond pas un préfixe qui n’est pas en tête', () => {
    // « …w2p-… » au milieu d'un identifiant ne doit pas suffire.
    expect(origineDuClickId('550e8400-w2p-e29b')).toBe('BR');
  });
});
