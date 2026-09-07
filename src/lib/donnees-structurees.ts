import { SITE_URL, SITE_NOM } from './site';

/**
 * Les données structurées d'une fiche de jeu.
 *
 * ── La règle qui gouverne ce fichier ──────────────────────────────────────
 *
 * **On ne déclare à Google que ce qu'on peut défendre.**
 *
 * Un RTP en `additionalProperty` est une affirmation faite à un moteur de
 * recherche, pas un chiffre affiché à un visiteur qui voit aussi son niveau de
 * preuve à côté. Déclarer 96,5 % sans source, c'est demander à être cité sur
 * une valeur qu'on n'a pas vérifiée — et sur laquelle on a mesuré ailleurs un
 * taux d'erreur réel.
 *
 * Le RTP ne part donc dans le balisage que s'il est `STUDIO` ou `RECOUPE`. Sur
 * la page, il reste visible dans tous les cas, avec sa mention d'incertitude :
 * le visiteur a le contexte, le robot ne l'aurait pas.
 */
export interface JeuStructure {
  slug: string;
  nom: string;
  rtpStudio: number | null;
  rtpConfiance: string;
  volatilite: string | null;
  gainMaxMultiple: number | null;
  visuelUrl: string | null;
  studio: { nom: string; slug: string };
}

const VOLATILITE_EN: Record<string, string> = {
  BASSE: 'Low',
  MOYENNE: 'Medium',
  HAUTE: 'High',
  TRES_HAUTE: 'Very high',
};

/** Les niveaux de preuve qu'on accepte de déclarer publiquement. */
const DECLARABLE = new Set(['STUDIO', 'RECOUPE']);

export function baliseJeu(jeu: JeuStructure) {
  const proprietes: { '@type': 'PropertyValue'; name: string; value: string }[] = [];

  if (jeu.rtpStudio != null && DECLARABLE.has(jeu.rtpConfiance)) {
    proprietes.push({
      '@type': 'PropertyValue',
      name: 'RTP',
      value: `${jeu.rtpStudio.toFixed(2)}%`,
    });
  }
  if (jeu.volatilite) {
    proprietes.push({
      '@type': 'PropertyValue',
      name: 'Volatility',
      value: VOLATILITE_EN[jeu.volatilite] ?? jeu.volatilite,
    });
  }
  if (jeu.gainMaxMultiple) {
    proprietes.push({
      '@type': 'PropertyValue',
      name: 'Max win',
      value: `${jeu.gainMaxMultiple}x`,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: jeu.nom,
    url: `${SITE_URL}/slot/${jeu.studio.slug}/${jeu.slug}`,
    gamePlatform: 'Browser',
    applicationCategory: 'Game',
    author: { '@type': 'Organization', name: jeu.studio.nom },
    publisher: { '@type': 'Organization', name: SITE_NOM, url: SITE_URL },
    ...(jeu.visuelUrl ? { image: `${SITE_URL}${jeu.visuelUrl}` } : {}),
    // Une propriété vide est du bruit dans les données structurées : on ne
    // déclare le tableau que s'il a quelque chose à dire.
    ...(proprietes.length ? { additionalProperty: proprietes } : {}),
  };
}
