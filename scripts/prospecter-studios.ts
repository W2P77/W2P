/*
 * Trouver, pour un studio qu'on ne connaît que de nom, où lit-on son catalogue.
 *
 * ── Pourquoi un prospecteur plutôt que des adaptateurs ────────────────────
 *
 * Nos casinos partenaires citent 248 fournisseurs et le marché en compte plus
 * de mille. Écrire un adaptateur à la main pour chacun — trouver le domaine,
 * lire le robots.txt, repérer la famille d'URL qui porte les jeux — coûte une
 * dizaine de minutes par studio. À mille, c'est un mois de travail pour du
 * travail qui se ressemble.
 *
 * Ce script fait le repérage tout seul et rend un rapport. On ne code ensuite
 * que ce qu'il n'a pas su faire.
 *
 * ── Ce qu'il ne fait pas ──────────────────────────────────────────────────
 *
 * Il ne crée aucune fiche et n'écrit pas en base. Il propose, un humain
 * valide. Un domaine mal deviné qui appartiendrait à quelqu'un d'autre
 * remplirait le catalogue de jeux inventés — c'est exactement ce qu'on
 * s'interdit.
 *
 *   npx tsx --env-file=.env.local scripts/prospecter-studios.ts --studios=spinomenal,onlyplay
 *   npx tsx --env-file=.env.local scripts/prospecter-studios.ts --depuis-betsrank --seuil=6
 */

import { writeFileSync } from 'node:fs';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const arg = (nom: string) =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=');

/** Un `<loc>`, nu ou enveloppé de CDATA — cf. `src/lib/inventaire/sources.ts`. */
const LOC = /<loc>\s*(?:<!\[CDATA\[)?([^<\]]+)/g;
const locs = (xml: string) => [...xml.matchAll(LOC)].map((m) => m[1].trim());

async function recuperer(url: string, ms = 20000): Promise<{ statut: number; texte: string }> {
  const r = await fetch(url, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(ms),
    redirect: 'follow',
  });
  return { statut: r.status, texte: r.ok ? await r.text() : '' };
}

/**
 * Les domaines plausibles pour un studio, du plus probable au moins probable.
 *
 * `spinomenal` → spinomenal.com, puis .games, puis spinomenalgaming.com. On ne
 * teste pas au hasard : chaque forme rencontrée dans les 17 adaptateurs déjà
 * écrits est représentée ici.
 */
function domainesCandidats(cle: string): string[] {
  const nu = cle.replace(/[^a-z0-9]/g, '');
  /*
   * Premier jet : six formes, toutes en `.com` ou presque. Elles ont manqué
   * 111 studios sur 265 — dont Booongo, porté par treize de nos casinos.
   * Le motif n'était pas « studio mort » mais « suffixe non testé » :
   * Fantasma est `fantasmagames.com`, Peter & Sons n'est pas en `.com`.
   *
   * L'ordre compte : un domaine parqué répond aussi vite qu'un vrai, et c'est
   * le premier qui passe le contrôle du métier qui est retenu.
   */
  return [
    `https://www.${nu}.com`,
    `https://${nu}.com`,
    `https://${nu}games.com`,
    `https://www.${nu}games.com`,
    `https://${nu}.games`,
    `https://www.${nu}gaming.com`,
    `https://${nu}gaming.com`,
    `https://${nu}studios.com`,
    `https://${nu}.io`,
    `https://${nu}.net`,
    `https://${nu}.co`,
    `https://${nu}.gg`,
  ];
}

/**
 * Est-ce bien le site d'un éditeur de jeux, ou un domaine parqué ?
 *
 * Un nom de studio est souvent un mot courant — `mascot`, `platipus`, `tada`.
 * Le .com correspondant appartient fréquemment à quelqu'un d'autre. Sans ce
 * contrôle, on inventorierait le catalogue d'une boutique de déguisements.
 */
const MOTS_DU_METIER =
  /\b(slot|slots|casino|igaming|rng|volatility|rtp|jackpot|game studio|game provider|reels)\b/i;

interface Piste {
  studio: string;
  domaine: string | null;
  sitemap: string | null;
  motif: string | null;
  jeux: number;
  exemples: string[];
  obstacle: string | null;
  /** `racine` = famille servie sans préfixe : à relire avant d'en créer des fiches. */
  confiance?: 'prefixe' | 'racine';
  /** Ce que le sitemap contenait, quand rien n'a été reconnu. */
  vu?: string[];
}

/**
 * La famille d'URL qui ressemble le plus à un catalogue de jeux.
 *
 * ── Pourquoi on ne cherche pas un préfixe fixe ────────────────────────────
 *
 * Premier jet : exiger `/games/<slug>`, deux segments pile. Il a trouvé 13
 * studios sur 33 et manqué tous ceux qui rangent leur catalogue autrement —
 * `/en/games/<slug>`, `/games/slots/<slug>`, `/portfolio/<slug>`. On regroupe
 * donc par **chemin parent**, quelle que soit sa profondeur, et on retient
 * celui qui porte le plus d'enfants distincts.
 *
 * ── Pourquoi un mot du métier reste exigé ─────────────────────────────────
 *
 * Sans lui, la famille la plus peuplée d'un site de studio est souvent
 * `/news/` ou `/blog/`. Playtech rendait 10 « jeux » sous `/products/` : son
 * catalogue de logiciels B2B, pas des machines à sous.
 */
const PARENT_DE_JEUX = /(^|\/)(games?|slots?|portfolio|our-games|casino-games|titles|game-list)(\/|$)/i;

function meilleureFamille(
  urls: string[],
  base: string,
): { motif: string; membres: string[]; racine: boolean } | null {
  const hote = new URL(base).hostname.replace(/^www\./, '');
  const familles = new Map<string, Set<string>>();

  for (const u of urls) {
    let chemin: string;
    try {
      const parsee = new URL(u);
      // Un sitemap qui pointe ailleurs que chez lui n'est pas son catalogue.
      if (parsee.hostname.replace(/^www\./, '') !== hote) continue;
      chemin = parsee.pathname.replace(/\/+$/, '');
    } catch {
      continue;
    }
    const segments = chemin.split('/').filter(Boolean);
    if (!segments.length) continue;
    const parent = '/' + segments.slice(0, -1).join('/');
    /*
     * Certains studios servent leurs jeux à la racine : Mascot publie
     * `mascot.games/gold-of-sirens`, sans préfixe. Exiger un dossier les
     * rendait invisibles — 211 pages ignorées. On accepte donc la racine,
     * mais seulement quand elle est manifestement peuplée : `/about` et
     * `/contact` y vivent aussi, et cinq pages ne font pas un catalogue.
     */
    if (parent !== '/' && !PARENT_DE_JEUX.test(parent)) continue;
    const membres = familles.get(parent) ?? new Set<string>();
    membres.add(u);
    familles.set(parent, membres);
  }

  /*
   * Une locale n'est pas un catalogue de plus.
   *
   * EGT sert `/ru/game/…` ×1702, `/es/game/…` ×1027 et `/game/…` ×470 : le
   * même catalogue six fois, et le russe l'emporte au nombre. Retenir la
   * famille la plus peuplée aurait compté leur catalogue au triple. On
   * regroupe donc les variantes qui ne diffèrent que par un préfixe de langue
   * et on garde celle qui n'en a pas — à défaut, la plus fournie du groupe.
   */
  const sansLangue = (chemin: string) => chemin.replace(/^\/[a-z]{2}(-[a-z]{2,4})?(?=\/|$)/i, '') || '/';
  const groupes = new Map<string, Array<[string, Set<string>]>>();
  for (const entree of familles.entries()) {
    const cle = sansLangue(entree[0]);
    groupes.set(cle, [...(groupes.get(cle) ?? []), entree]);
  }
  const representants = [...groupes.entries()].map(([cle, variantes]) => {
    const nue = variantes.find(([chemin]) => chemin === cle);
    return nue ?? variantes.sort((a, b) => b[1].size - a[1].size)[0];
  });

  const classees = representants
    .filter(([parent, membres]) => parent !== '/' || membres.size >= 50)
    .sort((a, b) => b[1].size - a[1].size);
  const meilleure = classees[0];
  /*
   * Sous quinze jeux, on ne conclut pas.
   *
   * Amatic rendait 9 entrées sous `/products/` et Playtech 10 : des pages
   * d'offre commerciale qui portent par hasard un mot du métier. Un studio qui
   * publie vraiment son catalogue en aligne des dizaines.
   */
  if (!meilleure || meilleure[1].size < 15) return null;
  return {
    motif: meilleure[0] === '/' ? '/<slug>' : `${meilleure[0]}/<slug>`,
    membres: [...meilleure[1]],
    racine: meilleure[0] === '/',
  };
}

/**
 * Ce que le sitemap contenait, quand rien n'a été reconnu.
 *
 * Un échec muet n'apprend rien. En rendant les trois familles les plus
 * peuplées, chaque studio manqué devient une ligne d'adaptateur à écrire au
 * lieu d'une enquête à refaire.
 */
function familleObservees(urls: string[], base: string): string[] {
  const hote = new URL(base).hostname.replace(/^www\./, '');
  const compte = new Map<string, number>();
  for (const u of urls) {
    try {
      const parsee = new URL(u);
      if (parsee.hostname.replace(/^www\./, '') !== hote) continue;
      const segments = parsee.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
      const parent = '/' + segments.slice(0, -1).join('/');
      compte.set(parent, (compte.get(parent) ?? 0) + 1);
    } catch {
      /* URL illisible : elle ne nous apprendrait rien */
    }
  }
  return [...compte.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([chemin, n]) => `${chemin}/… ×${n}`);
}

async function prospecter(studio: string): Promise<Piste> {
  const vide: Piste = { studio, domaine: null, sitemap: null, motif: null, jeux: 0, exemples: [], obstacle: null };

  let vues: string[] = [];
  for (const domaine of domainesCandidats(studio)) {
    let accueil: { statut: number; texte: string };
    try {
      accueil = await recuperer(domaine, 15000);
    } catch {
      continue;
    }
    if (accueil.statut === 403) return { ...vide, domaine, obstacle: 'le site refuse la requête (403)' };
    if (!accueil.texte) continue;
    if (!MOTS_DU_METIER.test(accueil.texte)) {
      // Le domaine répond mais ne parle pas du métier : ce n'est pas eux.
      continue;
    }

    // robots.txt : ce qu'il interdit, on ne le lit pas.
    let declares: string[] = [];
    try {
      const rb = await recuperer(`${domaine}/robots.txt`, 12000);
      if (/^\s*Disallow:\s*\/\s*$/im.test(rb.texte) && !/^\s*Allow:/im.test(rb.texte)) {
        return { ...vide, domaine, obstacle: 'robots.txt interdit tout le site' };
      }
      declares = [...rb.texte.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => m[1].trim());
    } catch {
      /* pas de robots.txt : on continue avec les chemins usuels */
    }

    const candidats = [...new Set([...declares, `${domaine}/sitemap.xml`, `${domaine}/sitemap_index.xml`])];
    for (const c of candidats.slice(0, 6)) {
      let xml: { statut: number; texte: string };
      try {
        xml = await recuperer(c, 25000);
      } catch {
        continue;
      }
      if (!xml.texte || !/<(urlset|sitemapindex)/i.test(xml.texte)) continue;

      let urls = locs(xml.texte);
      if (/<sitemapindex/i.test(xml.texte)) {
        // On ne descend que dans les sous-sitemaps qui promettent des jeux :
        // tirer les actualités coûte des requêtes pour rien.
        const sous = urls.filter((u) => /game|slot|product|portfolio/i.test(u)).slice(0, 4);
        const tout: string[] = [];
        for (const s of sous.length ? sous : urls.slice(0, 3)) {
          try {
            tout.push(...locs((await recuperer(s, 25000)).texte));
          } catch {
            /* un sous-sitemap injoignable ne fait pas échouer la piste */
          }
        }
        urls = tout;
      }

      const famille = meilleureFamille(urls, domaine);
      if (famille) {
        return {
          studio,
          domaine,
          sitemap: c,
          motif: famille.motif,
          jeux: new Set(famille.membres).size,
          exemples: famille.membres.slice(0, 3).map((u) => u.replace(domaine, '')),
          obstacle: null,
          confiance: famille.racine ? 'racine' : 'prefixe',
        };
      }
      vues = familleObservees(urls, domaine);
    }
    return {
      ...vide,
      domaine,
      obstacle: 'site trouvé, mais aucun sitemap ne porte de famille de jeux',
      vu: vues,
    };
  }
  return { ...vide, obstacle: 'aucun domaine plausible ne répond' };
}

async function main() {
  const liste = (arg('studios') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!liste.length) {
    console.log('Passer --studios=a,b,c');
    return;
  }

  const pistes: Piste[] = [];
  const parallele = 4;
  for (let i = 0; i < liste.length; i += parallele) {
    const lot = await Promise.all(liste.slice(i, i + parallele).map((s) => prospecter(s).catch((e) => ({
      studio: s, domaine: null, sitemap: null, motif: null, jeux: 0, exemples: [],
      obstacle: e instanceof Error ? e.message : 'échec',
    } as Piste))));
    for (const p of lot) {
      pistes.push(p);
      const etat = p.jeux
        ? `${String(p.jeux).padStart(4)} jeux  ${p.motif}${p.confiance === 'racine' ? ' ⚠ racine' : ''}  (${p.domaine})`
        : `   —       ${p.obstacle}${p.vu?.length ? ` — vu : ${p.vu.join('  ')}` : ''}`;
      console.log(p.studio.padEnd(16) + etat);
    }
  }

  const trouves = pistes.filter((p) => p.jeux > 0);
  console.log(
    `\n${trouves.length} studios sur ${pistes.length} ont un catalogue énumérable — ` +
      `${trouves.reduce((s, p) => s + p.jeux, 0)} jeux repérés.`,
  );
  const chemin = arg('rapport') ?? '/tmp/prospection.json';
  writeFileSync(chemin, JSON.stringify(pistes, null, 2));
  console.log(`Rapport détaillé : ${chemin}`);
  console.log('Aucune fiche créée : ce script propose, il n\'écrit pas.');
}

main();
