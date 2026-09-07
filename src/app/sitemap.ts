import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/donnees/prisma';
import { SITE_URL } from '@/lib/site';
import { GUIDES } from '@/data/guides';

export const revalidate = 3600;

/**
 * Le sitemap.
 *
 * ── Pourquoi il compte plus ici que sur un site ordinaire ─────────────────
 *
 * Un catalogue vit de sa longue traîne : sept cents fiches aujourd'hui,
 * beaucoup plus demain, et aucune n'est atteignable en trois clics depuis
 * l'accueil. Sans sitemap, un domaine neuf laisse l'essentiel de son contenu
 * hors de l'index — le trafic n'arrive jamais.
 *
 * `lastModified` vient de la date de mise à jour réelle de la fiche : une date
 * du jour sur toutes les URLs apprend à Google à ne plus la croire.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jeux, studios] = await Promise.all([
    prisma.jeu.findMany({
      select: { slug: true, majLe: true, studio: { select: { slug: true } } },
    }),
    prisma.studio.findMany({ select: { slug: true, majLe: true } }),
  ]);

  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalogue`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/demos`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/new-releases`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/reviews`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/guides`, changeFrequency: 'monthly', priority: 0.7 },
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...studios.map((s) => ({
      url: `${SITE_URL}/slot/${s.slug}`,
      lastModified: s.majLe,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...jeux.map((j) => ({
      url: `${SITE_URL}/slot/${j.studio.slug}/${j.slug}`,
      lastModified: j.majLe,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
