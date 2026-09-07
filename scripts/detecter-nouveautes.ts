/**
 * Détecte les sorties qu'on n'a pas encore.
 *
 * ── Pourquoi c'est le chantier le plus rentable ───────────────────────────
 *
 * Un domaine neuf ne peut pas gagner sur « RTP de Sweet Bonanza » : les pages
 * en place ont des années d'ancienneté et des milliers de liens. Mais un jeu
 * sorti ce matin n'a **aucune page concurrente**. C'est la seule fenêtre où
 * l'antériorité ne joue pas contre nous — et la fiche publiée le jour J garde
 * sa position quand le titre décolle.
 *
 * Mesuré le 07/09/2026 : le catalogue avait déjà cinq semaines de retard, le
 * jeu le plus récent datant du 1ᵉʳ août. Rien ne l'alimentait.
 *
 * ── Ce que ce script fait, et ne fait pas ─────────────────────────────────
 *
 * Il **signale**, il n'écrit pas. Une fiche créée automatiquement depuis une
 * page de studio hériterait de données non vérifiées, et le site entier repose
 * sur l'idée inverse. La décision d'ajouter un jeu reste humaine ; ce script
 * fait le travail de veille, qui lui est mécanique.
 *
 * Usage :
 *   npx tsx scripts/detecter-nouveautes.ts
 *
 * Il affiche, par studio, la page à consulter et les jeux les plus récents
 * qu'on possède déjà — pour savoir où s'arrête notre couverture.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

/**
 * Où chaque studio annonce ses sorties.
 *
 * La méthode diffère d'un éditeur à l'autre — page produit, salle de presse,
 * ou rien de public. Le noter évite de le rechercher à chaque veille.
 */
const SOURCES: Record<string, string> = {
  'pragmatic-play': 'https://www.pragmaticplay.com/en/games/',
  'nolimit-city': 'https://nolimitcity.com/games',
  'hacksaw-gaming': 'https://www.hacksawgaming.com/games',
  'push-gaming': 'https://pushgaming.com/games',
  'relax-gaming': 'https://www.relax-gaming.com/products/casino',
  'playn-go': 'https://www.playngo.com/games',
  bgaming: 'https://bgaming.com/games',
  'big-time-gaming': 'https://www.bigtimegaming.com/games',
  'elk-studios': 'https://www.elk-studios.com/games/',
  playson: 'https://playson.com/games',
  'red-tiger': 'https://redtiger.com/games',
  netent: 'https://netent.com/games',
  pgsoft: 'https://www.pgsoft.com/en/games/',
};

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const studios = await prisma.studio.findMany({
    select: { slug: true, nom: true, _count: { select: { jeux: true } } },
    orderBy: { nom: 'asc' },
  });

  console.log('Veille des sorties — où en est notre couverture, studio par studio.\n');

  let enRetard = 0;
  for (const s of studios) {
    const dernier = await prisma.jeu.findFirst({
      where: { studioId: undefined, studio: { slug: s.slug }, sortieLe: { not: null } },
      orderBy: { sortieLe: 'desc' },
      select: { nom: true, sortieLe: true },
    });

    const jours = dernier?.sortieLe
      ? Math.floor((Date.now() - new Date(dernier.sortieLe).getTime()) / 86400000)
      : null;

    // Au-delà de deux mois sans sortie connue chez un studio actif, c'est
    // presque toujours notre veille qui a décroché, pas le studio qui s'est
    // arrêté.
    const alerte = jours == null || jours > 60;
    if (alerte) enRetard++;

    console.log(
      `${alerte ? '⚠️ ' : '   '}${s.nom.padEnd(18)}${String(s._count.jeux).padStart(4)} jeux · ` +
        (dernier?.sortieLe
          ? `dernière sortie connue ${new Date(dernier.sortieLe).toISOString().slice(0, 10)} (${jours} j)`
          : 'aucune date connue'),
    );
    if (alerte && SOURCES[s.slug]) console.log(`      → ${SOURCES[s.slug]}`);
  }

  console.log(
    `\n${enRetard} studio(s) sans sortie connue depuis plus de deux mois.\n` +
      'Ouvrir les pages signalées, relever les titres absents du catalogue, ' +
      'et les ajouter avec leur niveau de preuve réel — `AUCUNE` tant que le ' +
      'studio ne publie pas son RTP.',
  );

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
