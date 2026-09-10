import { NextResponse, type NextRequest } from 'next/server';

import { CHEMINS, idDepuisSlug } from '@/i18n/chemins';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';

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
/**
 * Toute adresse sans langue mène à la langue par défaut.
 *
 * ── Pourquoi ici et pas dans une page racine ──────────────────────────────
 *
 * Next impose que `html` et `body` soient rendus par le **layout racine**.
 * Tant qu'un `app/layout.tsx` existait à côté de `app/[langue]/layout.tsx`,
 * c'est lui qui tenait ce rôle — et il ne peut pas connaître la langue, qui
 * vit dans le segment. En supprimant la page et le layout racines, le layout
 * de langue devient le layout racine, et l'attribut `lang` peut enfin varier.
 *
 * La redirection revient donc au middleware. Elle y est même mieux placée :
 * `/catalogue` mène à `/en/catalogue` sans rendre la moindre page.
 *
 * ── Pourquoi pas de détection automatique ─────────────────────────────────
 *
 * Rediriger selon l'IP ou `Accept-Language` renverrait Googlebot — IP
 * américaine, sans en-tête de langue — vers une langue choisie pour lui, et
 * ferait indexer les trois versions sous une seule. C'est l'erreur que ce
 * fichier évite déjà pour le pays du visiteur : le serveur ne décide pas à la
 * place de celui qui regarde.
 */
function versLaLangueParDefaut(requete: NextRequest): NextResponse | null {
  const chemin = requete.nextUrl.pathname;
  if (/^\/(api|go|_next)(\/|$)/.test(chemin) || /\.[a-z0-9]+$/i.test(chemin)) return null;

  const premier = chemin.split('/')[1] ?? '';
  if (estUneLangue(premier)) return null;

  const url = requete.nextUrl.clone();
  url.pathname = `/${LANGUE_DEFAUT}${chemin === '/' ? '' : chemin}`;
  return NextResponse.redirect(url, 307);
}

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
  const reponse =
    versLaLangueParDefaut(requete) ?? reecrireLeSlug(requete) ?? NextResponse.next();
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
