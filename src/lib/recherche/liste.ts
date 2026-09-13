/**
 * Les deux règles de la liste de résultats, isolées du reste.
 *
 * Elles sont partagées par la route (serveur) et le champ (navigateur). Les
 * garder ici évite que le composant client importe `donnees/recherche.ts`, qui
 * tire Prisma derrière lui : une seule constante mal placée embarquerait le
 * client de base de données dans le bundle du navigateur.
 */

/**
 * En dessous de deux caractères, on n'interroge rien.
 *
 * Une lettre unique correspond à un tiers du catalogue : la requête coûte
 * cher, la liste n'apprend rien, et le visiteur n'a pas fini de taper.
 */
export const LONGUEUR_MINIMALE = 2;

/**
 * Où va la sélection quand on presse une flèche.
 *
 * `-1` signifie « aucune ligne sélectionnée » : c'est l'état d'ouverture, et
 * celui où Entrée vaut « chercher dans le catalogue » plutôt qu'« ouvrir cette
 * fiche ». La liste **boucle** — buter contre le bas oblige sinon à remonter
 * douze lignes à la main pour atteindre la première, qui est presque toujours
 * la bonne.
 */
export function deplacer(actif: number, pas: number, taille: number): number {
  if (taille === 0) return -1;
  const suivant = actif + pas;
  if (suivant < 0) return taille - 1;
  if (suivant >= taille) return 0;
  return suivant;
}
