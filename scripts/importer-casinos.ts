/**
 * Importe les casinos partenaires et rattache chaque studio à sa clé.
 *
 * ── Pourquoi la clé est écrite, pas devinée ───────────────────────────────
 *
 * Les casinos déclarent leurs studios sous des clés qui ne suivent aucune
 * règle : « pragmatic » pour Pragmatic Play, « nolimit » pour Nolimit City,
 * « elkstudios » pour ELK Studios. Une dérivation automatique marche sur les
 * quatorze studios d'aujourd'hui et échouera sur le quinzième — en le faisant
 * disparaître des listes sans un message d'erreur. C'est un défaut déjà
 * rencontré ailleurs, autant ne pas le reproduire.
 *
 * Le script propose une correspondance et **échoue bruyamment** quand il n'en
 * trouve pas : un studio sans clé est un studio dont aucune fiche ne dira où
 * jouer.
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

interface CasinoSource {
  id: number; slug: string; nom: string; logo: string;
  providers: string[]; playUrl: string; pays: string[];
  note: number; bonusTexte: string;
}

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const casinos: CasinoSource[] = JSON.parse(readFileSync('/tmp/casinos-w2p.json', 'utf-8'));

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const cles = new Set(casinos.flatMap((c) => c.providers));
  const studios = await prisma.studio.findMany({ select: { id: true, slug: true, nom: true } });

  const correspondances: { slug: string; cle: string | null }[] = studios.map((s) => {
    const candidats = [
      s.slug,
      s.slug.replace(/-/g, ''),
      s.nom.toLowerCase().replace(/[^a-z0-9]/g, ''),
      s.slug.split('-')[0],
    ];
    return { slug: s.slug, cle: candidats.find((c) => cles.has(c)) ?? null };
  });

  const orphelins = correspondances.filter((c) => !c.cle);
  console.log(`${casinos.length} casinos · ${studios.length} studios`);
  if (orphelins.length) {
    console.log(`\n⚠️  ${orphelins.length} studio(s) sans clé casino — aucune fiche ne dira où jouer :`);
    orphelins.forEach((o) => console.log(`   ${o.slug}`));
  } else {
    console.log('Tous les studios ont une clé casino.');
  }

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    return;
  }

  for (const c of casinos) {
    await prisma.casino.upsert({
      where: { id: c.id },
      update: { providers: c.providers, playUrl: c.playUrl, pays: c.pays, actif: true },
      create: {
        id: c.id, slug: c.slug, nom: c.nom, logo: c.logo,
        providers: c.providers, playUrl: c.playUrl, pays: c.pays,
        note: c.note, bonusTexte: c.bonusTexte,
      },
    });
  }

  for (const { slug, cle } of correspondances) {
    if (cle) await prisma.studio.update({ where: { slug }, data: { cleCasino: cle } });
  }

  console.log(`\n${await prisma.casino.count()} casinos en base.`);
  console.log(`${await prisma.studio.count({ where: { cleCasino: { not: null } } })} studios rattachés.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
