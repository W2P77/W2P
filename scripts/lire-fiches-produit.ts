/*
 * Sourcer RTP, volatilité et gain maximum depuis la page produit des studios.
 *
 * Les lecteurs vivent dans `src/lib/fiches-produit/lecteurs.ts`, testés sur des
 * extraits réels. Ce script les applique au catalogue.
 *
 * ── La règle d'autorité ───────────────────────────────────────────────────
 *
 * Le panneau de règles du jeu est le logiciel qui paie : il l'emporte sur la
 * page produit. Une fiche déjà sourcée au panneau n'est jamais écrasée ; si la
 * page produit dit autre chose, le désaccord est signalé et c'est tout.
 * Ailleurs, la page produit remplace la valeur d'import — que personne n'a
 * vérifiée — et la preuve garde la trace de la valeur remplacée.
 *
 * ── La politesse ──────────────────────────────────────────────────────────
 *
 * Une page à la fois, avec une pause entre deux. Le serveur de démo de BGaming
 * nous a mis au ban le 11/09/2026 ; ces pages-ci sont celles du site marketing,
 * mais la leçon vaut pour tous.
 *
 *   npx tsx --env-file=.env.local scripts/lire-fiches-produit.ts --studio=netent --limite=15
 *   … --appliquer   … --pause=1500
 */

import { LECTEURS, type FaitsFiche } from '@/lib/fiches-produit/lecteurs';
import { prisma } from '@/lib/donnees/prisma';
import { SOURCES, slugDepuisUrl } from '@/lib/inventaire/sources';

const arg = (nom: string) =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const APPLIQUER = process.argv.includes('--appliquer');
const LIMITE = Number(arg('limite') ?? Infinity);
const PAUSE = Number(arg('pause') ?? 1500);
/*
 * Au-delà de cet écart, un remplacement est mis de côté au lieu d'être écrit.
 *
 * La règle de la soirée : un gros écart se relit dans sa phrase avant d'être
 * écrit. Une simulation ne couvre qu'un échantillon ; sur des milliers de pages,
 * le script peut croiser un écart que personne n'a relu. Il le liste, il ne
 * l'écrit pas.
 */
const SEUIL = Number(arg('seuil') ?? 0.5);
/** Viser des jeux précis : pour écrire, après relecture, des écarts mis de côté. */
const SLUGS = arg('slugs')?.split(',');
const AUTEUR = 'fiche-produit';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

async function recuperer(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(25000), redirect: 'follow' });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.text();
}

/**
 * Une page de jeu, avec l'adresse où l'on a vraiment atterri.
 *
 * Pour les studios issus de la prospection, l'adresse est reconstruite à partir
 * de notre slug. Quand elle ne correspond pas à la leur, le site redirige — vers
 * une page d'accueil, une liste, parfois la page d'un **autre** jeu. Lire cette
 * page-là attribuerait au jeu demandé le RTP d'un autre, sans qu'aucun
 * désaccord ne le signale : ces fiches n'ont aucun chiffre en base à contredire.
 */
async function recupererPage(url: string): Promise<{ html: string; urlFinale: string }> {
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(25000), redirect: 'follow' });
  if (!r.ok) throw new Error(`${r.status}`);
  return { html: await r.text(), urlFinale: r.url };
}

/*
 * La page parle-t-elle bien de ce jeu ?
 *
 * Une adresse reconstruite peut répondre 200 sans être la bonne page : une
 * « page introuvable » habillée, une liste, la fiche d'un jeu voisin avec son
 * propre RTP. Aucune redirection à détecter, et sur ces studios aucun chiffre
 * en base pour contredire. On exige donc que le titre ou le premier intitulé
 * de la page contienne **tous** les mots distinctifs du nom du jeu — un seul
 * suffirait à confondre « Book of Kemet » et « Book of Ra ». La comparaison se
 * fait sans espaces : « Dragon's Gold 100 » doit reconnaître « dragons gold 100 ».
 */
const MOTS_VIDES = new Set([
  'slot', 'slots', 'game', 'games', 'the', 'and', 'of', 'online', 'free', 'play', 'demo', 'casino',
]);
/** Ce que la page dit d'elle-même, pour nommer une page écartée dans le rapport. */
function titreDePage(html: string): string {
  const brut =
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]*content=["']([^"']*)/i.exec(html)?.[1] ||
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ||
    /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ||
    '';
  return brut.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70) || '(page sans titre)';
}

function parleDuJeu(html: string, nom: string): boolean {
  const norme = (x: string) =>
    // « Hold & Hit 3×3 » : le signe de multiplication devient une espace, et « 3x3 » ne s'y retrouve plus.
    x.replace(/×|&#215;|&times;/g, 'x').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&[a-z#0-9]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  /*
   * `og:title` et `twitter:title` en plus du titre et du `h1`.
   *
   * Les fiches de Fugaso n'ont ni `<title>` ni `<h1>` dans le HTML servi : le
   * nom du jeu n'y est porté que par `og:title` (« MEGA THUNDER »). Sans lui, le
   * contrôle ne pouvait rien confirmer et écartait 32 pages pourtant justes,
   * RTP compris.
   */
  const meta = (cle: string) =>
    new RegExp(`<meta[^>]+(?:property|name)=["']${cle}["'][^>]*content=["']([^"']*)`, 'i').exec(html)?.[1] ??
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${cle}["']`, 'i').exec(html)?.[1] ??
    '';
  const entete = [
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '',
    /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? '',
    meta('og:title'),
    meta('twitter:title'),
  ]
    .join(' ')
    .replace(/<[^>]+>/g, ' ');
  const colle = norme(entete).replace(/ /g, '');
  const mots = norme(nom).split(' ').filter((m) => m.length >= 3 && !MOTS_VIDES.has(m));
  // Un nom sans mot distinctif ne permet pas de conclure : on ne bloque pas.
  return !mots.length || mots.every((m) => colle.includes(m));
}

type Verdict =
  | 'nouveau' | 'confirme' | 'remplace' | 'desaccord-panneau' | 'sans-chiffre' | 'hors-base' | 'illisible' | 'redirige'
  | 'autre-page' | 'a-relire';

async function main() {
  const studios = arg('studio') ? [arg('studio')!] : Object.keys(LECTEURS);
  for (const studio of studios) {
    const lire = LECTEURS[studio];
    if (!lire) {
      console.log(`${studio} : pas de lecteur.`);
      continue;
    }
    const jeux = await prisma.jeu.findMany({
      where: { studio: { slug: studio } },
      select: { id: true, slug: true, nom: true, rtpStudio: true, rtpSource: true, volatilite: true, gainMaxMultiple: true },
    });
    const parSlug = new Map(jeux.map((j) => [j.slug, j]));

    /*
     * Où lire les pages : l'adaptateur d'inventaire s'il existe, sinon le
     * motif d'URL noté à la prospection (« familles /games/<slug> »).
     *
     * La plupart des studios à la page produit lisible viennent de la
     * prospection et n'ont pas d'adaptateur : sans ce second chemin, le script
     * n'en lisait aucun.
     */
    const source = SOURCES.find((s) => s.studio === studio);
    let paires: Array<{ url: string; jeu: (typeof jeux)[number] | undefined }>;
    if (source) {
      const enSlug = source.slug?.bind(source) ?? slugDepuisUrl;
      paires = (await source.lister(recuperer)).map((url) => ({ url, jeu: parSlug.get(enSlug(url)) }));
    } else {
      const fiche = await prisma.studio.findUnique({ where: { slug: studio }, select: { siteUrl: true, ouSourcer: true } });
      const ou = fiche?.ouSourcer ?? '';
      const prefixe = /familles\s+(\/[^<\s]*)\/<slug>/.exec(ou)?.[1] ?? (/familles \/<slug>/.test(ou) ? '' : null);
      if (prefixe == null || !fiche?.siteUrl) {
        console.log(`${studio} : ni adaptateur d'inventaire ni motif d'URL connu.`);
        continue;
      }
      const racine = fiche.siteUrl.replace(/\/$/, '');
      paires = jeux.map((jeu) => ({ url: `${racine}${prefixe}/${jeu.slug}`, jeu }));
    }
    if (SLUGS) paires = paires.filter((p) => p.jeu && SLUGS.includes(p.jeu.slug));
    paires = paires.slice(0, LIMITE);
    const urls = paires.map((p) => p.url);
    const bilan: Record<Verdict, number> = {
      nouveau: 0, confirme: 0, remplace: 0, 'desaccord-panneau': 0, 'sans-chiffre': 0, 'hors-base': 0, illisible: 0,
      redirige: 0, 'autre-page': 0, 'a-relire': 0,
    };
    const aMontrer: string[] = [];

    console.log(`\n### ${studio} — ${urls.length} pages produit`);
    for (let i = 0; i < urls.length; i++) {
      if (i > 0) await new Promise((fin) => setTimeout(fin, PAUSE));
      const { url, jeu } = paires[i];
      if (!jeu) { bilan['hors-base'] += 1; continue; }

      let f: FaitsFiche;
      try {
        const { html, urlFinale } = await recupererPage(url);
        // La page lue doit être celle du jeu demandé, pas celle où l'on a été renvoyé.
        if (slugDepuisUrl(urlFinale) !== slugDepuisUrl(url)) { bilan.redirige += 1; continue; }
        if (!parleDuJeu(html, jeu.nom)) {
          bilan['autre-page'] += 1;
          // Nommer la page écartée : c'est ce qui distingue une vraie page
          // « introuvable » d'un titre simplement formulé autrement que notre nom.
          aMontrer.push(`  autre-page         ${jeu.slug.padEnd(32)} ← « ${titreDePage(html)} »`);
          continue;
        }
        f = lire(html);
      } catch { bilan.illisible += 1; continue; }
      if (f.rtp == null) { bilan['sans-chiffre'] += 1; continue; }

      const base = jeu.rtpStudio == null ? null : Number(jeu.rtpStudio);
      const auPanneau = /panneau de règles/.test(jeu.rtpSource ?? '');
      const identique = base != null && Math.abs(base - f.rtp) <= 0.005;
      const verdict: Verdict =
        auPanneau ? (identique ? 'confirme' : 'desaccord-panneau')
        : base == null ? 'nouveau'
        : identique ? 'confirme'
        : 'remplace';
      const ecartFort = verdict === 'remplace' && base != null && Math.abs(base - f.rtp) > SEUIL;
      const retenu: Verdict = ecartFort ? 'a-relire' : verdict;
      bilan[retenu] += 1;
      if (retenu === 'remplace' || retenu === 'desaccord-panneau' || retenu === 'a-relire') {
        aMontrer.push(`  ${retenu.padEnd(18)} ${jeu.slug.padEnd(32)} base ${String(base).padEnd(6)} fiche ${f.rtp}`);
      }

      if (!APPLIQUER || auPanneau || retenu === 'a-relire') continue;

      await prisma.jeu.update({
        where: { id: jeu.id },
        data: {
          rtpStudio: f.rtp,
          rtpSource: url,
          rtpConfiance: 'STUDIO',
          rtpVerifieLe: new Date(),
          confiance: 'STUDIO',
          ...(f.volatilite ? { volatilite: f.volatilite } : {}),
          ...(f.gainMax != null ? { gainMaxMultiple: f.gainMax } : {}),
          // Plusieurs versions publiées : la première est le défaut, les autres des paliers.
          ...(f.paliers?.length ? { rtpPaliers: [f.rtp, ...f.paliers] } : {}),
        },
      });
      const deja = new Set(
        (await prisma.preuve.findMany({ where: { jeuId: jeu.id }, select: { champ: true } })).map((p) => p.champ),
      );
      const champs: Array<[string, string, string | null]> = [
        [
          'rtpStudio',
          String(f.rtp),
          [
            verdict === 'remplace' ? `Remplace ${base} issu de l'import.` : null,
            f.paliers?.length ? `Autres versions publiées : ${f.paliers.join(' · ')} %.` : null,
          ].filter(Boolean).join(' ') || null,
        ],
        ...(f.volatilite ? [['volatilite', f.volatilite, null] as [string, string, null]] : []),
        ...(f.gainMax != null ? [['gainMaxMultiple', String(f.gainMax), null] as [string, string, null]] : []),
      ];
      for (const [champ, valeur, note] of champs) {
        if (deja.has(champ)) continue;
        await prisma.preuve.create({
          data: {
            jeuId: jeu.id, champ, valeurBrute: valeur, type: 'STUDIO', url,
            libelle: 'Fiche produit du studio', verifieePar: AUTEUR, note,
          },
        });
      }
    }

    console.log(
      `  nouveaux ${bilan.nouveau} · confirmés ${bilan.confirme} · remplacés ${bilan.remplace} · ` +
        `désaccords avec le panneau ${bilan['desaccord-panneau']} · sans chiffre ${bilan['sans-chiffre']} · ` +
        `hors base ${bilan['hors-base']} · illisibles ${bilan.illisible} · redirigées ${bilan.redirige} · ` +
        `pages d'un autre jeu ${bilan['autre-page']} · à relire ${bilan['a-relire']}`,
    );
    for (const l of aMontrer.slice(0, 40)) console.log(l);
  }
  console.log(APPLIQUER ? '\nÉcrit.\n' : '\nSIMULATION — ajouter --appliquer.\n');
}

main().finally(() => prisma.$disconnect());
