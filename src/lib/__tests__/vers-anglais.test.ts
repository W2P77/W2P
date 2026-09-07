import { describe, expect, it } from 'vitest';
import { versAnglais } from '@/lib/traduction/vers-anglais';

describe('les faits repris en français', () => {
  it('traduit le vocabulaire du domaine', () => {
    const cas: Array<[string, string]> = [
      ['Achat bonus 100x', 'Bonus buy 100x'],
      ['Achat de bonus disponible (75x)', 'Bonus buy available (75x)'],
      ['Aucun achat de bonus', 'No bonus buy'],
      ["Pas d'achat bonus", 'No bonus buy'],
      ['Tours gratuits', 'Free spins'],
      ['Aucun tour gratuit', 'No free spins'],
      ['Symboles empilés', 'Stacked symbols'],
      ['Wilds multiplicateurs', 'Multiplier wilds'],
      ['6 rouleaux, 2 à 8 rangées', '6 reels, 2 to 8 rows'],
      ['20 lignes fixes', '20 fixed paylines'],
      ['10 lignes de paiement fixes', '10 fixed paylines'],
      ['Achat bonus 100x mise (interdit UK)', 'Bonus buy 100x bet (not available in the UK)'],
    ];
    for (const [fr, en] of cas) expect(versAnglais(fr), fr).toBe(en);
  });

  it('passe le séparateur de milliers à la virgule', () => {
    // « 117 649 ways » se lit comme deux nombres en anglais.
    expect(versAnglais('De 64 à 117 649 façons de gagner (Megaways)')).toBe(
      '64 to 117,649 ways to win (Megaways)',
    );
    expect(versAnglais("Jusqu'à 262 144 façons")).toBe('Up to 262,144 ways');
  });

  it('n’ouvre pas une majuscule en milieu de phrase', () => {
    expect(versAnglais('Grille Megaways 6 rouleaux (jusqu’à 6 symboles par rouleau)')).toBe(
      'Grid Megaways 6 reels (up to 6 symbols per reel)',
    );
  });
});

describe('le refus, qui est la vraie garantie', () => {
  it('laisse intacte une chaîne déjà anglaise', () => {
    for (const en of ['Free Spins', 'Cluster Pays', 'Megaways engine', '243 ways', 'Hold & Spin']) {
      expect(versAnglais(en), en).toBeNull();
    }
  });

  it('refuse une traduction restée à moitié française', () => {
    /*
     * Le cas qui a motivé le durcissement : « plus a wagon de 4 symbols »
     * passait le contrôle parce que les mots-outils n'étaient pas surveillés.
     * Une phrase à moitié traduite a l'air d'avoir été relue — elle coûte plus
     * cher que l'original resté franchement français.
     */
    expect(versAnglais('Bonus offert avec le premier tour de la partie')).toBeNull();
    expect(versAnglais('Fonctionnalité déclenchée selon le niveau atteint')).toBeNull();
  });

  it('refuse plutôt que de laisser un nombre bouger', () => {
    // Aucune règle ne touche aux nombres ; la vérification est là pour le cas
    // où une règle future le ferait sans qu'on s'en aperçoive.
    const source = '6 rouleaux, 2 à 8 rangées';
    const traduit = versAnglais(source)!;
    const chiffres = (t: string) => (t.replace(/[\s ,](?=\d{3}\b)/g, '').match(/\d+/g) ?? []).join();
    expect(chiffres(traduit)).toBe(chiffres(source));
  });
});

describe('les demi-traductions constatées en production', () => {
  /*
   * Ce bloc n'est pas théorique : chacun de ces cas a réellement été écrit en
   * base par un premier passage dont le détecteur était trop faible. Il y en
   * a eu 464. Les figer ici évite de les réintroduire à la prochaine règle
   * ajoutée.
   */
  it('rattrape le mot français greffé sur un mot anglais', () => {
    const cas: Array<[string, string]> = [
      ['Grille 5x3, extensible à 5x5', 'Grid 5x3, expanding to 5x5'],
      ['Grid 5x3, expanding à 5x6', 'Grid 5x3, expanding to 5x6'],
      ['Multiplicateurs cumulés', 'Cumulative multipliers'],
      ['Random Wilds (apparition aléatoire)', 'Random Wilds (random trigger)'],
      ['Multipliers x2 à x100', 'Multipliers x2 to x100'],
      ['3 niveaux réglables par le joueur', '3 tiers player-adjustable'],
    ];
    for (const [avant, apres] of cas) expect(versAnglais(avant), avant).toBe(apres);
  });

  it('refuse encore ce qu’il ne sait pas finir', () => {
    // Un accent suffit à disqualifier : c'est la règle qui rattrape toute la
    // famille de mots qu'une liste manuelle aurait oubliés un par un.
    expect(versAnglais('Bonus fusée (choix parmi 5 fusées)')).toBeNull();
    expect(versAnglais('Simulateur de pêche vue FPS (instant win)')).toBeNull();
  });
});
