/**
 * Reconnaître la page qu'un serveur de démo sert quand il nous a mis au ban.
 *
 * ── Pourquoi une fonction à part ─────────────────────────────────────────
 *
 * Le 11/09/2026, après 227 lancements en 2h40, `demo.bgaming-network.com` a
 * répondu « Error 1015 — You are being rate limited » (Cloudflare, HTTP 429).
 * Le runner ne le voyait pas : chaque jeu tombait en « icône des règles
 * introuvable », indiscernable d'un vrai défaut d'adaptateur, et la campagne
 * continuait de lancer des jeux dans le ban — ce qui le prolonge. Deux tests de
 * non-régression en ont tiré une conclusion fausse.
 *
 * La page seule ne suffit pas à conclure : le code d'un jeu peut contenir
 * « Too Many Requests » dans ses messages d'erreur, et un gain maximum peut
 * valoir « x1015 ». On exige donc les deux marques de la page Cloudflare
 * ensemble.
 */
export function estUneLimiteDeDebit(html: string): boolean {
  return /Error\s*1015/i.test(html) && /rate\s+limited/i.test(html);
}

/** Levée pour arrêter une campagne entière, pas seulement le jeu en cours. */
export class LimiteDeDebit extends Error {
  constructor(public readonly hote: string) {
    super(`${hote} limite nos requêtes (Cloudflare 1015 / HTTP 429)`);
    this.name = 'LimiteDeDebit';
  }
}
