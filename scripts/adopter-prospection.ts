/*
 * Transformer un rapport de prospection en studios et en fiches WIP.
 *
 * ── Pourquoi c'est un second script ───────────────────────────────────────
 *
 * `prospecter-studios.ts` devine. Ce script écrit. Les séparer donne le point
 * d'arrêt où quelqu'un relit avant que la base bouge : un domaine mal deviné
 * remplirait le catalogue de jeux qui n'existent pas, et c'est précisément ce
 * qu'on s'interdit.
 *
 * Il ne fait pas confiance au rapport sur parole : il relit le sitemap qui y
 * est consigné et refiltre avec le motif retenu. Le rapport dit où regarder,
 * pas ce qu'il faut croire.
 *
 *   npx tsx --env-file=.env.local scripts/adopter-prospection.ts --rapport=/tmp/prospection-220.json
 *   … --appliquer          écrit vraiment
 *   … --avec-racine        inclut les catalogues servis sans préfixe d'URL
 *   … --min=25             relève le plancher (défaut 15)
 */

import { readFileSync } from 'node:fs';

import { prisma } from '@/lib/donnees/prisma';
import { locsDuTexte, slugDepuisUrl } from '@/lib/inventaire/sources';

const arg = (nom: string) =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=');
const APPLIQUER = process.argv.includes('--appliquer');
const AVEC_RACINE = process.argv.includes('--avec-racine');
const MIN = Number(arg('min') ?? 15);

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

interface Piste {
  studio: string;
  domaine: string | null;
  sitemap: string | null;
  motif: string | null;
  jeux: number;
  confiance?: 'prefixe' | 'racine';
}

/**
 * Les pistes qu'on refuse malgré un catalogue énumérable.
 *
 * Le prospecteur trouve des URL ; il ne sait pas ce qu'elles décrivent. Deux
 * cas rencontrés valent d'être nommés plutôt que redécouverts.
 */
const ECARTES: Record<string, string> = {
  egt:
    "Euro Games Technology est le parent industriel d'Amusnet : son catalogue est fait de bornes et de variantes par juridiction (`rise-of-ra-gold-vlt-spain`, `panorama-roulette-double-zero-automatic-virtual-live`). On ne peut y jouer depuis aucune page web, comme les `land-based` d'Amusnet déjà exclus.",
};

/**
 * Les studios dont la racine est vraiment le catalogue, vérifiés un par un.
 *
 * Le prospecteur signale une famille servie sans préfixe d'URL ; il ne sait pas
 * ce qu'elle contient. Sur les huit rencontrées, **cinq étaient des communiqués
 * de presse** : BF Games, Vivo, Fire Kirin, Bluberi et High 5 auraient versé au
 * catalogue sept cents fiches nommées
 * « bf-games-enters-switzerland-with-gamanza-partnership ».
 *
 * D'où une liste nominative plutôt qu'un drapeau global : chaque entrée a été
 * ouverte et lue.
 */
const RACINE_VALIDEE: Record<string, string> = {
  mascot: '210 pages à la racine, toutes des jeux',
  backseat: '58 pages à la racine, toutes des jeux',
  gamebeat: 'des jeux, précédés de six pages de navigation que le filtre écarte',
};

/**
 * Ce qui vit à la racine d'un site sans être un jeu.
 *
 * Gamebeat sert `about`, `careers`, `blog`, `partners`, `brandbook` et
 * `games-catalog` au même niveau que ses machines.
 */
const PAGES_DE_SITE =
  /^(about|about-us|contact|contact-us|careers|jobs|blog|news|press|partners|partnership|brandbook|media|legal|privacy|privacy-policy|terms|terms-of-use|cookies|imprint|faq|support|home|games?|games?-catalog|catalog|catalogue|portfolio|team|company|responsible-gaming|sitemap|search|login|demo|releases|case-study)$/i;

function nomDepuisSlug(slug: string): string {
  return slug
    .split('-')
    .map((mot) => (mot.length <= 2 ? mot : mot[0].toUpperCase() + mot.slice(1)))
    .join(' ');
}

async function recuperer(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(30000),
    redirect: 'follow',
  });
  if (!r.ok) throw new Error(`${r.status} sur ${url}`);
  return r.text();
}

/** Les URL de jeux d'une piste, relues à la source. */
async function jeuxDeLaPiste(piste: Piste): Promise<string[]> {
  if (!piste.sitemap || !piste.motif || !piste.domaine) return [];
  const prefixe = piste.motif.replace(/\/<slug>$/, '');
  const texte = await recuperer(piste.sitemap);

  let urls = locsDuTexte(texte);
  if (/<sitemapindex/i.test(texte)) {
    const sous = urls.filter((u) => /game|slot|product|portfolio/i.test(u)).slice(0, 4);
    const tout: string[] = [];
    for (const s of sous.length ? sous : urls.slice(0, 3)) {
      try {
        tout.push(...locsDuTexte(await recuperer(s)));
      } catch {
        /* un sous-sitemap injoignable ne fait pas échouer la piste */
      }
    }
    urls = tout;
  }

  const hote = new URL(piste.domaine).hostname.replace(/^www\./, '');
  return [...new Set(urls)].filter((u) => {
    try {
      const p = new URL(u);
      if (p.hostname.replace(/^www\./, '') !== hote) return false;
      const chemin = p.pathname.replace(/\/+$/, '');
      const segments = chemin.split('/').filter(Boolean);
      if (!segments.length) return false;
      const parent = '/' + segments.slice(0, -1).join('/');
      return parent === (prefixe || '/');
    } catch {
      return false;
    }
  });
}

async function main() {
  const chemin = arg('rapport') ?? '/tmp/prospection.json';
  const pistes: Piste[] = JSON.parse(readFileSync(chemin, 'utf8'));

  const eligibles = pistes.filter(
    (p) =>
      p.jeux >= MIN &&
      p.sitemap &&
      p.motif &&
      (AVEC_RACINE || p.confiance !== 'racine' || RACINE_VALIDEE[p.studio]) &&
      !ECARTES[p.studio],
  );

  /*
   * Un domaine, un studio.
   *
   * Nos casinos citent `felix` et `felixgaming` comme deux fournisseurs : les
   * deux pistes tombent sur felixgaming.com. Sans ce regroupement, la même
   * société entrerait deux fois en base avec 106 fiches chacune — dont la
   * moitié en collision de slug, l'autre moitié en doublons publiés.
   */
  const parDomaine = new Map<string, Piste>();
  const doublons: string[] = [];
  for (const p of eligibles) {
    const hote = new URL(p.domaine!).hostname.replace(/^www\./, '');
    const deja = parDomaine.get(hote);
    if (deja) {
      doublons.push(`${p.studio} — même site que « ${deja.studio} » (${hote})`);
      continue;
    }
    parDomaine.set(hote, p);
  }
  const retenues = [...parDomaine.values()];
  const ecartees = pistes.filter((p) => p.jeux > 0 && !retenues.includes(p));

  console.log(`${pistes.length} pistes lues · ${retenues.length} retenues · ${ecartees.length} écartées\n`);
  if (ecartees.length) {
    console.log('Écartées :');
    for (const e of ecartees) {
      const pourquoi =
        ECARTES[e.studio] ??
        (e.confiance === 'racine'
          ? "servie à la racine, non vérifiée (voir RACINE_VALIDEE)"
          : doublons.find((d) => d.startsWith(`${e.studio} `))?.split('—')[1]?.trim() ??
            `moins de ${MIN} jeux`);
      console.log(`  ${e.studio.padEnd(16)} ${String(e.jeux).padStart(4)} jeux — ${pourquoi}`);
    }
    console.log();
  }

  console.log('studio             trouvés  créés  déjà là  collisions  jumeaux');
  console.log('─'.repeat(70));

  let totalCrees = 0;
  const incidents: string[] = [];

  for (const piste of retenues) {
    let urls: string[];
    try {
      urls = await jeuxDeLaPiste(piste);
    } catch (e) {
      console.log(`${piste.studio.padEnd(18)}  ${e instanceof Error ? e.message : 'échec'}`);
      continue;
    }

    const slugs = [...new Set(urls.map(slugDepuisUrl))].filter((s) => s && !PAGES_DE_SITE.test(s));
    if (slugs.length < MIN) {
      console.log(`${piste.studio.padEnd(18)}  ${slugs.length} seulement à la relecture — piste abandonnée`);
      continue;
    }

    /*
     * Le même studio sous deux noms, d'un rapport à l'autre.
     *
     * Nos casinos l'appellent `amigogaming`, SoftSwiss `amigo-gaming` : deux
     * slugs, un seul site. Le regroupement par domaine ne vaut qu'à
     * l'intérieur d'un rapport — ici on confronte à ce que la base porte déjà,
     * sinon la seconde prospection recrée chaque studio de la première.
     */
    const hote = new URL(piste.domaine!).hostname.replace(/^www\./, '');
    let studio =
      (await prisma.studio.findUnique({ where: { slug: piste.studio } })) ??
      (await prisma.studio.findFirst({
        where: { OR: [{ siteUrl: `https://www.${hote}` }, { siteUrl: `https://${hote}` }] },
      }));

    if (studio && studio.slug !== piste.studio) {
      console.log(`${piste.studio.padEnd(18)}  déjà en base sous « ${studio.slug} » (${hote})`);
      continue;
    }

    if (!studio && APPLIQUER) {
      studio = await prisma.studio.create({
        data: {
          slug: piste.studio,
          nom: nomDepuisSlug(piste.studio),
          siteUrl: piste.domaine,
          ouSourcer: `${piste.sitemap} — familles ${piste.motif}`,
        },
      });
    }

    const nos = studio
      ? await prisma.jeu.findMany({ where: { studioId: studio.id }, select: { slug: true } })
      : [];
    const chezNous = new Set(nos.map((j) => j.slug));
    const manquants = slugs.filter((s) => !chezNous.has(s));

    let crees = 0;
    let collisions = 0;
    let jumeaux = 0;

    if (APPLIQUER && studio) {
      // `Jeu.slug` est unique globalement : un slug pris ailleurs n'est pas
      // forcément le même jeu, et on ne tranche pas à la place de quelqu'un.
      const pris = new Set(
        (await prisma.jeu.findMany({ where: { slug: { in: manquants } }, select: { slug: true } })).map(
          (j) => j.slug,
        ),
      );
      // Le même jeu sous deux orthographes — cf. `inventorier-studios.ts`.
      const colle = (v: string) => v.replace(/[^a-z0-9]/g, '');
      const nosCollees = new Set(nos.map((j) => colle(j.slug)));

      for (const slug of manquants) {
        if (pris.has(slug)) {
          collisions += 1;
          incidents.push(`${piste.studio}/${slug} — slug déjà pris`);
          continue;
        }
        if (nosCollees.has(colle(slug))) {
          jumeaux += 1;
          continue;
        }
        await prisma.jeu.create({ data: { slug, nom: nomDepuisSlug(slug), studioId: studio.id } });
        crees += 1;
      }
    } else {
      crees = manquants.length;
    }

    totalCrees += crees;
    console.log(
      piste.studio.padEnd(18) +
        String(slugs.length).padStart(7) +
        String(crees).padStart(7) +
        String(chezNous.size).padStart(9) +
        String(collisions).padStart(12) +
        String(jumeaux).padStart(9),
    );
  }

  console.log('─'.repeat(70));
  console.log(
    APPLIQUER
      ? `\n${totalCrees} fiches créées, sans aucune donnée inventée.`
      : `\nSIMULATION — ${totalCrees} fiches seraient créées. Ajouter --appliquer.`,
  );
  if (incidents.length) {
    console.log(`\n${incidents.length} slugs déjà pris ailleurs, non créés :`);
    for (const i of incidents.slice(0, 15)) console.log(`  ${i}`);
    if (incidents.length > 15) console.log(`  … et ${incidents.length - 15} autres.`);
  }
  console.log('Elles restent hors index et hors sitemap tant qu\'elles n\'ont pas de RTP.\n');
}

main().finally(() => prisma.$disconnect());
