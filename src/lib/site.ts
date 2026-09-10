/**
 * L'adresse publique du site, en un seul endroit.
 *
 * Elle sert au sitemap, aux canoniques, aux données structurées et à l'image
 * de partage. Recopiée dans chacun, elle finirait par diverger — et une
 * canonique fausse fait plus de mal que pas de canonique du tout.
 *
 * ── Pourquoi elle n'est plus écrite en dur ────────────────────────────────
 *
 * Elle valait `https://where2play.info`, un domaine **qui ne résout pas** —
 * et que le site a d'ailleurs cessé de porter, `where2play.com` et `.net`
 * étant déjà pris, ce dernier par un site du même créneau. Le
 * site déclarait donc à Google que ses 1 987 URLs vivaient à une adresse
 * morte, et les réseaux sociaux allaient chercher l'image de partage sur un
 * hôte inexistant — d'où l'absence d'aperçu au partage, qui n'était que le
 * symptôme visible du problème.
 *
 * L'ordre ci-dessous se corrige tout seul : Vercel renseigne
 * `VERCEL_PROJECT_PRODUCTION_URL` avec le **domaine de production du projet**,
 * c'est-à-dire l'adresse `.vercel.app` tant qu'aucun domaine n'est branché,
 * puis le domaine personnalisé dès qu'il l'est. Rien à changer ce jour-là.
 */
function racineDuSite(): string {
  const explicite = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicite) return explicite;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  // Développement local : rien d'autre ne serait atteignable.
  return 'http://localhost:3000';
}

export const SITE_URL = racineDuSite().replace(/\/$/, '');

export const SITE_NOM = 'where2spin.com';

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
