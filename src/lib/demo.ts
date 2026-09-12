/**
 * Ce qu'on peut embarquer, et ce qu'on ne peut pas.
 *
 * ── Deux sortes d'adresses dans `demoUrl` ─────────────────────────────────
 *
 * Chez Pragmatic, l'adresse est un **lanceur** : `openGame.do` ouvre le jeu
 * lui-même, sans habillage. C'est ce qu'un casino embarque dans son lobby, et
 * c'est ce qu'on peut embarquer ici.
 *
 * Chez Hacksaw, BGaming, Play'n GO et les autres, l'adresse est la **page
 * produit** du studio : une page de marque, avec son menu et son pied de
 * page, où la démo n'est qu'un bouton parmi d'autres. L'embarquer donnerait
 * un site dans le site. On y envoie le visiteur, on ne l'encadre pas.
 *
 * Le test est conservateur : dans le doute, on envoie vers le studio. Une
 * page de marque affichée en iframe est un défaut visible ; un lien qui
 * s'ouvre est simplement un lien.
 */
const LANCEURS = [/openGame\.do/i, /\/gs2c\//i];

/** Une page produit : `.../games/le-jeu` ou `.../games/le-jeu.html`, rien après. */
const PAGE_PRODUIT = /\/games?\/[a-z0-9-]+(?:\.html?)?\/?$/i;

export function estUnLanceurDeDemo(url: string | null | undefined): boolean {
  if (!url) return false;
  if (PAGE_PRODUIT.test(url)) return false;
  return LANCEURS.some((r) => r.test(url));
}
