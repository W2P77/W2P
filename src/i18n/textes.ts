import type { Langue } from './langues';

/**
 * Les textes de l'interface, dans les trois langues.
 *
 * ── Ce qu'on traduit ici, et ce qu'on ne traduit pas ──────────────────────
 *
 * Ici : la navigation, les intitulés, les boutons — ce que le site dit de
 * lui-même. Trente-huit chaînes, écrites une fois.
 *
 * Pas ici : les **données des jeux**. Mécaniques, grilles, lignes de paiement
 * sont stockées en un seul exemplaire dans la fiche, et la table `Traduction`
 * existe pour porter leurs versions par langue. Les mélanger reviendrait à
 * faire d'un dictionnaire d'interface un dictionnaire de contenu, qui
 * grossirait sans fin.
 *
 * ── Pourquoi un objet et pas une bibliothèque ─────────────────────────────
 *
 * Trente-huit chaînes et trois langues ne justifient ni le poids ni la
 * configuration d'une bibliothèque d'internationalisation. Le typage fait le
 * travail : une clé oubliée dans une langue casse la compilation, ce qui est
 * exactement le garde-fou qu'on attend.
 */
const EN = {
  navAccueil: 'HOME',
  navCatalogue: 'SLOT CATALOGUE',
  navNouveautes: 'NEW',
  navAvis: 'REVIEWS',
  navDemos: 'DEMOS',
  navGuides: 'GUIDES',
  navFavoris: 'FAVORITES',

  piedParcourir: 'Browse',
  piedApprendre: 'Learn',
  piedCatalogue: 'Catalogue',
  piedDemos: 'Free demos',
  piedAvis: 'Verified slots',
  piedGuides: 'Guides',
  piedFavoris: 'Favorites',

  rechercher: 'Search',
  rechercherPlaceholder: 'Search by slot name or provider…',
  pagination: 'Pagination',
  precedent: '← Previous',
  suivant: 'Next →',

  accroche: 'Discover your next',
  accrocheSuite: 'Unleash thousands of free slots, demos, and expert reviews.',
  jouerDemos: 'Play free demos',
  explorerCatalogue: 'Explore catalogue',
  mieuxNotes: 'Top rated slots this week',
  parStudio: 'Browse by provider',
  lireGuides: 'Read the guides',
  tousStudios: 'All providers',
  studio: 'Provider',

  parcourirCatalogue: 'Browse the catalogue',
  parcourirDemos: 'Browse free demos',
  aucunResultat: 'No slot matches these filters.',
  effacerFiltres: 'Clear all filters',
  aucunFavori: 'You have not saved any game yet.',

  jouerDemo: 'Play the free demo',
  donneesJeu: 'Game data',
  dansLeJeu: 'Inside the game',
  ouJouer: 'Where to play',
  agrandir: 'Enlarge',
  fermer: 'Close',
  lirePlus: 'Read more',

  /*
   * ── Le titre d'une fiche, en deux versions ─────────────────────────────
   *
   * Une seule formule donnait « Where to play Gemix — RTP, demo and full
   * specs » sur les 512 fiches sans RTP : une virgule après un mot vide, sur
   * un cinquième du catalogue. Deux formules valent mieux qu'un trou.
   *
   * Celle sans RTP nomme le studio à la place : c'est le fait qu'on a, et il
   * distingue la fiche au lieu de laisser une place béante.
   */
  titreJeuAvecRtp: 'Where to play {jeu} — {rtp}% RTP, free demo and specs',
  titreJeuSansRtp: 'Where to play {jeu} by {studio} — free demo and specs',
  descriptionJeuAvecRtp:
    '{jeu} by {studio}: {rtp}% RTP, volatility, max win and a free demo. Every number says where it comes from.',
  descriptionJeuSansRtp:
    '{jeu} by {studio}: volatility, max win and a free demo. We say plainly when a number is not yet sourced.',
} as const;

export type CleTexte = keyof typeof EN;

const FR: Record<CleTexte, string> = {
  navAccueil: 'ACCUEIL',
  navCatalogue: 'CATALOGUE',
  navNouveautes: 'NOUVEAUTÉS',
  navAvis: 'AVIS',
  navDemos: 'DÉMOS',
  navGuides: 'GUIDES',
  navFavoris: 'FAVORIS',

  piedParcourir: 'Parcourir',
  piedApprendre: 'Comprendre',
  piedCatalogue: 'Catalogue',
  piedDemos: 'Démos gratuites',
  piedAvis: 'Machines vérifiées',
  piedGuides: 'Guides',
  piedFavoris: 'Favoris',

  rechercher: 'Rechercher',
  rechercherPlaceholder: 'Chercher un jeu ou un studio…',
  pagination: 'Pagination',
  precedent: '← Précédent',
  suivant: 'Suivant →',

  accroche: 'Trouve ta prochaine',
  accrocheSuite: 'Des milliers de machines à sous, leurs démos gratuites et nos analyses.',
  jouerDemos: 'Jouer aux démos',
  explorerCatalogue: 'Explorer le catalogue',
  mieuxNotes: 'Les mieux notées cette semaine',
  parStudio: 'Parcourir par studio',
  lireGuides: 'Lire les guides',
  tousStudios: 'Tous les studios',
  studio: 'Studio',

  parcourirCatalogue: 'Parcourir le catalogue',
  parcourirDemos: 'Voir les démos gratuites',
  aucunResultat: 'Aucune machine ne correspond à ces filtres.',
  effacerFiltres: 'Effacer les filtres',
  aucunFavori: "Tu n'as encore enregistré aucun jeu.",

  jouerDemo: 'Jouer à la démo gratuite',
  donneesJeu: 'Fiche technique',
  dansLeJeu: 'Dans le jeu',
  ouJouer: 'Où jouer',
  agrandir: 'Agrandir',
  fermer: 'Fermer',
  lirePlus: 'Lire la suite',

  titreJeuAvecRtp: 'Où jouer à {jeu} — RTP {rtp} %, démo gratuite et fiche',
  titreJeuSansRtp: 'Où jouer à {jeu} de {studio} — démo gratuite et fiche',
  descriptionJeuAvecRtp:
    '{jeu} de {studio} : RTP {rtp} %, volatilité, gain maximum et démo gratuite. Chaque chiffre dit d\u2019où il vient.',
  descriptionJeuSansRtp:
    '{jeu} de {studio} : volatilité, gain maximum et démo gratuite. On dit franchement quand un chiffre n\u2019est pas encore sourcé.',
};

const DE: Record<CleTexte, string> = {
  navAccueil: 'START',
  navCatalogue: 'KATALOG',
  navNouveautes: 'NEU',
  navAvis: 'TESTS',
  navDemos: 'DEMOS',
  navGuides: 'RATGEBER',
  navFavoris: 'FAVORITEN',

  piedParcourir: 'Entdecken',
  piedApprendre: 'Verstehen',
  piedCatalogue: 'Katalog',
  piedDemos: 'Gratis-Demos',
  piedAvis: 'Geprüfte Slots',
  piedGuides: 'Ratgeber',
  piedFavoris: 'Favoriten',

  rechercher: 'Suchen',
  rechercherPlaceholder: 'Slot oder Studio suchen…',
  pagination: 'Seitennavigation',
  precedent: '← Zurück',
  suivant: 'Weiter →',

  accroche: 'Finde deinen nächsten',
  accrocheSuite: 'Tausende Slots, ihre Gratis-Demos und unsere Analysen.',
  jouerDemos: 'Gratis-Demos spielen',
  explorerCatalogue: 'Katalog entdecken',
  mieuxNotes: 'Bestbewertet diese Woche',
  parStudio: 'Nach Studio stöbern',
  lireGuides: 'Ratgeber lesen',
  tousStudios: 'Alle Studios',
  studio: 'Studio',

  parcourirCatalogue: 'Katalog durchsuchen',
  parcourirDemos: 'Gratis-Demos ansehen',
  aucunResultat: 'Kein Slot passt zu diesen Filtern.',
  effacerFiltres: 'Filter zurücksetzen',
  aucunFavori: 'Du hast noch kein Spiel gespeichert.',

  jouerDemo: 'Gratis-Demo spielen',
  donneesJeu: 'Spieldaten',
  dansLeJeu: 'Im Spiel',
  ouJouer: 'Wo spielen',
  agrandir: 'Vergrößern',
  fermer: 'Schließen',
  lirePlus: 'Weiterlesen',

  titreJeuAvecRtp: 'Wo {jeu} spielen — {rtp} % RTP, Gratis-Demo und Daten',
  titreJeuSansRtp: 'Wo {jeu} von {studio} spielen — Gratis-Demo und Daten',
  descriptionJeuAvecRtp:
    '{jeu} von {studio}: {rtp} % RTP, Volatilität, Maximalgewinn und Gratis-Demo. Jede Zahl nennt ihre Quelle.',
  descriptionJeuSansRtp:
    '{jeu} von {studio}: Volatilität, Maximalgewinn und Gratis-Demo. Wir sagen offen, wenn eine Zahl noch keine Quelle hat.',
};

const TOUT: Record<Langue, Record<CleTexte, string>> = { en: EN, fr: FR, de: DE };

/** Remplace les `{jeton}` d'un gabarit par leurs valeurs. */
export function remplir(gabarit: string, valeurs: Record<string, string>): string {
  return gabarit.replace(/\{(\w+)\}/g, (_, cle: string) => valeurs[cle] ?? '');
}

/** Les textes d'une langue. Le typage refuse une clé manquante. */
export function textes(l: Langue): Record<CleTexte, string> {
  return TOUT[l] ?? EN;
}
