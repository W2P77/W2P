/**
 * Ce que la requête dit du visiteur.
 *
 * ── Pourquoi ces champs manquaient ────────────────────────────────────────
 *
 * L'écran de sortie passait `pays: null, referer: null` et n'a jamais lu les
 * en-têtes. Le clic arrivait donc dans Redis avec `ip`, `userAgent`,
 * `country` et `referer` vides — quatre champs que `ClickLog` prévoit et que
 * BetsRank remplit. Sans eux, pas de géo, pas de déduplication, pas de score
 * d'antifraude possible sur les clics where2spin, et une notification Discord
 * bien plus pauvre que celle de BetsRank pour le même événement.
 *
 * ── L'IP est celle du visiteur, et il faut pouvoir l'affirmer ─────────────
 *
 * Une IP lue au mauvais endroit est celle d'un serveur intermédiaire, et tout
 * code qui attribue ou déduplique dessus crédite alors n'importe qui.
 * `x-vercel-forwarded-for` est posé par l'edge de Vercel et n'est pas
 * falsifiable par le client ; `x-forwarded-for` peut l'être, on ne le lit
 * qu'en repli et on prend **la première** adresse de la liste, la seule qui
 * soit celle du client. `estFiable` dit laquelle des deux a servi, pour qu'un
 * traitement ultérieur puisse en tenir compte plutôt que de supposer.
 */
export interface Visiteur {
  ip: string | null;
  /** Vrai si l'IP vient d'un en-tête posé par la plateforme, non falsifiable. */
  estFiable: boolean;
  pays: string | null;
  userAgent: string | null;
  referer: string | null;
  /** « discord » quand le clic vient de l'app ou du site Discord, sinon « web ». */
  origine: string;
}

type Entetes = { get(nom: string): string | null };

function premiere(valeur: string | null): string | null {
  if (!valeur) return null;
  const x = valeur.split(',')[0]?.trim();
  return x || null;
}

export function lireVisiteur(h: Entetes): Visiteur {
  const deLaPlateforme = premiere(h.get('x-vercel-forwarded-for'));
  const ip = deLaPlateforme ?? premiere(h.get('x-forwarded-for')) ?? premiere(h.get('x-real-ip'));

  const userAgent = h.get('user-agent');
  const referer = h.get('referer') ?? h.get('referrer');

  // Le même test que BetsRank : l'application Discord se reconnaît à son
  // user-agent, un lien cliqué dans Discord à son referer.
  const viaDiscord =
    /Discord/i.test(userAgent ?? '') || /discord(app)?\.com/i.test(referer ?? '');

  return {
    ip,
    estFiable: Boolean(deLaPlateforme),
    // Vercel donne le pays en ISO-2 ; « XX » signifie inconnu, pas un pays.
    pays: (h.get('x-vercel-ip-country') || '').toUpperCase().replace(/^XX$/, '') || null,
    userAgent,
    referer,
    origine: viaDiscord ? 'discord' : 'web',
  };
}

/**
 * Un appel de l'écran de sortie qui ne vient d'aucun parcours humain.
 *
 * ── Le cas qui l'a motivé (19/09/2026) ────────────────────────────────────
 *
 * 202 des 207 clics de la semaine étaient un robot : des serveurs OVH
 * (141.94.x, 51.75.x, 149.202.x…) qui aspirent les fiches de jeux, suivent les
 * liens `/go/<casino>?slot=<jeu>` — que `robots.txt` interdit pourtant — et
 * repartent. Deux user-agents en tout (« Chrome 148 Windows », « iPhone iOS
 * 13.2.3 »), aucun referer, deux casinos à une seconde d'écart depuis deux IP.
 * Ils déclenchaient chacun un clic et une notification Discord, et Google
 * Analytics ne voyait personne : un robot n'exécute pas le script de mesure.
 *
 * ── La règle ──────────────────────────────────────────────────────────────
 *
 * where2spin n'expose ses liens de sortie que sur ses propres pages et dans
 * Discord. Un vrai clic porte donc un referer where2spin, ou vient de Discord.
 * Sans l'un ni l'autre, c'est un appel direct — le robot. Les user-agents
 * d'outils (curl, python…) sont écartés dans tous les cas.
 *
 * On ne bloque personne : un visiteur réel dont le navigateur masque le
 * referer (rare) atteint quand même le casino. Seuls changent la comptabilité
 * et le rafraîchissement automatique, que les robots suivent.
 */
export function estUnPassageSansParcours(v: Pick<Visiteur, 'referer' | 'origine' | 'userAgent'>): boolean {
  if (!v.userAgent || /bot|crawl|spider|slurp|headless|python|curl|wget|axios|node-fetch|go-http|java\/|okhttp|scrapy|httpclient/i.test(v.userAgent)) return true;
  if (v.origine === 'discord') return false;
  try {
    return !/(^|\.)where2spin\.com$/i.test(new URL(v.referer ?? '').hostname);
  } catch {
    return true;
  }
}
