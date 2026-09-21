/**
 * Sonde Yggdrasil : UNE ouverture, et on regarde ce que le moteur expose.
 *
 * L'adaptateur prend en charge deux enveloppes sur la trentaine que
 * Yggdrasil distribue — celles dont le reglement est du HTML lisible dans le
 * DOM, donc dont le RTP se lit au chiffre pres sans OCR. Les deux familles
 * suivantes par le volume sont Bulletproof (33 + ~22 variantes) et F40 (20).
 * Avant d'ecrire une prise en charge, il faut savoir si leur reglement est du
 * HTML ou du canvas : c'est ce que cette sonde repond, et c'est une
 * observation, pas une deduction.
 *
 * Rien n'est ecrit en base. Un seul chargement par execution : le serveur de
 * jeu compte, trois chargements en 65 s ont deja valu une heure de ban.
 *
 *   npx tsx --env-file=.env.local scripts/_tmp-yggdrasil-sonde.ts <slug>
 */
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const SORTIE = '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/ygg';
const slug = process.argv[2];
if (!slug) throw new Error('usage : _tmp-yggdrasil-sonde.ts <slug>');

/*
 * Le corps part en CHAINE, pas en fonction.
 *
 * `tsx` compile avec esbuild, qui nomme les fonctions flechees en leur
 * ajoutant un appel a son helper `__name`. Ce helper n'existe pas dans la
 * page : `page.evaluate(() => …)` meurt sur « __name is not defined » — c'est
 * ce qui a tue la premiere execution de cette sonde. Une chaine n'est pas
 * transformee.
 */
const SONDE = `(function () {
  function lisible(e) {
    var r = e.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), vu: getComputedStyle(e).display !== 'none' && r.width > 0 };
  }
  function decrire(e) {
    var cls = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
    return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + cls + ' ' + JSON.stringify(lisible(e));
  }

  var MOTS = /rule|help|info|paytable|paytbl|menu|settings|reglement/i;
  var candidats = [];
  var tous = document.querySelectorAll('*');
  for (var i = 0; i < tous.length && candidats.length < 40; i++) {
    var e = tous[i];
    var cls = typeof e.className === 'string' ? e.className : '';
    if (MOTS.test(e.id || '') || MOTS.test(cls)) candidats.push(decrire(e));
  }

  var canvas = [].slice.call(document.querySelectorAll('canvas')).map(decrire);

  var globales = Object.keys(window).filter(function (k) {
    return /game|rule|lgp|gati|f40|bp|engine|pixi|menu|isense|boost/i.test(k);
  }).slice(0, 30);

  var texte = document.body ? document.body.innerText || '' : '';
  var pourcents = (texte.match(/\\d{2}[.,]\\d{1,2}\\s*%/g) || []).slice(0, 10);

  var cadres = [].slice.call(document.querySelectorAll('iframe')).map(function (f) { return (f.src || '').slice(0, 110); });
  var scripts = [].slice.call(document.querySelectorAll('script[src]')).map(function (x) { return (x.getAttribute('src') || '').slice(0, 70); }).slice(0, 12);

  return {
    titre: document.title,
    cadres: cadres,
    candidats: candidats,
    canvas: canvas,
    globales: globales,
    pourcents: pourcents,
    longueurTexte: texte.length,
    scripts: scripts
  };
})()`;

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const jeu = await prisma.jeu.findUniqueOrThrow({
    where: { slug },
    select: { slug: true, nom: true, demoUrl: true, rtpStudio: true },
  });
  await prisma.$disconnect();
  console.log(`${jeu.nom}\n  ${jeu.demoUrl}\n  RTP en base : ${jeu.rtpStudio ?? '(vide)'}\n`);

  const dossier = join(SORTIE, slug);
  mkdirSync(dossier, { recursive: true });

  const nav = await chromium.launch({
    executablePath: process.env.CHROME_BIN || undefined,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await nav.newPage({ viewport: { width: 1280, height: 800 } });
  const t0 = Date.now();
  const s = () => ((Date.now() - t0) / 1000).toFixed(1);

  page.on('framenavigated', (f) => console.log(`  [${s()}s] cadre → ${f.url().slice(0, 120)}`));

  await page.goto(jeu.demoUrl!, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  console.log(`  [${s()}s] page chargee`);

  /* Le moteur pose ses elements apres avoir recu sa configuration. On laisse
   * trente secondes, et on photographie a intervalles pour voir la bascule. */
  for (const attente of [8_000, 12_000, 10_000]) {
    await page.waitForTimeout(attente);
    await page.screenshot({ path: join(dossier, `t${s()}.png`) });
    console.log(`  [${s()}s] cliche`);
  }

  /* Le jeu vit souvent dans un cadre : on sonde la page ET chacun d'eux. */
  const rapports: Record<string, unknown> = {};
  rapports.page = await page.evaluate(SONDE);
  for (const cadre of page.frames()) {
    if (cadre === page.mainFrame()) continue;
    try {
      rapports[cadre.url().slice(0, 80)] = await cadre.evaluate(SONDE);
    } catch (e) {
      rapports[cadre.url().slice(0, 80)] = `illisible : ${String(e).slice(0, 80)}`;
    }
  }

  writeFileSync(join(dossier, 'rapport.json'), JSON.stringify(rapports, null, 2));
  console.log('\n' + JSON.stringify(rapports, null, 2).slice(0, 4500));
  console.log(`\nclichés et rapport : ${dossier}`);
  await nav.close();
}

main().catch((e) => {
  console.error(String(e).slice(0, 300));
  process.exit(1);
});
