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
  chargementMs: 30_000,

  /**
   * Ferme l'écran d'accueil : **la touche Espace**.
   *
   * ── Trois versions ratées avant la bonne ───────────────────────────────
   *
   * 1. **Un clic à position fixe** (1122, 527) — le bouton de lancement de
   *    Gates of Olympus. Échouait un jeu sur deux : la mise en page change.
   * 2. **Six positions essayées dès la 22ᵉ seconde.** Le problème n'était pas
   *    *où* cliquer mais *quand* : ces jeux mettent plus de 22 s à charger et
   *    n'écoutent pas avant.
   * 3. **Une détection de l'accueil par OCR**, pour attendre le bon moment.
   *    Elle ne lisait rien : le texte de l'accueil est décoratif, courbé,
   *    ombré — l'OCR en tire « TO START (UU ». Le panneau de règles se lit
   *    parfaitement, l'écran d'accueil pas du tout.
   *
   * La réponse était dans le panneau de règles lui-même : « SPACE and ENTER
   * buttons on the keyboard can be used to start and stop the spin. » Le gros
   * bouton rond de l'accueil n'est pas cliquable — c'est une **illustration**
   * dans la phrase « PRESS ⟳ TO START PLAYING! ». Vérifié à l'écran : Espace
   * ouvre le jeu, le clic sur le rond ne fait rien.
   */
  async ouvrirLeJeu(page) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(5000);
    // Filet, pour les rares habillages sans écran d'accueil ou qui l'ont
    // déjà fermé : un second Espace y lancerait un tour, sans conséquence.
    await page.keyboard.press('Space');
    await page.waitForTimeout(4000);
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
