/**
 * Que contiennent les globales du GATI recent ?
 *
 * La sonde precedente a montre que Bulletproof / GATI recent est du canvas
 * pur : `longueurTexte: 0`, aucun texte dans le DOM. Le reglement ne sera
 * donc pas lisible en HTML. Mais la page expose `gameData`, `GatiServerGame`
 * et `gameRulesButton` — et si le RTP figure dans la configuration recue du
 * serveur, on le lit au chiffre pres SANS OCR, ce qui vaut mieux qu'un
 * panneau peint.
 *
 * On ne devine pas la forme de ces objets : on l'imprime.
 *
 *   npx tsx --env-file=.env.local scripts/_tmp-ygg-globales.ts <slug>
 */
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const SORTIE = '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/ygg';
const slug = process.argv[2];
if (!slug) throw new Error('usage : _tmp-ygg-globales.ts <slug>');

/* En chaine : esbuild ajoute `__name` aux fonctions flechees, absent de la page. */
const SONDE = `(function () {
  function forme(v, prof) {
    if (prof > 3) return '…';
    if (v === null || v === undefined) return String(v);
    var t = typeof v;
    if (t === 'number' || t === 'boolean') return v;
    if (t === 'string') return v.length > 90 ? v.slice(0, 90) + '…' : v;
    if (t === 'function') return 'fn()';
    if (Array.isArray(v)) return v.length > 6 ? ['[' + v.length + ']', forme(v[0], prof + 1)] : v.map(function (x) { return forme(x, prof + 1); });
    var o = {};
    var cles = Object.keys(v).slice(0, 40);
    for (var i = 0; i < cles.length; i++) {
      try { o[cles[i]] = forme(v[cles[i]], prof + 1); } catch (e) { o[cles[i]] = '(illisible)'; }
    }
    return o;
  }

  /* Toute cle qui ressemble a un taux de retour, ou tout nombre entre 80 et
   * 100 avec deux decimales : c'est la signature d'un RTP. */
  var pistes = [];
  function fouiller(v, chemin, prof) {
    if (prof > 5 || v === null || typeof v !== 'object') return;
    var cles = Object.keys(v).slice(0, 60);
    for (var i = 0; i < cles.length; i++) {
      var k = cles[i];
      var w;
      try { w = v[k]; } catch (e) { continue; }
      var ch = chemin + '.' + k;
      if (/rtp|payout|return|percent/i.test(k)) pistes.push(ch + ' = ' + JSON.stringify(forme(w, 2)).slice(0, 160));
      else if (typeof w === 'number' && w > 80 && w < 100 && String(w).indexOf('.') > 0) pistes.push(ch + ' = ' + w);
      else if (typeof w === 'string' && /^9[0-9][.,][0-9]{1,2}$/.test(w)) pistes.push(ch + ' = "' + w + '"');
      if (typeof w === 'object' && prof < 5) fouiller(w, ch, prof + 1);
    }
  }

  var sortie = { globales: {}, pistes: [] };
  var NOMS = ['gameData', 'game', 'gameController', 'GatiServer', 'GatiServerGame', 'SlotsEngine', 'BPLibs', 'gameRulesButton', 'settingsMenu', 'sideMenuHelpButton', 'BoostUI'];
  for (var i = 0; i < NOMS.length; i++) {
    var n = NOMS[i];
    try {
      var v = window[n];
      sortie.globales[n] = v === undefined ? '(absent)' : forme(v, 0);
      if (v && typeof v === 'object') fouiller(v, n, 0);
    } catch (e) { sortie.globales[n] = '(erreur)'; }
  }
  sortie.pistes = pistes.slice(0, 40);
  return sortie;
})()`;

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const jeu = await prisma.jeu.findUniqueOrThrow({ where: { slug }, select: { nom: true, demoUrl: true, rtpStudio: true } });
  await prisma.$disconnect();
  console.log(`${jeu.nom} — RTP en base : ${jeu.rtpStudio ?? '(vide)'}\n`);

  const dossier = join(SORTIE, slug);
  mkdirSync(dossier, { recursive: true });
  const nav = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await nav.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(jeu.demoUrl!, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(25_000);

  const avant = await page.evaluate(SONDE);
  console.log('=== avant le clic ===');
  console.log(JSON.stringify(avant, null, 1).slice(0, 2500));

  /* Le voile « PRESS ANYWHERE TO START » se ferme d'un clic au centre. La
   * configuration complete n'arrive parfois qu'ensuite. */
  await page.mouse.click(640, 400);
  await page.waitForTimeout(10_000);
  await page.screenshot({ path: join(dossier, 'apres-clic.png') });

  const apres = await page.evaluate(SONDE);
  writeFileSync(join(dossier, 'globales.json'), JSON.stringify({ avant, apres }, null, 2));
  console.log('\n=== apres le clic : pistes de RTP ===');
  console.log(JSON.stringify((apres as { pistes: string[] }).pistes, null, 1).slice(0, 2500));
  console.log(`\nrapport : ${join(dossier, 'globales.json')}`);
  await nav.close();
}

main().catch((e) => {
  console.error(String(e).slice(0, 300));
  process.exit(1);
});
