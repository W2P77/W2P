import { readFileSync } from 'node:fs';

import { RACINE_CAPTURES } from '../site';

/**
 * Le stockage des captures, chez Supabase.
 *
 * ── Pourquoi elles ne vivent pas dans le dépôt ────────────────────────────
 *
 * Six captures pèsent 1 Mo en WebP. Sur les 1 951 jeux du catalogue, l'ordre
 * de grandeur est de **1,7 Go** — Git n'est pas fait pour ça : chaque version
 * d'une image reste dans l'historique pour toujours, et un dépôt qu'on ne peut
 * plus cloner est un dépôt perdu. Les jaquettes (54 Mo) passaient encore ; les
 * captures, non.
 *
 * Le bucket est **public en lecture** : ces images sont servies à chaque
 * visiteur, une URL signée ajouterait un aller-retour par image pour protéger
 * ce qui est déjà public.
 */
const BUCKET = 'captures';

function config() {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour téléverser une capture.',
    );
  }
  return { url, cle };
}

/** L'URL publique d'une capture, calculable sans appel réseau. */
export function urlPublique(chemin: string): string {
  return `${RACINE_CAPTURES}/${chemin}`;
}

/**
 * Téléverse un fichier local. `upsert` est actif : relancer une capture doit
 * remplacer l'ancienne, pas échouer — sinon une correction demanderait une
 * suppression manuelle et on finirait par ne plus corriger.
 */
/**
 * Un refus passager ne doit pas coûter une campagne entière.
 *
 * Une campagne de 261 jeux est morte à la quatorzième sur un **502 Bad
 * Gateway** de Supabase — trois campagnes téléversaient en parallèle et le
 * stockage a lâché une seconde. Les treize jeux capturés avant étaient perdus
 * avec le reste, et une capture coûte une minute de navigateur : c'est le prix
 * fort pour un hoquet réseau.
 *
 * On ne réessaie que ce qui peut réussir au coup suivant — 5xx, 408, 429, ou
 * une coupure. Un 401 ou un 403 sont des refus définitifs : les rejouer trois
 * fois ne ferait que retarder le diagnostic.
 */
const REESSAYABLE = (statut: number) => statut >= 500 || statut === 408 || statut === 429;
const RECULS_MS = [1_000, 4_000, 12_000];

export async function televerser(cheminLocal: string, cheminDistant: string): Promise<string> {
  const { url, cle } = config();
  const corps = readFileSync(cheminLocal);

  let dernierEchec = '';
  for (let essai = 0; essai <= RECULS_MS.length; essai++) {
    if (essai > 0) await new Promise((r) => setTimeout(r, RECULS_MS[essai - 1]));
    try {
      const reponse = await fetch(`${url}/storage/v1/object/${BUCKET}/${cheminDistant}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cle}`,
          apikey: cle,
          'Content-Type': 'image/webp',
          'x-upsert': 'true',
        },
        body: corps,
      });
      if (reponse.ok) return urlPublique(cheminDistant);

      const detail = (await reponse.text()).slice(0, 200);
      if (!REESSAYABLE(reponse.status)) {
        throw new Error(`Téléversement refusé (${reponse.status}) : ${detail}`);
      }
      dernierEchec = `${reponse.status} : ${detail}`;
    } catch (erreur) {
      // Une erreur réseau (socket coupée, DNS) mérite le même traitement qu'un
      // 5xx ; un refus définitif remonte tel quel et sort de la boucle.
      if (erreur instanceof Error && erreur.message.startsWith('Téléversement refusé')) throw erreur;
      dernierEchec = erreur instanceof Error ? erreur.message.slice(0, 200) : 'erreur réseau';
    }
  }
  throw new Error(
    `Téléversement abandonné après ${RECULS_MS.length + 1} essais — ${dernierEchec}`,
  );
}
