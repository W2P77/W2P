import { NextResponse } from 'next/server';

import { rechercherTout } from '@/lib/donnees/recherche';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';

/**
 * La recherche du site, à la frappe.
 *
 * ── Pourquoi cette route existe ───────────────────────────────────────────
 *
 * Le catalogue compte 11 658 fiches. Les embarquer dans le navigateur — même
 * réduites au nom et au studio — chargerait chaque page du site d'un index
 * d'un mégaoctet pour une frappe que la plupart des visiteurs ne feront pas.
 * La base reste donc la base : le navigateur envoie un terme, la route rend
 * une quinzaine de lignes. Ce qui traverse ne dépend plus du catalogue.
 *
 * ── Pourquoi rien n'est mis en cache ──────────────────────────────────────
 *
 * La réponse dépend du pays du visiteur, lu dans le cookie posé par le
 * middleware : les casinos proposés sont ceux que **notre sélection** couvre
 * là où il se trouve. Une réponse mutualisée servirait le pays du premier
 * arrivant à tous les suivants — le piège déjà payé sur les pages rendues
 * avec `revalidate`, et la raison pour laquelle le filtrage y a lieu dans le
 * navigateur. Ici, le dynamique nous permet de mieux faire.
 */
export const dynamic = 'force-dynamic';

/** Ce qu'on accepte de lire : au-delà, c'est du bruit ou une sonde. */
const LONGUEUR_MAXIMALE = 80;

export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const q = (url.searchParams.get('q') ?? '').slice(0, LONGUEUR_MAXIMALE);

  /*
   * La langue vient du paramètre, pas du chemin.
   *
   * La route est servie depuis `/api/recherche`, hors du segment `[langue]` :
   * elle n'a aucun moyen de savoir sur quelle version du site le visiteur se
   * trouve. C'est le champ qui la lui dit — il la lit déjà dans l'URL de la
   * page pour ses propres libellés.
   */
  const brut = url.searchParams.get('langue') ?? '';
  const langue = estUneLangue(brut) ? brut : LANGUE_DEFAUT;

  const pays = requete.headers
    .get('cookie')
    ?.split('; ')
    .find((c) => c.startsWith('w2p_pays='))
    ?.slice('w2p_pays='.length);

  const reponse = await rechercherTout({
    q,
    langue,
    pays: pays ? decodeURIComponent(pays) : null,
  });

  return NextResponse.json(reponse, {
    // Une frappe de plus doit interroger la base, pas relire une réponse d'il
    // y a trois secondes qui portait un terme plus court.
    headers: { 'Cache-Control': 'no-store' },
  });
}
