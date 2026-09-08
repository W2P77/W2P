/**
 * Retire le filigrane en **recadrant le haut**, au lieu d'écarter l'image.
 *
 * ── Pourquoi la détection a été abandonnée ────────────────────────────────
 *
 * Cinq détecteurs successifs : par la taille de l'image, par le vert dans une
 * boîte fixe, par la teinte exacte, par la signature blanc-puis-vert, par la
 * géométrie du mot sur bande glissante. Chacun séparait parfaitement
 * l'échantillon sur lequel il avait été calibré, et chacun laissait passer des
 * filigranes sur le lot suivant — le calque existe à plusieurs échelles, sur
 * des fonds clairs comme sombres, et l'artwork contient lui-même du vert.
 *
 * Le dernier atteignait quinze détections sur quinze et laissait quand même
 * passer deux images sur douze prises au hasard. À ce stade, le problème n'est
 * pas le réglage : c'est qu'on cherche à **reconnaître** une chose dont on
 * connaît déjà la position.
 *
 * ── Ce que le recadrage change ────────────────────────────────────────────
 *
 * Le calque est toujours ancré en haut à gauche et ne descend jamais au-delà
 * de 45 px sur une image de 396 px de haut — mesuré sur les cas observés.
 * Couper les 15 premiers pour cent le supprime **quelle que soit son
 * échelle**, sans avoir à le reconnaître.
 *
 * Le prix est une bande de fond en haut de la jaquette. Le gain est double :
 * plus aucun filigrane possible, et les 652 images qu'on écartait par
 * précaution redeviennent utilisables. Sur un catalogue dont les deux tiers
 * n'ont pas d'image, c'est le meilleur échange disponible.
 *
 * Le recadrage n'est appliqué qu'aux images de 400 px de large ou plus : les
 * petites viennent d'une autre source et n'ont jamais porté le calque.
 *
 * Usage : npx tsx scripts/retirer-bandeau-filigrane.ts [--appliquer]
 */
import { readdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const DOSSIER = resolve(process.cwd(), 'public/images/slots');
export const LARGEUR_CONCERNEE = 400;
export const PART_COUPEE = 0.15;

export async function couperLeBandeau(entree: string, sortie: string): Promise<boolean> {
  const meta = await sharp(entree).metadata();
  const largeur = meta.width ?? 0;
  const hauteur = meta.height ?? 0;
  if (largeur < LARGEUR_CONCERNEE) return false;

  const coupe = Math.round(hauteur * PART_COUPEE);
  await sharp(entree)
    .extract({ left: 0, top: coupe, width: largeur, height: hauteur - coupe })
    .webp({ quality: 88 })
    .toFile(sortie);
  return true;
}

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const fichiers = readdirSync(DOSSIER);
  let concernees = 0;

  for (const f of fichiers) {
    const chemin = join(DOSSIER, f);
    const meta = await sharp(chemin).metadata();
    if ((meta.width ?? 0) < LARGEUR_CONCERNEE) continue;
    concernees++;
    if (!appliquer) continue;

    const temporaire = `${chemin}.coupe`;
    await couperLeBandeau(chemin, temporaire);
    unlinkSync(chemin);
    renameSync(temporaire, chemin);
  }

  console.log(`${fichiers.length} jaquettes publiées, ${concernees} de 400 px ou plus.`);
  console.log(appliquer ? `${concernees} recadrées de ${PART_COUPEE * 100} %.` : '\nSIMULATION — rien n’a été recadré. Ajouter --appliquer.');
}

if (process.argv[1]?.endsWith('retirer-bandeau-filigrane.ts')) main().catch((e) => { console.error(e); process.exit(1); });
