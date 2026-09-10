import type { Metadata } from 'next';

import { cheminPublic } from '@/i18n/chemins';
import { LANGUES, LANGUE_DEFAUT, type Langue } from '@/i18n/langues';
import { SITE_URL } from '@/lib/site';

/**
 * Le bloc de partage d'une page, title et description compris.
 *
 * ── Pourquoi un helper et pas quatre copies ───────────────────────────────
 *
 * Next **fusionne** les métadonnées d'une page avec celles du layout racine.
 * Un `title` défini dans la page remplace bien celui du layout — mais un bloc
 * `openGraph` absent est hérité **en entier**. Les quatre pages qui déclarent
 * leurs métadonnées oubliaient toutes ce bloc, et servaient donc celui du
 * site :
 *
 *     og:url → la page d'accueil, sur les 1 951 fiches de jeu.
 *
 * Ce n'est pas cosmétique. `og:url` est le signal de canonique que lisent les
 * plateformes sociales : la même adresse partout leur dit que toutes ces
 * pages sont la même. Et tout lien partagé s'affichait avec la vignette
 * générique du site, quel que soit son contenu.
 *
 * L'oubli est facile à refaire — c'est précisément pour ça qu'il ne doit plus
 * y avoir qu'un seul endroit où l'écrire.
 */
/**
 * La bannière de partage du site, servie quand la page n'a pas de visuel.
 *
 * ── Pourquoi une version dans l'URL ───────────────────────────────────────
 *
 * Le cache des réseaux porte sur l'URL et dure des semaines. Or le chemin
 * `/images/og.jpg` a servi deux images différentes : celle de where2play
 * jusqu'au 10/09/2026, celle de where2spin depuis. **À incrémenter à chaque
 * fois que le fichier change**, sans quoi les plateformes continuent
 * d'afficher l'ancienne.
 */
export const VERSION_OG = 'w2s-1';
export const BANNIERE_OG = `/images/og.jpg?v=${VERSION_OG}`;

export function metadonneesDePage({
  titre,
  description,
  chemin,
  langue,
  image,
  imageGeneree,
}: {
  titre: string;
  description: string;
  /**
   * Chemin **interne**, avec le `/` initial et sans langue : `/favorites`,
   * `/slot/x/y`. La langue et la traduction du premier segment sont posées
   * ici — les écrire à l'appel les figerait dans une seule langue.
   */
  chemin: string;
  /** La langue de la page. */
  langue: Langue;
  /** Visuel propre à la page. Sans lui, la bannière du site prend le relais. */
  image?: { url: string; largeur: number; hauteur: number; alt: string } | null;
  /**
   * Laisse le champ `images` entièrement vide.
   *
   * À réserver aux pages qui portent un fichier `opengraph-image` : Next
   * fabrique alors la carte lui-même et pose la balise. Déclarer une image
   * ici la court-circuiterait — c'est celle du helper qui gagnerait, et la
   * route ne servirait jamais.
   */
  imageGeneree?: boolean;
}): Metadata {
  const adresse = `${SITE_URL}${cheminPublic(chemin, langue)}`;

  /*
   * ── Les versions linguistiques, déclarées page par page ─────────────────
   *
   * Sans elles, `/en/catalogue`, `/fr/catalogue` et `/de/katalog` sont trois
   * pages qui se ressemblent et se disputent le même classement : Google en
   * garde une et ignore les autres. Déclarées comme versions d'une même page,
   * elles se renforcent au lieu de se concurrencer.
   *
   * Le sitemap les porte déjà, mais un moteur qui arrive par un lien plutôt
   * que par le sitemap ne les verrait pas — et c'est le cas le plus courant.
   *
   * `x-default` désigne ce qu'on sert à qui ne correspond à aucune langue
   * déclarée : l'anglais, comme la racine.
   */
  const versions = Object.fromEntries(
    LANGUES.map((l) => [l.htmlLang, `${SITE_URL}${cheminPublic(chemin, l.code)}`]),
  );
  versions['x-default'] = `${SITE_URL}${cheminPublic(chemin, LANGUE_DEFAUT)}`;

  /*
   * Le repli n'est pas décoratif. Quand une page déclare son bloc
   * `openGraph`, Next **ne fusionne pas** les images du layout : omettre le
   * champ ne rend pas la bannière du site, il ne rend rien du tout, et le
   * lien partagé perd sa vignette. Le repli doit donc être explicite ici.
   */
  const visuel = imageGeneree ? null : image ?? {
    url: `${SITE_URL}${BANNIERE_OG}`,
    largeur: 1200,
    hauteur: 630,
    alt: 'where2spin',
  };

  return {
    title: titre,
    description,
    alternates: { canonical: adresse, languages: versions },
    openGraph: {
      type: 'article',
      title: titre,
      description,
      url: adresse,
      siteName: 'where2spin',
      ...(visuel
        ? {
            images: [
              { url: visuel.url, width: visuel.largeur, height: visuel.hauteur, alt: visuel.alt },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: titre,
      description,
      ...(visuel ? { images: [visuel.url] } : {}),
    },
  };
}
