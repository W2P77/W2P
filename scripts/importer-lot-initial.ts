/**
 * Le lot d'amorçage du catalogue.
 *
 * ── D'où viennent ces jeux ────────────────────────────────────────────────
 *
 * Des fiches dont le RTP a été **vérifié auprès des studios**. Ce sont des
 * faits — RTP, volatilité, gain maximum, mécaniques — donc transférables. Les
 * textes, eux, ne le sont pas et ne sont pas repris : where2play écrira les
 * siens.
 *
 * ── Le niveau de preuve n'est pas décoratif ───────────────────────────────
 *
 * `STUDIO` est réservé aux jeux dont on possède **l'URL exacte** qui atteste
 * le chiffre. Les autres arrivent en `RECOUPE` : la valeur est sérieuse, mais
 * personne n'a consigné où elle a été lue. Marquer tout le lot `STUDIO` serait
 * confortable et faux — et c'est précisément ce qu'on reproche aux autres.
 *
 * Usage : npx tsx scripts/importer-lot-initial.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

/** Les jeux arbitrés le 06/09/2026, avec la page du studio qui fait foi. */
const SOURCES: Record<string, string> = {
  'big-bass-amazon-xtreme': 'https://www.pragmaticplay.com/en/games/big-bass-amazon-xtreme/',
  'big-bass-halloween-2': 'https://www.pragmaticplay.com/en/games/big-bass-halloween-2/',
  'big-bass-hold-spinner': 'https://www.pragmaticplay.com/en/games/big-bass-hold-spinner/',
  'big-bass-keeping-it-reel': 'https://www.pragmaticplay.com/en/games/big-bass-keeping-it-reel/',
  'big-bass-reel-repeat': 'https://www.pragmaticplay.com/en/games/big-bass-reel-repeat/',
  'big-bass-secrets-of-the-golden-lake':
    'https://www.pragmaticplay.com/en/games/big-bass-secrets-of-the-golden-lake/',
  'big-bass-xmas-extreme': 'https://www.pragmaticplay.com/en/games/big-bass-xmas-extreme/',
  'extra-juicy-slot': 'https://www.pragmaticplay.com/en/games/extra-juicy/',
  'extra-juicy-megaways': 'https://www.pragmaticplay.com/en/games/extra-juicy-megaways/',
  'fire-hot-20': 'https://www.pragmaticplay.com/en/games/fire-hot-20/',
  'fire-hot-100': 'https://www.pragmaticplay.com/en/games/fire-hot-100/',
  'floating-dragon-hold-and-spin': 'https://www.pragmaticplay.com/en/games/floating-dragon/',
  'floating-dragon-megaways': 'https://www.pragmaticplay.com/en/games/floating-dragon-megaways/',
  'wisdom-of-athena': 'https://www.pragmaticplay.com/en/games/wisdom-of-athena/',
  starburst: 'https://netent.com/games/starburst',
  'hall-of-gods': 'https://netent.com/games/hall-of-gods',
  reactor: 'https://redtiger.com/games/reactor',
  'white-rabbit': 'https://www.bigtimegaming.com/games/white-rabbit',
  'katmandu-gold': 'https://www.elk-studios.com/games/katmandu-gold/',
  'le-pharaoh': 'https://static-live.hacksawgaming.com/1562/1.48.1/main.js',
  'wild-chapo-2': 'https://www.relax-gaming.com/products/casino/wildchapo2',
  'buffalo-hunter': 'https://nolimitcity.com/games/buffalo-hunter',
  'infectious-5-xways': 'https://nolimitcity.com/games/infectious-5-xways',
  'stars-stripes-hold-and-win': 'https://bgaming.com/games/stars-stripes-hold-and-win',
};

/** Les titres que le public cherche par leur nom — l'amorçage vise ceux-là. */
const NOTOIRES = [
  'sweet bonanza', 'gates of olympus', 'starburst', 'book of dead', 'big bass',
  'sugar rush', 'wanted dead', 'money train', 'razor shark', 'dog house',
  'bonanza', 'fire in the hole', 'le bandit', 'mental', 'san quentin',
  'reactor', 'white rabbit', 'hall of gods', 'dead or alive', 'floating dragon',
  'great rhino', 'wolf gold', 'buffalo', 'madame destiny', 'fruit party',
  'extra juicy', 'fire hot', 'wisdom of athena', 'katmandu', 'infectious',
  'le pharaoh', 'wild chapo', 'stars & stripes',
];

const VOLATILITE: Record<string, 'BASSE' | 'MOYENNE' | 'HAUTE' | 'TRES_HAUTE'> = {
  LOW: 'BASSE',
  MEDIUM: 'MOYENNE',
  HIGH: 'HAUTE',
  VERY_HIGH: 'TRES_HAUTE',
};

interface SlotSource {
  fichier?: string;
  confidence?: string;
  slug: string;
  name: string;
  rtp: string | number | null;
  volatility: string | null;
  maxWinMultiplier: number | null;
  reels: string | null;
  paylines: string | null;
  mechanics: string[];
  bonusBuyAvailable: boolean | null;
  releaseDate: string | null;
  demoUrl: string | null;
  provider: { slug: string; name: string };
}

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const tous: SlotSource[] = JSON.parse(readFileSync('/tmp/slots-propres.json', 'utf-8'));

  // Tout ce qui possède un visuel propre. Le filtre par notoriété limitait le
  // catalogue à 35 titres ; or un catalogue incomplet n'est pas un petit
  // catalogue, c'est un site qu'on quitte parce qu'on n'y trouve pas son jeu.
  const lot = tous;
  const avecSource = lot.filter((s) => SOURCES[s.slug]).length;

  console.log(`${lot.length} jeux retenus, dont ${avecSource} avec une source studio consignée.\n`);

  if (!appliquer) {
    for (const s of lot) {
      const marque = SOURCES[s.slug] ? 'STUDIO ' : 'RECOUPE';
      console.log(`  [${marque}] ${s.name.slice(0, 36).padEnd(37)}${s.provider.name.padEnd(17)}${s.rtp}`);
    }
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    return;
  }

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  // Les studios d'abord : un jeu sans studio n'a pas de sens, et l'ordre
  // inverse ferait échouer la contrainte de clé étrangère.
  const studios = new Map<string, string>();
  for (const s of lot) studios.set(s.provider.slug, s.provider.name);
  for (const [slug, nom] of studios) {
    const existant = await prisma.studio.findUnique({ where: { slug } });
    const cree = existant ?? (await prisma.studio.create({ data: { slug, nom } }));
    studios.set(slug, cree.id);
  }
  console.log(`${studios.size} studios en base.`);

  let ecrits = 0;
  for (const s of lot) {
    const source = SOURCES[s.slug] ?? null;
    await prisma.jeu.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        nom: s.name,
        studioId: studios.get(s.provider.slug)!,
        rtpStudio: s.rtp == null ? null : Number(s.rtp),
        rtpSource: source,
        // Sans URL consignée, on ne peut pas prétendre au niveau « studio ».
        // Une fiche vérifiée chez BetsRank sans source devient « recoupée » ;
        // le reste reste « non vérifié » — et le dira au visiteur.
        rtpConfiance: source
          ? 'STUDIO'
          : s.confidence === 'VERIFIED' || s.confidence === 'HIGH'
            ? 'RECOUPE'
            : 'AUCUNE',
        rtpVerifieLe: source ? new Date() : null,
        volatilite: s.volatility ? (VOLATILITE[s.volatility] ?? null) : null,
        gainMaxMultiple: s.maxWinMultiplier,
        grille: s.reels,
        lignesPaiement: s.paylines,
        mecaniques: s.mechanics ?? [],
        achatBonus: s.bonusBuyAvailable,
        sortieLe: s.releaseDate ? new Date(s.releaseDate) : null,
        // La démo n'est reprise que si elle pointe vers le studio ou le jeu —
        // jamais vers un agrégateur concurrent. L'erreur a coûté 590 fiches
        // sur BetsRank, autant ne pas l'importer avec les données.
        demoUrl: s.demoUrl && !/slotcatalog|askgamblers|casino\.guru/i.test(s.demoUrl)
          ? s.demoUrl
          : null,
        visuelUrl: s.fichier ? `/images/slots/${s.fichier}` : null,
        confiance: source
          ? 'STUDIO'
          : s.confidence === 'VERIFIED' || s.confidence === 'HIGH'
            ? 'RECOUPE'
            : 'AUCUNE',
      },
    });
    ecrits++;
  }

  console.log(`${ecrits} jeux écrits.`);
  console.log('\nRelecture :');
  console.log('  studios :', await prisma.studio.count());
  console.log('  jeux    :', await prisma.jeu.count());
  console.log('  dont source studio :', await prisma.jeu.count({ where: { rtpConfiance: 'STUDIO' } }));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
