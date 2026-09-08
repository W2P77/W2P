/**
 * Les adaptateurs de capture, un par studio.
 *
 * ── Pourquoi un adaptateur et pas une routine générique ───────────────────
 *
 * Chaque studio dessine son jeu dans un `<canvas>` : il n'y a **aucun DOM à
 * interroger**, donc aucun sélecteur. On ne peut pas demander « le bouton
 * d'info » — on ne peut que cliquer à un endroit. Ces endroits sont stables
 * *dans* un studio, qui réutilise le même habillage sur tous ses jeux, et
 * n'ont aucun rapport d'un studio à l'autre.
 *
 * D'où cette table : un studio, une séquence de coordonnées. Elle est le
 * résultat d'une reconnaissance manuelle — trois essais ont été nécessaires
 * chez Pragmatic pour trouver l'icône « i », que j'avais d'abord placée
 * 100 px trop à gauche.
 *
 * ── La fragilité est réelle, et elle est nommée ───────────────────────────
 *
 * Un studio qui redessine son interface casse son adaptateur, et rien ne le
 * signalera : le script continuera de cliquer dans le vide et produira des
 * captures du jeu de base, en croyant capturer la table de gains. C'est
 * pourquoi `verifierLaCapture` existe — on compare les captures entre elles,
 * et deux images identiques trahissent un clic qui n'a rien fait.
 */
import type { Page } from 'playwright';

export interface Adaptateur {
  studio: string;
  /** Le temps de chargement du jeu, mesuré et non deviné. */
  chargementMs: number;
  /** Ferme l'écran d'accueil, s'il y en a un. */
  ouvrirLeJeu(page: Page): Promise<void>;
  /** Ouvre le panneau de règles et renvoie le nombre de pages capturées. */
  capturerLesRegles(page: Page, cliche: (nom: string) => Promise<void>): Promise<number>;
  /** Ouvre la boîte d'achat de bonus. Renvoie faux si le jeu n'en propose pas. */
  capturerLAchat(page: Page, cliche: (nom: string) => Promise<void>): Promise<boolean>;
}

export const PRAGMATIC: Adaptateur = {
  studio: 'pragmatic-play',
  chargementMs: 22_000,

  async ouvrirLeJeu(page) {
    // Le gros bouton rond de droite ferme le carrousel d'accueil. Un clic au
    // centre ne suffit pas : le carrousel défile et reste affiché.
    await page.mouse.click(1122, 527);
    await page.waitForTimeout(6000);
  },

  async capturerLesRegles(page, cliche) {
    await page.mouse.click(133, 745); // l'icône « i », en bas à gauche
    await page.waitForTimeout(4500);
    // Sept pages chez Pragmatic. On les capture toutes plutôt que de s'arrêter
    // à celle qui porte le RTP : les autres donnent les mécaniques, et une
    // seconde visite coûterait un chargement complet.
    for (let n = 1; n <= 7; n++) {
      await cliche(`regles-${n}`);
      await page.mouse.click(256, 625); // la flèche « page suivante »
      await page.waitForTimeout(2200);
    }
    await page.mouse.click(1178, 49); // fermer le panneau
    await page.waitForTimeout(2500);
    return 7;
  },

  async capturerLAchat(page, cliche) {
    await page.mouse.click(100, 165); // « BUY FREE SPINS », en haut à gauche
    await page.waitForTimeout(3500);
    await cliche('achat');
    return true;
  },
};

export const ADAPTATEURS: Record<string, Adaptateur> = {
  'pragmatic-play': PRAGMATIC,
};
