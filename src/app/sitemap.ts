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
/**
 * ── Pourquoi la base est interrogée sous `try` ────────────────────────────
 *
 * Ce fichier est rendu **pendant le build**. Le premier déploiement Vercel a
 * échoué ici : sans `DATABASE_URL` dans l'environnement, Prisma retombe sur
 * `127.0.0.1:5432`, la requête lève, et **tout le build s'arrête** — le site
 * entier reste hors ligne à cause d'une seule route annexe.
 *
 * Une variable d'environnement manquante doit rester une erreur visible, pas
 * un site indisponible. La base injoignable produit donc un sitemap réduit
 * aux pages fixes, avec un avertissement dans le journal de build. Les fiches
 * y reviennent à la première revalidation, une heure plus tard.
 *
 * Ce repli ne dispense évidemment pas de configurer la variable : sans elle,
 * les pages de jeux n'ont rien à afficher au runtime non plus.
 */
async function contenuDeLaBase() {
  try {
    return await Promise.all([
      prisma.jeu.findMany({
        select: { slug: true, majLe: true, studio: { select: { slug: true } } },
      }),
      prisma.studio.findMany({ select: { slug: true, majLe: true } }),
    ]);
  } catch (erreur) {
    console.warn(
      '[sitemap] Base injoignable — sitemap réduit aux pages fixes. ' +
        'Vérifier DATABASE_URL (pooler, port 6543).',
      erreur instanceof Error ? erreur.message : erreur,
    );
    return [[], []] as const;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jeux, studios] = await contenuDeLaBase();

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
