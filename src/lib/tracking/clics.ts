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
 * Le format des clés reprend donc exactement celui de BetsRank — c'est ce que
 * le postback sait lire. L'origine, elle, voyage dans le clickId préfixé.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** 90 jours, comme côté BetsRank. */
const RETENTION = 90 * 24 * 3600;

export interface ClicSortant {
  clickId: string;
  casinoSlug: string;
  jeu?: string | null;
  pays?: string | null;
  referer?: string | null;
}

export async function enregistrerClic(c: ClicSortant): Promise<boolean> {
  if (!redis) return false;

  const jour = new Date().toISOString().slice(0, 10);
  const entree = {
    id: c.clickId,
    casino: c.casinoSlug,
    slot: c.jeu ?? null,
    country: c.pays ?? null,
    referer: c.referer ?? null,
    timestamp: new Date().toISOString(),
    // Redondant avec le préfixe du clickId, et c'est voulu : le préfixe sert
    // à l'attribution, ce champ sert à lire un clic sans l'analyser.
    site: 'w2p',
  };

  await redis.lpush(`bce:clicks:${jour}`, JSON.stringify(entree));
  await redis.expire(`bce:clicks:${jour}`, RETENTION);
  return true;
}
