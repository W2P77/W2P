/*
 * Compléter les dates de sortie manquantes — en n'écrivant que ce qui est publié.
 *
 * ── Ce que le manque coûte ────────────────────────────────────────────────
 *
 * La page d'accueil trie « Dernières sorties » par `sortieLe`. Une fiche sans
 * date passe derrière toutes les autres : elle n'apparaît jamais, quelle que
 * soit sa fraîcheur réelle. Au 12/09/2026, 221 des 796 fiches visibles (RTP
 * **et** au moins une capture) sont dans ce cas, et elles tiennent en deux
 * studios : Pragmatic Play 158, Hacksaw Gaming 63. Aucun autre studio n'est
 * concerné — les dates que nous avons viennent toutes du lot d'import initial,
 * qui les portait déjà.
 *
 * ── Pourquoi ce script trouve si peu, et pourquoi c'est voulu ─────────────
 *
 * Ni Pragmatic ni Hacksaw ne publie la date de sortie de ses jeux. Leur page
 * produit donne le RTP, les mécaniques, la démo — jamais la date. Quatre
 * substituts plausibles ont été mesurés contre les dates que nous possédons
 * déjà, et les quatre mentent :
 *
 *   · `datePublished` du JSON-LD Yoast de la page produit Pragmatic : c'est la
 *     date de publication du billet WordPress. Écart mesuré sur 13 jeux datés :
 *     de −51 à +109 jours. Sur 777 Wheel Blitz, elle est même **postérieure**
 *     au `dateModified` de la même page.
 *   · Le communiqué de presse Pragmatic qui porte le visuel de lancement du
 *     jeu. Confronté à 41 jeux datés : 5 seulement tombent à deux jours près,
 *     écart médian **+121 jours**. Pragmatic communique quand il veut, souvent
 *     des mois après la mise en ligne, et l'archive REST ne remonte qu'à deux
 *     ans — pour un jeu ancien, le plus vieux communiqué retrouvé n'est pas
 *     celui du lancement mais une relance marketing.
 *   · Le `Last-Modified` de la vignette Hacksaw (`casino_thumbnails/{id}.jpg`).
 *     Sur 24 jeux datés : 1 seul à deux jours près, écart médian **−61 jours**.
 *     L'asset est déposé avant la sortie, pas le jour même.
 *   · Le `lastmod` du sitemap Hacksaw : figé à 2022-03-01 pour toutes les URL.
 *
 * Une date approximative est pire que pas de date : le site vend la fraîcheur,
 * donc une date fausse ment sur exactement ce qu'elle sert à trier. Et le
 * projet a déjà payé le repli commode — des centaines de fiches datées au
 * 1ᵉʳ janvier parce qu'une source ne donnait que l'année.
 *
 * Le script ne retient donc **que** ce qu'un studio déclare explicitement, au
 * jour près, sur sa propre page. Aujourd'hui cela ne donne rien, et c'est le
 * résultat : la question n'est pas « comment remplir la colonne » mais « qui
 * publie l'information », et la réponse est personne. Le lecteur reste en
 * place parce qu'il coûte une requête par fiche et qu'il répondra tout seul le
 * jour où un studio ajoutera le champ.
 *
 *   npx tsx --env-file=.env.local scripts/completer-dates-sortie.ts
 *   … --studio=hacksaw-gaming   … --limite=5   … --appliquer
 */

import { basename } from 'node:path';

const arg = (nom: string) =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const APPLIQUER = process.argv.includes('--appliquer');
const STUDIO = arg('studio');
const LIMITE = Number(arg('limite') ?? Infinity);

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/*
 * Quatre en parallèle, avec une pause : les 221 fiches passent en deux
 * minutes, et deux minutes n'ont aucune importance pour une opération qu'on ne
 * refera pas. Se faire bloquer par pragmaticplay.com en aurait une : c'est la
 * même source qui alimente les démos et les captures.
 */
const PARALLELE = 4;
const PAUSE_MS = 250;

/** Où chaque studio publierait la date, s'il la publiait. */
const PAGE_PRODUIT: Record<string, (slug: string) => string> = {
  'pragmatic-play': (slug) => `https://www.pragmaticplay.com/en/games/${slug}/`,
  'hacksaw-gaming': (slug) => `https://www.hacksawgaming.com/games/${slug}`,
};

/**
 * Un refus porte son motif : sans lui, « 221 échecs » ne dit pas si la source
 * est muette, cassée ou simplement imprécise — trois conclusions opposées.
 */
type Lecture =
  | { date: Date; libelle: string }
  | { refus: 'aucune date déclarée' | 'date imprécise' | 'date invraisemblable' };

const MOIS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** Le jour, le mois et l'année, ou rien. Un mois seul n'est pas une date. */
function jourPrecis(texte: string): Date | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(texte);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));

  const litteral =
    /\b(\d{1,2})(?:st|nd|rd|th|er)?\s+(?:de\s+)?([A-Za-zéèûî]{3,9})\.?\s+(\d{4})\b/.exec(texte) ??
    /\b([A-Za-zéèûî]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/.exec(texte);
  if (!litteral) return null;

  const [jour, mot, annee] = /^\d/.test(litteral[1])
    ? [litteral[1], litteral[2], litteral[3]]
    : [litteral[2], litteral[1], litteral[3]];
  const mois = MOIS.findIndex((m) => m.startsWith(mot.toLowerCase().slice(0, 3)));
  if (mois < 0) return null;
  return new Date(Date.UTC(+annee, mois, +jour));
}

/**
 * La date de sortie **déclarée** par le studio dans sa page produit.
 *
 * Deux formes seulement sont acceptées, et aucune n'est une approximation :
 * un `releaseDate` porté par un nœud JSON-LD de type jeu, ou une étiquette
 * explicite dans le texte visible. Le `datePublished` d'un nœud `WebPage` est
 * écarté délibérément — c'est la date du billet, pas celle du jeu, et c'est
 * précisément le piège mesuré en tête de fichier.
 */
export function lireDateSortie(html: string): Lecture {
  const candidats: string[] = [];

  for (const bloc of html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    // Le JSON-LD n'est lu qu'à la recherche de `releaseDate` : le parcourir en
    // objet obligerait à suivre `@graph`, les tableaux et les références `@id`
    // pour un champ qui, s'il existe, apparaît tel quel.
    for (const m of bloc[1].matchAll(/"releaseDate"\s*:\s*"([^"]+)"/g)) candidats.push(m[1]);
  }

  const texte = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ');
  for (const m of texte.matchAll(
    /\b(?:release[d]?\s*(?:date)?|launch(?:ed)?\s*date|date de sortie|sortie le)\b\s*[:–-]?\s*([^|]{4,40})/gi,
  )) {
    candidats.push(m[1]);
  }

  if (candidats.length === 0) return { refus: 'aucune date déclarée' };

  for (const candidat of candidats) {
    const date = jourPrecis(candidat);
    if (!date || Number.isNaN(date.getTime())) continue;
    // Une date hors de l'histoire du jeu de casino en ligne vient d'un
    // copyright, d'une licence ou d'une échéance réglementaire : la page en est
    // pleine, et c'est ainsi qu'un « 2029-12-31 » de certificat deviendrait une
    // sortie.
    const annee = date.getUTCFullYear();
    if (annee < 2000 || date.getTime() > Date.now()) return { refus: 'date invraisemblable' };
    return { date, libelle: candidat.trim().slice(0, 40) };
  }
  return { refus: 'date imprécise' };
}

async function main() {
  const { prisma } = await import('@/lib/donnees/prisma');
  const { filtrePubliable } = await import('@/lib/donnees/publiables');

  /*
   * Le périmètre est exactement celui de la navigation — `filtrePubliable()`,
   * et pas une condition réécrite ici. Compléter la date d'une fiche que
   * personne ne peut atteindre ne change rien au classement de la page
   * d'accueil, qui est tout l'objet ; et deux définitions du « visible » qui
   * divergent, c'est le prochain écart à débusquer.
   */
  const jeux = (
    await prisma.jeu.findMany({
      where: {
        ...(await filtrePubliable()),
        sortieLe: null,
        ...(STUDIO ? { studio: { slug: STUDIO } } : {}),
      },
      select: { id: true, slug: true, nom: true, studio: { select: { slug: true } } },
      orderBy: [{ studio: { slug: 'asc' } }, { slug: 'asc' }],
    })
  ).slice(0, LIMITE);

  const parStudio = new Map<string, number>();
  for (const j of jeux) parStudio.set(j.studio.slug, (parStudio.get(j.studio.slug) ?? 0) + 1);

  console.log(`${jeux.length} fiches visibles sans date de sortie :`);
  for (const [studio, n] of [...parStudio].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${studio.padEnd(20)} ${String(n).padStart(4)}` + (PAGE_PRODUIT[studio] ? '' : '   (aucune page produit connue)'));
  }
  console.log('');

  const trouves: Array<{ id: string; slug: string; date: Date; libelle: string; source: string }> =
    [];
  const echecs: string[] = [];

  for (let i = 0; i < jeux.length; i += PARALLELE) {
    await Promise.all(
      jeux.slice(i, i + PARALLELE).map(async (j) => {
        const construire = PAGE_PRODUIT[j.studio.slug];
        if (!construire) return echecs.push(`${j.slug} (studio sans page produit connue)`);
        const url = construire(j.slug);
        try {
          const r = await fetch(url, { headers: { 'User-Agent': NAVIGATEUR } });
          if (!r.ok) return echecs.push(`${j.slug} (HTTP ${r.status})`);
          const lu = lireDateSortie(await r.text());
          if ('refus' in lu) return echecs.push(`${j.slug} (${lu.refus})`);
          trouves.push({ id: j.id, slug: j.slug, date: lu.date, libelle: lu.libelle, source: url });
        } catch (e) {
          echecs.push(`${j.slug} (${e instanceof Error ? e.message.slice(0, 40) : 'erreur'})`);
        }
      }),
    );
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    if ((i / PARALLELE) % 10 === 0) process.stdout.write(`  ${i + PARALLELE}/${jeux.length}\r`);
  }

  console.log(`\n${trouves.length} dates publiées et précises, ${echecs.length} sans date.\n`);
  for (const t of trouves) {
    console.log(`  ${t.slug.padEnd(34)} ${t.date.toISOString().slice(0, 10)}  « ${t.libelle} »`);
  }

  /*
   * Les motifs comptés, pas seulement listés : « 158 aucune date déclarée » est
   * une conclusion sur la source, « 158 HTTP 404 » serait un bug de slug. Les
   * confondre ferait conclure à tort que le studio ne publie rien.
   */
  const motifs = new Map<string, string[]>();
  for (const e of echecs) {
    const motif = /\(([^)]+)\)$/.exec(e)?.[1] ?? 'inconnu';
    (motifs.get(motif) ?? motifs.set(motif, []).get(motif)!).push(e.replace(/ \([^)]+\)$/, ''));
  }
  for (const [motif, noms] of [...motifs].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(noms.length).padStart(4)} ${motif} : ${noms.slice(0, 8).join(', ')}${noms.length > 8 ? ', …' : ''}`);
  }

  if (!APPLIQUER) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  // Par lots : le pooler coupe une transaction longue, et rien ici n'exige
  // que les 221 écritures réussissent ou échouent ensemble.
  for (let i = 0; i < trouves.length; i += 25) {
    await Promise.all(
      trouves
        .slice(i, i + 25)
        .map((t) => prisma.jeu.update({ where: { id: t.id }, data: { sortieLe: t.date } })),
    );
  }
  const restants = await prisma.jeu.count({ where: { sortieLe: null, rtpStudio: { not: null } } });
  console.log(`\n${trouves.length} dates écrites. ${restants} fiches avec RTP restent sans date.`);
  await prisma.$disconnect();
}

/*
 * `lireDateSortie` est exportée : sans cette garde, l'importer pour la tester
 * lancerait une campagne de 221 requêtes en arrière-plan.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
