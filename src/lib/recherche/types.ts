/**
 * Le contrat entre la route de recherche et le champ qui l'interroge.
 *
 * ── Pourquoi des données brutes et aucun libellé ──────────────────────────
 *
 * La route pourrait renvoyer « 4 jeux · RTP 96,5 % » tout composé. Elle ne le
 * fait pas : ces phrases vivent dans `src/i18n/textes.ts`, où le typage force
 * les trois langues. Une chaîne assemblée côté serveur échapperait à ce
 * garde-fou et reviendrait en anglais pour tout le monde le jour où l'on
 * oublie un cas. La route envoie donc des nombres et des noms propres ; le
 * composant les met en phrase dans la langue de la page.
 *
 * ── Pourquoi ce fichier ne contient que des types ─────────────────────────
 *
 * Il est importé des deux côtés de la frontière. Un type disparaît à la
 * compilation : rien de ce fichier n'atteint le navigateur. Y poser une
 * constante l'embarquerait dans le bundle de chaque page qui porte le champ.
 */

export type CategorieRecherche = 'jeu' | 'studio' | 'guide' | 'casino';

export interface ResultatRecherche {
  categorie: CategorieRecherche;
  /**
   * L'identité de la ligne dans la liste.
   *
   * Le slug seul ne suffit pas : un studio et un jeu peuvent le partager
   * (`gates-of-olympus` existe des deux côtés chez certains éditeurs), et deux
   * clés React identiques font réutiliser le mauvais nœud au frappe suivante.
   */
  cle: string;
  titre: string;
  /**
   * Le chemin **interne**, sans langue : `/slot/pragmatic-play/fire-hot-20`.
   * Le composant le traduit et le préfixe, comme `Lien` le fait partout
   * ailleurs. Seuls les casinos font exception — voir `href` ci-dessous.
   */
  href: string;
  /** L'image à gauche de la ligne, quand on en a une. */
  visuel: string | null;
  /** Jeux : le nom du studio, affiché en sous-titre. */
  studio?: string;
  /** Jeux : le RTP studio, déjà converti — un `Decimal` ne traverse pas JSON. */
  rtp?: number | null;
  /** Studios : le nombre de fiches **visibles**, pas le catalogue annoncé. */
  nbJeux?: number;
  /** Guides : le temps de lecture. */
  minutes?: number;
  score: number;
}

export interface GroupeRecherche {
  categorie: CategorieRecherche;
  resultats: ResultatRecherche[];
}

export interface ReponseRecherche {
  /** La requête telle qu'elle a été traitée — sert à ignorer une réponse en retard. */
  q: string;
  groupes: GroupeRecherche[];
  total: number;
}
