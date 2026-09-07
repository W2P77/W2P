/**
 * Passe les offres de bienvenue en anglais.
 *
 * ── Pourquoi c'était un défaut, et pas un détail ──────────────────────────
 *
 * Les accords viennent de BetsRank, et les textes avec — en français. Sur des
 * fiches entièrement rédigées en anglais, chaque bloc « où jouer » affichait
 * « Pack 4 dépôts jusqu'à 4 BTC ». C'est le dernier élément lu avant le clic
 * qui rapporte, et c'était le seul en langue étrangère.
 *
 * ── Le seul risque réel de cette opération ────────────────────────────────
 *
 * Qu'un chiffre bouge. Une offre annoncée à 15 000 € au lieu de 1 500 € est
 * une promesse fausse faite au nom d'un partenaire — la faute la plus chère
 * possible ici. La traduction est donc **vérifiée mécaniquement** : tous les
 * nombres de la version française doivent se retrouver dans l'anglaise, et le
 * script refuse d'écrire au premier écart. Le séparateur de milliers change
 * de forme (« 1 000 € » devient « €1,000 »), la comparaison porte donc sur
 * les chiffres seuls, pas sur la chaîne.
 *
 * Usage : npx tsx scripts/traduire-bonus-casinos.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const EN: Record<string, string> = {
  alawin: '150% up to €750 on your 1st deposit (package across 3 deposits)',
  allspins: '100% up to €1,000 + 75 FS',
  atlantisslots: '100% up to €1,000 + 100 FS',
  beonbet: '400% up to €2,150 + 300 FS across your first 5 deposits',
  betmac: '100% up to €525 + 100 FS (50/day × 2)',
  betriviera: '€15,000 + 350 FS package across 4 deposits',
  betti: '150% up to €750 + 150 FS on Big Bass',
  bonrush: '400% up to €2,000 + 100 FS',
  cosmobet: '200% crypto bonus up to €1,000 + 10% monthly cashback',
  crownplay: '250% up to €3,000 + 350 FS across your first 4 deposits',
  europe777: '300% across your first 3 deposits',
  flappycasino: '100% up to €500 + 300 FS',
  greatslots: '100% up to €2,500 across your first 3 deposits',
  gxbet: '€4,000 + 400 FS package across 4 deposits',
  hermes: '300% up to €2,000 across your first 3 deposits (slots only)',
  hollywin: '350% up to €15,000 + 350 FS across your first 4 deposits',
  instasino: '€4,000 + 400 FS package across 4 deposits',
  jet4bet: '300% up to €15,000 across your first 4 deposits',
  kazeeno: '100% up to €1,000 + 300 FS',
  kingschance: '150% up to €500 + 40 FS',
  letsjackpot: '250% up to €1,000 across your first 3 deposits',
  luckytreasure: '200% up to €500 + 100 FS',
  lussurio: '200% up to €850 + 100 FS',
  megafishwins: '125% up to €1,250 + 300 FS',
  millioner: '250% up to €2,000 across your first 3 deposits',
  ninlay: '100% up to €1,000 + 100 FS on your 1st deposit',
  retrobet: '100% up to €1,000 + 100 FS (package up to €15,000 + 500 FS across 4 deposits)',
  rxcasino: '€17,500 package across 3 deposits',
  slotlair: '€3,000 + 450 FS + Lucky Box package across 3 deposits',
  slotlounge: '350% up to €15,000 + 350 FS across your first 4 deposits',
  slotrush: '350% up to €4,000 + 200 FS across your first 3 deposits',
  slotsgem: '120% up to €600 + 125 FS',
  slotsmafia: '350% up to €15,000 + 350 FS across your first 4 deposits',
  slott: '200% up to €20,000 + 75 FS',
  spinaura: '€15,000 + 350 FS package across 4 deposits',
  spindynasty: '200% up to €500 + 50 FS',
  spinimax: '150% up to €750 + 150 free spins',
  spinlynx: '€5,000 + 500 FS package across 4 deposits',
  staxino: '2-deposit package up to €600 + 300 FS',
  uspin: '450% up to €5,000 + 350 FS across your first 6 deposits',
  vave: '4-deposit package up to 4 BTC + 100 FS',
  vegashero: '100% up to €500 + 200 free spins',
  vipsta: '100% up to €500 + 200 free spins',
  winkingdom: '4-deposit package up to €15,000 + 450 free spins',
};

/**
 * Les nombres d'un texte, séparateurs de milliers retirés.
 *
 * « 1 000 € » et « €1,000 » doivent donner le même 1000, sans quoi la
 * vérification signalerait un écart à chaque montant et deviendrait du bruit
 * qu'on finirait par ignorer — c'est-à-dire une vérification morte.
 */
function nombres(texte: string): number[] {
  return (texte.replace(/[\s ,](?=\d{3}\b)/g, '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number).sort((a, b) => a - b);
}

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const casinos = await prisma.casino.findMany({
    select: { slug: true, bonusTexte: true },
    orderBy: { slug: 'asc' },
  });

  const aEcrire: Array<{ slug: string; texte: string }> = [];
  const ecarts: string[] = [];
  const sansTraduction: string[] = [];

  for (const c of casinos) {
    const fr = c.bonusTexte;
    const en = EN[c.slug];
    if (!fr) continue;
    if (!en) {
      sansTraduction.push(`${c.slug} — « ${fr} »`);
      continue;
    }
    const a = nombres(fr);
    const b = nombres(en);
    if (a.join('|') !== b.join('|')) {
      ecarts.push(`${c.slug}\n      FR ${fr}\n      EN ${en}\n      chiffres ${a.join(',')} contre ${b.join(',')}`);
      continue;
    }
    aEcrire.push({ slug: c.slug, texte: en });
  }

  console.log(`${casinos.length} casinos.`);
  console.log(`  traductions vérifiées : ${aEcrire.length}`);
  console.log(`  sans traduction       : ${sansTraduction.length}`);
  console.log(`  écarts de chiffres    : ${ecarts.length}`);
  for (const s of sansTraduction) console.log(`    ? ${s}`);
  for (const e of ecarts) console.log(`    ! ${e}`);

  if (ecarts.length > 0) {
    console.error('\nRefus d’écrire : un montant diffère entre les deux versions.');
    await prisma.$disconnect();
    process.exit(1);
  }

  if (!appliquer) {
    for (const { slug, texte } of aEcrire) console.log(`  ${slug.padEnd(16)} ${texte}`);
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  for (let i = 0; i < aEcrire.length; i += 25) {
    await Promise.all(
      aEcrire.slice(i, i + 25).map(({ slug, texte }) =>
        prisma.casino.update({ where: { slug }, data: { bonusTexte: texte } }),
      ),
    );
  }

  const restants = await prisma.casino.count({
    where: { bonusTexte: { contains: "jusqu'à" } },
  });
  console.log(`\n${aEcrire.length} offres traduites. Relecture : ${restants} contiennent encore « jusqu'à ».`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
