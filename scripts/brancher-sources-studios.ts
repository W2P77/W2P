/**
 * Renseigne, pour chaque studio, **où** ses chiffres se lisent.
 *
 * ── Pourquoi ce n'est pas cosmétique ──────────────────────────────────────
 *
 * `siteUrl` sert à décider si une source vaut le niveau « STUDIO ». Tant qu'il
 * est vide, aucune URL ne peut correspondre au domaine de l'éditeur, et toute
 * donnée sourcée entre au mieux en « RECOUPE » — le niveau le plus haut du
 * catalogue devient inatteignable, sans qu'aucune erreur ne le signale. C'est
 * la panne la plus coûteuse possible sur un site dont l'argument est la preuve.
 *
 * Le sens de l'erreur est heureusement conservateur : un domaine faux ne
 * correspondra jamais et rétrogradera en « RECOUPE ». Il ne peut pas accorder
 * une preuve imméritée. Les studios dont je n'ai pas le domaine officiel de
 * façon certaine restent donc à `null` plutôt que devinés.
 *
 * `ouSourcer` note la méthode, qui diffère à chaque éditeur. Elle a été payée
 * fiche par fiche : la retrouver à chaque veille, c'est refaire l'apprentissage.
 *
 * Usage : npx tsx scripts/brancher-sources-studios.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

interface Source {
  siteUrl: string | null;
  ouSourcer: string;
}

const SOURCES: Record<string, Source> = {
  'pragmatic-play': {
    siteUrl: 'https://www.pragmaticplay.com',
    ouSourcer:
      'La fiche produit ne publie pas le RTP : il est dans le communiqué de lancement. ' +
      'Trois paliers opérateur circulent, toujours PLUS BAS que le défaut studio.',
  },
  'playn-go': {
    siteUrl: 'https://www.playngo.com',
    ouSourcer:
      'Comme Pragmatic : le chiffre est dans le communiqué, pas sur la fiche de jeu. ' +
      'Paliers opérateur fréquents.',
  },
  'nolimit-city': {
    siteUrl: 'https://nolimitcity.com',
    ouSourcer:
      'Le CMS expose un bloc « math » complet (rtp, volatility, hitFrequency, maxPayout). ' +
      'Piège : rtpMainGame et rtpBonus sont des CONTRIBUTIONS au RTP total, pas des paliers — ' +
      'ne pas les additionner ni les prendre pour la valeur du jeu.',
  },
  'hacksaw-gaming': {
    siteUrl: 'https://www.hacksawgaming.com',
    ouSourcer:
      'Bloc « Game Data » sur la page produit. Le RTP d’achat de bonus y figure ' +
      'à côté de celui du jeu — les confondre gonfle la fiche de 0,2 à 0,8 point.',
  },
  'elk-studios': {
    siteUrl: 'https://www.elk-studios.com',
    ouSourcer:
      'Champ « Max Win » de la fiche — JAMAIS « Max exposure », qui est une autre grandeur.',
  },
  'red-tiger': {
    siteUrl: 'https://redtiger.com',
    ouSourcer:
      'Plusieurs paliers publiés. Les agrégateurs relèvent couramment le palier BAS configuré ' +
      'par les opérateurs : un écart d’environ un point entre deux sources en est la signature. ' +
      'Retenir la valeur de redtiger.com.',
  },
  netent: {
    siteUrl: 'https://netent.com',
    ouSourcer:
      'Fiche produit. Sur les jeux à jackpot progressif, préciser si le RTP inclut ou non ' +
      'la part de jackpot — les deux chiffres circulent.',
  },
  yggdrasil: {
    siteUrl: 'https://www.yggdrasilgaming.com',
    ouSourcer:
      'Gain maximum publié en EUROS, avec un diviseur de mise qui varie de 6 € à 125 € ' +
      'selon le jeu. Sans le diviseur, la conversion en multiple est impossible : ne pas convertir.',
  },
  evoplay: {
    siteUrl: 'https://evoplay.games',
    ouSourcer: 'Gain maximum publié en EUROS sur une mise de référence de 75 €.',
  },
  amusnet: {
    siteUrl: 'https://www.amusnet.com',
    ouSourcer:
      'Le gain maximum est exprimé « x mise PAR LIGNE », pas sur la mise totale. ' +
      'Recopier le chiffre tel quel multiplie la fiche par le nombre de lignes.',
  },
  pgsoft: {
    siteUrl: 'https://www.pgsoft.com',
    ouSourcer:
      'Le gain maximum est un plafond CONTRACTUEL, pas une mesure du jeu : ' +
      '27 titres partagent x100 000. Il décrit la limite de paiement, pas la variance.',
  },
  'relax-gaming': {
    siteUrl: 'https://www.relax-gaming.com',
    ouSourcer: 'Fiche produit. Versions « DX » = paliers opérateur, toujours sous le défaut.',
  },
  'push-gaming': {
    siteUrl: 'https://pushgaming.com',
    ouSourcer: 'Fiche produit et communiqués. Paliers opérateur configurables.',
  },
  'big-time-gaming': {
    siteUrl: 'https://www.bigtimegaming.com',
    ouSourcer: 'Fiche produit. Sur les Megaways, le nombre de façons varie — le noter en texte.',
  },
  bgaming: { siteUrl: 'https://bgaming.com', ouSourcer: 'Fiche produit, RTP et gain max publiés.' },
  playson: { siteUrl: 'https://playson.com', ouSourcer: 'Fiche produit ; le site bloque la lecture automatisée.' },
  quickspin: { siteUrl: 'https://www.quickspin.com', ouSourcer: 'Fiche produit.' },
  thunderkick: { siteUrl: 'https://www.thunderkick.com', ouSourcer: 'Fiche produit.' },
  wazdan: { siteUrl: 'https://www.wazdan.com', ouSourcer: 'RTP configurable par l’opérateur sur une large plage — le défaut studio est le seul comparable.' },
  blueprint: { siteUrl: 'https://www.blueprintgaming.com', ouSourcer: 'Fiche produit.' },
  betsoft: { siteUrl: 'https://www.betsoftgaming.com', ouSourcer: 'Fiche produit.' },
  endorphina: { siteUrl: 'https://endorphina.com', ouSourcer: 'Fiche produit.' },
  habanero: { siteUrl: 'https://www.habanerosystems.com', ouSourcer: 'Fiche produit.' },
  booming: { siteUrl: 'https://www.boominggames.com', ouSourcer: 'Fiche produit.' },
  evolution: {
    siteUrl: 'https://www.evolution.com',
    ouSourcer:
      'Les jeux LIVE sont hors sujet pour le gain maximum : leurs cotes portent sur une case ' +
      'de mise, pas sur la mise totale. Ne pas remplir gainMaxMultiple.',
  },
  spribe: { siteUrl: 'https://spribe.co', ouSourcer: 'Jeux de crash : le RTP est publié, le gain maximum est une cote, pas un multiple de mise.' },
  // Domaine officiel non établi avec certitude : laissé vide plutôt que deviné.
  // Conséquence assumée : ses sources plafonneront à « RECOUPE » jusqu'à vérification.
  'inout-games': { siteUrl: null, ouSourcer: 'Domaine officiel à vérifier avant de pouvoir accorder le niveau STUDIO.' },
};

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const studios = await prisma.studio.findMany({ select: { slug: true, nom: true } });
  const connus = studios.filter((s) => SOURCES[s.slug]);
  const orphelins = studios.filter((s) => !SOURCES[s.slug]);
  const inutilises = Object.keys(SOURCES).filter((k) => !studios.some((s) => s.slug === k));

  console.log(`${studios.length} studios en base, ${connus.length} couverts.`);
  if (orphelins.length) console.log(`Sans méthode de sourçage : ${orphelins.map((s) => s.slug).join(', ')}`);
  if (inutilises.length) console.log(`Entrées sans studio correspondant : ${inutilises.join(', ')}`);

  if (!appliquer) {
    for (const s of connus) {
      console.log(`  ${s.slug.padEnd(18)} ${SOURCES[s.slug].siteUrl ?? '— (à vérifier)'}`);
    }
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  for (let i = 0; i < connus.length; i += 25) {
    await Promise.all(
      connus.slice(i, i + 25).map((s) =>
        prisma.studio.update({ where: { slug: s.slug }, data: SOURCES[s.slug] }),
      ),
    );
  }

  const relu = await prisma.studio.count({ where: { siteUrl: { not: null } } });
  console.log(`\n${connus.length} studios mis à jour. Relecture : ${relu} portent un siteUrl.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
