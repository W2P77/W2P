/**
 * Les langues du site, et la forme des URL.
 *
 * ── Pourquoi un segment dans l'URL, et pas un cookie ──────────────────────
 *
 * Les pages sont rendues avec `revalidate` : leur HTML est **mis en cache par
 * chemin** et servi à tout le monde. Une langue choisie par cookie ou par
 * réécriture vers le même chemin ferait donc partager le cache entre les
 * langues — la première version rendue serait servie à tous les suivants, et
 * Google indexerait une langue au hasard. C'est exactement le piège que le
 * middleware décrit déjà pour le pays du visiteur.
 *
 * ── Pourquoi les trois langues sont préfixées, anglais compris ────────────
 *
 * Laisser l'anglais à la racine donne deux adresses pour la même page — `/`
 * et `/en/` — donc du contenu dupliqué à démêler avec des canoniques. Rien
 * n'étant encore indexé, préfixer les trois coûte zéro aujourd'hui et évite
 * cette dette entièrement.
 *
 * ── Pourquoi seulement trois ──────────────────────────────────────────────
 *
 * Elles suivent les marchés réellement couverts par les casinos du panel :
 * 21 en France, 12 en Allemagne, et l'anglais pour l'Australie et le
 * Royaume-Uni réunis. Ouvrir l'italien ou l'espagnol pour deux ou trois
 * casinos reproduirait l'erreur que BetsRank paie déjà — 2 390 pages en
 * italien pour zéro casino.
 */
export const LANGUES = [
  { code: 'en', nom: 'English', drapeau: '🇬🇧', htmlLang: 'en' },
  { code: 'fr', nom: 'Français', drapeau: '🇫🇷', htmlLang: 'fr' },
  { code: 'de', nom: 'Deutsch', drapeau: '🇩🇪', htmlLang: 'de' },
] as const;

export type Langue = (typeof LANGUES)[number]['code'];

export const LANGUE_DEFAUT: Langue = 'en';

export function estUneLangue(valeur: string): valeur is Langue {
  return LANGUES.some((l) => l.code === valeur);
}

export function langue(code: string) {
  return LANGUES.find((l) => l.code === code) ?? LANGUES[0];
}

/**
 * Préfixe un chemin interne de la langue courante.
 *
 * Le chemin passé commence par `/` et ne porte **jamais** de langue : c'est
 * cette fonction qui la pose. Un lien écrit en dur avec sa langue survivrait
 * au changement de langue du visiteur et le ramènerait à l'anglais sans qu'il
 * l'ait demandé.
 */
export function chemin(l: Langue, vers: string): string {
  return `/${l}${vers === '/' ? '' : vers}`;
}
