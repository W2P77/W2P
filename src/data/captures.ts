/**
 * Les captures faites dans la démo officielle du studio.
 *
 * ── Pourquoi elles valent plus qu'une jaquette ────────────────────────────
 *
 * Une jaquette est fournie par le studio et se retrouve à l'identique sur
 * trente sites. Une capture de la table de gains, elle, n'existe nulle part
 * ailleurs — et surtout elle **fait autorité** : sur Gates of Olympus, le
 * panneau de règles affiche « The theoretical RTP of the game is 96.50% ».
 * C'est le jeu lui-même qui le dit, ce qui vaut mieux qu'un communiqué.
 *
 * ── Ce que les légendes disent, et ne disent pas ──────────────────────────
 *
 * Elles reprennent les chiffres écrits **en gros** dans le jeu : RTP, mises
 * minimale et maximale, plage de multiplicateurs, coût de l'achat de bonus.
 * Elles ne transcrivent pas les valeurs de symboles ligne à ligne : recopier
 * vingt-sept petits nombres lus dans une image est exactement la manière dont
 * une erreur entre dans une fiche. La capture montre, le texte résume.
 */
import type { LectureDeCapture } from '@/lib/legendes';

export interface Capture {
  fichier: string;
  titre: string;
  legende: string;
  /**
   * Ce que la page de règles explique, reconnu au moment de la capture.
   *
   * Pas le texte OCR : le sujet de la page et les codes des formulations
   * reconnues, une centaine d'octets. Le texte brut n'est jamais publié — il
   * pèserait une dizaine de kilooctets par fiche dans la page, et personne ne
   * l'a relu. Voir `LectureDeCapture` dans `src/lib/legendes.ts`.
   *
   * Absent sur les captures d'avant ce chantier, et sur celles dont l'OCR n'a
   * rien permis d'affirmer : la légende générique reprend alors la main.
   */
  lecture?: LectureDeCapture | null;
}

export interface CapturesDeJeu {
  /** Le jour de la capture : une donnée de jeu peut changer d'une version à l'autre. */
  faitesLe: string;
  source: string;
  captures: Capture[];
}

/*
 * Les captures elles-mêmes vivent en base, colonne `jeux.captures`.
 *
 * Elles ont commencé ici, en dur, le temps de la première fiche. À 598 jeux
 * et neuf captures chacun, un fichier statique serait un demi-mégaoctet
 * régénéré à chaque passage du programme de capture — et il faudrait le
 * commiter pour publier une image. La base fait ça mieux, et la publication
 * ne consomme plus de build.
 *
 * Ce fichier ne garde que les types, partagés entre le script qui écrit et le
 * composant qui lit.
 */
