/**
 * La légende d'une capture énonce-t-elle cette valeur ?
 *
 * `adopter-preuves.ts` attachait la volatilité et le gain maximum en base à la
 * capture qui porte le RTP, en supposant qu'elle les montrait. Elle ne le fait
 * pas toujours : 309 plafonds sur 601 étaient attestés par une capture dont la
 * légende ne cite aucun plafond (19/09/2026). Monster Superlanche en portait un
 * de 20 000x ; l'écran dit 5 000x. On n'accepte donc la preuve que si la
 * légende énonce la valeur — le fait que la capture existe ne prouve rien.
 */
const MOTS_VOLATILITE: Record<string, RegExp> = {
  BASSE: /volatility stated as basse|low volatility/i,
  MOYENNE: /volatility stated as moyenne|medium volatility/i,
  HAUTE: /volatility stated as haute|high volatility/i,
  TRES_HAUTE: /volatility stated as (tres_haute|très haute)|very high volatility/i,
};

export function legendeEnonce(legende: string, champ: string, valeur: string): boolean {
  if (champ === 'volatilite') return MOTS_VOLATILITE[valeur]?.test(legende) ?? false;
  if (champ === 'gainMaxMultiple') {
    const n = Number(valeur);
    if (!Number.isFinite(n) || !/max win/i.test(legende)) return false;
    const chiffres = String(n).split('').join('[,. \\u00a0\\u202f]?');
    return new RegExp(`max win ${chiffres}\\s?[x×]`, 'i').test(legende);
  }
  return true;
}
