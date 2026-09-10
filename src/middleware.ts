import { NextResponse, type NextRequest } from 'next/server';

import { CHEMINS, idDepuisSlug } from '@/i18n/chemins';
import { estUneLangue } from '@/i18n/langues';

/**
 * Pose le pays du visiteur dans un cookie lisible par le navigateur.
 *
 * ── Pourquoi passer par un cookie plutôt que filtrer sur le serveur ──────
 *
 * Les fiches de jeu sont rendues avec `revalidate` : leur HTML est **mis en
 * cache et servi à tout le monde**. Filtrer les casinos au rendu reviendrait
 * donc à servir le pays du premier arrivant à tous les visiteurs suivants
 * pendant toute la durée du cache — et à faire indexer par Google la sélection
 * d'un pays au hasard. Le serveur rend la liste complète ; le navigateur la
 * réduit au pays de celui qui regarde.
 *
 * ── Ce que le middleware ne fait pas ─────────────────────────────────────
 *
 * Il ne redirige rien et ne masque rien. Il ne fait que recopier l'en-tête de
 * géolocalisation dans un cookie. Un middleware qui déciderait à la place de
 * la page servirait Googlebot — IP américaine — comme un visiteur américain,
 * et c'est exactement l'erreur qu'on veut éviter.
 */
const COOKIE = 'w2p_pays';

/**
 * Réécrit le slug traduit vers le dossier de route qui le sert.
 *
 * Un dossier est un nom de fichier : il ne peut pas valoir `favorites` en
 * anglais et `favoris` en français. Les dossiers portent donc l'identifiant
 * interne, et c'est ici que `/fr/favoris` devient `/fr/favorites`.
 *
 * ── Deux détails qui décident de la justesse ──────────────────────────────
 *
 * La **langue reste dans le chemin réécrit**. Les pages sont rendues avec
 * `revalidate`, donc mises en cache par chemin : réécrire vers `/favorites`
 * sans langue ferait partager une seule entrée de cache aux trois langues, et
 * la première rendue serait servie à tout le monde.
 *
 * Le segment interne accédé directement — `/fr/favorites` — est **renvoyé en
 * 301** vers le slug traduit. Sans ça deux adresses serviraient la même page,
 * et les moteurs auraient à choisir laquelle garder.
 */
function reecrireLeSlug(requete: NextRequest): NextResponse | null {
  const segments = requete.nextUrl.pathname.split('/');
  const [, langue, premier] = segments;
  if (!langue || !estUneLangue(langue) || !premier) return null;

  const interne = idDepuisSlug(premier, langue);
  if (interne && interne !== premier) {
    const url = requete.nextUrl.clone();
    segments[2] = interne;
    url.pathname = segments.join('/');
    return NextResponse.rewrite(url);
  }

  // Le dossier interne atteint en direct alors que la langue en a un autre.
  const entree = CHEMINS.find((c) => c.id === premier);
  if (entree && entree[langue] !== premier) {
    const url = requete.nextUrl.clone();
    segments[2] = entree[langue];
    url.pathname = segments.join('/');
    return NextResponse.redirect(url, 301);
  }

  return null;
}

export function middleware(requete: NextRequest) {
  const reponse = reecrireLeSlug(requete) ?? NextResponse.next();
  const pays = requete.headers.get('x-vercel-ip-country');

  if (pays) {
    reponse.cookies.set(COOKIE, pays, {
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
      // Volontairement lisible par le script de la page : c'est lui qui filtre.
      httpOnly: false,
    });
  }

  return reponse;
}

export const config = {
  /*
   * Tout sauf les fichiers servis tels quels. Faire passer une image ou un
   * fragment `_next` par le middleware ne poserait aucun cookie utile et
   * facturerait une invocation par requête.
   */
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico|robots.txt|sitemap.xml).*)'],
};
