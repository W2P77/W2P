import { describe, expect, it } from 'vitest';

import { SANS_SOURCE_AUTOMATISABLE, SOURCES, locsDuTexte, slugDepuisUrl } from '../inventaire/sources';

describe('lecture des <loc>', () => {
  it('lit un sitemap ordinaire', () => {
    expect(locsDuTexte('<url><loc>https://x.test/games/a</loc></url>')).toEqual([
      'https://x.test/games/a',
    ]);
  });

  /*
   * Le jour où ce test a été écrit, Evoplay comptait pour zéro jeu dans
   * l'inventaire alors qu'il en publie 270. Le motif `[^<]+` butait sur le
   * `<` de `<![CDATA[`. Rien n'échouait : un sitemap illisible et un studio
   * sans jeu rendent le même compte.
   */
  it('lit un <loc> enveloppé de CDATA', () => {
    expect(locsDuTexte('<url><loc><![CDATA[https://evoplay.games/game/a/]]></loc></url>')).toEqual([
      'https://evoplay.games/game/a/',
    ]);
  });

  it('lit les deux formes mélangées dans un même document', () => {
    const xml = `<loc>https://x.test/a</loc><loc><![CDATA[https://x.test/b]]></loc>`;
    expect(locsDuTexte(xml)).toEqual(['https://x.test/a', 'https://x.test/b']);
  });
});

describe('slug déduit de l’URL', () => {
  it('décode et normalise', () => {
    expect(slugDepuisUrl('https://x.test/games/merlin%3A-journey-of-flame')).toBe(
      'merlin-journey-of-flame',
    );
  });

  it('ignore la barre finale', () => {
    expect(slugDepuisUrl('https://x.test/games/a-b/')).toBe('a-b');
  });

  /*
   * Dragon Gaming met la langue en paramètre : `/games/x/?lang=zh-hans`. Sans
   * couper la requête, le dernier segment est `?lang=zh-hans` et tous ses jeux
   * traduits tombent sur le slug « lang-zh-hans ».
   */
  it('coupe la requête et l’ancre avant de lire le slug', () => {
    expect(slugDepuisUrl('https://x.test/games/mythical-creatures/?lang=zh-hans')).toBe(
      'mythical-creatures',
    );
    expect(slugDepuisUrl('https://x.test/games/a-b#regles')).toBe('a-b');
  });

  /* Merkur et Push Gaming servent des `.html`. */
  it('coupe une extension de fichier', () => {
    expect(slugDepuisUrl('https://merkur.com/en/games/articles/jokers-cap.html')).toBe('jokers-cap');
  });

  /*
   * Habanero nomme ses pages avec un identifiant interne. Sans son crochet,
   * `SGKoiGate` devient `sgkoigate` : aucun slug de la base ne lui ressemble,
   * et son catalogue entier serait compté deux fois — 226 manquants d'un côté,
   * nos fiches en « chez nous seulement » de l'autre.
   */
  it('rend un slug lisible pour Habanero', () => {
    const habanero = SOURCES.find((s) => s.studio === 'habanero');
    expect(habanero?.slug).toBeTypeOf('function');
    const enSlug = (u: string) => habanero!.slug!(u);
    expect(enSlug('https://habanerosystems.com/games/SGBattleTheBeast')).toBe('battle-the-beast');
    expect(enSlug('https://habanerosystems.com/games/SG12Zodiacs')).toBe('12-zodiacs');
    expect(enSlug('https://habanerosystems.com/games/TGBlackjack')).toBe('blackjack');
  });
});

describe('couverture des studios', () => {
  it('ne déclare jamais un studio des deux côtés à la fois', () => {
    const automatises = SOURCES.map((s) => s.studio);
    const manuels = Object.keys(SANS_SOURCE_AUTOMATISABLE);
    expect(automatises.filter((s) => manuels.includes(s))).toEqual([]);
  });

  it('donne une raison à chaque studio non automatisé', () => {
    for (const [studio, raison] of Object.entries(SANS_SOURCE_AUTOMATISABLE)) {
      expect(raison.length, `${studio} sans raison`).toBeGreaterThan(30);
    }
  });
});
