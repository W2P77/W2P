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
  demoTitre: 'Try it for free',
  demoNote: "The studio's own free demo, played here — no account, no money, the same maths as the real game.",
  demoChezLeStudio: 'Open the demo on {studio}’s site',
  capturesIntro: "Captured in the studio's own free demo{date}. Nothing below is taken from a press release or another site — it is what the game shows when you open it.",
  sortieVers: 'Heading to {casino}',
  sortieDans: 'Automatic redirect in {n}s…',
  sortieSecours: 'Click here if nothing happens →',
  sortieResponsable: '18+ · Play responsibly',
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

  // ── Pages de section : titre, description, accroche ────────────────────
  titrePageCatalogue: 'Slot catalogue — RTP, volatility and demos',
  descPageCatalogue: 'Every slot with its RTP, volatility and max win — and where each number comes from.',

  titrePageDemos: 'Free slot demos — play without an account',
  descPageDemos: 'Play hundreds of slots for free, no sign-up and no deposit. Every demo links straight to the studio, never to another site.',
  accrocheDemos: 'Play for free, without an account and without a deposit. Every demo opens on the studio’s own page — never on another comparison site.',

  titrePageAvis: 'Verified slots — RTP checked against the studio',
  descPageAvis: 'Slots whose RTP we checked against the studio itself, with the source on file. What we could not confirm is listed as unconfirmed.',

  titrePageGuides: 'Guides — how to read slot data',
  descPageGuides: 'How RTP tiers, bonus buy returns and volatility labels actually work — written from what we measured building the catalogue.',
  accrocheGuides: 'Written from what we measured while building this catalogue — not from what other sites say.',

  titrePageNouveautes: 'New slot releases — the latest games, with their real RTP',
  descPageNouveautes: 'Slots released recently, with the RTP the studio actually publishes — and a clear mark when we have not been able to confirm it yet.',

  titrePageFavoris: 'Favorites',
  descPageFavoris: 'The slots you saved, kept on your device.',
  accrocheFavoris: 'Saved on this device only. No account, no email, nothing sent to us — a catalogue does not need to know who you are.',

  titrePageStudio: '{studio} slots — RTP, volatility and demos',
  descPageStudio: 'Every {studio} slot with its RTP, volatility and max win — and where each number comes from.',

  derniersGuides: 'Latest guides & reviews',
  chargement: 'Loading…',
  rtpInconnu: 'RTP —',
  introuvableJeu: 'Slot not found',
  introuvableStudio: 'Provider not found',
  introuvableGuide: 'Guide not found',
  aucunResultatPour: 'No slot matches “{terme}”.',
  titreCatalogue: 'Slot catalogue',
  pageIntrouvable: 'Page not found',
} as const;

export type CleTexte = keyof typeof EN;

const FR: Record<CleTexte, string> = {
  demoTitre: 'Essayer gratuitement',
  demoNote: 'La démo gratuite du studio, jouée ici — sans compte, sans argent, avec les mêmes maths que le jeu réel.',
  demoChezLeStudio: 'Ouvrir la démo sur le site de {studio}',
  capturesIntro: "Capturé dans la démo gratuite du studio{date}. Rien ici ne vient d'un communiqué ni d'un autre site : c'est ce que le jeu affiche quand on l'ouvre.",
  sortieVers: 'Direction {casino}',
  sortieDans: 'Redirection automatique dans {n} s…',
  sortieSecours: 'Clique ici si rien ne se passe →',
  sortieResponsable: '18+ · Joue de manière responsable',
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
    '{jeu} de {studio} : RTP {rtp} %, volatilité, gain maximum et démo gratuite. Chaque chiffre dit d’où il vient.',
  descriptionJeuSansRtp:
    '{jeu} de {studio} : volatilité, gain maximum et démo gratuite. On dit franchement quand un chiffre n’est pas encore sourcé.',

  titrePageCatalogue: 'Catalogue de machines à sous — RTP, volatilité et démos',
  descPageCatalogue: 'Chaque machine avec son RTP, sa volatilité et son gain maximum — et d’où vient chaque chiffre.',

  titrePageDemos: 'Démos gratuites — jouer sans compte',
  descPageDemos: 'Des centaines de machines à sous en démo gratuite, sans inscription ni dépôt. Chaque démo mène directement au studio, jamais à un autre site.',
  accrocheDemos: 'Jouer gratuitement, sans compte et sans dépôt. Chaque démo s’ouvre sur la page du studio lui-même — jamais sur un autre comparateur.',

  titrePageAvis: 'Machines vérifiées — RTP contrôlé auprès du studio',
  descPageAvis: 'Les machines dont nous avons contrôlé le RTP auprès du studio, source à l’appui. Ce que nous n’avons pas pu confirmer est annoncé comme non confirmé.',

  titrePageGuides: 'Guides — comment lire les données d’une machine',
  descPageGuides: 'Ce que valent vraiment les paliers de RTP, les rendements d’achat de bonus et les étiquettes de volatilité — écrit à partir de ce que nous avons mesuré.',
  accrocheGuides: 'Écrit à partir de ce que nous avons mesuré en construisant ce catalogue — pas de ce que disent les autres sites.',

  titrePageNouveautes: 'Nouveautés — les dernières sorties, avec leur vrai RTP',
  descPageNouveautes: 'Les machines sorties récemment, avec le RTP que le studio publie réellement — et une mention claire quand nous n’avons pas encore pu le confirmer.',

  titrePageFavoris: 'Favoris',
  descPageFavoris: 'Les machines que tu as enregistrées, gardées sur ton appareil.',
  accrocheFavoris: 'Enregistrées sur cet appareil uniquement. Aucun compte, aucun e-mail, rien qui nous soit envoyé — un catalogue n’a pas besoin de savoir qui tu es.',

  titrePageStudio: 'Machines {studio} — RTP, volatilité et démos',
  descPageStudio: 'Chaque machine {studio} avec son RTP, sa volatilité et son gain maximum — et d’où vient chaque chiffre.',

  derniersGuides: 'Derniers guides et analyses',
  chargement: 'Chargement…',
  rtpInconnu: 'RTP —',
  introuvableJeu: 'Machine introuvable',
  introuvableStudio: 'Studio introuvable',
  introuvableGuide: 'Guide introuvable',
  aucunResultatPour: 'Aucune machine ne correspond à « {terme} ».',
  titreCatalogue: 'Catalogue',
  pageIntrouvable: 'Page introuvable',
};

const DE: Record<CleTexte, string> = {
  demoTitre: 'Kostenlos ausprobieren',
  demoNote: 'Die kostenlose Demo des Studios, hier gespielt — ohne Konto, ohne Geld, mit derselben Mathematik wie im echten Spiel.',
  demoChezLeStudio: 'Die Demo auf der Seite von {studio} öffnen',
  capturesIntro: 'Aufgenommen in der kostenlosen Demo des Studios{date}. Nichts davon stammt aus einer Pressemitteilung oder von einer anderen Seite — es ist das, was das Spiel beim Öffnen zeigt.',
  sortieVers: 'Weiter zu {casino}',
  sortieDans: 'Automatische Weiterleitung in {n} s…',
  sortieSecours: 'Hier klicken, wenn nichts passiert →',
  sortieResponsable: '18+ · Spiele verantwortungsbewusst',
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

  titrePageCatalogue: 'Slot-Katalog — RTP, Volatilität und Demos',
  descPageCatalogue: 'Jeder Slot mit RTP, Volatilität und Maximalgewinn — und woher jede Zahl stammt.',

  titrePageDemos: 'Gratis-Demos — ohne Konto spielen',
  descPageDemos: 'Hunderte Slots gratis testen, ohne Anmeldung und ohne Einzahlung. Jede Demo führt direkt zum Studio, nie zu einer anderen Seite.',
  accrocheDemos: 'Gratis spielen, ohne Konto und ohne Einzahlung. Jede Demo öffnet auf der Seite des Studios selbst — nie auf einem anderen Vergleichsportal.',

  titrePageAvis: 'Geprüfte Slots — RTP beim Studio kontrolliert',
  descPageAvis: 'Slots, deren RTP wir beim Studio selbst kontrolliert haben, mit hinterlegter Quelle. Was wir nicht bestätigen konnten, steht als unbestätigt da.',

  titrePageGuides: 'Ratgeber — Slot-Daten richtig lesen',
  descPageGuides: 'Was RTP-Stufen, Bonuskauf-Renditen und Volatilitätsangaben wirklich bedeuten — geschrieben aus dem, was wir selbst gemessen haben.',
  accrocheGuides: 'Geschrieben aus dem, was wir beim Aufbau dieses Katalogs gemessen haben — nicht aus dem, was andere Seiten behaupten.',

  titrePageNouveautes: 'Neuheiten — die jüngsten Slots, mit echtem RTP',
  descPageNouveautes: 'Kürzlich erschienene Slots, mit dem RTP, den das Studio tatsächlich veröffentlicht — und einem klaren Hinweis, wenn wir ihn noch nicht bestätigen konnten.',

  titrePageFavoris: 'Favoriten',
  descPageFavoris: 'Die Slots, die du gespeichert hast — auf deinem Gerät.',
  accrocheFavoris: 'Nur auf diesem Gerät gespeichert. Kein Konto, keine E-Mail, nichts wird an uns gesendet — ein Katalog muss nicht wissen, wer du bist.',

  titrePageStudio: '{studio}-Slots — RTP, Volatilität und Demos',
  descPageStudio: 'Jeder {studio}-Slot mit RTP, Volatilität und Maximalgewinn — und woher jede Zahl stammt.',

  derniersGuides: 'Neueste Ratgeber und Tests',
  chargement: 'Lädt…',
  rtpInconnu: 'RTP —',
  introuvableJeu: 'Slot nicht gefunden',
  introuvableStudio: 'Studio nicht gefunden',
  introuvableGuide: 'Ratgeber nicht gefunden',
  aucunResultatPour: 'Kein Slot passt zu „{terme}“.',
  titreCatalogue: 'Slot-Katalog',
  pageIntrouvable: 'Seite nicht gefunden',
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
