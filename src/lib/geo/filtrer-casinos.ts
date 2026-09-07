/**
 * Le filtrage des casinos par pays.
 *
 * ── Ce que `pays` décrit, et ce qu'il ne décrit pas ───────────────────────
 *
 * Il décrit **notre couverture** : les pays où notre accord avec l'opérateur
 * s'applique. Il ne dit rien de ce que l'opérateur accepte. On ne peut donc
 * jamais écrire qu'un casino « refuse » un pays — seulement que notre
 * sélection ne le couvre pas là-bas. La nuance n'est pas juridique, elle est
 * factuelle : l'information n'est pas dans les données.
 *
 * ── Pourquoi on ne descend jamais à zéro ─────────────────────────────────
 *
 * Un jeu dont aucun partenaire ne couvre le pays du visiteur donnerait une
 * page sans aucun lien : la visite est perdue, et le visiteur repart croire
 * que le jeu est introuvable — ce qui est faux, il est juste hors de notre
 * sélection. Quand rien ne correspond, on montre donc tout, et on le dit.
 */
export interface CasinoGeo {
  slug: string;
  pays: string[];
}

export interface Filtrage<T> {
  casinos: T[];
  /** Vrai seulement si la liste a réellement été réduite au pays du visiteur. */
  filtre: boolean;
  /** Le pays retenu, en ISO 3166-1 alpha-2, ou `null` si on n'en sait rien. */
  pays: string | null;
}

/** Un code pays plausible : deux lettres, et pas le « XX » des IP inconnues. */
export function normaliserPays(brut: string | null | undefined): string | null {
  if (!brut) return null;
  const v = brut.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(v)) return null;
  /*
   * Trois codes ne désignent pas un pays mais une absence de réponse :
   * « XX » quand Vercel ne sait pas géolocaliser l'IP, « T1 » derrière Tor,
   * et « ZZ » qui est le code CLDR de la région inconnue. Ce dernier est le
   * plus traître : `Intl.DisplayNames` le connaît et le traduit poliment en
   * « Unknown Region », si bien qu'un visiteur aurait lu « Available in
   * Unknown Region » — une phrase que personne n'a écrite. Le rejeter ici,
   * et pas à l'affichage, coupe le problème à la source.
   */
  if (v === 'XX' || v === 'T1' || v === 'ZZ') return null;
  return v;
}

export function filtrerCasinosParPays<T extends CasinoGeo>(
  casinos: T[],
  paysBrut: string | null | undefined,
): Filtrage<T> {
  const pays = normaliserPays(paysBrut);
  if (!pays) return { casinos, filtre: false, pays: null };

  const correspondants = casinos.filter((c) => c.pays.includes(pays));
  if (correspondants.length === 0) return { casinos, filtre: false, pays };

  return { casinos: correspondants, filtre: true, pays };
}

/**
 * Le nom du pays, dans la langue du site.
 *
 * `Intl.DisplayNames` évite d'entretenir une table de quinze pays qui
 * deviendrait seize au prochain accord — et qui, ce jour-là, afficherait un
 * code brut au visiteur sans que personne ne s'en aperçoive.
 *
 * `fallback: 'none'` n'est pas un détail : par défaut, un code inconnu ne
 * lève pas, il rend la chaîne « Unknown Region ». On afficherait donc
 * « Available in Unknown Region » à un visiteur — une phrase que personne
 * n'aurait écrite, et que rien n'aurait signalée.
 */
export function nomDuPays(code: string, langue = 'en'): string {
  try {
    return new Intl.DisplayNames([langue], { type: 'region', fallback: 'none' }).of(code) ?? code;
  } catch {
    return code;
  }
}
