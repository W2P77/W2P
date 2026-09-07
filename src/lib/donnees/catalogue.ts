import { prisma } from './prisma';
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

function construireOu(f: FiltresCatalogue): Prisma.JeuWhereInput {
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
  const ou = construireOu(f);
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

/** Les studios, avec le nombre de jeux — sert au filtre et à la grille. */
export async function studiosDuCatalogue() {
  const studios = await prisma.studio.findMany({
    select: { slug: true, nom: true, logoUrl: true, _count: { select: { jeux: true } } },
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
    where: { studioId, slug: { not: sauf }, visuelUrl: { not: null } },
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
    select: {
      slug: true, nom: true, logo: true, note: true,
      bonusTexte: true, pays: true,
    },
  });
}
