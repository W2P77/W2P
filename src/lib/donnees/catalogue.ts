import { prisma } from './prisma';
import { filtrePubliable } from './publiables';
import type { Prisma } from '@/generated/prisma/client';

/**
 * La requête du catalogue, filtres compris.
 *
 * ── Pourquoi côté serveur et pas dans le navigateur ───────────────────────
 *
 * Chaque combinaison de filtres devient une **URL** : elle se partage,
 * s'indexe, et revient en arrière correctement. Un filtrage en mémoire
 * donnerait une seule page pour dix mille états — exactement ce qu'un
 * catalogue ne peut pas se permettre, puisque son trafic vient de la longue
 * traîne.
 */
export interface FiltresCatalogue {
  q?: string;
  studio?: string;
  volatilite?: string;
  rtpMin?: number;
  preuve?: string;
  tri?: string;
  page?: number;
}

export const PAR_PAGE = 24;

const TRIS: Record<string, Prisma.JeuOrderByWithRelationInput[]> = {
  nom: [{ nom: 'asc' }],
  'rtp-desc': [{ rtpStudio: 'desc' }, { nom: 'asc' }],
  'rtp-asc': [{ rtpStudio: 'asc' }, { nom: 'asc' }],
  'gain-desc': [{ gainMaxMultiple: 'desc' }, { nom: 'asc' }],
  recent: [{ sortieLe: 'desc' }, { nom: 'asc' }],
  // Par défaut : ce qui est le mieux sourcé d'abord. C'est l'argument du site,
  // autant qu'il gouverne l'ordre d'affichage.
  preuve: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
};

export function construireOu(f: FiltresCatalogue): Prisma.JeuWhereInput {
  const et: Prisma.JeuWhereInput[] = [];

  if (f.q?.trim()) {
    const q = f.q.trim();
    et.push({
      OR: [
        { nom: { contains: q, mode: 'insensitive' } },
        { studio: { nom: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }
  if (f.studio) et.push({ studio: { slug: f.studio } });
  if (f.volatilite) et.push({ volatilite: f.volatilite as never });
  if (f.preuve) et.push({ rtpConfiance: f.preuve as never });
  if (f.rtpMin) et.push({ rtpStudio: { gte: f.rtpMin } });

  return et.length ? { AND: et } : {};
}

export async function chercherJeux(f: FiltresCatalogue) {
  // Le catalogue ne propose que des fiches finies : voir `publiables.ts`.
  const filtres = construireOu(f);
  const ou = { AND: [filtres, await filtrePubliable()] };
  const page = Math.max(1, f.page ?? 1);

  const [jeux, total] = await Promise.all([
    prisma.jeu.findMany({
      where: ou,
      orderBy: TRIS[f.tri ?? 'preuve'] ?? TRIS.preuve,
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
      select: {
        slug: true, nom: true, rtpStudio: true, rtpConfiance: true,
        volatilite: true, gainMaxMultiple: true, visuelUrl: true,
        studio: { select: { nom: true, slug: true } },
      },
    }),
    prisma.jeu.count({ where: ou }),
  ]);

  return { jeux, total, page, pages: Math.max(1, Math.ceil(total / PAR_PAGE)) };
}

/**
 * Les studios, avec le nombre de jeux — sert au filtre et à la grille.
 *
 * Le compte ne porte que sur les fiches **visibles**. Un studio annonçant
 * 564 jeux dont deux seulement s'ouvrent enverrait le visiteur dans le vide,
 * et un studio dont aucune fiche n'est finie disparaît de la liste plutôt que
 * d'y figurer à zéro.
 */
export async function studiosDuCatalogue() {
  const visible = await filtrePubliable();
  const studios = await prisma.studio.findMany({
    select: {
      slug: true,
      nom: true,
      logoUrl: true,
      _count: { select: { jeux: { where: visible } } },
    },
    orderBy: { nom: 'asc' },
  });
  // Les plus fournis d'abord : c'est ce que le visiteur vient chercher.
  return studios
    .filter((s) => s._count.jeux > 0)
    .sort((a, b) => b._count.jeux - a._count.jeux);
}

export async function jeuParSlug(slug: string) {
  return prisma.jeu.findUnique({
    where: { slug },
    include: { studio: true },
  });
}

/** Quelques jeux du même studio, pour ne pas laisser une fiche sans suite. */
export async function memeStudio(studioId: string, sauf: string, limite = 6) {
  return prisma.jeu.findMany({
    where: {
      studioId,
      visuelUrl: { not: null },
      // Deux conditions sur `slug` : l'exclusion du jeu courant et la liste
      // des fiches finies. Un objet ne peut porter la clé qu'une fois.
      AND: [{ slug: { not: sauf } }, await filtrePubliable()],
    },
    take: limite,
    orderBy: { nom: 'asc' },
    select: {
      slug: true, nom: true, rtpStudio: true, rtpConfiance: true,
      volatilite: true, gainMaxMultiple: true, visuelUrl: true,
      studio: { select: { nom: true, slug: true } },
    },
  });
}

/**
 * Les casinos qui proposent les jeux d'un studio.
 *
 * ── Pourquoi tous, et pas les trois premiers ──────────────────────────────
 *
 * Un comparateur limite sa liste : il classe, il arbitre, il pousse ses
 * meilleures marges. Un catalogue répond à une question — « où jouer à ce
 * jeu » — et une réponse tronquée est une réponse incomplète. Le visiteur qui
 * a déjà un compte chez le quatrième partenaire repart bredouille, alors qu'on
 * avait la réponse.
 *
 * L'ordre reste éditorial (la note d'abord), mais rien n'est coupé.
 *
 * ⚠️ C'est une **approximation assumée** : on sait qu'un casino distribue ce
 * studio, pas qu'il propose ce jeu précis. Un titre tout juste sorti peut être
 * exclusif à un opérateur pendant quelques semaines. La page doit le dire.
 */
export async function casinosPourStudio(cleCasino: string | null) {
  if (!cleCasino) return [];
  return prisma.casino.findMany({
    where: { actif: true, providers: { has: cleCasino } },
    orderBy: [{ note: 'desc' }, { nom: 'asc' }],
    /*
     * `note` ordonne mais n'est pas sélectionné, et c'est volontaire.
     *
     * Prisma la rend en `Decimal`, un objet qui ne traverse pas la frontière
     * serveur → client : le bloc « où jouer » filtre par pays côté navigateur,
     * il est donc client, et chaque casino passé lui faisait cracher « Only
     * plain objects can be passed to Client Components ». Le tri, lui, se fait
     * en SQL — la colonne n'a aucune raison de remonter jusqu'à React.
     */
    select: {
      slug: true, nom: true, logo: true,
      bonusTexte: true, pays: true,
    },
  });
}

/**
 * Les fiches citées par une section de guide, dans l'ordre où elles le sont.
 *
 * ── Pourquoi rendre le niveau de preuve avec le chiffre ───────────────────
 *
 * Un guide qui affirme « les jeux de table rendent 98 % » doit montrer sur
 * quoi il s'appuie. Servir le RTP sans son niveau de preuve reviendrait à
 * présenter une valeur non confirmée avec la même autorité qu'une valeur lue
 * dans le panneau du jeu — c'est précisément ce que ce site reproche aux
 * agrégateurs.
 *
 * L'ordre d'entrée est conservé : l'auteur du guide a choisi de citer ces
 * jeux dans cet ordre, et le trier par RTP changerait son propos.
 */
export async function jeuxCites(slugs: string[]) {
  if (!slugs.length) return [];
  const jeux = await prisma.jeu.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      nom: true,
      rtpStudio: true,
      rtpConfiance: true,
      studio: { select: { nom: true, slug: true } },
    },
  });
  const parSlug = new Map(jeux.map((j) => [j.slug, j]));
  return slugs.map((s) => parSlug.get(s)).filter((j): j is NonNullable<typeof j> => j != null);
}
