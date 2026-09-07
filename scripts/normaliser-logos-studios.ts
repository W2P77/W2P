/**
 * Normalise les logos de studios et les branche en base.
 *
 * ── Pourquoi « passer en 4K » n'aurait rien donné ─────────────────────────
 *
 * Les sources vont de 240×62 à 1500×846 px, et s'affichent dans une boîte
 * d'environ 110 px de large. Agrandir un logo de 240 px vers 4K n'ajoute aucun
 * détail — l'interpolation invente des pixels, elle ne retrouve pas ceux qui
 * n'ont jamais été capturés — et multiplie le poids du fichier par vingt pour
 * un résultat identique à l'œil, voire plus flou.
 *
 * Ce qui améliore réellement la netteté, c'est de servir **environ trois fois
 * la taille d'affichage** : à 110 px affichés, une source de 360 px reste nette
 * sur un écran retina à 2× et laisse de la marge. D'où une toile commune de
 * 400×160, en `contain` et sur fond transparent : les grands logos y sont
 * réduits (donc plus nets), les petits y sont posés sans déformation.
 *
 * Le script **signale** ceux dont la source est plus petite que la toile : ce
 * sont les seuls réellement en basse définition, et les seuls qu'il faudrait
 * remplacer par un fichier officiel. Les traiter en silence reviendrait à
 * croire le problème résolu.
 *
 * Usage : npx tsx scripts/normaliser-logos-studios.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const SOURCE = '/Users/joris/Documents/GitHub/BetsRank/public/images';
const CIBLE = resolve(process.cwd(), 'public/studios');

/** Trois fois la boîte d'affichage (~110×45). Au-delà, c'est du poids mort. */
const TOILE = { largeur: 400, hauteur: 160 };

/**
 * Le fichier source de chaque studio.
 *
 * La table est **écrite**, pas déduite du slug : « pragmatic-play » donne
 * « Pragmaticplay.webp », « bgaming » donne « bgaming-v2.webp ». Une règle de
 * transformation marcherait pour vingt studios et échouerait en silence sur
 * le vingt-et-unième.
 */
const FICHIERS: Record<string, string> = {
  'pragmatic-play': 'Pragmaticplay.webp',
  bgaming: 'bgaming-v2.webp',
  'playn-go': 'playngo.webp',
  'hacksaw-gaming': 'hacksaw.webp',
  pgsoft: 'pgsoft.webp',
  'nolimit-city': 'nolimit.webp',
  netent: 'netent.webp',
  'red-tiger': 'redtiger.webp',
  'relax-gaming': 'relax.webp',
  yggdrasil: 'yggdrasil.webp',
  'elk-studios': 'elk.webp',
  'big-time-gaming': 'bigtimegaming.webp',
  'push-gaming': 'pushgaming.webp',
  playson: 'playson-v2.webp',
  spribe: 'spribe.webp',
  'inout-games': 'inoutgames-v2.webp',
  evolution: 'evolution.svg',
};

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const studios = await prisma.studio.findMany({ select: { slug: true, nom: true } });
  mkdirSync(CIBLE, { recursive: true });

  const faits: Array<{ slug: string; source: string; agrandi: boolean }> = [];
  const sansLogo: string[] = [];

  for (const s of studios) {
    const fichier = FICHIERS[s.slug];
    if (!fichier || !existsSync(resolve(SOURCE, fichier))) {
      sansLogo.push(`${s.slug} (${s.nom})`);
      continue;
    }
    const entree = resolve(SOURCE, fichier);
    const meta = await sharp(entree).metadata();
    const agrandi = (meta.width ?? 0) < TOILE.largeur && (meta.height ?? 0) < TOILE.hauteur;

    if (appliquer) {
      await sharp(entree)
        .resize({
          width: TOILE.largeur,
          height: TOILE.hauteur,
          fit: 'contain',
          // Fond transparent : un logo posé sur du blanc découpe un rectangle
          // clair au milieu d'une page noire.
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: 'lanczos3',
        })
        .webp({ quality: 92, alphaQuality: 100 })
        .toFile(resolve(CIBLE, `${s.slug}.webp`));
    }
    faits.push({ slug: s.slug, source: `${meta.width}×${meta.height}`, agrandi });
  }

  console.log(`${studios.length} studios, ${faits.length} logos traités, ${sansLogo.length} sans source.\n`);
  for (const f of faits) {
    const poids = appliquer ? `${Math.round(statSync(resolve(CIBLE, `${f.slug}.webp`)).size / 1024)} Ko` : '';
    console.log(`  ${f.slug.padEnd(18)} ${f.source.padEnd(11)} ${f.agrandi ? '⚠ source plus petite que la toile' : 'net'} ${poids}`);
  }
  if (sansLogo.length) {
    console.log(`\nSans logo — la pastille au nom reste :`);
    for (const s of sansLogo) console.log(`  · ${s}`);
  }

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  for (let i = 0; i < faits.length; i += 25) {
    await Promise.all(
      faits.slice(i, i + 25).map((f) =>
        prisma.studio.update({ where: { slug: f.slug }, data: { logoUrl: `/studios/${f.slug}.webp` } }),
      ),
    );
  }
  // Les studios sans source repassent à `null` : un chemin qui ne mène à rien
  // désactive le repli et rend une image cassée.
  await prisma.studio.updateMany({
    where: { slug: { notIn: faits.map((f) => f.slug) } },
    data: { logoUrl: null },
  });

  const branches = await prisma.studio.count({ where: { logoUrl: { not: null } } });
  console.log(`\n${faits.length} logos écrits, ${branches} studios en portent un.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
