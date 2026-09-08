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

/**
 * La racine publique du stockage des captures.
 *
 * C'est une **constante**, pas une variable d'environnement, et c'est
 * délibéré : cette URL apparaît telle quelle dans chaque image servie au
 * visiteur — elle n'a rien d'un secret. En faire une variable ajouterait une
 * façon de casser le site en production (variable oubliée sur Vercel = toutes
 * les captures en 404) pour protéger ce qui est déjà public.
 */
export const RACINE_CAPTURES =
  'https://rxzmnzkvdnippihbdhta.supabase.co/storage/v1/object/public/captures';
