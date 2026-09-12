/**
 * Ce qu'une fiche doit porter pour mériter d'être proposée aux moteurs.
 *
 * ── Pourquoi ce seuil existe ──────────────────────────────────────────────
 *
 * L'inventaire des catalogues studio crée des fiches dont on ne sait qu'une
 * chose : que le jeu existe. C'est un fait honnête et il a sa place dans la
 * base — c'est la liste de travail. Mais déclarer ces pages à Google reviendrait
 * à noyer les fiches renseignées sous des centaines de pages vides, et un site
 * jugé sur la moyenne de ses pages perd le classement de ses meilleures.
 *
 * ── Pourquoi la capture, et plus seulement le RTP ─────────────────────────
 *
 * Le seuil a longtemps été « un RTP présent ». Il laissait passer **5 831**
 * pages, dont **3 901 sans la moindre image** — ni jaquette ni capture. Une
 * fiche qui annonce un taux sans rien montrer du jeu n'est pas une fiche, et
 * les publier par milliers dessert précisément les quelques centaines qui sont
 * complètes.
 *
 * La capture est le bon seuil parce qu'elle **entraîne tout le reste**. Le
 * pipeline ouvre la démo officielle, lit le panneau de règles et en ramène du
 * même coup le RTP, la volatilité, le plafond et les mécaniques : entre
 * « au moins une capture » (695 fiches) et « capture + volatilité + plafond +
 * mécaniques + démo » (666), il n'y a que **29 fiches** d'écart. Une condition
 * suffit donc là où cinq n'ajouteraient que de la complexité.
 *
 * Elle a aussi une vertu que le RTP n'avait pas : elle ne se pose pas à la
 * main. Une fiche devient publiable le jour où le pipeline la capture, et pas
 * avant — le seuil se lève tout seul, personne n'a à y repasser.
 *
 * ── Ce que « non publiable » ne veut pas dire ─────────────────────────────
 *
 * La page **reste consultable**. Un visiteur qui cherche ce jeu le trouve, le
 * catalogue continue de le lister : on ne cache pas un jeu au public, on
 * s'abstient de le proposer aux moteurs tant qu'il n'a rien à leur montrer.
 * C'est `robots: noindex, follow` — les liens de la page gardent leur valeur.
 */
export interface FicheAPublier {
  rtpStudio: unknown;
  captures?: unknown;
}

/** Le nombre de captures d'une fiche, quelle que soit la forme du champ JSON. */
export function nombreDeCaptures(captures: unknown): number {
  return Array.isArray(captures) ? captures.length : 0;
}

export function estPublieable(jeu: FicheAPublier): boolean {
  return jeu.rtpStudio != null && nombreDeCaptures(jeu.captures) > 0;
}
