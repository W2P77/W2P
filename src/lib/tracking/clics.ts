import { Redis } from '@upstash/redis';

/**
 * L'enregistrement d'un clic sortant.
 *
 * ── Redis partagé avec BetsRank, volontairement ───────────────────────────
 *
 * Les postbacks arrivent sur un déploiement commun qui lit cette base. Un
 * Redis séparé rendrait les clics de where2spin introuvables au moment de la
 * conversion : le lead serait perdu, pas seulement mal attribué.
 *
 * ── Le format n'est pas un choix, c'est une contrainte ────────────────────
 *
 * La première version faisait un `lpush` sur `bce:clicks:<jour>`, en croyant
 * la clé être une liste. **Elle est une string** : BetsRank y stocke un
 * tableau JSON entier, lu par `get` et réécrit par `set`
 * (`app/api/go/logger.ts`). Chaque `lpush` renvoyait donc `WRONGTYPE`,
 * l'appelant avalait l'erreur en `.catch(() => {})`, et **aucun clic
 * where2spin n'a jamais été écrit** — 50 clics dans la clé du jour, zéro
 * portant le préfixe `w2p-`. La notification Discord partait quand même, ce
 * qui donnait toutes les apparences du bon fonctionnement.
 *
 * Conséquence si on ne corrige pas : un postback de conversion arrive avec un
 * clickId `w2p-…`, `getClickById` ne trouve rien, et l'attribution du FTD part
 * à l'admin. C'est le métier qui se perd, pas une statistique.
 *
 * ── Deux précautions reprises de BetsRank ─────────────────────────────────
 *
 * · **On n'écrit que si la lecture a abouti.** Écrire après une lecture ratée
 *   remplacerait le tableau de la journée par un tableau d'un seul élément :
 *   un timeout Upstash effacerait tous les clics du jour, des deux sites. On
 *   préfère perdre CE clic plutôt que la journée.
 *
 * · **Aucune expiration posée.** La clé n'en a pas côté BetsRank (`ttl = -1`).
 *   Un `expire` depuis ici en imposerait une à une clé partagée et ferait
 *   disparaître des clics BetsRank qui sont aujourd'hui permanents.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
        // Comme BetsRank : on lit et on écrit la chaîne brute nous-mêmes.
        automaticDeserialization: false,
      })
    : null;

/** Le format exact de `ClickLog` côté BetsRank. Ne pas en dévier. */
export interface ClicEnregistre {
  id: string;
  timestamp: string;
  casinoId: number;
  casinoSlug: string;
  casinoName: string;
  source: string;
  campaign: string;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  referer: string | null;
  /** Redondant avec le préfixe du clickId, et c'est voulu : il permet de lire
   *  l'origine d'un clic sans avoir à analyser son identifiant. */
  site?: string;
}

export interface ClicSortant {
  clickId: string;
  casinoId: number;
  casinoSlug: string;
  casinoNom: string;
  jeu?: string | null;
  pays?: string | null;
  referer?: string | null;
}

/** Le tableau du jour, quelle que soit la forme sous laquelle Redis le rend. */
export function lireClics(brut: unknown): ClicEnregistre[] {
  if (brut == null) return [];
  if (Array.isArray(brut)) return brut as ClicEnregistre[];
  if (typeof brut === 'string') {
    try {
      const v = JSON.parse(brut || '[]');
      return Array.isArray(v) ? (v as ClicEnregistre[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function cleDuJour(date = new Date()): string {
  return `bce:clicks:${date.toISOString().slice(0, 10)}`;
}

export function entreeDeClic(c: ClicSortant, date = new Date()): ClicEnregistre {
  return {
    id: c.clickId,
    timestamp: date.toISOString(),
    casinoId: c.casinoId,
    casinoSlug: c.casinoSlug,
    casinoName: c.casinoNom,
    source: 'where2spin',
    campaign: c.jeu ?? 'direct',
    ip: null,
    userAgent: null,
    country: c.pays ?? null,
    referer: c.referer ?? null,
    site: 'w2p',
  };
}

export async function enregistrerClic(c: ClicSortant): Promise<boolean> {
  if (!redis) return false;
  const cle = cleDuJour();

  let clics: ClicEnregistre[];
  try {
    clics = lireClics(await redis.get(cle));
  } catch {
    // Lecture ratée : on abandonne l'écriture plutôt que d'écraser la journée.
    return false;
  }

  clics.push(entreeDeClic(c));
  try {
    await redis.set(cle, JSON.stringify(clics));
    return true;
  } catch {
    return false;
  }
}
