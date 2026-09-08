import sharp from 'sharp';

/**
 * Détecte le filigrane « SlotCatalog.com » sur une jaquette.
 *
 * ── Quatre détecteurs, et pourquoi les trois premiers échouaient ──────────
 *
 * 1. **Par la taille de l'image.** « Au-delà de 400 px, c'est filigrané. »
 *    Faux dans les deux sens : `bonanza.webp` fait 480 px et est propre,
 *    `fruits.webp` porte le calque à 600×600 quand `aztec-twist.webp`, même
 *    dimension, ne l'a pas. Ce tri jetait mille images utilisables.
 *
 * 2. **Par le vert, dans une boîte en pixels fixes.** Séparation parfaite sur
 *    quinze images, puis un filigrane d'une autre échelle est passé à côté de
 *    la boîte. Un contrôle calé sur une seule taille ne tient que tant qu'il
 *    n'y en a qu'une.
 *
 * 3. **Par la teinte exacte du vert.** Écrasé par la réalité : `booze-bash`
 *    porte un disque vert dans son artwork et sortait à 23 %, quand un vrai
 *    filigrane sur fond clair tombait à 0,5 %. La couleur seule ne distingue
 *    pas un mot d'une tache.
 *
 * 4. **Par la géométrie, ci-dessous.** Ce qu'on cherche n'est pas une couleur
 *    mais une **forme** : le mot « Catalog » dessine une boîte basse et
 *    allongée, calée en haut à gauche, avec « Slot » en blanc sur la même
 *    ligne juste à sa gauche. Un feuillage donne une tache haute et ronde,
 *    sans blanc à sa gauche.
 *
 * ── L'asymétrie qui fixe les seuils ───────────────────────────────────────
 *
 * Sur les vingt-six images vérifiées à l'œil : quinze filigranes sur quinze
 * détectés, un seul faux positif. Les seuils sont réglés dans ce sens
 * volontairement — un faux positif coûte **une image utilisable**, un raté
 * publie **la marque d'un concurrent sur notre page**. Les deux erreurs n'ont
 * pas le même prix, les seuils ne doivent donc pas être neutres.
 *
 * La bande d'analyse **glisse** sur le haut de l'image : sans cela, du vert
 * présent ailleurs dans l'artwork gonfle la boîte englobante et fait rater le
 * filigrane — c'est ce qui arrivait sur quatre images sur quatorze.
 */

/** Une bande de 30 px suffit à contenir le mot, quelle que soit l'échelle. */
const BANDE = 30;

export async function porteFiligrane(chemin: string): Promise<boolean> {
  const meta = await sharp(chemin).metadata();
  const largeur = meta.width ?? 0;
  const hauteur = meta.height ?? 0;
  // Trop petite pour porter le calque : elle vient d'une autre source.
  if (largeur < 120 || hauteur < 40) return false;

  const zone = {
    left: 0,
    top: 0,
    width: Math.round(largeur * 0.6),
    height: Math.min(hauteur, Math.max(36, Math.round(hauteur * 0.22))),
  };
  const { data, info } = await sharp(chemin).extract(zone).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;

  const estVert = (i: number) => {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    return g > 120 && g > r + 25 && g > b + 60 && r > 45 && b < 130;
  };
  const estBlanc = (i: number) => data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200;

  for (let haut = 0; haut + Math.min(BANDE, info.height) <= info.height; haut += 4) {
    const bas = Math.min(haut + BANDE, info.height);
    let x0 = Infinity;
    let x1 = -1;
    let y0 = Infinity;
    let y1 = -1;
    let verts = 0;
    for (let y = haut; y < bas; y++) {
      for (let x = 0; x < info.width; x++) {
        if (!estVert((y * info.width + x) * ch)) continue;
        verts++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (verts < 40) continue;

    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const ratio = bw / bh;
    const densite = verts / (bw * bh);

    const forme =
      bh >= 10 && bh <= 34 && ratio >= 2.4 && ratio <= 8 &&
      x0 < largeur * 0.35 && y0 < hauteur * 0.16 && densite > 0.12;
    if (!forme) continue;

    // « Slot » en blanc, sur la même ligne, à gauche du mot vert.
    let blancs = 0;
    for (let y = Math.max(0, y0 - 3); y <= Math.min(info.height - 1, y1 + 3); y++) {
      for (let x = 0; x < x0; x++) if (estBlanc((y * info.width + x) * ch)) blancs++;
    }
    if (blancs > 60) return true;
  }
  return false;
}
