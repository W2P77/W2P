/**
 * Envoie les captures locales vers Supabase Storage.
 *
 * Le dossier `public/images/captures` sert d'aire de travail : le script de
 * capture y dépose, celui-ci téléverse, et le dossier peut être vidé. Rien de
 * ce qui s'y trouve n'a vocation à être commité.
 *
 * Usage : npx tsx scripts/televerser-captures.ts [--appliquer]
 */
import { config as loadEnv } from 'dotenv';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { televerser, urlPublique } from '../src/lib/visuels/stockage';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const DOSSIER = resolve(process.cwd(), 'public/images/captures');

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.webp'));
  const poids = fichiers.reduce((s, f) => s + statSync(join(DOSSIER, f)).size, 0);
  console.log(`${fichiers.length} captures, ${Math.round(poids / 1024)} Ko.`);

  if (!appliquer) {
    for (const f of fichiers) console.log(`  ${f} → ${urlPublique(f)}`);
    console.log('\nSIMULATION — rien n’a été envoyé. Ajouter --appliquer.');
    return;
  }

  let envoyees = 0;
  for (const f of fichiers) {
    await televerser(join(DOSSIER, f), f);
    envoyees++;
  }
  console.log(`${envoyees} captures en ligne. Exemple : ${urlPublique(fichiers[0])}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
