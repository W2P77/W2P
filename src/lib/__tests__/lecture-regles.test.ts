import { describe, expect, it } from 'vitest';

import { extraireLesFaits } from '../captures/lecture-regles';

/*
 * Chaque studio a sa formule. Ces cas viennent de panneaux réellement lus :
 * tant que l'interprétation vivait dans la fonction d'OCR, les vérifier
 * demandait de fabriquer une image et de lancer Tesseract — donc personne ne
 * le faisait, et une formulation inconnue ne se découvrait qu'en production,
 * sous la forme d'un champ resté vide.
 */
describe('le RTP, selon la formule du studio', () => {
  it('lit la formule de Pragmatic', () => {
    expect(extraireLesFaits('The theoretical RTP of this game is 96.07%').rtp).toBe(96.07);
  });

  it('lit la formule de Hacksaw, où RTP est entre parenthèses', () => {
    expect(extraireLesFaits('Theoretical payout (RTP): 96.43%').rtp).toBe(96.43);
  });

  /*
   * Le texte est celui que Tesseract a rendu de la capture d'All-Star Fruits,
   * recopié sans retouche. La phrase suivante annonce deux RTP d'achat, et
   * c'est ce voisinage-là qui fait l'intérêt du cas : le studio publie les
   * trois d'affilée, et seul le premier porte « theoretical ».
   */
  it('lit la formule de BGaming, où « RTP » suit le sigle développé', () => {
    const f = extraireLesFaits(
      'The overall theoretical Return to Player (RTP) is 97.04%. ' +
        'RTP for the Buy Bonus feature is 97.01%. RTP for the Buy Magic Spins feature is 97.03%.',
    );
    expect(f.rtp).toBe(97.04);
  });

  /*
   * Recopié de l'OCR de Snoop Dogg Dollars : un RTP rond, sans décimale, et
   * pas d'espace après le point. La fiche était capturée sans chiffre.
   */
  it('lit un RTP entier quand il est suivi de « % »', () => {
    expect(
      extraireLesFaits('The overall theoretical Return to Player (RTP) is 96%.RTP in the Buy Bonus feature').rtp,
    ).toBe(96);
  });

  it('ne prend pas un nombre entier sans « % » pour un RTP', () => {
    expect(extraireLesFaits('The theoretical RTP of this game uses 20 lines').rtp).toBeNull();
  });

  /*
   * Recopié de l'OCR de Four Lucky Clover. Le premier nombre est le bas : le
   * prendre pour le taux publiait 89,41 % au lieu de 94 %.
   */
  it('lit une plage « A - B % » dans la même phrase par son haut', () => {
    const f = extraireLesFaits(
      "Return to Player The overall theoretical Return to Player (RTP) is 89,41 - 94,00% depending on the player's strategy.",
    );
    expect(f.rtp).toBe(94);
    expect(f.rtpMin).toBe(89.41);
  });

  /*
   * Recopié de l'OCR de Grand Buffalo Hold and Win. Le taux hors jackpot était
   * publié seul, alors que le studio met en avant celui avec jackpot.
   */
  it('lit « X % (without Jackpot) - Y % (with Jackpot) » par son haut', () => {
    const f = extraireLesFaits(
      'Return to Player The overall theoretical Return to Player (RTP) is 96.23% (without Jackpot) - 96.7% (with Jackpot). ' +
        'RTP in Buy Bonus with Free Spins is 96.7%. RTP in Buy Bonus with Fireball Respin is 92.66% (without Jackpot) - 96.7% (with Jackpot).',
    );
    expect(f.rtp).toBe(96.7);
    expect(f.rtpMin).toBe(96.23);
  });

  it('lit une plage comme un défaut et un palier', () => {
    const f = extraireLesFaits(
      'The maximum RTP of this game is 96.03% The minimum RTP of this game is 94.02%',
    );
    expect(f.rtp).toBe(96.03);
    expect(f.rtpMin).toBe(94.02);
  });

  /*
   * Le même panneau annonce le RTP de l'achat de bonus, qui peut **dépasser**
   * celui du jeu de base (Hacksaw : 96,43 contre 96,38). « Prendre le plus
   * bas » et « prendre le premier lu » sont donc tous deux faux : seule la
   * formulation les distingue.
   */
  it('ne prend jamais le RTP de l’achat de bonus pour celui du jeu', () => {
    const f = extraireLesFaits(
      'The RTP of the game when using "BUY FREE SPINS" is 96.50% The theoretical RTP of this game is 96.07%',
    );
    expect(f.rtp).toBe(96.07);
  });

  it('jette une valeur hors des bornes de vraisemblance', () => {
    expect(extraireLesFaits('The theoretical RTP of this game is 12.00%').rtp).toBeNull();
  });

  it('refuse un minimum supérieur au défaut', () => {
    const f = extraireLesFaits(
      'The maximum RTP of this game is 94.00% The minimum RTP of this game is 96.00%',
    );
    expect(f.rtpMin).toBeNull();
  });
});

describe('le gain maximum, selon la formule du studio', () => {
  it('lit « maximum theoretical win »', () => {
    expect(extraireLesFaits('The maximum theoretical win is 5,000x the bet').gainMax).toBe(5000);
  });

  it('lit « limited to … x bet »', () => {
    expect(extraireLesFaits('the maximum win amount is limited to 10,000x bet').gainMax).toBe(10000);
  });

  it('lit « maximum achievable win », la formule de Hacksaw', () => {
    expect(extraireLesFaits('Maximum achievable win: 25,000x').gainMax).toBe(25000);
  });

  /*
   * BGaming écrit le multiplicateur **avant** le nombre, et l'OCR rend son
   * « × » en « x » ordinaire. Les deux tournures relevées à trois jeux d'écart
   * ne diffèrent que par « in the game », d'où un saut toléré entre le mot-clé
   * et le signe plutôt que deux expressions séparées.
   */
  it('lit la formule de BGaming, où le signe précède le nombre', () => {
    expect(extraireLesFaits('The maximum winning amount is x1500 of the bet.').gainMax).toBe(1500);
    expect(extraireLesFaits('The maximum winning amount in the game is ×10000.').gainMax).toBe(10000);
  });
});

describe('la volatilité, dans les deux sens de lecture', () => {
  it('lit « high volatility »', () => {
    expect(extraireLesFaits('This game has high volatility').volatilite).toBe('HAUTE');
  });

  it('lit « Volatility: High », la forme inversée de Hacksaw', () => {
    expect(extraireLesFaits('Volatility: High').volatilite).toBe('HAUTE');
  });

  /* « very high » doit être essayé avant « high », sinon la seconde l'attrape. */
  it('distingue très haute de haute', () => {
    expect(extraireLesFaits('very high volatility').volatilite).toBe('TRES_HAUTE');
    expect(extraireLesFaits('Volatility: Very High').volatilite).toBe('TRES_HAUTE');
  });

  it('ne devine rien quand le panneau ne dit rien', () => {
    expect(extraireLesFaits('Bets from 0.10 to 250').volatilite).toBeNull();
  });
});
