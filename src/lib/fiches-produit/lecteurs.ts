/**
 * Lire les faits qu'un studio publie sur la page produit de ses jeux.
 *
 * ── Pourquoi la page produit, à côté des captures ─────────────────────────
 *
 * Capturer le panneau de règles d'une démo coûte un navigateur, un OCR et un
 * rechargement complet du jeu — et le serveur de démo de BGaming nous a mis au
 * ban le 11/09/2026 après 227 lancements. Or plusieurs studios écrivent déjà le
 * RTP sur leur page produit, en HTML ordinaire : une requête suffit, sans
 * écran, sans OCR, sans toucher au serveur de démo.
 *
 * Le fait obtenu est de rang « studio » : un cran sous le panneau du jeu (qui
 * est le logiciel qui paie), mais une source publique et identifiable. Là où
 * les deux existent, le panneau l'emporte — c'est le script qui en décide.
 *
 * ── Ce qu'un lecteur rend, et ce qu'il laisse vide ────────────────────────
 *
 * Un champ n'est rempli que si la page l'énonce sans ambiguïté. La volatilité
 * de NetEnt est une note chiffrée (`"volatility": 5.1`) sur une échelle dont on
 * ne connaît pas la correspondance : on la laisse vide plutôt que d'inventer
 * une conversion. Les gains exprimés en euros (« Max Win € 250,000 ») sont
 * écartés : seul un multiple de la mise se compare d'un jeu à l'autre.
 */

export type Volatilite = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'TRES_HAUTE';

export interface FaitsFiche {
  rtp: number | null;
  volatilite: Volatilite | null;
  gainMax: number | null;
}

/** Le texte visible d'une page : sans scripts, sans styles, sans balises. */
export function texteDuHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** Un taux « 96.00 » ou « 94,76 », borné à ce qu'un jeu peut rendre. */
function taux(brut: string | undefined): number | null {
  if (!brut) return null;
  const v = Number(brut.replace(',', '.'));
  return Number.isFinite(v) && v >= 80 && v <= 99.9 ? v : null;
}

/**
 * Un multiple de mise, séparateurs de milliers compris.
 *
 * BGaming écrit « x 10.490 » : le point y sépare les milliers. Lu comme une
 * décimale, le gain maximum de Lucky Lager tombait à 10,49 fois la mise. On ne
 * retire donc un séparateur que s'il est suivi d'exactement trois chiffres.
 */
function multiple(brut: string | undefined): number | null {
  if (!brut) return null;
  const propre = brut.trim().replace(/[.,\s](?=\d{3}(?!\d))/g, '');
  const v = Number(propre.replace(',', '.'));
  return Number.isFinite(v) && v >= 10 && v <= 1_000_000 ? Math.round(v) : null;
}

/*
 * L'échelle en mots, telle que les studios l'écrivent. Un libellé absent de
 * cette table rend null : « medium-low » n'a pas d'équivalent sûr chez nous,
 * et le ranger quelque part serait une décision qu'aucune source ne porte.
 * « Medium-high » suit la règle déjà retenue pour les panneaux de règles.
 */
const MOTS_DE_VOLATILITE: Record<string, Volatilite> = {
  'very-high': 'TRES_HAUTE',
  'very high': 'TRES_HAUTE',
  'medium-high': 'HAUTE',
  'medium high': 'HAUTE',
  high: 'HAUTE',
  medium: 'MOYENNE',
  low: 'BASSE',
};

/*
 * Un libellé ne vaut que s'il n'est suivi ni d'un tiret ni d'une lettre.
 *
 * Endorphina écrit « Volatility: Medium-Low » sur Satoshi's Secret. Sans ce
 * garde, l'expression s'arrêtait à « Medium » — le tiret compte comme une fin
 * de mot — et la fiche aurait annoncé une volatilité moyenne là où le studio
 * dit moyenne-basse. Un libellé absent de la table ci-dessus rend null.
 */
function volatilite(brut: string | undefined): Volatilite | null {
  return brut ? MOTS_DE_VOLATILITE[brut.trim().toLowerCase()] ?? null : null;
}

/**
 * BGaming : un bloc « Game Details » en clair.
 *
 * Le titre annonce aussi « 96% RTP », nombre **avant** le sigle, et un encart
 * « Real-Time RTP Insights » parle de RTP sans chiffre. On ne lit que la forme
 * du bloc de détails, sigle **puis** nombre.
 */
function lireBGaming(html: string): FaitsFiche {
  const t = texteDuHtml(html);
  return {
    rtp: taux(/\bRTP\s+(\d{2}[.,]\d{1,2})\s?%/.exec(t)?.[1]),
    volatilite: volatilite(/\bVolatility\s+(very-high|very high|medium-high|medium high|high|medium|low)(?![-\w])/i.exec(t)?.[1]),
    gainMax: multiple(/Max\.?\s*multiplier\s+x\s*([\d][\d.,\s]{0,12}\d|\d)/i.exec(t)?.[1]),
  };
}

/**
 * NetEnt : la page embarque ses faits en JSON.
 *
 * `"rtp":95.62` d'abord, le texte (« 95.62% RTP ») en secours. Le gain maximum
 * s'écrit « 1 700 x bet Max payout », avec une espace pour séparer les milliers.
 * La volatilité reste vide : voir l'en-tête.
 */
function lireNetEnt(html: string): FaitsFiche {
  const t = texteDuHtml(html);
  return {
    rtp: taux(/"rtp"\s*:\s*"?(\d{2}(?:[.,]\d{1,2})?)/i.exec(html)?.[1] ?? /(\d{2}[.,]\d{1,2})\s?%\s*RTP/i.exec(t)?.[1]),
    volatilite: null,
    gainMax: multiple(/(\d[\d\s]{0,9})\s*x\s*bet\s*Max\s*payout/i.exec(t)?.[1]),
  };
}

/** Endorphina : « RTP: 94.76% · Volatility: High », en clair. */
function lireEndorphina(html: string): FaitsFiche {
  const t = texteDuHtml(html);
  /*
   * « The RTP of Satoshi's Secret ranges from 89.83% » : le bloc de détails ne
   * donne alors que le **bas** d'une plage, et « RTP: 89.83% » s'y lit comme un
   * taux. Le prendre aurait remplacé 96,07 par le minimum — l'erreur déjà
   * commise sur Four Lucky Clover côté panneau. Sans le haut de la plage, on
   * ne publie aucun taux.
   */
  const plageSansHaut = /\bRTP\b.{0,80}?ranges\s+from/i.test(t);
  return {
    rtp: plageSansHaut ? null : taux(/\bRTP:\s*(\d{2}[.,]\d{1,2})\s?%/i.exec(t)?.[1]),
    volatilite: volatilite(/\bVolatility:\s*(very-high|very high|medium-high|medium high|high|medium|low)(?![-\w])/i.exec(t)?.[1]),
    gainMax: null,
  };
}

/** Les studios dont la page produit publie des faits lisibles, par slug de studio. */
export const LECTEURS: Record<string, (html: string) => FaitsFiche> = {
  bgaming: lireBGaming,
  netent: lireNetEnt,
  endorphina: lireEndorphina,
};
