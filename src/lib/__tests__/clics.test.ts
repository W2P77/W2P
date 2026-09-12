/**
 * Le clic doit atterrir dans le format que BetsRank sait relire.
 *
 * La première version faisait un `lpush` sur une clé qui est une **string** :
 * chaque écriture renvoyait WRONGTYPE, l'appelant l'avalait, et aucun clic
 * where2spin n'a jamais existé — pendant que la notification Discord partait
 * normalement, donnant toutes les apparences du bon fonctionnement. Le coût
 * n'est pas cosmétique : sans clic, le postback de conversion ne retrouve
 * rien et l'attribution du FTD part à l'admin.
 *
 * Ces tests fixent le contrat avec `app/api/go/logger.ts` de BetsRank.
 */
import { describe, it, expect } from 'vitest';

import { cleDuJour, entreeDeClic, lireClics } from '../tracking/clics';

const CLIC = {
  clickId: 'w2p-abc123',
  casinoId: 117,
  casinoSlug: 'vave',
  casinoNom: 'Vave',
  jeu: 'gates-of-olympus',
  pays: 'FR',
  referer: null,
};

describe('la clé du jour', () => {
  it('reprend le préfixe et le format de date de BetsRank', () => {
    expect(cleDuJour(new Date('2026-09-12T22:30:00Z'))).toBe('bce:clicks:2026-09-12');
  });
});

describe('le tableau du jour', () => {
  /*
   * Selon `automaticDeserialization`, Upstash rend la chaîne brute ou le
   * tableau déjà parsé. Les deux doivent être acceptés : se tromper ici
   * repartirait d'un tableau vide et effacerait la journée à l'écriture.
   */
  it('accepte la chaîne brute comme le tableau déjà parsé', () => {
    expect(lireClics('[{"id":"a"}]')).toHaveLength(1);
    expect(lireClics([{ id: 'a' }])).toHaveLength(1);
  });

  it('rend un tableau vide sur une clé absente ou illisible', () => {
    expect(lireClics(null)).toEqual([]);
    expect(lireClics(undefined)).toEqual([]);
    expect(lireClics('')).toEqual([]);
    expect(lireClics('{pas du json')).toEqual([]);
    expect(lireClics(42)).toEqual([]);
  });
});

describe('l’entrée écrite', () => {
  it('porte exactement les champs de ClickLog', () => {
    const e = entreeDeClic(CLIC, new Date('2026-09-12T10:00:00Z'));
    expect(Object.keys(e).sort()).toEqual(
      [
        'campaign', 'casinoId', 'casinoName', 'casinoSlug', 'country',
        'id', 'ip', 'referer', 'site', 'source', 'timestamp', 'userAgent',
      ].sort(),
    );
  });

  it('garde le clickId intact — c’est lui qui porte l’attribution', () => {
    expect(entreeDeClic(CLIC).id).toBe('w2p-abc123');
    expect(entreeDeClic(CLIC).id.startsWith('w2p-')).toBe(true);
  });

  it('remplit l’id numérique du casino, que le CPA utilise comme clé', () => {
    const e = entreeDeClic(CLIC);
    expect(e.casinoId).toBe(117);
    expect(typeof e.casinoId).toBe('number');
    expect(e.casinoName).toBe('Vave');
    expect(e.casinoSlug).toBe('vave');
  });

  /*
   * `source` dit le CANAL (web / discord), `site` dit le SITE. Les confondre
   * afficherait « Source URL : where2spin » dans le dashboard BetsRank, à la
   * place d'une information que la colonne existe pour porter.
   */
  it('sépare le canal d’arrivée du site d’origine', () => {
    const e = entreeDeClic(CLIC);
    expect(e.source).toBe('web');
    expect(e.site).toBe('w2p');
    expect(entreeDeClic({ ...CLIC, origine: 'discord' }).source).toBe('discord');
  });

  it('reprend ce que la requête dit du visiteur', () => {
    const e = entreeDeClic({
      ...CLIC,
      ip: '88.173.241.10',
      userAgent: 'Mozilla/5.0',
      pays: 'FR',
      referer: 'https://where2spin.com/fr',
    });
    expect(e.ip).toBe('88.173.241.10');
    expect(e.userAgent).toBe('Mozilla/5.0');
    expect(e.country).toBe('FR');
    expect(e.referer).toBe('https://where2spin.com/fr');
  });

  it('laisse à null ce que la requête ne dit pas, sans rien supposer', () => {
    const e = entreeDeClic({ ...CLIC, ip: null, userAgent: null, pays: null, referer: null });
    expect(e.ip).toBeNull();
    expect(e.userAgent).toBeNull();
    expect(e.country).toBeNull();
    expect(e.referer).toBeNull();
  });

  it('n’invente aucune donnée de navigateur', () => {
    const e = entreeDeClic(CLIC);
    expect(e.ip).toBeNull();
    expect(e.userAgent).toBeNull();
  });

  it('retombe sur « direct » quand le clic ne vient pas d’une fiche', () => {
    expect(entreeDeClic({ ...CLIC, jeu: null }).campaign).toBe('direct');
    expect(entreeDeClic(CLIC).campaign).toBe('gates-of-olympus');
  });

  it('se relit après un aller-retour JSON, comme le fera BetsRank', () => {
    const ecrit = JSON.stringify([entreeDeClic(CLIC)]);
    const relu = lireClics(ecrit);
    expect(relu[0].id).toBe('w2p-abc123');
    expect(relu[0].casinoId).toBe(117);
  });
});
