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
 * Les jeux mis en avant sur l'accueil, **un par studio d'abord**.
 *
 * Un simple tri alphabétique donnait huit « Big Bass » à la suite : la vitrine
 * donnait l'impression d'un catalogue d'un seul jeu décliné. Prendre un titre
 * par studio avant de compléter montre la couverture réelle, qui est ce qu'on
 * vend.
 */
export async function jeuxEnAvant(limite = 8) {
  const tous = await prisma.jeu.findMany({
    orderBy: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
    select: CHAMPS_VIGNETTE,
  });

  const vus = new Set<string>();
  const varies = tous.filter((j) => {
    if (vus.has(j.studio.nom)) return false;
    vus.add(j.studio.nom);
    return true;
  });

  // Si les studios ne suffisent pas à remplir la rangée, on complète.
  const restants = tous.filter((j) => !varies.includes(j));
  return [...varies, ...restants].slice(0, limite);
}

export async function compterCatalogue() {
  const [jeux, studios, sourcés] = await Promise.all([
    prisma.jeu.count(),
    prisma.studio.count(),
    prisma.jeu.count({ where: { rtpConfiance: 'STUDIO' } }),
  ]);
  return { jeux, studios, sourcés };
}
