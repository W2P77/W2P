import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Les redirections d'affiliation sont interdites au crawl.
 *
 * `/go/*` génère un clickId et redirige : un robot qui les parcourt fabrique
 * des milliers de faux clics, fausse les statistiques et gaspille le budget de
 * crawl sur des pages qui n'ont aucun contenu.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/go/', '/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
