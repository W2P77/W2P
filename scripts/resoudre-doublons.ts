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
 * 1. **Est-ce le même jeu ?**  Un nom voisin ne prouve rien, et un symbole de
 *    lanceur partagé non plus. « Pirate Gold » et « Pirate's Riches » portent
 *    tous deux `gameSymbol=vs40pirate` en base, et pourtant Pragmatic publie
 *    deux pages produit distinctes : le symbole partagé prouve qu'**une des
 *    deux démos est fausse**, pas que les deux fiches sont un seul jeu. Le
 *    script sépare donc les *preuves* d'identité — nom identique, même page
 *    produit — des simples *indices*, qui n'autorisent jamais une suppression.
 *
 * 2. **Laquelle garder ?**  D'abord la page produit du studio : elle porte le
 *    titre officiel, et un slug qu'elle ne connaît pas est un slug inventé.
 *    Ensuite les captures, puis les preuves, puis les traductions — le travail
 *    déjà fait. En dernier recours le slug nu, quand l'autre n'ajoute qu'un
 *    suffixe de collision d'import. Si rien ne départage, le groupe reste
 *    ambigu et personne n'y touche.
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

/*
 * Les suffixes qu'un import colle au slug quand le précédent est déjà pris.
 *
 * Aucun d'eux n'appartient au nom d'un jeu : `-netent` est le studio,
 * `-slot` la catégorie, `-1` un compteur de collision. Les suffixes porteurs
 * de sens — `-2`, `-deluxe`, `-megaways` — en sont exclus exprès : « Story of
 * Alice » et « Story of Alice 2 » sont deux jeux.
 */
const SUFFIXES_D_IMPORT = /(?:-slot|-slots|-game|-netent|-hacksaw|-btg|-original|-1)+$/;

/*
 * Les paramètres par lesquels un lanceur nomme le jeu qu'il ouvre.
 *
 * Wazdan sert ses 250 jeux depuis une seule adresse — `…/gamelauncher?game=411` —
 * et le chemin est identique pour tous. Sans cette liste, le chemin seul
 * déclarait les 250 fiches doublons les unes des autres.
 */
const PARAMETRES_DE_JEU = ['gamesymbol', 'gid', 'game', 'gameid', 'gamename', 'symbol'];

/**
 * Ce que l'adresse de démo désigne comme jeu.
 *
 * Le paramètre du lanceur d'abord : c'est l'identifiant interne du studio, et
 * deux fiches qui le partagent pointent le même binaire. À défaut, le
 * **chemin entier** — jamais le dernier segment seul, parce que
 * `…/fullstate/…/adrenalinerush` et `…/socketgames/…/adrenalinerush` sont deux
 * jeux Evoplay différents.
 */
function identifiantDeLanceur(url: string): string | null {
  let adresse: URL;
  try {
    adresse = new URL(url);
  } catch {
    return null;
  }
  for (const attendu of PARAMETRES_DE_JEU) {
    for (const [cle, valeur] of adresse.searchParams) {
      if (cle.toLowerCase() === attendu && valeur) return `${attendu}=${valeur.toLowerCase()}`;
    }
  }
  const chemin = adresse.pathname.replace(/\/+$/, '').toLowerCase();
  return chemin && chemin !== '/' ? `chemin=${chemin}` : null;
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
  /** L'adresse finale après redirections. C'est elle qui désigne la page réelle. */
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

/** La page parle-t-elle bien d'un des titres du groupe ? Sinon, le slug n'existe pas chez le studio. */
function pageDecritLeJeu(page: PageProduit | null, noms: string[]): boolean {
  if (!page?.titre) return false;
  const titre = normaliser(page.titre);
  return noms.some((nom) => normaliser(nom).length >= 4 && titre.includes(normaliser(nom)));
}

/*
 * Le jeu que l'adresse finale désigne, débarrassé de la langue.
 *
 * Pragmatic renvoie le même jeu sous `/en/games/luxor-of-cleopatra/` et
 * `/br/jogos/luxor-of-cleopatra/` : comparer les URL entières ferait passer
 * deux fois la même page pour deux pages. Le dernier segment, normalisé,
 * neutralise la langue comme il neutralise le « - » de « big-bass-hold-and-
 * spinner » contre « big-bass-hold-spinner ».
 */
function jeuDesignePar(page: PageProduit): string {
  try {
    return normaliser(new URL(page.urlFinale).pathname.replace(/\/+$/, '').split('/').pop() ?? '');
  } catch {
    return '';
  }
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
  /* `AUCUNE` est le défaut du schéma : l'absence de niveau, pas un niveau. */
  const niveau = (v: string) => ({ presence: v === 'AUCUNE' ? 0 : 1, valeur: v });

  return new Map([
    ['rtpStudio', entree(fiche.rtpStudio)],
    ['rtpPaliers', compte(fiche.rtpPaliers.length)],
    ['rtpAchatBonus', entree(fiche.rtpAchatBonus)],
    ['rtpSource', entree(fiche.rtpSource)],
    ['rtpConfiance', niveau(fiche.rtpConfiance)],
    ['rtpVerifieLe', entree(fiche.rtpVerifieLe?.toISOString().slice(0, 10))],
    ['confiance', niveau(fiche.confiance)],
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
  const chezGardee = inventaire(gardee);
  const chezCondamnee = inventaire(condamnee);
  const manques: string[] = [];
  for (const [champ, valeurCondamnee] of chezCondamnee) {
    const valeurGardee = chezGardee.get(champ)!;
    if (valeurCondamnee.presence > valeurGardee.presence) {
      manques.push(`${champ} (${valeurCondamnee.valeur} contre ${valeurGardee.valeur || 'rien'})`);
    }
  }
  return manques;
}

type Statut = 'supprimable' | 'refus' | 'ambigu' | 'lanceur-partage' | 'non-corrobore';

interface Groupe {
  fiches: Fiche[];
  /** Ce qui établit qu'il s'agit d'un seul jeu. Vide = on ne supprime rien. */
  preuves: string[];
  /** Ce qui attire l'attention sans rien prouver. */
  indices: string[];
  statut: Statut;
  gardee?: Fiche;
  raison?: string;
  obstacles: string[];
}

/* ── Détection ──────────────────────────────────────────────────────────── */

/*
 * Au-delà de trois fiches, un signal ne décrit plus un doublon.
 *
 * Un vrai doublon se compte sur les doigts d'une main. Un signal qui en réunit
 * cent décrit autre chose — une adresse de démo générique, un nom de série
 * trop court — et le laisser passer noierait les vraies paires sous des
 * centaines de faux positifs. Le lot écarté est rapporté à part : c'est un
 * défaut de données, pas un doublon.
 */
const TAILLE_MAX_D_UN_SIGNAL = 3;

interface Detection {
  groupes: Fiche[][];
  /** Les clés qui réunissent trop de fiches pour désigner un jeu. */
  signauxTropLarges: Array<{ cle: string; nombre: number; exemples: string[] }>;
}

function detecter(fiches: Fiche[]): Detection {
  const signaux: Array<(f: Fiche) => string | null> = [
    (f) => (f.demoUrl ? identifiantDeLanceur(f.demoUrl) : null),
    (f) => `nom:${normaliser(f.nom)}`,
    (f) => `slug:${normaliser(f.slug.replace(SUFFIXES_D_IMPORT, ''))}`,
    /*
     * Les variantes chiffrées, et pourquoi elles ne sont qu'une question.
     *
     * « Blood Suckers 2 », « Gates of Olympus 1000 » sont des jeux à part
     * entière : retirer les chiffres d'un slug réunit 404 groupes dont la
     * quasi-totalité sont des suites légitimes. Le signal ne tranche donc
     * rien — il désigne des couples à interroger, et c'est la page produit qui
     * répond. Elle sépare proprement les suites, et c'est elle qui a montré
     * que `snakes-ladders-2-snake-eyes` renvoie, lui, vers la fiche sans le 2.
     *
     * D'où la restriction aux studios dont on sait lire la page produit :
     * ailleurs, le signal ne produirait que des groupes qu'aucune preuve ne
     * pourrait départager.
     */
    (f) => {
      if (!PAGES_PRODUIT[f.studioSlug]) return null;
      const sansChiffres = normaliser(f.slug.replace(/[0-9]/g, ''));
      return sansChiffres.length >= 6 ? `chiffres:${sansChiffres}` : null;
    },
  ];

  /*
   * Les trois signaux se recoupent largement ; les fusionner par fiche évite
   * de rapporter trois fois la même paire, et de proposer trois suppressions
   * pour une.
   */
  const groupesParFiche = new Map<string, Set<string>>();
  const signauxTropLarges: Detection['signauxTropLarges'] = [];

  for (const signal of signaux) {
    const paniers = new Map<string, Fiche[]>();
    for (const f of fiches) {
      const cle = signal(f);
      if (!cle || cle.endsWith(':')) continue;
      const complete = `${f.studioSlug}|${cle}`;
      if (!paniers.has(complete)) paniers.set(complete, []);
      paniers.get(complete)!.push(f);
    }
    for (const [cle, panier] of paniers) {
      if (panier.length < 2) continue;
      if (panier.length > TAILLE_MAX_D_UN_SIGNAL) {
        signauxTropLarges.push({
          cle,
          nombre: panier.length,
          exemples: panier.slice(0, 3).map((f) => f.slug),
        });
        continue;
      }
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
  return { groupes, signauxTropLarges };
}

/* ── Corroboration : est-ce vraiment le même jeu ? ──────────────────────── */

async function corroborer(fiches: Fiche[]): Promise<{ preuves: string[]; indices: string[] }> {
  const preuves: string[] = [];
  const indices: string[] = [];
  const noms = fiches.map((f) => f.nom);

  const lanceurs = fiches.map((f) => (f.demoUrl ? identifiantDeLanceur(f.demoUrl) : null));
  if (lanceurs[0] && lanceurs.every((l) => l === lanceurs[0])) {
    /*
     * Un indice, jamais une preuve : deux fiches peuvent partager un symbole
     * parce que l'une porte la démo de l'autre. C'est même le cas le plus
     * fréquent, et le supprimer effacerait un vrai jeu.
     */
    indices.push(`même identifiant de lanceur (${lanceurs[0]}) — une des deux démos est peut-être fausse`);
  }

  if (fiches.map((f) => normaliser(f.nom)).every((n, _, tous) => n === tous[0])) {
    preuves.push('nom identique une fois la ponctuation et les mots de liaison retirés');
  }

  const pages = await Promise.all(fiches.map((f) => lirePageProduit(f.studioSlug, f.slug)));
  const valides = pages.map((p) => (pageDecritLeJeu(p, noms) ? p! : null));

  if (valides.every((p) => p !== null)) {
    const designes = valides.map((p) => jeuDesignePar(p!));
    if (designes[0] && designes.every((d) => d === designes[0])) {
      preuves.push(`les deux adresses produit aboutissent au même jeu chez le studio (${designes[0]})`);
    }
  }

  /*
   * Le cas `vikings` / `vikings-netent` : le second slug n'est pas celui du
   * studio, c'est le premier auquel un import a collé le nom du studio pour
   * éviter une collision. Le studio ne connaissant que le slug nu, il n'y a
   * qu'un jeu.
   */
  const nus = fiches.map((f) => f.slug.replace(SUFFIXES_D_IMPORT, ''));
  const reconnues = fiches.filter((_, i) => valides[i] !== null);
  if (nus.every((s) => s === nus[0]) && reconnues.length === 1 && pages.some((p) => p !== null)) {
    const ignores = fiches.filter((f) => f !== reconnues[0]).map((f) => f.slug);
    preuves.push(
      `même slug à un suffixe d'import près, et ${fiches[0].studioSlug} ne connaît que ${reconnues[0].slug} (pas ${ignores.join(', ')})`,
    );
  }

  return { preuves, indices };
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

  /*
   * Dernier recours, et seulement parce que l'identité du jeu est déjà
   * prouvée : entre `sweet-bonanza` et `sweet-bonanza-slot`, également vides,
   * le suffixe n'appartient pas au nom du jeu. On garde l'URL que le nom
   * justifie.
   */
  const nus = fiches.map((f) => f.slug.replace(SUFFIXES_D_IMPORT, ''));
  if (nus.every((s) => s === nus[0])) {
    const nue = fiches.find((f) => f.slug === nus[0]);
    if (nue) {
      const suffixes = fiches.filter((f) => f !== nue).map((f) => f.slug.slice(nus[0].length));
      return {
        gardee: nue,
        raison: `à travail égal, le slug nu : « ${suffixes.join(', ')} » vient d'une collision d'import, pas du nom du jeu`,
      };
    }
  }

  return null;
}

/* ── Rapport ────────────────────────────────────────────────────────────── */

function decrire(fiche: Fiche, groupe: Groupe): string {
  const marque = !groupe.gardee ? '   ?      ' : fiche === groupe.gardee ? 'GARDÉE    ' : 'À SUPPRIMER';
  const chiffres = [
    `${nombreDeCaptures(fiche.captures)} captures`,
    `${fiche.nbPreuves} preuves`,
    `${fiche.nbTraductions} traductions`,
    fiche.demoUrl ? 'démo' : 'sans démo',
    fiche.visuelUrl ? 'visuel' : 'sans visuel',
  ].join(', ');
  return `    ${marque}  ${fiche.slug}  «${fiche.nom}»  — ${chiffres}`;
}

function afficher(titre: string, groupes: Groupe[], commentaire: string, limite = 0) {
  console.log(`\n── ${titre} — ${groupes.length} ${'─'.repeat(Math.max(3, 62 - titre.length))}`);
  console.log(`   ${commentaire}\n`);
  const montres = limite > 0 ? groupes.slice(0, limite) : groupes;
  for (const g of montres) {
    console.log(`  ${g.fiches.map((f) => f.slug).join('  /  ')}   [${g.fiches[0].studioSlug}]`);
    for (const f of g.fiches) console.log(decrire(f, g));
    if (g.preuves.length) for (const p of g.preuves) console.log(`      même jeu : ${p}`);
    else console.log('      même jeu : rien ne le prouve');
    for (const i of g.indices) console.log(`      indice : ${i}`);
    if (g.raison) console.log(`      arbitrage : ${g.raison}`);
    for (const o of g.obstacles) console.log(`      obstacle : ${o}`);
    console.log('');
  }
  if (montres.length < groupes.length) {
    console.log(`  … et ${groupes.length - montres.length} autres du même genre.\n`);
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

  const { groupes: detectes, signauxTropLarges } = detecter(fiches);
  console.log(`\n${fiches.length} fiches en base, ${detectes.length} groupes suspects.`);
  if (!HORS_LIGNE) console.log('Interrogation des pages produit des studios…');

  /*
   * L'unité de travail est la **paire**, pas l'amas.
   *
   * Un amas mélange les deux : `the-dog-house-megaways`, son doublon
   * `…-megaways-slot` et la suite légitime `…-megaways-1000` arrivent
   * ensemble, parce que le signal des variantes chiffrées attrape la
   * troisième. Raisonner sur l'amas ferait bloquer un vrai doublon par un jeu
   * qui n'a rien à y faire. Chaque couple est donc corroboré pour lui-même, et
   * seuls les couples prouvés sont arbitrés.
   */
  const groupes: Groupe[] = [];
  for (const amas of detectes) {
    const couples: Array<{ duo: Fiche[]; preuves: string[]; indices: string[] }> = [];
    for (let i = 0; i < amas.length; i += 1) {
      for (let j = i + 1; j < amas.length; j += 1) {
        const duo = [amas[i], amas[j]];
        couples.push({ duo, ...(await corroborer(duo)) });
      }
    }

    const prouves = couples.filter((c) => c.preuves.length);
    if (!prouves.length) {
      const indices = [...new Set(couples.flatMap((c) => c.indices))];
      groupes.push({
        fiches: amas,
        preuves: [],
        indices,
        statut: indices.length ? 'lanceur-partage' : 'non-corrobore',
        obstacles: [
          indices.length
            ? 'le lanceur ne prouve pas un seul jeu : vérifier laquelle des démos est fausse'
            : 'ressemblance de nom seulement — deux titres voisins ne sont pas un doublon',
        ],
      });
      continue;
    }

    /*
     * Une fiche appariée à deux autres forme une chaîne : A double B, B double
     * C, sans que A et C se répondent. Supprimer au fil de l'eau y détruirait
     * la mauvaise. On rend la main.
     */
    const apparitions = new Map<string, number>();
    for (const c of prouves) for (const f of c.duo) apparitions.set(f.id, (apparitions.get(f.id) ?? 0) + 1);

    for (const couple of prouves) {
      const groupe: Groupe = {
        fiches: couple.duo,
        preuves: couple.preuves,
        indices: couple.indices,
        statut: 'ambigu',
        obstacles: [],
      };

      if (couple.duo.some((f) => (apparitions.get(f.id) ?? 0) > 1)) {
        groupe.obstacles.push('une de ces fiches est aussi appariée à une troisième — chaîne à démêler à la main');
        groupes.push(groupe);
        continue;
      }

      const verdict = await arbitrer(couple.duo);
      if (!verdict) {
        groupe.obstacles.push('aucun critère ne départage : même travail des deux côtés');
        groupes.push(groupe);
        continue;
      }

      groupe.gardee = verdict.gardee;
      groupe.raison = verdict.raison;
      const condamnee = couple.duo.find((f) => f !== verdict.gardee)!;
      const manques = pertes(verdict.gardee, condamnee);
      if (manques.length) {
        groupe.statut = 'refus';
        groupe.obstacles.push(`la gardée perdrait : ${manques.join(' · ')}`);
      } else {
        groupe.statut = 'supprimable';
      }
      groupes.push(groupe);
    }
  }

  const par = (s: Statut) => groupes.filter((g) => g.statut === s);

  afficher('SUPPRIMABLES', par('supprimable'), 'Même jeu prouvé, arbitrage tranché, et la gardée ne perd rien.');
  afficher(
    'REFUS — la gardée perdrait quelque chose',
    par('refus'),
    'Recopier ce qui manque sur la fiche gardée, puis relancer : elles basculeront.',
  );
  afficher(
    'AMBIGUS — aucun critère ne tranche',
    par('ambigu'),
    'Même jeu prouvé, mais rien ne désigne la fiche à garder. À trancher à la main.',
  );
  afficher(
    'MÊME LANCEUR, JEUX PEUT-ÊTRE DIFFÉRENTS',
    par('lanceur-partage'),
    'Une démo pour deux fiches : corriger la mauvaise démo, ne rien supprimer avant.',
  );
  afficher(
    'NON CORROBORÉS — à vérifier à la main',
    par('non-corrobore'),
    'Noms proches sans preuve que ce soit le même jeu. Souvent des suites légitimes.',
    12,
  );

  if (signauxTropLarges.length) {
    console.log(`\n── SIGNAUX ÉCARTÉS — ${signauxTropLarges.length} ${'─'.repeat(40)}`);
    console.log('   Trop de fiches pour désigner un jeu : à traiter comme un défaut de données.\n');
    for (const s of signauxTropLarges.sort((x, y) => y.nombre - x.nombre)) {
      console.log(`  ${s.nombre} fiches partagent ${s.cle}  (${s.exemples.join(', ')}…)`);
    }
    console.log('');
  }

  const aSupprimer = par('supprimable');
  console.log(`\n${'═'.repeat(72)}`);
  console.log(
    `  ${groupes.length} groupes : ${aSupprimer.length} supprimables, ${par('refus').length} refusés, ` +
      `${par('ambigu').length} ambigus, ${par('lanceur-partage').length} à démo douteuse, ` +
      `${par('non-corrobore').length} non corroborés.`,
  );

  if (!APPLIQUER) {
    console.log(`\n  SIMULATION — ${aSupprimer.length} fiches seraient supprimées. Ajouter --appliquer.`);
    console.log("  Rappel : aucune redirection n'existe, chaque slug supprimé devient un 404.\n");
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
