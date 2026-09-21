/**
 * Retrouve les demos jouables de Play'n GO, en lisant leurs pages produit.
 *
 * ── Ce qu'on a trouve le 21/09/2026 ──────────────────────────────────────
 *
 * La campagne de captures Play'n GO a echoue **20 fois sur 20**. Ce n'etait
 * pas l'adaptateur : aucune des 180 `demoUrl` du studio n'est jouable.
 *
 *   150  www.playngo.com/games/<slug>/        la page PRODUIT, pas une demo
 *    30  demo.playngo.com/RGSGameLaunch/...   hote qui ne resout plus
 *
 * D'ou les deux symptomes du journal : `ERR_NAME_NOT_RESOLVED` pour les 30,
 * et « icone des regles introuvable » pour les 150 — diagnostic d'adaptateur
 * casse, alors qu'il n'y avait simplement aucun jeu dans la page.
 *
 * ── Ce que la page produit donne encore ──────────────────────────────────
 *
 * Elle expose un lanceur vivant, sur un TROISIEME hote :
 *
 *   asccw.playngonetwork.com/casino/ContainerLauncher?pid=2&gid=<gid>&…
 *
 * Et l'identifiant y est `crystalsun` la ou l'ancienne URL morte disait
 * `DawnOfEgypt` : la casse et la forme changent. On **lit** donc chaque page,
 * on ne fabrique aucune URL — c'est la regle qui a permis de retrouver 1 495
 * demos sans en inventer une seule.
 *
 * ── Pourquoi un navigateur ───────────────────────────────────────────────
 *
 * `www.playngo.com` rend **un octet** a un `curl` nu : la page est protegee et
 * construite en JavaScript. Playwright, donc — et le lanceur est relu dans le
 * DOM apres rendu, pas dans le HTML d'origine.
 *
 *   npx tsx --env-file=.env.local scripts/trouver-demos-playngo.ts --limite=3
 *   npx tsx --env-file=.env.local scripts/trouver-demos-playngo.ts --limite=200 --appliquer
 */
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const LIMITE = Number(arg('limite') ?? 3);
const PAUSE = Number(arg('pause') ?? 2_500);
const APPLIQUER = process.argv.includes('--appliquer');
const SORTIE = arg('sortie') ?? '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/playngo';

/* En chaine : esbuild ajoute `__name` aux fonctions flechees, absent de la page. */
const CHERCHER = `(function () {
  var vus = {};
  function garder(u) {
    if (!u || u.indexOf('ContainerLauncher') < 0) return;
    vus[u.split('&lang')[0] + '|' + u] = u;
  }
  /* Le lanceur peut vivre dans un href, un data-*, un iframe, ou le texte
   * d'un script inline. On regarde les quatre plutot que de parier. */
  var n = document.querySelectorAll('a[href], iframe[src], [data-src], [data-url], [data-demo], [data-game-url]');
  for (var i = 0; i < n.length; i++) {
    var e = n[i];
    garder(e.getAttribute('href'));
    garder(e.getAttribute('src'));
    garder(e.getAttribute('data-src'));
    garder(e.getAttribute('data-url'));
    garder(e.getAttribute('data-demo'));
    garder(e.getAttribute('data-game-url'));
  }
  var html = document.documentElement.outerHTML;
  var re = /https?:\\/\\/[^"'\\s\\\\<>]*ContainerLauncher[^"'\\s\\\\<>]*/g, m;
  while ((m = re.exec(html)) !== null) garder(m[0]);

  return Object.keys(vus).map(function (k) { return vus[k]; });
})()`;

type Trouvaille = { slug: string; nom: string; avant: string; page: string; trouve: string | null; note?: string };

/* On prefere le canal « desktop » : la capture se fait en 1280x800. */
function choisir(urls: string[]): string | null {
  if (!urls.length) return null;
  return urls.find((u) => /channel=desktop/i.test(u)) ?? urls[0];
}

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  /*
   * Toutes les fiches du studio, pas seulement celles qui portent deja une
   * `demoUrl` : 254 des 434 n'en ont aucune, et leur page produit se derive
   * du slug. Ce qu'on ne derive jamais, c'est l'URL du lanceur — elle se lit.
   */
  const jeux = await prisma.jeu.findMany({
    where: { studio: { is: { slug: 'playn-go' } } },
    select: { id: true, slug: true, nom: true, demoUrl: true },
    orderBy: { slug: 'asc' },
    take: LIMITE,
  });
  console.log(`${jeux.length} fiches Play'n GO\n`);

  mkdirSync(SORTIE, { recursive: true });
  const nav = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true });
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 } });

  const trouvailles: Trouvaille[] = [];
  let ecrits = 0;

  for (const [i, jeu] of jeux.entries()) {
    /* La page produit : soit la `demoUrl` actuelle l'est deja, soit on la
     * derive du slug — mais on ne derive JAMAIS l'URL du lanceur. */
    const page = jeu.demoUrl && /www\.playngo\.com\/games\//.test(jeu.demoUrl)
      ? jeu.demoUrl
      : `https://www.playngo.com/games/${jeu.slug}/`;

    const t: Trouvaille = { slug: jeu.slug, nom: jeu.nom, avant: jeu.demoUrl ?? '(aucune)', page, trouve: null };
    const p = await ctx.newPage();
    try {
      const rep = await p.goto(page, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      if (rep && rep.status() !== 200) t.note = `page produit en statut ${rep.status()}`;
      else {
        await p.waitForTimeout(3_000);
        t.trouve = choisir((await p.evaluate(CHERCHER)) as string[]);
        if (!t.trouve) t.note = 'aucun lanceur dans la page';
      }
    } catch (e) {
      t.note = String(e).slice(0, 90);
    }
    await p.close();

    console.log(t.trouve ? `  ✓ ${jeu.slug} → ${t.trouve.slice(0, 95)}` : `  — ${jeu.slug} : ${t.note}`);

    if (t.trouve && APPLIQUER) {
      await prisma.jeu.update({ where: { id: jeu.id }, data: { demoUrl: t.trouve } });
      ecrits++;
    }
    trouvailles.push(t);
    writeFileSync(join(SORTIE, 'demos-playngo.json'), JSON.stringify(trouvailles, null, 1));
    if (i < jeux.length - 1) await new Promise((r) => setTimeout(r, PAUSE));
  }

  await nav.close();
  const ok = trouvailles.filter((t) => t.trouve).length;
  console.log(`\n${ok}/${trouvailles.length} lanceurs retrouves`);
  console.log(APPLIQUER ? `APPLIQUÉ — ${ecrits} demoUrl remplacées` : 'SIMULATION — relancer avec --appliquer');
  console.log(`relevé : ${join(SORTIE, 'demos-playngo.json')}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
