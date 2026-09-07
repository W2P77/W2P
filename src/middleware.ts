import { NextResponse, type NextRequest } from 'next/server';

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

export function middleware(requete: NextRequest) {
  const reponse = NextResponse.next();
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
