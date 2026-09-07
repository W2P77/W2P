/**
 * L'adresse publique du site, en un seul endroit.
 *
 * Elle sert au sitemap, aux canoniques et aux données structurées. Recopiée
 * dans chacun, elle finirait par diverger — et une canonique fausse fait plus
 * de mal que pas de canonique du tout.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://where2play.info'
).replace(/\/$/, '');

export const SITE_NOM = 'where2play.info';
