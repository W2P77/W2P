/**
 * Retire les jaquettes portant le filigrane d'un concurrent.
 *
 * ── Ce qui a été trouvé ───────────────────────────────────────────────────
 *
 * Les visuels repris de BetsRank viennent de deux sources. Celles servies en
 * ~330 px de large sont propres ; celles en 400 px et plus portent, en haut à
 * gauche, un filigrane **SlotCatalog.com** — vérifié à l'œil sur Buffalo
 * Hunter et Hall of Gods, tandis que Big Bass Amazon Xtreme et Wisdom of
 * Athena, plus petites, en sont exemptes.
 *
 * Where2play vise précisément ce concurrent. Afficher son filigrane sur notre
 * page d'accueil reviendrait à lui faire de la publicité chez nous, avec sa
 * marque sur notre produit.
 *
 * ── Pourquoi supprimer plutôt que masquer ─────────────────────────────────
 *
 * Recadrer pour couper le coin marcherait un temps, puis quelqu'un
 * réutiliserait le fichier ailleurs — vignette, partage social, flux. Un
 * fichier absent ne se réintroduit pas par distraction.
 *
 * Le seuil de largeur est une **heuristique**, pas une preuve : elle sépare
 * proprement les deux familles observées, mais toute nouvelle image doit être
 * regardée avant d'être publiée.
 */
import { config as loadEnv } from 'dotenv';
import { readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const LARGEUR_SUSPECTE = 400;

function largeurWebp(chemin: string): number {
  const d = readFileSync(chemin).subarray(0, 40);
  if (d.subarray(0, 4).toString() !== 'RIFF') return 0;
  const type = d.subarray(12, 16).toString();
  if (type === 'VP8X') return 1 + d.readUIntLE(24, 3);
  if (type === 'VP8 ') return d.readUInt16LE(26) & 0x3fff;
  if (type === 'VP8L') return (d.readUInt32LE(21) & 0x3fff) + 1;
  return 0;
}

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const dossier = 'public/images/slots';
  const suspects = readdirSync(dossier).filter(
    (f) => largeurWebp(join(dossier, f)) >= LARGEUR_SUSPECTE,
  );

  console.log(`${suspects.length} visuels suspects (≥ ${LARGEUR_SUSPECTE} px de large) :`);
  suspects.forEach((f) => console.log(`  ${f}`));

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été supprimé. Ajouter --appliquer.');
    return;
  }

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  for (const f of suspects) {
    const slug = f.replace(/\.[a-z]+$/, '');
    await prisma.jeu.updateMany({ where: { slug }, data: { visuelUrl: null } });
    unlinkSync(join(dossier, f));
  }

  const restants = await prisma.jeu.count({ where: { visuelUrl: { not: null } } });
  console.log(`\n${suspects.length} fichiers supprimés. ${restants} jeux gardent un visuel propre.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
