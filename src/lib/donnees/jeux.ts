import { prisma } from './prisma';

const CHAMPS_VIGNETTE = {
  slug: true,
  nom: true,
  rtpStudio: true,
  rtpConfiance: true,
  volatilite: true,
  gainMaxMultiple: true,
  visuelUrl: true,
  studio: { select: { nom: true, slug: true } },
} as const;

/**
 * Les titres que le public cherche par leur nom.
 *
 * ── Pourquoi une liste écrite à la main ───────────────────────────────────
 *
 * La vitrine était triée par niveau de preuve puis par ordre alphabétique,
 * avec un jeu par studio pour éviter huit « Big Bass » à la suite. Le résultat
 * montrait la **couverture** du catalogue — Annihilator, Cygnus 2, Dead
 * Canary — mais aucun des titres pour lesquels les gens arrivent. Or l'accueil
 * n'a pas à démontrer l'étendue : il a à faire reconnaître quelque chose en
 * une seconde.
 *
 * Aucun critère en base ne peut produire cette liste. Ni le RTP, ni la date,
 * ni le nombre de casinos qui le proposent ne disent qu'un jeu est célèbre. Le
 * volume de recherche est la seule mesure qui le dirait, et il n'est pas dans
 * nos données. Une liste écrite est donc la solution honnête — à condition
 * d'être maintenue.
 *
 * L'ordre compte : ce sont les quatre premiers qui portent la première rangée.
 */
const VEDETTES = [
  'gates-of-olympus',
  'sweet-bonanza-1000',
  'sugar-rush',
  'starlight-princess',
  'big-bass-bonanza',
  'gates-of-olympus-1000',
  'book-of-dead',
  'wolf-gold',
  'madame-destiny-megaways',
];

export async function jeuxEnAvant(limite = 8) {
  /*
   * Seulement les jeux qui ont une jaquette.
   *
   * Deux tiers du catalogue n'en ont pas, et le repli — nom composé sur fond
   * dégradé — est fait pour une grille de recherche, pas pour une vitrine.
   * Sur l'accueil, six cartes de texte sur huit donnent l'impression d'un
   * catalogue vide alors qu'il compte 1 951 jeux.
   */
  const tous = await prisma.jeu.findMany({
    where: { visuelUrl: { not: null } },
    orderBy: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
    select: CHAMPS_VIGNETTE,
  });

  const parSlug = new Map(tous.map((j) => [j.slug, j]));
  const vedettes = VEDETTES.map((slug) => parSlug.get(slug)).filter((j) => j != null);

  /*
   * Le complément garde la règle d'un titre par studio : si la liste écrite
   * devient trop courte — un jeu retiré, une jaquette perdue — la rangée se
   * remplit avec de la variété plutôt qu'avec le premier venu par ordre
   * alphabétique.
   */
  const dejaLa = new Set(vedettes.map((j) => j!.slug));
  const studiosVus = new Set(vedettes.map((j) => j!.studio.nom));
  const complement = tous.filter((j) => {
    if (dejaLa.has(j.slug) || studiosVus.has(j.studio.nom)) return false;
    studiosVus.add(j.studio.nom);
    return true;
  });

  return [...vedettes, ...complement].slice(0, limite) as typeof tous;
}

export async function compterCatalogue() {
  const [jeux, studios, sourcés] = await Promise.all([
    prisma.jeu.count(),
    prisma.studio.count(),
    prisma.jeu.count({ where: { rtpConfiance: 'STUDIO' } }),
  ]);
  return { jeux, studios, sourcés };
}
