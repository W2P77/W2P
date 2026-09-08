/**
 * Intègre les logos récupérés sur les sites officiels des studios.
 *
 * ── Deux précautions qui ne sont pas cosmétiques ──────────────────────────
 *
 * 1. **Les SVG sont rasterisés à haute densité, pas redimensionnés.** Un SVG
 *    lu à sa densité par défaut (72 ppp) donne parfois une image de 198×24 px ;
 *    l'agrandir ensuite produit exactement le flou qu'on cherchait à éviter.
 *    En imposant la densité au moment du décodage, le tracé est rendu **à la
 *    taille finale**, donc net par construction.
 *
 * 2. **Un logo sombre est invisible sur ce site.** Le fond est noir : un logo
 *    en noir sur transparent disparaît, et rien ne le signale — la case paraît
 *    simplement vide. Le script mesure donc la luminance médiane des pixels
 *    opaques et refuse d'écrire en dessous du seuil, en le disant.
 *
 *    Le garde-fou a servi dès le premier passage : Wazdan publie son logo en
 *    `#191919`, luminance 25. Sa version de pied de page l'est aussi. Le tracé
 *    étant **monochrome** — une seule forme, une seule couleur — il a été
 *    recoloré en blanc, ce qui est l'usage normal d'une marque sur fond sombre
 *    et ne touche pas à sa forme. Un logo polychrome, lui, aurait dû rester
 *    écarté : on ne réinvente pas les couleurs d'un partenaire.
 *
 * Usage : npx tsx scripts/importer-logos-officiels.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const SOURCE =
  '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/logos';
const CIBLE = resolve(process.cwd(), 'public/studios');
const TOILE = { largeur: 400, hauteur: 160 };
/** En dessous, le logo se fond dans le fond noir de la page. */
const LUMINANCE_MINIMALE = 70;

/**
 * La luminance **médiane** des pixels opaques, pas la moyenne.
 *
 * La moyenne s'est fait avoir dès le second lot : le logo BGaming est un mot
 * en noir avec un petit carré jaune vif. Le jaune, minoritaire en surface mais
 * très lumineux, tirait la moyenne à 91 — au-dessus du seuil — alors que les
 * neuf dixièmes du dessin étaient invisibles sur fond noir. Un contrôle qu'un
 * seul détail suffit à tromper ne protège de rien.
 *
 * La médiane décrit ce que l'œil voit réellement : si plus de la moitié du
 * tracé est sombre, le logo est sombre, quel que soit l'éclat du reste.
 */
async function luminanceMediane(mem: Buffer): Promise<number> {
  const { data, info } = await sharp(mem).raw().toBuffer({ resolveWithObject: true });
  const valeurs: number[] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = info.channels === 4 ? data[i + 3] : 255;
    if (alpha < 128) continue;
    valeurs.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  }
  if (valeurs.length === 0) return 0;
  valeurs.sort((x, y) => x - y);
  return valeurs[Math.floor(valeurs.length / 2)];
}

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const fichiers = existsSync(SOURCE) ? readdirSync(SOURCE).filter((f) => /\.(svg|png|webp|jpg)$/i.test(f)) : [];
  mkdirSync(CIBLE, { recursive: true });

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const retenus: string[] = [];
  const trop_sombres: string[] = [];

  for (const f of fichiers) {
    const slug = f.replace(/\.[a-z]+$/i, '');
    const entree = resolve(SOURCE, f);

    // Densité forcée : le tracé est rendu à la taille finale, pas agrandi après.
    const brut = sharp(entree, f.endsWith('.svg') ? { density: 600 } : undefined);
    const rendu = await brut
      .resize({
        width: TOILE.largeur,
        height: TOILE.hauteur,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'lanczos3',
      })
      .png()
      .toBuffer();

    const lum = Math.round(await luminanceMediane(rendu));
    if (lum < LUMINANCE_MINIMALE) {
      trop_sombres.push(`${slug} (luminance ${lum}) — invisible sur fond noir, non écrit`);
      continue;
    }

    if (appliquer) {
      await sharp(rendu).webp({ quality: 92, alphaQuality: 100 }).toFile(resolve(CIBLE, `${slug}.webp`));
    }
    retenus.push(`${slug} (luminance ${lum})`);
  }

  console.log(`${fichiers.length} logos récupérés, ${retenus.length} retenus, ${trop_sombres.length} écartés.\n`);
  for (const r of retenus) console.log(`  ✓ ${r}`);
  for (const t of trop_sombres) console.log(`  ✗ ${t}`);

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  const slugs = retenus.map((r) => r.split(' ')[0]);
  for (let i = 0; i < slugs.length; i += 25) {
    await Promise.all(
      slugs.slice(i, i + 25).map((slug) =>
        prisma.studio.updateMany({ where: { slug }, data: { logoUrl: `/studios/${slug}.webp` } }),
      ),
    );
  }
  const total = await prisma.studio.count({ where: { logoUrl: { not: null } } });
  console.log(`\n${slugs.length} logos écrits. ${total} studios sur 27 en portent un.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
