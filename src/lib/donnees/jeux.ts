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

/**
 * Les slugs des fiches réellement finies.
 *
 * Le critère est celui de `estPublieable()` — un RTP **et** au moins une
 * capture. Il passe par du SQL parce que Prisma ne sait pas filtrer sur la
 * longueur d'un tableau `jsonb` : `captures: { not: null }` laisserait passer
 * un tableau vide, qui est précisément le cas à exclure.
 */
async function slugsPubliables(): Promise<string[]> {
  const lignes = await prisma.$queryRaw<Array<{ slug: string }>>`
    SELECT slug FROM jeux
    WHERE rtp_studio IS NOT NULL
      AND captures IS NOT NULL
      AND jsonb_array_length(captures) > 0
  `;
  return lignes.map((l) => l.slug);
}

export async function jeuxEnAvant(limite = 8) {
  /*
   * ── Ce que la vitrine a le droit de montrer ─────────────────────────────
   *
   * Deux conditions, et elles ne disent pas la même chose.
   *
   * **Une jaquette**, parce que le repli — nom composé sur fond dégradé — est
   * fait pour une grille de recherche, pas pour une vitrine : six cartes de
   * texte sur huit donnent l'impression d'un catalogue vide.
   *
   * **Une fiche finie**, parce qu'une carte d'accueil est une promesse. Mettre
   * en avant un jeu dont la page n'est même pas proposée aux moteurs, c'est
   * envoyer le visiteur sur la seule page qu'on juge nous-mêmes incomplète.
   * Le filtre est donc exactement celui de la publication : ce qui entre dans
   * le sitemap peut entrer dans la vitrine, rien d'autre.
   */
  const publiables = new Set(await slugsPubliables());
  const tous = (
    await prisma.jeu.findMany({
      where: { visuelUrl: { not: null } },
      orderBy: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
      select: CHAMPS_VIGNETTE,
    })
  ).filter((j) => publiables.has(j.slug));

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
