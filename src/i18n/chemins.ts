import type { Langue } from './langues';

/**
 * Le slug public de chaque section, dans les trois langues.
 *
 * ── Pourquoi les dossiers ne portent pas le slug public ───────────────────
 *
 * Un dossier de route est un nom de fichier : il ne peut pas valoir
 * `favorites` en anglais et `favoris` en français. Les dossiers portent donc
 * un identifiant **interne** — l'anglais, par commodité — et le middleware
 * réécrit le slug traduit vers lui.
 *
 * ── Le piège du cache, et pourquoi la langue reste dans l'URL réécrite ────
 *
 * Les pages sont rendues avec `revalidate`, donc mises en cache **par
 * chemin**. La réécriture conserve le préfixe de langue — `/fr/favoris` mène
 * à `/fr/favorites`, pas à `/favorites` — sinon les trois langues
 * partageraient une seule entrée de cache et la première rendue serait servie
 * à tout le monde.
 *
 * ── Ce qui n'est pas traduit, et pourquoi ─────────────────────────────────
 *
 * `slot` reste `slot` partout. Le segment est suivi du studio et du slug du
 * jeu, qui sont des noms propres : `/de/spielautomat/pragmatic-play/gates-of-
 * olympus` mélangerait une traduction et deux noms propres pour un gain nul.
 */
export const CHEMINS = [
  { id: 'catalogue', en: 'catalogue', fr: 'catalogue', de: 'katalog' },
  { id: 'demos', en: 'demos', fr: 'demos', de: 'demos' },
  { id: 'guides', en: 'guides', fr: 'guides', de: 'ratgeber' },
  { id: 'reviews', en: 'reviews', fr: 'avis', de: 'tests' },
  { id: 'new-releases', en: 'new-releases', fr: 'nouveautes', de: 'neuheiten' },
  { id: 'favorites', en: 'favorites', fr: 'favoris', de: 'favoriten' },
  { id: 'slot', en: 'slot', fr: 'slot', de: 'slot' },
] as const;

export type IdChemin = (typeof CHEMINS)[number]['id'];

/** Le slug public d'une section dans une langue donnée. */
export function slugPublic(id: IdChemin, l: Langue): string {
  const e = CHEMINS.find((c) => c.id === id);
  return e ? e[l] : id;
}

/** L'identifiant interne derrière un slug public, quelle que soit la langue. */
export function idDepuisSlug(slug: string, l: Langue): IdChemin | null {
  const e = CHEMINS.find((c) => c[l] === slug);
  return e ? e.id : null;
}

/**
 * Traduit un chemin interne en chemin public.
 *
 * Le chemin entre commence par `/` et porte l'identifiant interne :
 * `/favorites`, `/slot/pragmatic-play/gates-of-olympus`. Seul le **premier**
 * segment est traduit — les suivants sont des noms propres.
 */
export function cheminPublic(vers: string, l: Langue): string {
  if (vers === '/' || !vers.startsWith('/')) return `/${l}`;

  /*
   * La requête et l'ancre sont détachées avant de découper le chemin.
   * Sans ça, `/demos?page=2` a pour premier segment `demos?page=2`, qui ne
   * correspond à aucune entrée : le slug n'était pas traduit, et la
   * pagination sortait de la langue à la première page suivante.
   */
  const coupure = vers.search(/[?#]/);
  const suffixe = coupure === -1 ? '' : vers.slice(coupure);
  const nu = coupure === -1 ? vers : vers.slice(0, coupure);

  const [, premier, ...reste] = nu.split('/');
  const id = CHEMINS.find((c) => c.id === premier)?.id;
  const traduit = id ? slugPublic(id, l) : premier;
  return `/${l}/${[traduit, ...reste].join('/')}${suffixe}`;
}
