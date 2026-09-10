import type { Metadata } from 'next';

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
  image,
}: {
  titre: string;
  description: string;
  /** Chemin absolu depuis la racine, avec le `/` initial. */
  chemin: string;
  /** Visuel propre à la page. Sans lui, la bannière du site prend le relais. */
  image?: { url: string; largeur: number; hauteur: number; alt: string } | null;
}): Metadata {
  const adresse = `${SITE_URL}${chemin}`;

  /*
   * Le repli n'est pas décoratif. Quand une page déclare son bloc
   * `openGraph`, Next **ne fusionne pas** les images du layout : omettre le
   * champ ne rend pas la bannière du site, il ne rend rien du tout, et le
   * lien partagé perd sa vignette. Le repli doit donc être explicite ici.
   */
  const visuel = image ?? {
    url: `${SITE_URL}${BANNIERE_OG}`,
    largeur: 1200,
    hauteur: 630,
    alt: 'where2spin',
  };

  return {
    title: titre,
    description,
    alternates: { canonical: adresse },
    openGraph: {
      type: 'article',
      title: titre,
      description,
      url: adresse,
      siteName: 'where2spin',
      images: [
        { url: visuel.url, width: visuel.largeur, height: visuel.hauteur, alt: visuel.alt },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titre,
      description,
      images: [visuel.url],
    },
  };
}
