/**
 * Où lire le catalogue **complet** d'un studio.
 *
 * ── Pourquoi un adaptateur par studio ─────────────────────────────────────
 *
 * Notre base ne sait pas ce qu'un studio a publié : elle sait ce qu'on y a
 * mis. La seule source qui fasse autorité sur « tous les jeux de X » est le
 * site de X — et chacun l'expose à sa façon. Quatre formes rencontrées, quatre
 * stratégies, aucune généralisable :
 *
 * · **BGaming** — un `game-sitemap.xml` dédié. 343 jeux en une requête.
 * · **Nolimit City** — le sitemap principal, les jeux sous `/games/`.
 * · **Play'n GO** — un sitemap Wix aux noms générés, et les jeux ne sont pas
 *   sous `/games/` mais sous `/additional-game-content/`. Chercher le motif
 *   attendu rendait zéro résultat sur un sitemap qui en contient 417.
 * · **Hacksaw** — le sitemap ne descend pas jusqu'aux jeux ; c'est la page de
 *   listing qui les porte tous, 146 liens d'un coup.
 *
 * ── Le sitemap plutôt que le listing, quand il existe ─────────────────────
 *
 * Un sitemap est publié *pour* être énuméré, il est complet par construction,
 * et il coûte une requête là où un listing paginé en coûte cinquante. On ne
 * racle une page de listing que faute de mieux.
 */

export interface SourceStudio {
  /** Le slug du studio dans notre base. */
  studio: string;
  /** Ce qu'on interroge, pour le journal et pour pouvoir le rejouer à la main. */
  origine: string;
  /** Rend les URL de fiches produit du studio. */
  lister(recuperer: (url: string) => Promise<string>): Promise<string[]>;
}

/**
 * Les `<loc>` d'un sitemap, **index compris**.
 *
 * Un `sitemap.xml` est souvent un index qui pointe d'autres sitemaps plutôt
 * que des pages. Sans descendre d'un niveau, on lit les URL des sous-sitemaps
 * et on conclut que le studio ne publie aucun jeu : Nolimit City rendait zéro
 * alors qu'il en liste 143. Un seul niveau suffit — aucun des sites rencontrés
 * n'imbrique plus loin.
 */
async function locs(
  xml: string,
  recuperer: (url: string) => Promise<string>,
): Promise<string[]> {
  const directes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!/<sitemapindex/i.test(xml)) return directes;

  const tout: string[] = [];
  for (const sous of directes) {
    try {
      const contenu = await recuperer(sous);
      tout.push(...[...contenu.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
    } catch {
      // Un sous-sitemap injoignable ne doit pas faire échouer l'inventaire
      // entier : on perd sa part, le reste du studio reste comptabilisé.
    }
  }
  return tout;
}

function filtrer(urls: string[], motif: RegExp): string[] {
  return [...new Set(urls.filter((u) => motif.test(u)))];
}

export const SOURCES: SourceStudio[] = [
  {
    studio: 'bgaming',
    origine: 'https://bgaming.com/game-sitemap.xml',
    async lister(recuperer) {
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+$/);
    },
  },
  {
    studio: 'nolimit-city',
    origine: 'https://nolimitcity.com/sitemap.xml',
    async lister(recuperer) {
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/games\/[^/]+$/);
    },
  },
  {
    studio: 'playn-go',
    origine:
      'https://www.playngo.com/dynamic-additional-game-content_p_cf43b67c_08fa_4d8f_8fd1_48114bf0b15b_0_5000-sitemap.xml',
    async lister(recuperer) {
      // Les jeux ne sont pas sous `/games/` chez eux : le motif attendu
      // rendait zéro résultat sur un sitemap qui en contient 417.
      return filtrer(await locs(await recuperer(this.origine), recuperer), /\/additional-game-content\/[^/]+$/);
    },
  },
  {
    studio: 'hacksaw-gaming',
    origine: 'https://www.hacksawgaming.com/games',
    async lister(recuperer) {
      const html = await recuperer(this.origine);
      const liens = [...html.matchAll(/href="(\/games\/[^"?#]+)"/g)].map(
        (m) => `https://www.hacksawgaming.com${m[1]}`,
      );
      // `/games/scratchcards` est une catégorie, pas un jeu.
      return filtrer(liens, /\/games\/[^/]+$/).filter((u) => !u.endsWith('/scratchcards'));
    },
  },
];

/**
 * Le slug d'un jeu, déduit de son URL chez le studio.
 *
 * Les URL portent des caractères encodés — `3-cursed-chests%3A-hold-%26-win`
 * chez Hacksaw, `merlin%3A-journey-of-flame` chez Play'n GO. Décoder puis
 * normaliser est indispensable : sans ça, deux écritures du même jeu comptent
 * pour deux jeux différents, et l'inventaire annonce des manquants qui n'en
 * sont pas.
 */
export function slugDepuisUrl(url: string): string {
  const dernier = decodeURIComponent(url.split('/').filter(Boolean).pop() ?? '');
  return dernier
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
