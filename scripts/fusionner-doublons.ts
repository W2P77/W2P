/*
 * Rassembler sur une seule fiche le contenu des onze paires qui décrivent un
 * seul jeu — sans rien trancher que les données ne tranchent déjà.
 *
 * ── Pourquoi ce script existe ─────────────────────────────────────────────
 *
 * `resoudre-doublons.ts` a fait la moitié du chemin : il a **prouvé** que ces
 * onze paires désignent le même jeu, puis il a refusé de supprimer. Son veto
 * est simple et juste — la fiche condamnée porte du contenu que la gardée n'a
 * pas, et `Traduction`, `Preuve` et `DisponibiliteCasino` sont en
 * `onDelete: Cascade` : la suppression emporterait tout sans un mot.
 *
 * Le veto ne se lève pas en le désactivant, il se lève en déplaçant le
 * contenu. C'est ce que fait ce script, et rien d'autre : **il ne supprime
 * jamais**. Une fois la fusion appliquée, `resoudre-doublons.ts` reclassera de
 * lui-même les paires vidées en « supprimables », et c'est lui qui supprimera.
 * Deux responsabilités, deux scripts : celui qui déplace ne détruit pas.
 *
 * ── La règle d'arbitrage, dans cet ordre et sans exception ────────────────
 *
 * 1. **Une valeur prouvée gagne toujours.** La table `Preuve` enregistre ce
 *    qui a été lu dans le panneau de règles ou sur la fiche produit, champ par
 *    champ. Une valeur qui porte une preuve fait foi contre une valeur qui
 *    n'en porte pas — y compris quand c'est la fiche condamnée qui la porte,
 *    auquel cas la gardée est corrigée.
 * 2. **Sinon, une valeur présente bat une valeur absente.** Un champ nul n'est
 *    pas un avis contraire, c'est un trou.
 * 3. **Sinon — deux valeurs différentes, aucune prouvée — on ne touche à
 *    rien.** Ni « la plus grande », ni « la plus récente », ni « la plus
 *    vraisemblable » : ces trois réflexes fabriquent une donnée que personne
 *    n'a lue. La contradiction est rapportée telle quelle et attend un
 *    arbitrage humain. C'est la seule raison pour laquelle ce script laisse
 *    volontairement des paires non fusionnables.
 *
 * ── Deux choses qui ne se déplacent pas seules ────────────────────────────
 *
 * `rtpSource`, `rtpConfiance` et `rtpVerifieLe` **n'ont de sens qu'attachés au
 * chiffre qu'ils attestent**. Les recopier sur une fiche qui affiche un autre
 * RTP reviendrait à déclarer sourcé un nombre que la source ne dit pas — la
 * fabrication la plus facile et la plus invisible de tout ce chantier. Ils ne
 * voyagent donc que si les deux fiches s'accordent sur `rtpStudio`, ou si
 * c'est justement ce RTP-là qui arrive.
 *
 * Les **captures** obéissent à la même contrainte, pour une raison qu'on ne
 * voit qu'en lisant leur contenu : leurs légendes portent le chiffre.
 * « Stated by the game itself: RTP 96.47% » posé sur une fiche qui annonce
 * 96,50 % publie la contradiction à l'écran, en image, sous le label le plus
 * fort du site. Une capture n'est pas un fichier, c'est un témoignage.
 *
 * ── Quelle fiche est gardée ───────────────────────────────────────────────
 *
 * Le studio d'abord : un slug que sa page produit ignore est un slug que notre
 * import a fabriqué. À défaut — les deux pages répondent — le slug nu, celui
 * auquel l'autre n'ajoute qu'un suffixe de collision.
 *
 * Les critères intermédiaires de `resoudre-doublons.ts` (le plus de captures,
 * puis de preuves, puis de traductions) ne sont **pas** repris ici, et c'est
 * délibéré : là-bas ils protégeaient le travail déjà fait d'une suppression.
 * Ici la fusion le protège de toute façon, quel que soit le sens. Il ne reste
 * donc qu'une question — quelle URL le studio reconnaît — et le nombre de nos
 * captures n'y répond pas. Le reste de la mécanique (lecture des pages
 * produit, liste des suffixes d'import, normalisation des titres) est repris
 * mot pour mot du script frère : il s'exécute au chargement et n'exporte rien,
 * on ne peut donc pas l'importer sans déclencher sa campagne entière.
 *
 *   npx tsx --env-file=.env.local scripts/fusionner-doublons.ts
 *   … --appliquer      déplace réellement le contenu (ne supprime toujours rien)
 */

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/donnees/prisma';
import { nombreDeCaptures } from '@/lib/publication';

const APPLIQUER = process.argv.includes('--appliquer');

/*
 * Les onze paires, telles que `resoudre-doublons.ts` les a prouvées.
 *
 * Elles sont écrites ici et non redétectées : la détection est le travail
 * coûteux et déjà validé du script frère, et la rouvrir ferait courir le
 * risque exact qu'il documente — `pirate-gold-slot` et `pirates-riches`
 * partagent un symbole de lanceur sans être le même jeu. Ce script n'ajoute
 * aucune paire ; il vide celles dont l'identité est établie.
 *
 * L'ordre des deux slugs ne veut rien dire : c'est l'arbitrage qui désigne la
 * fiche gardée, pas la position dans le couple.
 */
const PAIRES_PROUVEES: ReadonlyArray<readonly [string, string]> = [
  ['mustang-gold', 'mustang-gold-slot'],
  ['john-hunter-and-the-tomb-of-the-scarab-queen-slot', 'john-hunter-tomb-of-the-scarab-queen'],
  ['fruit-party', 'fruit-party-slot'],
  ['the-dog-house', 'the-dog-house-slot'],
  ['cursed-crypt', 'cursed-crypt-hacksaw'],
  ['san-quentin-2', 'san-quentin-2-death-row'],
  ['donuts', 'donuts-btg'],
  ['holmes-and-the-stolen-stones', 'holmes-stolen-stones'],
  ['x-ways-hoarder-2', 'xways-hoarder-2'],
  ['dragon-age-hold-and-win', 'dragon-age-hold-win'],
  ['vikings', 'vikings-netent'],
];

/* ── Repris de resoudre-doublons.ts ─────────────────────────────────────── */

/** Les mots que deux catalogues écrivent différemment pour le même jeu. */
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

/** Les suffixes qu'un import colle au slug quand le précédent est déjà pris. */
const SUFFIXES_D_IMPORT = /(?:-slot|-slots|-game|-netent|-hacksaw|-btg|-original|-1)+$/;

/** Où chaque studio publie la page produit d'un jeu, à partir de son slug. */
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

/** Sans ce décodage, « Dragon Age Hold &amp; Win » ne contient plus le nom du jeu. */
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
  if (!patron) return null;
  const url = patron(slug);
  const dejaLue = cachePages.get(url);
  if (dejaLue !== undefined) return dejaLue;

  let page: PageProduit | null = null;
  try {
    const reponse = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(25_000) });
    const html = await reponse.text();
    const titre = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    /* Le code HTTP ne dit rien : Pragmatic répond 200 « Page not found ». Le titre, si. */
    page = { url, urlFinale: reponse.url || url, titre: decoderEntites(titre).trim() };
  } catch {
    page = null;
  }
  cachePages.set(url, page);
  return page;
}

/** La page parle-t-elle bien d'un des titres du couple ? Sinon, le slug n'existe pas chez le studio. */
function pageDecritLeJeu(page: PageProduit | null, noms: string[]): boolean {
  if (!page?.titre) return false;
  const titre = normaliser(page.titre);
  return noms.some((nom) => normaliser(nom).length >= 4 && titre.includes(normaliser(nom)));
}

/** Le jeu que l'adresse finale désigne, débarrassé de la langue. */
function jeuDesignePar(page: PageProduit): string {
  try {
    return normaliser(new URL(page.urlFinale).pathname.replace(/\/+$/, '').split('/').pop() ?? '');
  } catch {
    return '';
  }
}

/* ── Les fiches ─────────────────────────────────────────────────────────── */

const SELECTION = {
  id: true,
  slug: true,
  nom: true,
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
  demoUrl: true,
  visuelUrl: true,
  captures: true,
  capturesLe: true,
  confiance: true,
  studio: { select: { slug: true } },
  preuves: { select: { id: true, champ: true, valeurBrute: true, type: true, url: true } },
  traductions: { select: { id: true, langue: true } },
  disponibilites: { select: { id: true, casinoId: true, pays: true } },
} satisfies Prisma.JeuSelect;

function chargerFiche(slug: string) {
  return prisma.jeu.findUnique({ where: { slug }, select: SELECTION });
}

type Fiche = NonNullable<Awaited<ReturnType<typeof chargerFiche>>>;
type Preuve = Fiche['preuves'][number];

/* ── Comparer deux valeurs sans les interpréter ─────────────────────────── */

function texte(valeur: unknown): string {
  return valeur === null || valeur === undefined ? '' : String(valeur);
}

function jour(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : '';
}

/**
 * Deux écritures du même texte, ou deux valeurs différentes ?
 *
 * « 5x3 » et « 5×3 » sont la même grille écrite avec deux caractères : les
 * séparer produirait une contradiction imaginaire à arbitrer. Un nombre se
 * compare comme un nombre — « 96.50 » et « 96.5 » ne sont pas un désaccord.
 * Au-delà, on ne rapproche rien : « 25 » et « 25 paylines » **restent** deux
 * valeurs distinctes, parce que les rapprocher demanderait de comprendre la
 * phrase, et comprendre à la place de la source est exactement l'erreur que
 * ce script existe pour éviter.
 */
function memeValeur(a: string, b: string): boolean {
  const lisser = (v: string) =>
    v
      .trim()
      .toLowerCase()
      .replace(/\u00d7/g, 'x')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ');
  const [ga, gb] = [lisser(a), lisser(b)];
  if (ga === gb) return true;
  const [na, nb] = [Number(ga), Number(gb)];
  return ga !== '' && gb !== '' && Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

/*
 * Ce qu'est un champ pour ce script.
 *
 * `nature` sépare ce qui s'arbitre de ce qui ne s'arbitre pas. Un **fait** est
 * une affirmation sur le jeu : deux valeurs différentes s'excluent, et le
 * désaccord doit remonter. Une **pièce** — une URL de démo, un visuel, une
 * source — est un exemplaire : deux exemplaires différents ne se contredisent
 * pas, la gardée conserve simplement le sien. Confondre les deux noierait les
 * vraies contradictions sous des divergences de chemins de fichiers.
 */
interface Champ {
  nom: string;
  nature: 'fait' | 'piece';
  lire: (f: Fiche) => string;
  /** La clé de comparaison, quand l'affichage ne s'y prête pas. */
  comparer?: (f: Fiche) => string;
  valeur: (f: Fiche) => Prisma.JeuUpdateInput;
}

const CHAMPS: Champ[] = [
  {
    nom: 'rtpStudio',
    nature: 'fait',
    lire: (f) => texte(f.rtpStudio),
    valeur: (f) => ({ rtpStudio: f.rtpStudio }),
  },
  {
    nom: 'rtpPaliers',
    nature: 'fait',
    lire: (f) => f.rtpPaliers.map(String).join(', '),
    valeur: (f) => ({ rtpPaliers: f.rtpPaliers }),
  },
  {
    nom: 'rtpAchatBonus',
    nature: 'fait',
    lire: (f) => texte(f.rtpAchatBonus),
    valeur: (f) => ({ rtpAchatBonus: f.rtpAchatBonus }),
  },
  {
    nom: 'rtpSource',
    nature: 'piece',
    lire: (f) => texte(f.rtpSource),
    valeur: (f) => ({ rtpSource: f.rtpSource }),
  },
  {
    /* `AUCUNE` est le défaut du schéma : l'absence de niveau, pas un niveau. */
    nom: 'rtpConfiance',
    nature: 'piece',
    lire: (f) => (f.rtpConfiance === 'AUCUNE' ? '' : f.rtpConfiance),
    valeur: (f) => ({ rtpConfiance: f.rtpConfiance }),
  },
  {
    nom: 'rtpVerifieLe',
    nature: 'piece',
    lire: (f) => jour(f.rtpVerifieLe),
    valeur: (f) => ({ rtpVerifieLe: f.rtpVerifieLe }),
  },
  {
    nom: 'confiance',
    nature: 'piece',
    lire: (f) => (f.confiance === 'AUCUNE' ? '' : f.confiance),
    valeur: (f) => ({ confiance: f.confiance }),
  },
  {
    nom: 'volatilite',
    nature: 'fait',
    lire: (f) => texte(f.volatilite),
    valeur: (f) => ({ volatilite: f.volatilite }),
  },
  {
    nom: 'gainMaxMultiple',
    nature: 'fait',
    lire: (f) => texte(f.gainMaxMultiple),
    valeur: (f) => ({ gainMaxMultiple: f.gainMaxMultiple }),
  },
  { nom: 'grille', nature: 'fait', lire: (f) => texte(f.grille), valeur: (f) => ({ grille: f.grille }) },
  {
    nom: 'lignesPaiement',
    nature: 'fait',
    lire: (f) => texte(f.lignesPaiement),
    valeur: (f) => ({ lignesPaiement: f.lignesPaiement }),
  },
  {
    /*
     * Deux listes de mécaniques différentes ne se marient pas.
     *
     * En faire l'union produirait une description que ni l'une ni l'autre des
     * deux sources n'a écrite — le seul champ du lot où « fusionner » serait
     * littéralement inventer. L'ordre, lui, ne porte aucun sens : deux listes
     * aux mêmes éléments rangés autrement sont la même liste.
     */
    nom: 'mecaniques',
    nature: 'fait',
    lire: (f) => f.mecaniques.join(' · '),
    comparer: (f) => [...f.mecaniques].map((m) => m.toLowerCase().trim()).sort().join('|'),
    valeur: (f) => ({ mecaniques: f.mecaniques }),
  },
  {
    nom: 'achatBonus',
    nature: 'fait',
    lire: (f) => (f.achatBonus === null ? '' : String(f.achatBonus)),
    valeur: (f) => ({ achatBonus: f.achatBonus }),
  },
  { nom: 'sortieLe', nature: 'fait', lire: (f) => jour(f.sortieLe), valeur: (f) => ({ sortieLe: f.sortieLe }) },
  { nom: 'demoUrl', nature: 'piece', lire: (f) => texte(f.demoUrl), valeur: (f) => ({ demoUrl: f.demoUrl }) },
  {
    nom: 'visuelUrl',
    nature: 'piece',
    lire: (f) => texte(f.visuelUrl),
    valeur: (f) => ({ visuelUrl: f.visuelUrl }),
  },
  {
    nom: 'captures',
    nature: 'piece',
    lire: (f) => (nombreDeCaptures(f.captures) ? `${nombreDeCaptures(f.captures)} captures` : ''),
    valeur: (f) => ({
      captures: (f.captures ?? Prisma.DbNull) as Prisma.InputJsonValue,
      /* La date de capture n'a de sens qu'avec les captures : elles voyagent ensemble. */
      capturesLe: f.capturesLe,
    }),
  },
];

/*
 * Les champs dont la valeur n'a de sens qu'avec le `rtpStudio` qu'ils attestent.
 *
 * `confiance` en fait partie bien qu'il décrive la fiche entière : dans cette
 * base il est posé au même instant que la lecture du RTP — `resoudre-ecarts.ts`
 * écrit `rtpStudio`, `rtpSource` et `confiance: 'STUDIO'` d'un seul geste. Le
 * déplacer seul reviendrait à afficher « source : le studio » sous un chiffre
 * que le studio n'a pas dit.
 */
const ADOSSES_AU_RTP = new Set(['rtpSource', 'rtpConfiance', 'rtpVerifieLe', 'confiance', 'captures']);

/* ── L'arbitrage, champ par champ ───────────────────────────────────────── */

type Verdict =
  | 'rien'
  | 'identique'
  | 'deplacement'
  | 'ecrasement'
  | 'gardee-prouvee'
  | 'contradiction'
  | 'double'
  | 'adosse';

interface Decision {
  champ: Champ;
  verdict: Verdict;
  /** Ce que la ligne raconte au lecteur : la valeur retenue et le pourquoi. */
  ligne: string;
}

/**
 * La preuve qu'une fiche porte pour ce champ, si elle atteste bien sa valeur.
 *
 * Une preuve dont la `valeurBrute` ne correspond plus au champ ne prouve pas
 * la fiche : elle prouve qu'on l'a modifiée après coup sans reprendre sa
 * source. Elle ne peut donc pas servir à écraser le voisin — c'est justement
 * le genre de dérive que la table `Preuve` sert à rendre visible.
 */
function preuveQuiAtteste(fiche: Fiche, champ: Champ): Preuve | null {
  const valeur = champ.lire(fiche);
  const candidates = fiche.preuves.filter((p) => p.champ === champ.nom);
  return candidates.find((p) => memeValeur(p.valeurBrute, valeur)) ?? null;
}

function source(p: Preuve): string {
  return `${p.type}${p.url ? ` — ${p.url.slice(0, 60)}` : ''}`;
}

function arbitrerChamp(gardee: Fiche, condamnee: Fiche, champ: Champ, rtpAligne: boolean): Decision {
  const cle = champ.comparer ?? champ.lire;
  const vg = champ.lire(gardee);
  const vc = champ.lire(condamnee);
  const decision = (verdict: Verdict, ligne: string): Decision => ({ champ, verdict, ligne });

  if (!vg && !vc) return decision('rien', 'les deux fiches sont vides');
  if (!vc) return decision('rien', `${vg} — la condamnée n'a rien à ajouter`);

  const pg = preuveQuiAtteste(gardee, champ);
  const pc = preuveQuiAtteste(condamnee, champ);

  if (!vg) {
    /* Règle 2 : un champ nul n'est pas un avis contraire. */
    if (ADOSSES_AU_RTP.has(champ.nom) && !rtpAligne) {
      return decision(
        'adosse',
        `${vc} NON déplacé — atteste un rtpStudio que la gardée n'affiche pas ; le recopier ` +
          `déclarerait sourcé un chiffre que la source ne dit pas`,
      );
    }
    const pourquoi = pc ? `prouvé (${source(pc)})` : 'la gardée n’avait rien';
    return decision('deplacement', `${vc} ← ${condamnee.slug} — ${pourquoi}`);
  }

  if (memeValeur(cle(gardee), cle(condamnee))) return decision('identique', `${vg} — les deux fiches l'écrivent`);

  if (champ.nature === 'piece') {
    return decision('double', `la gardée garde ${vg} ; ${condamnee.slug} en portait un autre (${vc})`);
  }

  /* Règle 1 : une valeur prouvée fait foi, y compris contre la fiche gardée. */
  if (pc && !pg) {
    return decision(
      'ecrasement',
      `${vc} ← ${condamnee.slug} — prouvé (${source(pc)}) ; ${vg} de la gardée écrasé — non prouvé`,
    );
  }
  if (pg && !pc) {
    return decision(
      'gardee-prouvee',
      `${vg} depuis ${gardee.slug} — prouvé (${source(pg)}) ; ${vc} ignoré — non prouvé`,
    );
  }

  /* Règle 3 : deux valeurs, aucune départagée. On rend la main. */
  const detail = pg && pc ? 'les deux sont prouvées et se contredisent' : 'aucune des deux n’est prouvée';
  return decision('contradiction', `${vg} (${gardee.slug}) contre ${vc} (${condamnee.slug}) — ${detail}`);
}

/* ── Les rattachements : preuves, traductions, disponibilités ───────────── */

/** Deux preuves identiques mot pour mot sont le même constat importé deux fois. */
function empreinte(p: Preuve): string {
  return `${p.champ}|${p.valeurBrute}|${p.type}|${p.url ?? ''}`;
}

interface Rattachements {
  preuves: Preuve[];
  preuvesEnDouble: number;
  traductions: Fiche['traductions'];
  languesEnConflit: string[];
  disponibilites: Fiche['disponibilites'];
  disponibilitesEnConflit: number;
}

function rattachements(gardee: Fiche, condamnee: Fiche): Rattachements {
  const connues = new Set(gardee.preuves.map(empreinte));
  const preuves = condamnee.preuves.filter((p) => !connues.has(empreinte(p)));

  /*
   * Une preuve qui contredit une preuve déjà là n'est pas jetée : le schéma
   * veut plusieurs preuves par champ, et deux constats opposés sur un même
   * chiffre sont précisément l'information à conserver.
   */
  const languesConnues = new Set(gardee.traductions.map((t) => t.langue));
  const traductions = condamnee.traductions.filter((t) => !languesConnues.has(t.langue));
  const languesEnConflit = condamnee.traductions
    .filter((t) => languesConnues.has(t.langue))
    .map((t) => t.langue);

  /*
   * `DisponibiliteCasino` n'était pas au programme, mais la cascade l'emporte
   * comme le reste : la laisser derrière reviendrait à la perdre en silence.
   * La contrainte `[jeuId, casinoId, pays]` interdit le doublon, d'où le tri.
   */
  const paires = new Set(gardee.disponibilites.map((d) => `${d.casinoId}|${d.pays ?? ''}`));
  const disponibilites = condamnee.disponibilites.filter((d) => !paires.has(`${d.casinoId}|${d.pays ?? ''}`));

  return {
    preuves,
    preuvesEnDouble: condamnee.preuves.length - preuves.length,
    traductions,
    languesEnConflit,
    disponibilites,
    disponibilitesEnConflit: condamnee.disponibilites.length - disponibilites.length,
  };
}

/* ── Le veto de resoudre-doublons.ts, rejoué après la fusion ────────────── */

/*
 * La même mesure que le script frère, aux mêmes vingt clés.
 *
 * C'est ce qui rend la réponse vérifiable : une paire n'est annoncée
 * supprimable que si le veto qui l'avait refusée tombe pour de bon. Toute
 * divergence de mesure entre les deux scripts produirait une promesse que
 * l'autre ne tiendrait pas.
 */
function presences(fiche: Fiche): Map<string, number> {
  const mesure = new Map<string, number>();
  for (const champ of CHAMPS) {
    if (champ.nom === 'captures') mesure.set('captures', nombreDeCaptures(fiche.captures));
    else if (champ.nom === 'rtpPaliers') mesure.set('rtpPaliers', fiche.rtpPaliers.length);
    else if (champ.nom === 'mecaniques') mesure.set('mecaniques', fiche.mecaniques.length);
    else mesure.set(champ.nom, champ.lire(fiche) ? 1 : 0);
  }
  mesure.set('preuves', fiche.preuves.length);
  mesure.set('traductions', fiche.traductions.length);
  mesure.set('disponibilites', fiche.disponibilites.length);
  return mesure;
}

/** Ce que la condamnée porterait encore, une fois la fusion faite. Vide = supprimable. */
function restesApresFusion(
  gardee: Fiche,
  condamnee: Fiche,
  decisions: Decision[],
  liens: Rattachements,
): string[] {
  const apres = presences(gardee);
  const chezElle = presences(condamnee);

  for (const d of decisions) {
    if (d.verdict !== 'deplacement' && d.verdict !== 'ecrasement') continue;
    apres.set(d.champ.nom, Math.max(apres.get(d.champ.nom) ?? 0, chezElle.get(d.champ.nom) ?? 0));
  }
  apres.set('preuves', (apres.get('preuves') ?? 0) + liens.preuves.length);
  apres.set('traductions', (apres.get('traductions') ?? 0) + liens.traductions.length);
  apres.set('disponibilites', (apres.get('disponibilites') ?? 0) + liens.disponibilites.length);

  const restes: string[] = [];
  for (const [champ, presence] of chezElle) {
    if (presence > (apres.get(champ) ?? 0)) restes.push(`${champ} (${presence} contre ${apres.get(champ) ?? 0})`);
  }
  return restes;
}

/* ── Quelle fiche garder ────────────────────────────────────────────────── */

interface ChoixDeFiche {
  gardee: Fiche;
  raison: string;
  origine: 'studio' | 'slug-nu';
  /** Ce que le studio répond, quand ça mérite un œil humain. */
  remarque?: string;
}

async function arbitrerLaPaire(duo: [Fiche, Fiche]): Promise<ChoixDeFiche | null> {
  const noms = duo.map((f) => f.nom);
  const pages = await Promise.all(duo.map((f) => lirePageProduit(f.studio.slug, f.slug)));
  const reconnues = duo.filter((_, i) => pageDecritLeJeu(pages[i], noms));

  /* Le studio d'abord : un slug que sa page produit ignore est un slug que l'import a fabriqué. */
  if (reconnues.length === 1 && pages.some((p) => p !== null)) {
    const perdante = duo.find((f) => f !== reconnues[0])!;
    return {
      gardee: reconnues[0],
      origine: 'studio',
      raison: `seul slug que ${reconnues[0].studio.slug} reconnaît — ${perdante.slug} n'y répond pas`,
    };
  }

  const nus = duo.map((f) => f.slug.replace(SUFFIXES_D_IMPORT, ''));
  if (nus[0] === nus[1]) {
    const nue = duo.find((f) => f.slug === nus[0]);
    if (nue) {
      const suffixee = duo.find((f) => f !== nue)!;
      /*
       * Quand les deux pages répondent, le studio a quand même tranché : celle
       * du slug suffixé redirige vers celle du slug nu. Le dire explicitement
       * évite qu'on relise ce choix comme arbitraire dans six mois.
       */
      const designes = pages.map((p) => (p ? jeuDesignePar(p) : ''));
      const remarque =
        designes[0] && designes[0] === designes[1]
          ? `les deux pages produit aboutissent au même jeu chez le studio (${designes[0]}) : ` +
            `c'est ${nue.slug} que l'URL finale porte`
          : undefined;
      return {
        gardee: nue,
        origine: 'slug-nu',
        raison: `le slug nu : « ${suffixee.slug.slice(nus[0].length)} » vient d'une collision d'import, pas du nom du jeu`,
        remarque,
      };
    }
  }

  return null;
}

/* ── Rapport et exécution ───────────────────────────────────────────────── */

function decrire(fiche: Fiche): string {
  return [
    `${nombreDeCaptures(fiche.captures)} captures`,
    `${fiche.preuves.length} preuves`,
    `${fiche.traductions.length} traductions`,
    `${fiche.disponibilites.length} disponibilités`,
  ].join(', ');
}

interface Bilan {
  supprimablesNettes: string[];
  supprimablesAvecContradictions: string[];
  bloquees: string[];
  contradictions: string[];
}

async function traiter(paire: readonly [string, string], bilan: Bilan): Promise<void> {
  const duo = (await Promise.all(paire.map(chargerFiche))) as (Fiche | null)[];
  if (!duo[0] || !duo[1]) {
    console.log(`\n── ${paire.join('  /  ')}`);
    console.log(`   introuvable : ${paire.filter((_, i) => !duo[i]).join(', ')} — déjà fusionnée ?\n`);
    return;
  }

  const couple: [Fiche, Fiche] = [duo[0], duo[1]];
  const verdict = await arbitrerLaPaire(couple);
  console.log(`\n── ${paire.join('  /  ')}   [${couple[0].studio.slug}]`);

  if (!verdict) {
    console.log("   aucun des deux critères du mandat ne désigne la fiche à garder : le studio ne");
    console.log('   départage pas et les slugs ne diffèrent pas d’un simple suffixe d’import.');
    console.log('   Rien n’est déplacé — le sens de la fusion décide de l’URL qui survit.\n');
    bilan.bloquees.push(`${paire.join(' / ')} — fiche à garder indéterminée`);
    return;
  }

  const gardee = verdict.gardee;
  const condamnee = couple.find((f) => f !== gardee)!;
  console.log(`   GARDÉE     ${gardee.slug}  «${gardee.nom}»  — ${decrire(gardee)}`);
  console.log(`   FUSIONNÉE  ${condamnee.slug}  «${condamnee.nom}»  — ${decrire(condamnee)}`);
  console.log(`   arbitrage : ${verdict.raison}  [${verdict.origine}]`);
  if (verdict.remarque) console.log(`   remarque : ${verdict.remarque}`);

  /*
   * Le RTP se tranche avant tout le reste : c'est lui qui autorise ou interdit
   * le déplacement de sa source, de sa confiance et des captures qui l'affichent.
   */
  const champRtp = CHAMPS.find((c) => c.nom === 'rtpStudio')!;
  const verdictRtp = arbitrerChamp(gardee, condamnee, champRtp, true);
  const rtpAligne = verdictRtp.verdict !== 'contradiction' && verdictRtp.verdict !== 'gardee-prouvee';

  const decisions = CHAMPS.map((champ) =>
    champ.nom === 'rtpStudio' ? verdictRtp : arbitrerChamp(gardee, condamnee, champ, rtpAligne),
  );

  console.log('\n   Champs');
  const etiquettes: Record<Verdict, string> = {
    rien: '·          ',
    identique: '=          ',
    deplacement: 'DÉPLACÉ    ',
    ecrasement: 'ÉCRASÉ     ',
    'gardee-prouvee': 'GARDÉ      ',
    contradiction: 'CONTRADICT.',
    double: 'EN DOUBLE  ',
    adosse: 'BLOQUÉ     ',
  };
  for (const d of decisions) {
    if (d.verdict === 'rien') continue;
    console.log(`     ${etiquettes[d.verdict]} ${d.champ.nom.padEnd(16)} ${d.ligne}`);
    if (d.verdict === 'contradiction') {
      bilan.contradictions.push(`${gardee.slug} / ${condamnee.slug} — ${d.champ.nom} : ${d.ligne}`);
    }
  }

  const liens = rattachements(gardee, condamnee);
  console.log('\n   Rattachements');
  console.log(
    `     preuves        ${liens.preuves.length} déplacées` +
      (liens.preuvesEnDouble ? `, ${liens.preuvesEnDouble} déjà présentes à l'identique` : '') +
      (liens.preuves.length ? ` : ${liens.preuves.map((p) => `${p.champ}=${p.valeurBrute}`).join(', ')}` : ''),
  );
  console.log(
    `     traductions    ${liens.traductions.length} déplacées` +
      (liens.languesEnConflit.length
        ? ` ; ${liens.languesEnConflit.join(', ')} laissée(s) : la gardée a déjà sa version, deux textes ne se fusionnent pas`
        : ''),
  );
  console.log(
    `     disponibilités ${liens.disponibilites.length} déplacées` +
      (liens.disponibilitesEnConflit ? `, ${liens.disponibilitesEnConflit} déjà couvertes` : ''),
  );

  const restes = restesApresFusion(gardee, condamnee, decisions, liens);
  const contradictions = decisions.filter((d) => d.verdict === 'contradiction');
  console.log('');
  if (restes.length) {
    console.log(`   Après fusion : ${condamnee.slug} porte encore ${restes.join(' · ')} → PAS supprimable.`);
    bilan.bloquees.push(`${condamnee.slug} — reste ${restes.join(', ')}`);
  } else if (contradictions.length) {
    console.log(
      `   Après fusion : ${condamnee.slug} ne porte plus rien d'unique → supprimable, mais ` +
        `${contradictions.length} contradiction(s) non tranchée(s) disparaîtraient avec elle.`,
    );
    bilan.supprimablesAvecContradictions.push(condamnee.slug);
  } else {
    console.log(`   Après fusion : ${condamnee.slug} ne porte plus rien d'unique → supprimable.`);
    bilan.supprimablesNettes.push(condamnee.slug);
  }

  if (!APPLIQUER) return;

  const majs = decisions
    .filter((d) => d.verdict === 'deplacement' || d.verdict === 'ecrasement')
    .reduce<Prisma.JeuUpdateInput>((tout, d) => ({ ...tout, ...d.champ.valeur(condamnee) }), {});

  if (Object.keys(majs).length) await prisma.jeu.update({ where: { id: gardee.id }, data: majs });
  /*
   * Pas de `$transaction` : le runtime passe par le pooler, et une transaction
   * y expire. Les rattachements se refont à l'identique si une passe échoue.
   */
  for (const p of liens.preuves) await prisma.preuve.update({ where: { id: p.id }, data: { jeuId: gardee.id } });
  for (const t of liens.traductions)
    await prisma.traduction.update({ where: { id: t.id }, data: { jeuId: gardee.id } });
  for (const d of liens.disponibilites)
    await prisma.disponibiliteCasino.update({ where: { id: d.id }, data: { jeuId: gardee.id } });
  console.log(`   appliqué : ${Object.keys(majs).length} champs, ${liens.preuves.length} preuves déplacés.`);
}

async function main() {
  console.log(`\n${PAIRES_PROUVEES.length} paires prouvées par resoudre-doublons.ts.`);
  console.log('Interrogation des pages produit des studios…');

  const bilan: Bilan = {
    supprimablesNettes: [],
    supprimablesAvecContradictions: [],
    bloquees: [],
    contradictions: [],
  };

  for (const paire of PAIRES_PROUVEES) await traiter(paire, bilan);

  console.log(`\n${'═'.repeat(78)}`);
  console.log('\n  CONTRADICTIONS NON TRANCHÉES — deux valeurs, aucune preuve pour départager\n');
  if (!bilan.contradictions.length) console.log('    aucune.');
  for (const c of bilan.contradictions) console.log(`    ${c}`);

  console.log(`\n  ${bilan.supprimablesNettes.length} fiches deviendraient supprimables sans réserve :`);
  console.log(`    ${bilan.supprimablesNettes.join(', ') || '—'}`);
  console.log(
    `\n  ${bilan.supprimablesAvecContradictions.length} supprimables mais portant une contradiction ` +
      'non tranchée, qui disparaîtrait avec la fiche :',
  );
  console.log(`    ${bilan.supprimablesAvecContradictions.join(', ') || '—'}`);
  const pluriel = bilan.bloquees.length > 1 ? 's restent bloquées' : ' reste bloquée';
  console.log(`\n  ${bilan.bloquees.length} paire${pluriel} :`);
  for (const b of bilan.bloquees) console.log(`    ${b}`);

  const total = bilan.supprimablesNettes.length + bilan.supprimablesAvecContradictions.length;
  console.log(`\n${'═'.repeat(78)}`);
  if (!APPLIQUER) {
    console.log(`\n  SIMULATION — rien n'a été écrit. Ajouter --appliquer.`);
  }
  console.log(
    `  ${total} fiches sur ${PAIRES_PROUVEES.length} deviendraient supprimables. ` +
      'La suppression reste le travail de resoudre-doublons.ts, qui revérifiera le veto.\n',
  );
}

main().finally(() => prisma.$disconnect());
