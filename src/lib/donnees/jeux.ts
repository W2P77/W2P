import { prisma } from './prisma';
import { filtrePubliable } from './publiables';

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
  /*
   * ── Pourquoi la date de sortie, et pas une note ─────────────────────────
   *
   * La section s'appelait « les mieux notées cette semaine » et affichait une
   * liste écrite à la main : ni notées, ni de cette semaine. On ne note pas
   * les jeux, et aucun champ ne le permettrait.
   *
   * La date de sortie, elle, est un fait. Le libellé dit « dernières sorties »
   * et non « de la semaine », parce que **9 992 fiches sur 11 682 n'ont aucune
   * date** et que le catalogue enregistre une poignée de sorties par mois :
   * promettre une fraîcheur hebdomadaire serait faux la plupart des semaines.
   *
   * Les fiches sans date passent en dernier plutôt que d'être exclues : elles
   * complètent la rangée quand les sorties récentes ne suffisent pas.
   */
  const tous = (
    await prisma.jeu.findMany({
      where: { visuelUrl: { not: null } },
      orderBy: [{ sortieLe: { sort: 'desc', nulls: 'last' } }, { nom: 'asc' }],
      select: CHAMPS_VIGNETTE,
    })
  ).filter((j) => publiables.has(j.slug));

  /*
   * Un titre par studio.
   *
   * Sans cette règle, un studio qui publie cinq jeux le même mois occupe la
   * rangée entière — la vitrine montrerait son calendrier à lui plutôt que le
   * catalogue.
   */
  const studiosVus = new Set<string>();
  const varies = tous.filter((j) => {
    if (studiosVus.has(j.studio.nom)) return false;
    studiosVus.add(j.studio.nom);
    return true;
  });

  /*
   * Si la variété ne suffit pas à remplir la rangée, on complète avec le reste
   * dans l'ordre des sorties : une rangée incomplète se voit plus qu'un studio
   * cité deux fois.
   */
  const dejaLa = new Set(varies.map((j) => j.slug));
  return [...varies, ...tous.filter((j) => !dejaLa.has(j.slug))].slice(0, limite) as typeof tous;
}

/**
 * Les chiffres affichés sous la vitrine.
 *
 * Ils comptent ce que le visiteur peut **ouvrir**, pas ce que la base
 * contient. Annoncer 11 682 jeux pour un catalogue qui en propose 769 serait
 * un chiffre exact et une promesse fausse — et c'est la promesse qu'il lit.
 */
export async function compterCatalogue() {
  const visible = await filtrePubliable();
  const [jeux, studios, sourcés] = await Promise.all([
    prisma.jeu.count({ where: visible }),
    prisma.studio.count({ where: { jeux: { some: visible } } }),
    prisma.jeu.count({ where: { ...visible, rtpConfiance: 'STUDIO' } }),
  ]);
  return { jeux, studios, sourcés };
}
