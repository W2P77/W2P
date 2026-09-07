/**
 * Le clickId doit partir dans le paramètre que le réseau renverra.
 *
 * ── Pourquoi ce test vaut plus que les autres ─────────────────────────────
 *
 * Une erreur ici ne casse rien : le visiteur arrive bien chez le partenaire,
 * il s'inscrit, il dépose. Seul le postback revient sans notre identifiant, et
 * la commission part ailleurs. Rien ne le signale — on le découvre en comptant
 * l'argent, des semaines plus tard.
 *
 * C'est arrivé deux fois sur BetsRank : Slott passé sur gambru.com, SlotsGem
 * sur novarao.com. Dans les deux cas le clickId partait en `sub4`, que le
 * réseau ne renvoyait plus.
 */
import { describe, it, expect } from 'vitest';
import { buildAffiliateRedirectUrl, resolveCasinoPlayUrl } from '../tracking/url-partenaire';

const CLICK = 'w2p-550e8400-e29b-41d4-a716-446655440000';

describe('URL partenaire', () => {
  it('remplace la macro {clickid} quand elle existe', () => {
    const u = buildAffiliateRedirectUrl('https://x.com/go?sub1={clickid}', CLICK);
    expect(u).toBe(`https://x.com/go?sub1=${CLICK}`);
    expect(u).not.toContain('{clickid}');
  });

  it('envoie sub1 aux réseaux qui le renvoient', () => {
    // Chaque domaine de cette liste a été confirmé par un manager ou payé par
    // une attribution perdue. Les retirer coûterait de l'argent.
    for (const domaine of ['univerns.com', 'gambru.com', 'moxtop.com', 'novarao.com', 'alfaleads.net']) {
      const u = new URL(buildAffiliateRedirectUrl(`https://${domaine}/visit?pid=1`, CLICK));
      expect(u.searchParams.get('sub1'), domaine).toBe(CLICK);
    }
  });

  it('utilise aff_click_id chez OctoCPA et Magic Click', () => {
    for (const d of ['octocpa.trkzen.com', 'magicclick.partners']) {
      const u = new URL(buildAffiliateRedirectUrl(`https://${d}/go?x=1`, CLICK));
      expect(u.searchParams.get('aff_click_id'), d).toBe(CLICK);
    }
  });

  it('porte toujours le préfixe w2p, quel que soit le paramètre', () => {
    // Le paramètre change d'un réseau à l'autre ; le préfixe, lui, ne doit
    // jamais se perdre en route — c'est lui qui dit d'où vient le lead.
    for (const url of [
      'https://univerns.com/visit?pid=1',
      'https://octocpa.trkzen.com/go?x=1',
      'https://track.cosmobetpartners.com/visit/?bta=1',
      'https://x.com/go?sub1={clickid}',
    ]) {
      expect(buildAffiliateRedirectUrl(url, CLICK)).toContain('w2p-');
    }
  });

  it('ne perd pas les paramètres déjà présents', () => {
    const u = new URL(buildAffiliateRedirectUrl('https://univerns.com/visit?pid=174401&offer=9', CLICK));
    expect(u.searchParams.get('pid')).toBe('174401');
    expect(u.searchParams.get('offer')).toBe('9');
  });

  it('retombe sur le lien par défaut quand le pays n’a pas de variante', () => {
    const casino = {
      playUrl: 'https://x.com/fr',
      playUrlByCountry: { DE: 'https://x.com/de' },
    };
    expect(resolveCasinoPlayUrl(casino, 'DE')).toBe('https://x.com/de');
    expect(resolveCasinoPlayUrl(casino, 'de')).toBe('https://x.com/de');
    // Un pays inconnu ne doit pas produire une URL vide : le visiteur part
    // sur l'offre par défaut plutôt que nulle part.
    expect(resolveCasinoPlayUrl(casino, 'PT')).toBe('https://x.com/fr');
    expect(resolveCasinoPlayUrl(casino, null)).toBe('https://x.com/fr');
  });
});
