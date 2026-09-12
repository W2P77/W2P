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
