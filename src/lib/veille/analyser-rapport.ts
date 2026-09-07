/**
 * Lecture d'un rapport de veille — le passage entre « quelqu'un a lu une page
 * de studio » et « le catalogue l'affirme ».
 *
 * ── Pourquoi ce fichier existe séparément du script d'import ──────────────
 *
 * Parce que c'est ici que se décide ce qu'on refuse d'écrire, et que ce genre
 * de décision doit pouvoir être mise en défaut par un test. Le script, lui, ne
 * fait qu'appliquer : il ne juge rien.
 *
 * ── Le principe : un rapport de veille n'est pas une source ───────────────
 *
 * Ce qu'on reçoit est le compte rendu d'une lecture. La donnée n'entre au
 * catalogue que si le rapport dit **où** elle a été lue. Sans URL, le chiffre
 * est jeté — pas rétrogradé, jeté : `rtp_confiance` sert à dire au visiteur
 * d'où vient un nombre, et un nombre sans provenance n'a rien à y faire.
 */

export type Volatilite = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'TRES_HAUTE';
export type Confiance = 'STUDIO' | 'RECOUPE' | 'UNIQUE' | 'AUCUNE';

export interface FicheVeille {
  studio: string | null;
  nom: string;
  slug: string;
  sortieLe: string | null;
  rtpStudio: number | null;
  rtpPaliers: number[];
  rtpAchatBonus: number | null;
  rtpSource: string | null;
  volatilite: Volatilite | null;
  gainMaxMultiple: number | null;
  grille: string | null;
  lignesPaiement: string | null;
  achatBonus: boolean | null;
  mecaniques: string[];
  demoUrl: string | null;
  /** Ce qu'on a refusé d'écrire, et pourquoi. Destiné à être lu, pas ignoré. */
  reserves: string[];
}

/**
 * Les mots par lesquels un rapport dit « je n'ai pas trouvé ».
 *
 * Ils comptent autant que les valeurs : un agent à qui on interdit d'inventer
 * répond forcément « INTROUVABLE » quelque part, et confondre ce mot avec une
 * donnée textuelle écrirait « Volatilité : INCONNUE » sur la fiche publique.
 */
const ABSENCES = new Set([
  'INCONNU', 'INCONNUE', 'INCONNUS', 'INCONNUES',
  'NON_PUBLIE', 'NON PUBLIE', 'NONPUBLIE',
  'AUCUN', 'AUCUNE', 'AUCUNS', 'AUCUNES',
  'INTROUVABLE', 'INTROUVABLES',
  'N/A', 'NA', 'NULL', 'NONE', 'UNKNOWN', '-', '—', '?', '',
]);

function sansAccents(v: string): string {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function estAbsent(valeur: string | undefined | null): boolean {
  if (valeur == null) return true;
  return ABSENCES.has(sansAccents(valeur).trim().toUpperCase());
}

/** Un texte, ou `null` s'il ne dit rien. */
function texte(valeur: string | undefined): string | null {
  if (estAbsent(valeur)) return null;
  return valeur!.trim();
}

export function slugifier(nom: string): string {
  return sansAccents(nom)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * La forme comparable d'un nom de jeu.
 *
 * Sert à repérer qu'un jeu est déjà au catalogue sous une autre écriture.
 * Trois paires de slugs jumeaux sur BetsRank ont montré ce que coûte l'oubli :
 * deux pages indexables pour un seul jeu, qui se concurrencent l'une l'autre.
 */
export function formeComparable(nom: string): string {
  return slugifier(nom).replace(/-/g, '');
}

/** Un RTP, en pourcentage. Hors de la plage plausible, on ne devine pas. */
function lireRtp(valeur: string, reserves: string[], quoi: string): number | null {
  if (estAbsent(valeur)) return null;
  const brut = valeur.replace(/%/g, '').replace(',', '.').trim();
  const n = Number.parseFloat(brut);
  if (!Number.isFinite(n)) {
    reserves.push(`${quoi} illisible : « ${valeur} »`);
    return null;
  }
  if (n < 80 || n > 99.9) {
    reserves.push(`${quoi} hors plage plausible (${n} %) — non écrit`);
    return null;
  }
  return Math.round(n * 100) / 100;
}

function lirePaliers(valeur: string | undefined, reserves: string[]): number[] {
  if (estAbsent(valeur)) return [];
  return valeur!
    .split(/[/;]/)
    .map((p) => lireRtp(p, reserves, 'Palier'))
    .filter((n): n is number => n != null)
    .sort((a, b) => b - a);
}

/**
 * Le gain maximum, en multiple de la **mise totale**.
 *
 * Une valeur en euros ou « par ligne » n'est pas convertible sans connaître la
 * mise de référence, et cette mise varie de 6 € à 125 € selon le studio. On
 * refuse plutôt que de diviser au jugé.
 */
function lireGainMax(valeur: string | undefined, reserves: string[]): number | null {
  if (estAbsent(valeur)) return null;
  const v = valeur!.trim();
  if (/[€$£]|\beur\b|\busd\b|par ligne|per ?line/i.test(v)) {
    reserves.push(`Gain max exprimé sur une autre base (« ${v} ») — non converti, non écrit`);
    return null;
  }
  const chiffres = v.replace(/[x×\s,'’]/gi, '').replace(/\.(?=\d{3}\b)/g, '');
  const n = Number.parseInt(chiffres, 10);
  if (!Number.isFinite(n) || n <= 0) {
    reserves.push(`Gain max illisible : « ${v} »`);
    return null;
  }
  return n;
}

const VOLATILITES: Record<string, Volatilite> = {
  BASSE: 'BASSE', LOW: 'BASSE', FAIBLE: 'BASSE',
  MOYENNE: 'MOYENNE', MEDIUM: 'MOYENNE', MEDIUM_HIGH: 'MOYENNE',
  HAUTE: 'HAUTE', HIGH: 'HAUTE', ELEVEE: 'HAUTE',
  TRES_HAUTE: 'TRES_HAUTE', 'TRES HAUTE': 'TRES_HAUTE',
  VERY_HIGH: 'TRES_HAUTE', 'VERY HIGH': 'TRES_HAUTE', EXTREME: 'TRES_HAUTE',
};

function lireVolatilite(valeur: string | undefined, reserves: string[]): Volatilite | null {
  if (estAbsent(valeur)) return null;
  const cle = sansAccents(valeur!).trim().toUpperCase();
  const v = VOLATILITES[cle];
  if (!v) {
    reserves.push(`Volatilité non reconnue : « ${valeur} »`);
    return null;
  }
  return v;
}

function lireBooleen(valeur: string | undefined): boolean | null {
  if (estAbsent(valeur)) return null;
  const v = sansAccents(valeur!).trim().toUpperCase();
  if (['OUI', 'YES', 'TRUE', 'O', 'Y'].includes(v)) return true;
  if (['NON', 'NO', 'FALSE', 'N'].includes(v)) return false;
  return null;
}

/**
 * Une date de sortie. Un catalogue qui affiche « Sorti en 2027 » se disqualifie
 * seul, et une date à 1970 trahit un champ vide passé par `new Date(0)`.
 */
function lireDate(valeur: string | undefined, reserves: string[]): string | null {
  if (estAbsent(valeur)) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur!.trim());
  if (!m) {
    reserves.push(`Date de sortie non normalisée : « ${valeur} » — attendu AAAA-MM-JJ`);
    return null;
  }
  const d = new Date(`${m[0]}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    reserves.push(`Date de sortie impossible : « ${valeur} »`);
    return null;
  }
  const an = Number(m[1]);
  const limite = new Date(Date.now() + 90 * 86_400_000).getUTCFullYear();
  if (an < 2000 || an > limite) {
    reserves.push(`Date de sortie invraisemblable : « ${valeur} »`);
    return null;
  }
  return m[0];
}

/** Une démo qui pointe chez un agrégateur envoie le visiteur chez le voisin. */
const AGREGATEURS = /slotcatalog|askgamblers|casino\.?guru|slotsmate|bigwinboard|vegasslotsonline|slottracker/i;

function lireDemo(valeur: string | undefined, reserves: string[]): string | null {
  const v = texte(valeur);
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) {
    reserves.push(`Démo ignorée, ce n'est pas une URL : « ${v} »`);
    return null;
  }
  if (AGREGATEURS.test(v)) {
    reserves.push(`Démo ignorée, elle pointe vers un agrégateur : « ${v} »`);
    return null;
  }
  return v;
}

function lireListe(valeur: string | undefined): string[] {
  if (estAbsent(valeur)) return [];
  return valeur!
    .split(/[,;]/)
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * Le niveau de preuve d'un RTP, déduit de l'endroit où il a été lu.
 *
 * `STUDIO` exige que l'URL soit **sur le domaine du studio**. C'est la seule
 * distinction qui compte : tout le reste — presse spécialisée, communiqué
 * relayé — est du second rang, sérieux mais non primaire. Une comparaison sur
 * le domaine, jamais sur une sous-chaîne : « pragmaticplay.com.example.net »
 * contient bien « pragmaticplay.com ».
 */
export function niveauDePreuve(rtpSource: string | null, siteStudio: string | null): Confiance {
  if (!rtpSource) return 'AUCUNE';
  let hote: string;
  try {
    hote = new URL(rtpSource).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'AUCUNE';
  }
  if (!siteStudio) return 'RECOUPE';
  let hoteStudio: string;
  try {
    hoteStudio = new URL(siteStudio).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'RECOUPE';
  }
  const memeDomaine = hote === hoteStudio || hote.endsWith(`.${hoteStudio}`);
  return memeDomaine ? 'STUDIO' : 'RECOUPE';
}

/**
 * Découpe un rapport en blocs et lit chaque bloc.
 *
 * ── Ce qui ouvre un bloc ──────────────────────────────────────────────────
 *
 * `NOM:` **et** `STUDIO:`, parce que l'ordre des deux n'est pas garanti : un
 * rapport mono-studio commence à `NOM:`, un rapport multi-studios annonce
 * `STUDIO:` en tête de chaque jeu. Ne reconnaître que `NOM:` avait un effet
 * silencieux et coûteux — le `STUDIO:` du jeu suivant venait écraser celui du
 * jeu précédent, et le premier jeu du rapport perdait le sien.
 *
 * Un bloc n'est retenu que s'il porte un nom : le `STUDIO:` d'une synthèse en
 * fin de rapport ne crée donc pas de fiche fantôme.
 */
export function analyserRapport(contenu: string, studioParDefaut?: string): FicheVeille[] {
  const fiches: FicheVeille[] = [];
  let champs: Record<string, string> = {};
  let studioCourant: string | undefined;

  const cloturer = () => {
    if (champs.NOM) {
      fiches.push(construireFiche(studioCourant ? { STUDIO: studioCourant, ...champs } : champs, studioParDefaut));
    }
    champs = {};
  };

  for (const ligne of contenu.split(/\r?\n/)) {
    const m = /^\s*([A-Z_]{3,20})\s*:\s*(.*)$/.exec(ligne);
    if (!m) continue;
    const cle = m[1].toUpperCase();
    const valeur = m[2].trim();

    /*
     * Le studio est suivi hors du bloc, et il persiste : un rapport peut
     * l'annoncer une fois pour vingt jeux comme le répéter à chaque jeu. Le
     * garder dans le bloc obligerait à choisir l'une des deux formes, et à se
     * tromper sur l'autre sans rien signaler.
     */
    if (cle === 'STUDIO') {
      cloturer();
      studioCourant = valeur;
      continue;
    }
    if (cle === 'NOM' && champs.NOM) cloturer();

    champs[cle] = valeur;
  }
  cloturer();

  return fiches;
}

function construireFiche(champs: Record<string, string>, studioParDefaut?: string): FicheVeille {
  const reserves: string[] = [];
  const nom = (champs.NOM ?? '').trim();

  const rtpStudio = lireRtp(champs.RTP ?? '', reserves, 'RTP');
  const rtpPaliers = lirePaliers(champs.RTP_PALIERS, reserves);
  const rtpSource = texte(champs.RTP_SOURCE);

  let rtp = rtpStudio;
  let paliers = rtpPaliers;

  /*
   * Un palier au-dessus du défaut est impossible : l'opérateur ne configure que
   * vers le bas. Quand ça arrive, ce n'est pas le palier qui est faux, c'est le
   * RTP annoncé qui n'est pas celui du studio — souvent un RTP d'achat de bonus
   * pris pour la valeur du jeu. On ne tranche pas à la place de l'humain : on
   * refuse le lot et on le dit.
   */
  if (rtp != null && paliers.some((p) => p > rtp!)) {
    reserves.push(
      `Un palier dépasse le RTP annoncé (${paliers.join(' / ')} contre ${rtp}) — ` +
        `le chiffre donné n'est pas le défaut studio. RTP non écrit.`,
    );
    rtp = null;
    paliers = [];
  }

  if (rtp != null && !rtpSource) {
    reserves.push(`RTP ${rtp} % fourni sans URL de source — non écrit`);
    rtp = null;
    paliers = [];
  }

  return {
    studio: texte(champs.STUDIO) ?? studioParDefaut ?? null,
    nom,
    slug: texte(champs.SLUG) ?? slugifier(nom),
    sortieLe: lireDate(champs.SORTIE, reserves),
    rtpStudio: rtp,
    rtpPaliers: paliers,
    rtpAchatBonus: lireRtp(champs.RTP_ACHAT_BONUS ?? '', reserves, 'RTP achat bonus'),
    rtpSource: rtp == null ? null : rtpSource,
    volatilite: lireVolatilite(champs.VOLATILITE, reserves),
    gainMaxMultiple: lireGainMax(champs.GAIN_MAX, reserves),
    grille: texte(champs.GRILLE),
    lignesPaiement: texte(champs.LIGNES),
    achatBonus: lireBooleen(champs.ACHAT_BONUS),
    mecaniques: lireListe(champs.MECANIQUES),
    demoUrl: lireDemo(champs.DEMO, reserves),
    reserves,
  };
}
