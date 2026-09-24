/**
 * Aligne le catalogue casino de where2spin sur celui de BetsRank.
 *
 * Les deux sites partagent les **mêmes identifiants numériques** : un casino
 * ajouté d'un côté garde son id de l'autre. C'est ce qui permet de rapprocher
 * les deux catalogues sans table de correspondance.
 *
 * Au 24/09/2026, W2S avait pris du retard sur deux points :
 *
 *  · **Trois marques masquées sur BetsRank y étaient encore actives** —
 *    Pandibet, GxBet et Instasino. Une marque masquée d'un côté et vivante de
 *    l'autre envoie du trafic vers un deal arrêté.
 *  · **Les cinq marques ajoutées les 23 et 24/09 y étaient absentes** :
 *    VegasNova, BoomsBet, CrownSlots, Evospin, WinHero.
 *
 * Les `bonusTexte` sont en anglais, comme les fiches existantes — c'est la
 * convention du champ côté W2S, pas un oubli de traduction.
 *
 * Les clés de studio sont **intersectées** avec celles que W2S connaît : une
 * clé inconnue ne casserait rien mais ne servirait à rien, et la garder
 * laisserait croire à une couverture qui n'existe pas.
 *
 *   npx tsx --env-file=.env.local scripts/_tmp-sync-casinos-betsrank.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const APPLIQUER = process.argv.includes('--appliquer');

/**
 * Les deux sites ne nomment pas les studios pareil.
 *
 * BetsRank colle les mots (`playngo`, `pragmatic`, `nolimit`), W2S met des
 * traits d'union (`playn-go`, `pragmatic-play`, `nolimit-city`). Sans cette
 * table, l'intersection écartait Play'n GO, Pragmatic et Nolimit City — les
 * studios les plus présents du catalogue — et les casinos ne seraient sortis
 * que sur une fraction des fiches de jeu. Un manque à gagner invisible :
 * aucune erreur, juste des recommandations qui ne s'affichent pas.
 */
const ALIAS: Record<string, string> = {
  playngo: 'playn-go',
  pragmatic: 'pragmatic-play',
  nolimit: 'nolimit-city',
  btg: 'big-time-gaming',
  bigtimegaming: 'big-time-gaming',
  redtiger: 'red-tiger',
  pushgaming: 'push-gaming',
  inout: 'inout-games',
  inoutgames: 'inout-games',
  tadagaming: 'tada',
  platipuslive: 'platipus',
};

/** Masquées sur BetsRank le 23 et le 24/09/2026. */
const A_DESACTIVER = ['pandibet', 'gxbet', 'instasino'];

type Nouveau = {
  id: number;
  slug: string;
  nom: string;
  playUrl: string;
  note: number;
  bonusTexte: string;
  providers: string[];
};

const NOUVEAUX: Nouveau[] = [
  {
    id: 152,
    slug: 'vegasnova',
    nom: 'VegasNova',
    playUrl: 'https://paykassmapartners.scaletrk.com/click?o=2283&a=9287',
    note: 9.3,
    bonusTexte: '100% up to €2,000 + 100 free spins (1st deposit)',
    providers: ['1spin4win', 'amatic', 'amusnet', 'avatarux', 'aviatrix', 'belatra', 'betsoft', 'betsolutions', 'btg', 'bigtimegaming', 'booming', 'booongo', 'caleta', 'ctinteractive', 'evolution', 'formulaspin', 'fugaso', 'iconic21', 'inout', 'inoutgames', 'kalamba', 'mascot', 'microgaming', 'mrslotty', 'netent', 'nolimit', 'nucleus', 'onetouch', 'orbitalgaming', 'pgsoft', 'platipus', 'platipuslive', 'playngo', 'playson', 'pushgaming', 'redtiger', 'spribe', 'tadagaming', 'tpg', 'wazdan', 'yggdrasil'],
  },
  {
    id: 153,
    slug: 'boomsbet',
    nom: 'BoomsBet',
    playUrl: 'https://a.univerns.com/click?pid=174401&offer_id=18971&l=1790234620',
    note: 8.8,
    bonusTexte: '100% up to €500 (1st deposit)',
    providers: ['playngo', 'playson', 'bgaming', '3oaks'],
  },
  {
    id: 154,
    slug: 'crownslots',
    nom: 'CrownSlots',
    playUrl: 'https://a.univerns.com/click?pid=174401&offer_id=17355&l=1790160732',
    note: 8.9,
    bonusTexte: '125% up to €1,000 + 100 free spins (1st deposit)',
    providers: ['100hp', '7rings', 'betora', 'bgaming', 'formulaspin', 'gamebeat', 'gamzix', 'inout', 'livevegas', 'netgame', 'neverending', 'pragmatic', 'truelab', 'winfinity'],
  },
  {
    id: 155,
    slug: 'evospin',
    nom: 'Evospin',
    playUrl: 'https://a.univerns.com/click?pid=174401&offer_id=18913&l=1790161595',
    note: 8.7,
    bonusTexte: '125% up to €2,500 + 125 free spins (1st deposit)',
    providers: ['100hp', 'betora', 'bgaming', 'gamebeat', 'gamzix', 'inout', 'livevegas', 'truelab', 'winfinity'],
  },
  {
    id: 156,
    slug: 'winhero',
    nom: 'WinHero',
    playUrl: 'https://a.univerns.com/click?pid=174401&offer_id=18927&l=1790243485',
    note: 8.6,
    bonusTexte: '150% up to €2,000 + 100 free spins (1st deposit)',
    providers: ['playngo', 'pgsoft', 'playson', 'novomatic'],
  },
];

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  const connus = new Set((await prisma.studio.findMany({ select: { slug: true } })).map((s) => s.slug));

  console.log('— désactivations —');
  for (const slug of A_DESACTIVER) {
    const c = await prisma.casino.findUnique({ where: { slug }, select: { id: true, actif: true } });
    if (!c) { console.log(`  ${slug} : absent de W2S`); continue; }
    if (!c.actif) { console.log(`  ${slug} : déjà inactif`); continue; }
    console.log(`  ${slug} : actif → inactif`);
    if (APPLIQUER) await prisma.casino.update({ where: { slug }, data: { actif: false } });
  }

  console.log('\n— ajouts —');
  for (const n of NOUVEAUX) {
    const traduits = [...new Set(n.providers.map((p) => ALIAS[p] ?? p))];
    const retenus = traduits.filter((p) => connus.has(p));
    const ecartes = traduits.filter((p) => !connus.has(p));
    const existe = await prisma.casino.findUnique({ where: { id: n.id }, select: { slug: true } });
    console.log(
      `  ${String(n.id).padStart(4)}  ${n.slug.padEnd(12)} ${existe ? 'DÉJÀ PRÉSENT' : 'à créer'}` +
        `  ${retenus.length}/${n.providers.length} studios retenus` +
        (ecartes.length ? `  (écartés : ${ecartes.join(', ')})` : ''),
    );
    if (!APPLIQUER || existe) continue;
    await prisma.casino.create({
      data: {
        id: n.id,
        slug: n.slug,
        nom: n.nom,
        logo: `/images/${n.slug}.webp`,
        providers: retenus,
        playUrl: n.playUrl,
        pays: ['FR'],
        note: n.note,
        bonusTexte: n.bonusTexte,
        actif: true,
      },
    });
  }

  const apres = await prisma.casino.count({ where: { actif: true } });
  console.log(`\n${APPLIQUER ? 'APPLIQUÉ' : 'SIMULATION'} — ${apres} casinos actifs`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
