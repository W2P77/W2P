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
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

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

/**
 * L'écran d'accueil est-il encore affiché ?
 *
 * On lit la bande basse plutôt que l'image entière : elle est petite, à fort
 * contraste, et porte les deux seules mentions qui distinguent l'accueil du
 * jeu. Une reconnaissance sur cette bande coûte moins d'une seconde, contre
 * une dizaine sur la capture complète — et c'est la différence entre un
 * contrôle qu'on fait à chaque essai et un contrôle qu'on renonce à faire.
 */
async function accueilEncoreLa(page: Page): Promise<boolean> {
  const bande = await page.screenshot({ clip: { x: 200, y: 600, width: 880, height: 180 } });
  const prepare = await sharp(bande).grayscale().normalise().resize({ width: 1760 }).png().toBuffer();
  const ouvrier = await createWorker('eng');
  try {
    const { data } = await ouvrier.recognize(prepare);
    return /START PLAYING|DON'?T SHOW|NEXT TIME/i.test(data.text);
  } finally {
    await ouvrier.terminate();
  }
}

export const PRAGMATIC: Adaptateur = {
  studio: 'pragmatic-play',
  chargementMs: 22_000,

  /**
   * Ferme l'écran d'accueil — en **attendant** qu'il soit là, puis en
   * vérifiant qu'il est parti.
   *
   * ── Deux versions ratées, et ce qu'elles apprennent ────────────────────
   *
   * 1. **Un clic à position fixe.** (1122, 527) est le bouton de lancement de
   *    Gates of Olympus. Le bouton se déplace selon la mise en page — 74 % de
   *    la largeur ici, 80 % là — et un jeu sur deux restait sur son carrousel.
   *    Les captures ressemblaient à des réussites : elles montraient toutes
   *    l'accueil, et le RTP n'était simplement jamais lu.
   *
   * 2. **Six positions essayées dès la 22ᵉ seconde.** Le vrai problème n'était
   *    pas *où* cliquer mais *quand* : ces jeux mettent plus de 22 s à
   *    charger, et les six clics tombaient tous pendant le chargement, où
   *    ils ne sont pas écoutés. Une fois épuisés, plus rien ne se passait.
   *
   * D'où l'ordre correct : **attendre que l'accueil apparaisse** — sa présence
   * prouve que le jeu est chargé et écoute —, puis cliquer jusqu'à ce qu'il
   * disparaisse. C'est le contraire d'une temporisation : on n'attend pas une
   * durée, on attend un état.
   */
  async ouvrirLeJeu(page) {
    // Phase 1 : le jeu a-t-il fini de charger ? L'accueil en est la preuve.
    let charge = false;
    for (let i = 0; i < 12; i++) {
      if (await accueilEncoreLa(page)) {
        charge = true;
        break;
      }
      await page.waitForTimeout(4000);
    }
    // Certains jeux n'ont pas d'écran d'accueil du tout : rien à fermer.
    if (!charge) return;

    // Phase 2 : cliquer jusqu'à ce qu'il cède.
    const positions: Array<[number, number]> = [
      [1122, 527], [947, 476], [1040, 560], [900, 520], [1000, 610],
      [780, 456], [640, 400], [947, 476],
    ];
    for (const [x, y] of positions) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(2500);
      if (!(await accueilEncoreLa(page))) {
        // Le jeu vient d'apparaître : on le laisse finir son animation
        // d'entrée avant de capturer, sinon la première image est un fondu.
        await page.waitForTimeout(3000);
        return;
      }
    }
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
