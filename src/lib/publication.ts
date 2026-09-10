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
 * ── Pourquoi le RTP, et pas un drapeau « WIP » ────────────────────────────
 *
 * Un drapeau se pose à la main et s'oublie à la main : il finirait par mentir
 * dans les deux sens — des fiches complètes marquées WIP, des fiches vides qui
 * ne le sont plus. Le RTP est le seul champ sans lequel une fiche n'a
 * strictement rien à dire ; c'est aussi ce qu'on vient chercher sur ce site.
 * Le seuil se lève donc tout seul à la minute où la fiche devient utile, sans
 * que personne ait à y repasser.
 *
 * Le niveau de preuve, lui, ne rentre pas dans ce calcul : une fiche au RTP
 * non recoupé est utile et le dit franchement à l'écran. C'est l'absence de
 * donnée qui disqualifie, pas la faiblesse de la source.
 */
export function estPublieable(jeu: { rtpStudio: unknown }): boolean {
  return jeu.rtpStudio != null;
}
