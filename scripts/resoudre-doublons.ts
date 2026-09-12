/*
 * Trouver les doublons de catalogue, et ne supprimer que ceux qui ne coûtent rien.
 *
 * ── Pourquoi ce script existe ─────────────────────────────────────────────
 *
 * Deux fiches pour un seul jeu réel, ce sont deux pages indexables pour un
 * seul contenu. Google n'en choisit qu'une, et fait payer l'hésitation aux
 * deux : la fiche travaillée est diluée par sa copie vide. Le catalogue vient
 * de passer 829 fiches visibles — chaque doublon en dégrade deux.
 *
 * ── Trois questions, jamais confondues ────────────────────────────────────
 *
 * 1. **Est-ce le même jeu ?**  Un nom voisin ne prouve rien : « Dwarven Gold »
 *    et « Dwarven Gold Deluxe » sont deux titres distincts chez Pragmatic.
 *    Seule une *corroboration* le prouve — le lanceur de démo désigne le jeu
 *    par son symbole, et deux adresses produit qui aboutissent à la même page
 *    désignent la même page. Sans corroboration, le groupe est rapporté et
 *    rien n'est proposé.
 *
 * 2. **Laquelle garder ?**  D'abord la page produit du studio : elle porte le
 *    titre officiel, et un slug qu'elle ne connaît pas est un slug inventé.
 *    Ensuite les captures, puis les preuves, puis les traductions — le travail
 *    déjà fait. Si rien ne départage, le groupe reste ambigu.
 *
 * 3. **La gardée perd-elle quelque chose ?**  `Traduction`, `Preuve` et
 *    `DisponibiliteCasino` sont en `onDelete: Cascade` : supprimer une fiche
 *    détruit sans un mot les preuves qui y étaient attachées. Le script
 *    compare donc champ par champ, et **refuse** dès que la fiche condamnée
 *    porte quoi que ce soit que la gardée n'a pas. Un doublon non résolu coûte
 *    moins cher qu'une fiche unique supprimée par erreur.
 *
 * ── Ce qu'une suppression emporte aussi ───────────────────────────────────
 *
 * Aucune redirection n'est configurée côté site : l'URL supprimée devient un
 * 404. C'est acceptable pour une page vide et jamais indexée, ça ne l'est pas
 * pour une page qui reçoit du trafic. Le rapport le rappelle à chaque lot.
 *
 *   npx tsx --env-file=.env.local scripts/resoudre-doublons.ts
 *   … --appliquer      supprime réellement les fiches jugées sûres
 *   … --hors-ligne     n'interroge aucune page produit (arbitrage dégradé)
 */

import { prisma } from '@/lib/donnees/prisma';
import { nombreDeCaptures } from '@/lib/publication';

const APPLIQUER = process.argv.includes('--appliquer');
const HORS_LIGNE = process.argv.includes('--hors-ligne');

/*
 * Les mots que deux catalogues écrivent différemment pour le même jeu.
 *
 * « Fruit Party » et « Fruit Party Slot », « Sparky & Shortz » et « Sparky
 * Shortz », « Koi Gate » et « The Koi Gate » : l'écart est celui de l'import,
 * pas celui du jeu. « a » est volontairement absent de la liste — le retirer
 * confondrait « Crazy Time » avec « Crazy Time A ».
 */
const MOTS_INTERCHANGEABLES = /\b(?:and|the|of|slots?)\b/g;

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(MOTS_INTERCHANGEABLES, ' ')
    .replace(/\s+/g, '');
}

/* Les suffixes qu'un import colle au slug quand le précédent est déjà pris. */
const SUFFIXES_D_IMPORT = /(?:-slot|-slots|-game|-netent|-hacksaw|-btg|-original|-1)+$/;

/**
 * Ce que l'adresse de démo désigne comme jeu.
 *
 * Chez Pragmatic et Play'n GO, le lanceur nomme le jeu dans sa requête —
 * `gameSymbol` et `gid` sont les identifiants internes du studio, et deux
 * fiches qui les partagent pointent le même binaire. Ailleurs l'adresse est
 * une page produit : on prend le **chemin entier**, jamais le dernier segment
 * seul, parce que `…/fullstate/…/adrenalinerush` et
 * `…/socketgames/…/adrenalinerush` sont deux jeux Evoplay différents.
 */
function identifiantDeLanceur(url: string): string | null {
  const symbole = url.match(/[?&]gameSymbol=([^&]+)/i);
  if (symbole) return `gameSymbol=${symbole[1].toLowerCase()}`;
  const gid = url.match(/[?&]gid=([^&]+)/i);
  if (gid) return `gid=${gid[1].toLowerCase()}`;
  try {
    const chemin = new URL(url).pathname.replace(/\/+$/, '').toLowerCase();
    return chemin && chemin !== '/' ? `chemin=${chemin}` : null;
  } catch {
    return null;
  }
}

/*
 * Où chaque studio publie la page produit d'un jeu, à partir de son slug.
 *
 * Ces patrons sont relevés sur les `demoUrl` déjà en base, pas devinés. Un
 * studio absent de la table n'est pas un oubli : chez Play'n GO l'adresse est
 * un lanceur, chez Habanero un code interne (`SG12Zodiacs`) — aucun des deux
 * ne se reconstruit depuis un slug, et un patron inventé validerait n'importe
 * quoi.
 */
const PAGES_PRODUIT: Record<string, (slug: string) => string> = {
  'pragmatic-play': (s) => `https://www.pragmaticplay.com/en/games/${s}/`,
  netent: (s) => `https://netent.com/games/${s}/`,
  'red-tiger': (s) => `https://redtiger.com/games/${s}/`,
  'hacksaw-gaming': (s) => `https://www.hacksawgaming.com/games/${s}`,
  'nolimit-city': (s) => `https://nolimitcity.com/games/${s}`,
  'big-time-gaming': (s) => `https://www.bigtimegaming.com/games/${s}`,
  yggdrasil: (s) => `https://www.yggdrasilgaming.com/games/${s}/`,
  bgaming: (s) => `https://bgaming.com/games/${s}`,
  'push-gaming': (s) => `https://www.pushgaming.com/games/${s}.html`,
  evolution: (s) => `https://www.evolution.com/games/${s}/`,
  'elk-studios': (s) => `https://www.elk-studios.com/games/${s}/`,
  quickspin: (s) => `https://quickspin.com/slots/${s}/`,
};

const ENTITES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  trade: '™',
  reg: '®',
};

/*
 * Sans ce décodage, « Dragon Age Hold &amp; Win » se normalise en
 * « dragonageholdampwin » et ne contient plus le nom du jeu : la page produit
 * serait déclarée muette alors qu'elle répond parfaitement.
 */
function decoderEntites(texte: string): string {
  return texte
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (entier, nom: string) => ENTITES[nom.toLowerCase()] ?? entier);
}

interface PageProduit {
  url: string;
  /** L'adresse finale après redirections : deux slugs qui y aboutissent sont un seul jeu. */
  urlFinale: string;
  titre: string;
}

const cachePages = new Map<string, PageProduit | null>();

async function lirePageProduit(studio: string, slug: string): Promise<PageProduit | null> {
  const patron = PAGES_PRODUIT[studio];
  if (HORS_LIGNE || !patron) return null;
  const url = patron(slug);
  const dejaLue = cachePages.get(url);
  if (dejaLue !== undefined) return dejaLue;

  let page: PageProduit | null = null;
  try {
    const reponse = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(25_000) });
    const html = await reponse.text();
    const titre = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    /*
     * Le code HTTP ne sert à rien ici : Pragmatic et NetEnt répondent 200 sur
     * un slug inexistant, l'un avec « Page not found », l'autre avec sa page
     * d'accueil. C'est le titre qui dit si la page parle du jeu.
     */
    page = { url, urlFinale: reponse.url || url, titre: decoderEntites(titre).trim() };
  } catch {
    page = null;
  }
  cachePages.set(url, page);
  return page;
}

/** La page parle-t-elle bien d'un des deux titres du groupe ? */
function pageDecritLeJeu(page: PageProduit | null, noms: string[]): boolean {
  if (!page || !page.titre) return false;
  const titre = normaliser(page.titre);
  return noms.some((nom) => normaliser(nom).length >= 4 && titre.includes(normaliser(nom)));
}

interface Fiche {
  id: string;
  slug: string;
  nom: string;
  studioSlug: string;
  demoUrl: string | null;
  visuelUrl: string | null;
  rtpStudio: unknown;
  rtpPaliers: unknown[];
  rtpAchatBonus: unknown;
  rtpSource: string | null;
  rtpConfiance: string;
  rtpVerifieLe: Date | null;
  volatilite: string | null;
  gainMaxMultiple: number | null;
  grille: string | null;
  lignesPaiement: string | null;
  mecaniques: string[];
  achatBonus: boolean | null;
  sortieLe: Date | null;
  captures: unknown;
  capturesLe: Date | null;
  confiance: string;
  nbPreuves: number;
  nbTraductions: number;
  nbDisponibilites: number;
}

/*
 * L'inventaire de ce qu'une fiche porte.
 *
 * Il sert au veto, et le veto est la seule chose qui sépare ce script d'une
 * perte de données : tout champ compté ici est un champ qu'on refuse de
 * laisser disparaître. Les compteurs valent mieux qu'un booléen — huit
 * captures contre trois est une perte, même si les deux fiches en ont.
 */
function inventaire(fiche: Fiche): Map<string, { presence: number; valeur: string }> {
  const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const entree = (valeur: unknown) => ({ presence: texte(valeur) ? 1 : 0, valeur: texte(valeur) });
  const compte = (n: number) => ({ presence: n, valeur: `${n}` });

  return new Map([
    ['rtpStudio', entree(fiche.rtpStudio)],
    ['rtpPaliers', compte(fiche.rtpPaliers.length)],
    ['rtpAchatBonus', entree(fiche.rtpAchatBonus)],
    ['rtpSource', entree(fiche.rtpSource)],
    ['rtpVerifieLe', entree(fiche.rtpVerifieLe?.toISOString())],
    ['volatilite', entree(fiche.volatilite)],
    ['gainMaxMultiple', entree(fiche.gainMaxMultiple)],
    ['grille', entree(fiche.grille)],
    ['lignesPaiement', entree(fiche.lignesPaiement)],
    ['mecaniques', compte(fiche.mecaniques.length)],
    ['achatBonus', entree(fiche.achatBonus === null ? null : String(fiche.achatBonus))],
    ['sortieLe', entree(fiche.sortieLe?.toISOString().slice(0, 10))],
    ['demoUrl', entree(fiche.demoUrl)],
    ['visuelUrl', entree(fiche.visuelUrl)],
    ['captures', compte(nombreDeCaptures(fiche.captures))],
    ['preuves', compte(fiche.nbPreuves)],
    ['traductions', compte(fiche.nbTraductions)],
    ['disponibilites', compte(fiche.nbDisponibilites)],
  ]);
}

/** Ce que la gardée n'a pas et que la condamnée porte. Vide = suppression sans perte. */
function pertes(gardee: Fiche, condamnee: Fiche): string[] {
  const a = inventaire(gardee);
  const b = inventaire(condamnee);
  const manques: string[] = [];
  for (const [champ, chezElle] of b) {
    const chezLa = a.get(champ)!;
    if (chezElle.presence > chezLa.presence) {
      manques.push(`${champ} (${chezElle.valeur} contre ${chezLa.valeur || 'rien'})`);
    }
  }
  return manques;
}

type Statut = 'supprimable' | 'refus' | 'ambigu' | 'non-corrobore';

interface Groupe {
  fiches: Fiche[];
  corroborations: string[];
  statut: Statut;
  gardee?: Fiche;
  raison?: string;
  obstacles: string[];
}

/* ── Détection ──────────────────────────────────────────────────────────── */

function detecter(fiches: Fiche[]): Fiche[][] {
  const signaux: Array<(f: Fiche) => string | null> = [
    (f) => (f.demoUrl ? `lanceur:${identifiantDeLanceur(f.demoUrl)}` : null),
    (f) => `nom:${normaliser(f.nom)}`,
    (f) => `slug:${normaliser(f.slug.replace(SUFFIXES_D_IMPORT, ''))}`,
  ];

  /*
   * Les trois signaux se recoupent largement ; les fusionner par fiche évite
   * de rapporter trois fois la même paire, et de proposer trois suppressions
   * pour une.
   */
  const groupesParFiche = new Map<string, Set<string>>();
  for (const signal of signaux) {
    const paniers = new Map<string, Fiche[]>();
    for (const f of fiches) {
      const cle = signal(f);
      if (!cle || cle.endsWith(':') || cle.endsWith('null')) continue;
      const complete = `${f.studioSlug}|${cle}`;
      if (!paniers.has(complete)) paniers.set(complete, []);
      paniers.get(complete)!.push(f);
    }
    for (const panier of paniers.values()) {
      if (panier.length < 2) continue;
      const union = new Set(panier.map((f) => f.id));
      for (const f of panier) {
        const deja = groupesParFiche.get(f.id);
        if (deja) for (const id of deja) union.add(id);
      }
      for (const id of union) groupesParFiche.set(id, union);
    }
  }

  const vus = new Set<Set<string>>();
  const parId = new Map(fiches.map((f) => [f.id, f]));
  const groupes: Fiche[][] = [];
  for (const union of groupesParFiche.values()) {
    if (vus.has(union)) continue;
    vus.add(union);
    groupes.push([...union].map((id) => parId.get(id)!).sort((x, y) => x.slug.localeCompare(y.slug)));
  }
  return groupes;
}

/* ── Corroboration : est-ce vraiment le même jeu ? ──────────────────────── */

async function corroborer(fiches: Fiche[]): Promise<string[]> {
  const preuves: string[] = [];

  const lanceurs = fiches.map((f) => (f.demoUrl ? identifiantDeLanceur(f.demoUrl) : null));
  if (lanceurs[0] && lanceurs.every((l) => l === lanceurs[0])) {
    preuves.push(`le lanceur désigne le même jeu (${lanceurs[0]})`);
  }

  const noms = fiches.map((f) => normaliser(f.nom));
  if (noms.every((n) => n === noms[0])) {
    preuves.push('nom identique une fois la ponctuation et les mots de liaison retirés');
  }

  const pages = await Promise.all(fiches.map((f) => lirePageProduit(f.studioSlug, f.slug)));
  const finales = pages.map((p) => (p && pageDecritLeJeu(p, fiches.map((f) => f.nom)) ? p.urlFinale : null));
  if (finales[0] && finales.every((u) => u === finales[0])) {
    preuves.push(`les deux adresses produit aboutissent à ${finales[0]}`);
  }

  const titres = pages.map((p, i) => (pageDecritLeJeu(p, [fiches[i].nom]) ? normaliser(p!.titre) : null));
  if (titres.every((t) => t !== null) && new Set(titres).size === 1) {
    preuves.push('les deux pages produit portent le même titre officiel');
  }

  return preuves;
}

/* ── Arbitrage : laquelle garder ? ──────────────────────────────────────── */

async function arbitrer(fiches: Fiche[]): Promise<{ gardee: Fiche; raison: string } | null> {
  const noms = fiches.map((f) => f.nom);
  const pages = await Promise.all(fiches.map((f) => lirePageProduit(f.studioSlug, f.slug)));
  const reconnues = fiches.filter((_, i) => pageDecritLeJeu(pages[i], noms));

  /*
   * Le studio d'abord : un slug que sa page produit ignore est un slug que
   * l'import a fabriqué. C'est le seul critère qui regarde le jeu plutôt que
   * l'état de notre base.
   */
  if (reconnues.length === 1 && pages.some((p) => p !== null)) {
    const perdantes = fiches.filter((f) => f !== reconnues[0]).map((f) => f.slug);
    return {
      gardee: reconnues[0],
      raison: `seul slug que ${reconnues[0].studioSlug} reconnaît — ${perdantes.join(', ')} n'y répond pas`,
    };
  }

  const criteres: Array<{ nom: string; mesure: (f: Fiche) => number }> = [
    { nom: 'captures', mesure: (f) => nombreDeCaptures(f.captures) },
    { nom: 'preuves', mesure: (f) => f.nbPreuves },
    { nom: 'traductions', mesure: (f) => f.nbTraductions },
  ];

  for (const critere of criteres) {
    const classees = [...fiches].sort((x, y) => critere.mesure(y) - critere.mesure(x));
    const tete = critere.mesure(classees[0]);
    if (tete > 0 && tete > critere.mesure(classees[1])) {
      return {
        gardee: classees[0],
        raison: `${tete} ${critere.nom} contre ${critere.mesure(classees[1])}`,
      };
    }
  }

  return null;
}

/* ── Rapport ────────────────────────────────────────────────────────────── */

function decrire(fiche: Fiche, gardee: boolean): string {
  const marque = gardee ? 'GARDÉE  ' : 'À SUPPRIMER';
  const chiffres = [
    `${nombreDeCaptures(fiche.captures)} captures`,
    `${fiche.nbPreuves} preuves`,
    `${fiche.nbTraductions} traductions`,
    fiche.demoUrl ? 'démo' : 'sans démo',
    fiche.visuelUrl ? 'visuel' : 'sans visuel',
  ].join(', ');
  return `    ${marque}  ${fiche.slug}  «${fiche.nom}»  — ${chiffres}`;
}

function afficher(titre: string, groupes: Groupe[], commentaire: string) {
  console.log(`\n── ${titre} — ${groupes.length} ${'─'.repeat(Math.max(0, 60 - titre.length))}`);
  console.log(`   ${commentaire}\n`);
  for (const g of groupes) {
    console.log(`  ${g.fiches.map((f) => f.slug).join('  /  ')}   [${g.fiches[0].studioSlug}]`);
    for (const f of g.fiches) console.log(decrire(f, f === g.gardee));
    if (g.corroborations.length) {
      for (const c of g.corroborations) console.log(`      même jeu : ${c}`);
    } else {
      console.log('      même jeu : rien ne le prouve');
    }
    if (g.raison) console.log(`      arbitrage : ${g.raison}`);
    for (const o of g.obstacles) console.log(`      obstacle : ${o}`);
    console.log('');
  }
}

async function main() {
  const brutes = await prisma.jeu.findMany({
    select: {
      id: true,
      slug: true,
      nom: true,
      demoUrl: true,
      visuelUrl: true,
      rtpStudio: true,
      rtpPaliers: true,
      rtpAchatBonus: true,
      rtpSource: true,
      rtpConfiance: true,
      rtpVerifieLe: true,
      volatilite: true,
      gainMaxMultiple: true,
      grille: true,
      lignesPaiement: true,
      mecaniques: true,
      achatBonus: true,
      sortieLe: true,
      captures: true,
      capturesLe: true,
      confiance: true,
      studio: { select: { slug: true } },
      _count: { select: { preuves: true, traductions: true, disponibilites: true } },
    },
  });

  const fiches: Fiche[] = brutes.map((j) => ({
    ...j,
    studioSlug: j.studio.slug,
    rtpConfiance: String(j.rtpConfiance),
    confiance: String(j.confiance),
    volatilite: j.volatilite === null ? null : String(j.volatilite),
    nbPreuves: j._count.preuves,
    nbTraductions: j._count.traductions,
    nbDisponibilites: j._count.disponibilites,
  }));

  const detectes = detecter(fiches);
  console.log(`\n${fiches.length} fiches en base, ${detectes.length} groupes suspects.`);
  if (!HORS_LIGNE) console.log('Interrogation des pages produit des studios…');

  const groupes: Groupe[] = [];
  for (const g of detectes) {
    const corroborations = await corroborer(g);
    const groupe: Groupe = { fiches: g, corroborations, statut: 'non-corrobore', obstacles: [] };

    if (!corroborations.length) {
      groupe.obstacles.push('ressemblance de nom seulement — deux titres voisins ne sont pas un doublon');
      groupes.push(groupe);
      continue;
    }

    /*
     * Un groupe de trois fiches ou plus demande un arbitrage à N branches que
     * personne n'a vérifié à la main. On le rapporte et on s'arrête là.
     */
    if (g.length > 2) {
      groupe.statut = 'ambigu';
      groupe.obstacles.push(`${g.length} fiches dans le groupe — arbitrage à faire à la main`);
      groupes.push(groupe);
      continue;
    }

    const verdict = await arbitrer(g);
    if (!verdict) {
      groupe.statut = 'ambigu';
      groupe.obstacles.push('aucun critère ne départage : même travail des deux côtés');
      groupes.push(groupe);
      continue;
    }

    groupe.gardee = verdict.gardee;
    groupe.raison = verdict.raison;
    const condamnee = g.find((f) => f !== verdict.gardee)!;
    const manques = pertes(verdict.gardee, condamnee);
    if (manques.length) {
      groupe.statut = 'refus';
      groupe.obstacles.push(`la gardée perdrait : ${manques.join(' · ')}`);
    } else {
      groupe.statut = 'supprimable';
    }
    groupes.push(groupe);
  }

  const par = (s: Statut) => groupes.filter((g) => g.statut === s);

  afficher(
    'SUPPRIMABLES',
    par('supprimable'),
    'Même jeu prouvé, arbitrage tranché, et la gardée ne perd rien.',
  );
  afficher(
    'REFUS — la gardée perdrait quelque chose',
    par('refus'),
    'Recopier ce qui manque sur la fiche gardée, puis relancer : elles basculeront.',
  );
  afficher(
    'AMBIGUS — aucun critère ne tranche',
    par('ambigu'),
    'À trancher à la main : le script ne choisit pas au hasard.',
  );
  afficher(
    'NON CORROBORÉS — à vérifier à la main',
    par('non-corrobore'),
    'Noms proches sans preuve que ce soit le même jeu. Souvent des suites légitimes.',
  );

  const aSupprimer = par('supprimable');
  console.log(`\n${'═'.repeat(70)}`);
  console.log(
    `  ${groupes.length} groupes : ${aSupprimer.length} supprimables, ${par('refus').length} refusés, ` +
      `${par('ambigu').length} ambigus, ${par('non-corrobore').length} non corroborés.`,
  );

  if (!APPLIQUER) {
    console.log(`\n  SIMULATION — ${aSupprimer.length} fiches seraient supprimées. Ajouter --appliquer.`);
    console.log('  Rappel : aucune redirection n\'existe, chaque slug supprimé devient un 404.\n');
    return;
  }

  for (const g of aSupprimer) {
    const condamnee = g.fiches.find((f) => f !== g.gardee)!;
    await prisma.jeu.delete({ where: { id: condamnee.id } });
    console.log(`  supprimée : ${condamnee.slug} (gardée : ${g.gardee!.slug})`);
  }
  console.log(`\n  ${aSupprimer.length} fiches supprimées.\n`);
}

main().finally(() => prisma.$disconnect());
