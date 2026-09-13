/**
 * Ce que donnerait la nouvelle légende, sur une fiche, dans les trois langues.
 *
 * ── Pourquoi un prototype avant tout le reste ─────────────────────────────
 *
 * La nouvelle légende restitue ce que la page de règles explique, à partir du
 * texte lu par OCR. On ne branche pas ça sur 10 384 captures avant de l'avoir
 * lu sur une fiche : une formulation mal reconnue produirait une phrase fausse
 * sur des milliers de pages, en trois langues, sous la signature du site.
 *
 * Le script ne fait que lire et afficher. Aucune écriture, aucun `--appliquer`.
 *
 *   npx tsx --env-file=.env.local scripts/prototyper-legendes-lues.ts bell-wizard
 */
import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

import { legendesDeCaptures, lirePageDeRegles } from '../src/lib/legendes';
import { RACINE_CAPTURES } from '../src/lib/site';

const LANGUES = ['fr', 'en', 'de'] as const;
/*
 * Les captures relues sont gardées sur le disque : une passe d'OCR coûte une
 * dizaine de secondes par image, et on relance ce script à chaque formulation
 * ajoutée. Sans le cache, mettre au point un énoncé prend une demi-heure.
 */
const CACHE = process.env.CACHE_CAPTURES ?? '/tmp/legendes-prototype';

async function main() {
  const slug = process.argv[2] ?? 'bell-wizard';
  mkdirSync(CACHE, { recursive: true });

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const jeu = await prisma.jeu.findUnique({
    where: { slug },
    select: { slug: true, nom: true, rtpStudio: true, gainMaxMultiple: true, volatilite: true, captures: true },
  });
  if (!jeu) throw new Error(`Aucune fiche « ${slug} ».`);

  const captures = (Array.isArray(jeu.captures) ? jeu.captures : []) as Array<{
    fichier: string;
    titre: string;
    legende?: string;
  }>;
  const faits = {
    slug: jeu.slug,
    nom: jeu.nom,
    rtp: jeu.rtpStudio == null ? null : Number(jeu.rtpStudio),
    gainMax: jeu.gainMaxMultiple == null ? null : Number(jeu.gainMaxMultiple),
    volatilite: jeu.volatilite ?? null,
  };

  const lues: Array<{ fichier: string; titre: string; legende?: string; texte: string }> = [];
  const ouvrier = await createWorker('eng');
  try {
    for (const c of captures) {
      const cache = join(CACHE, `${c.fichier}.txt`);
      let texte = existsSync(cache) ? readFileSync(cache, 'utf8') : '';
      // La capture de base montre les rouleaux, pas le panneau : rien à y lire.
      if (!texte && /regles|achat/.test(c.fichier)) {
        const r = await fetch(`${RACINE_CAPTURES}/${c.fichier}`, { signal: AbortSignal.timeout(30000) });
        if (r.ok) {
          const png = await sharp(Buffer.from(await r.arrayBuffer()))
            .grayscale()
            .normalise()
            .resize({ width: 2560 })
            .png()
            .toBuffer();
          texte = (await ouvrier.recognize(png)).data.text;
          writeFileSync(cache, texte);
        }
      }

      lues.push({ ...c, texte });
    }
    const parLangue = Object.fromEntries(
      LANGUES.map((langue) => [langue, legendesDeCaptures(lues, faits, langue)]),
    ) as Record<(typeof LANGUES)[number], string[]>;

    lues.forEach((c, i) => {
      const lecture = lirePageDeRegles(c.texte);
      console.log(`\n━━ ${c.titre}  (${c.fichier})`);
      console.log(
        `   sujet : ${lecture ? `${lecture.sujet} [${lecture.enonces.join(', ')}] poids ${lecture.poids}` : '— non identifié, repli générique'}`,
      );
      for (const langue of LANGUES) console.log(`   ${langue} : ${parLangue[langue][i]}`);
    });
  } finally {
    await ouvrier.terminate();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
