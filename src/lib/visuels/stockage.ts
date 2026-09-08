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
export async function televerser(cheminLocal: string, cheminDistant: string): Promise<string> {
  const { url, cle } = config();
  const corps = readFileSync(cheminLocal);
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
  if (!reponse.ok) {
    throw new Error(`Téléversement refusé (${reponse.status}) : ${await reponse.text()}`);
  }
  return urlPublique(cheminDistant);
}
