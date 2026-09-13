import { prisma } from './prisma';
import { filtrePubliable } from './publiables';
import { GUIDES, contenuDuGuide } from '@/data/guides';
import { filtrerCasinosParPays } from '@/lib/geo/filtrer-casinos';
import { LONGUEUR_MINIMALE } from '@/lib/recherche/liste';
import { meilleurScore, score } from '@/lib/recherche/score';
import type {
  CategorieRecherche,
  GroupeRecherche,
  ReponseRecherche,
  ResultatRecherche,
} from '@/lib/recherche/types';
import type { Langue } from '@/i18n/langues';

/**
 * La recherche instantanée, côté serveur — et elle ne peut être qu'ici.
 *
 * ── Pourquoi une route et pas un index embarqué ───────────────────────────
 *
 * BetsRank tient sa recherche en mémoire dans le navigateur : ses 1 894 fiches
 * y entrent, à condition de n'embarquer qu'un index allégé — la version
 * complète pesait 11,4 Mo de bundle, prose comprise. where2spin en compte
 * 11 658. Même réduit au nom, au studio et au slug, l'index dépasserait le
 * mégaoctet, servi sur **chaque page** puisque le champ vit dans l'accroche.
 *
 * Le catalogue reste donc en base et n'en sort jamais. Le navigateur envoie
 * trois lettres, le serveur renvoie une quinzaine de lignes. Ce qui traverse
 * ne dépend plus de la taille du catalogue — c'est ce qui rend la chose
 * tenable à 11 658 fiches comme à 50 000.
 *
 * ── Ce que la recherche a le droit de proposer ────────────────────────────
 *
 * Uniquement des fiches **publiées** : un RTP et au moins une capture, le même
 * filtre que le catalogue (`publiables.ts`). Proposer une fiche qu'on juge
 * incomplète enverrait le visiteur précisément là où le site n'a pas tenu sa
 * promesse — et il n'a aucun moyen de le deviner avant d'avoir cliqué.
 */

/**
 * Combien de lignes la base remonte avant classement.
 *
 * Le classement se fait en mémoire (voir `score.ts`), donc il ne voit que ce
 * que la requête a ramené. Deux cents lignes couvrent très largement une
 * requête réelle — « bonanza » en rend 31, « book » 44 — tout en bornant le
 * coût d'une requête d'une seule lettre qui aurait franchi le seuil.
 */
const CANDIDATS = 200;

/** Ce qu'on montre par catégorie. Au-delà, la liste se parcourt au lieu de se lire. */
const QUOTAS: Record<CategorieRecherche, number> = {
  jeu: 8,
  studio: 4,
  guide: 3,
  casino: 4,
};

/**
 * L'ordre de repli des catégories, quand deux d'entre elles ont le même score.
 *
 * Les groupes sont sinon classés par leur meilleur résultat : taper « hacksaw »
 * doit faire remonter le studio avant ses jeux, et « gates » l'inverse. Sans
 * départage, l'ordre des groupes changerait d'une frappe à l'autre pour des
 * scores égaux — un scintillement que l'œil lit comme un bug.
 */
const ORDRE_DE_REPLI: Record<CategorieRecherche, number> = {
  jeu: 0,
  studio: 1,
  guide: 2,
  casino: 3,
};

interface Demande {
  q: string;
  langue: Langue;
  /** Le pays du visiteur, lu dans le cookie posé par le middleware. */
  pays: string | null;
}

async function chercherJeux(q: string): Promise<ResultatRecherche[]> {
  const jeux = await prisma.jeu.findMany({
    where: {
      AND: [
        {
          OR: [
            { nom: { contains: q, mode: 'insensitive' } },
            { studio: { nom: { contains: q, mode: 'insensitive' } } },
          ],
        },
        await filtrePubliable(),
      ],
    },
    take: CANDIDATS,
    orderBy: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
    select: {
      slug: true,
      nom: true,
      rtpStudio: true,
      visuelUrl: true,
      studio: { select: { nom: true, slug: true } },
    },
  });

  return jeux.map((j) => ({
    categorie: 'jeu' as const,
    cle: `jeu:${j.slug}`,
    titre: j.nom,
    href: `/slot/${j.studio.slug}/${j.slug}`,
    visuel: j.visuelUrl,
    studio: j.studio.nom,
    // `Decimal` ne survit pas à `JSON.stringify` : il en ressort
    // `{"s":1,"e":1,"d":[…]}`, et la ligne affiche un chiffre absurde.
    rtp: j.rtpStudio == null ? null : Number(j.rtpStudio),
    // Le studio pèse moins que le titre : « pragmatic » ne doit pas faire
    // remonter sept cents jeux au-dessus du studio lui-même.
    score: meilleurScore(q, [
      [j.nom, 1],
      [j.studio.nom, 0.45],
    ]),
  }));
}

async function chercherStudios(q: string): Promise<ResultatRecherche[]> {
  const visible = await filtrePubliable();
  const studios = await prisma.studio.findMany({
    where: { nom: { contains: q, mode: 'insensitive' } },
    select: {
      slug: true,
      nom: true,
      logoUrl: true,
      _count: { select: { jeux: { where: visible } } },
    },
  });

  return (
    studios
      // Un studio dont aucune fiche n'est finie mène à une page vide : c'est la
      // règle du catalogue, elle vaut aussi pour la recherche.
      .filter((s) => s._count.jeux > 0)
      .map((s) => ({
        categorie: 'studio' as const,
        cle: `studio:${s.slug}`,
        titre: s.nom,
        href: `/slot/${s.slug}`,
        visuel: s.logoUrl,
        nbJeux: s._count.jeux,
        score: score(q, s.nom),
      }))
  );
}

function chercherGuides(q: string, langue: Langue): ResultatRecherche[] {
  return GUIDES.map((g) => {
    const contenu = contenuDuGuide(g, langue);
    return {
      categorie: 'guide' as const,
      cle: `guide:${g.slug}`,
      titre: contenu.titre,
      href: `/guides/${g.slug}`,
      visuel: null,
      minutes: g.minutes,
      // Le chapô compte, à poids réduit : il porte les mots du sujet
      // (« volatilité », « achat de bonus ») que le titre n'a pas la place de
      // reprendre. Le slug aussi, parce qu'il est en anglais dans les trois
      // langues et reste ce qu'on retrouve dans une URL partagée.
      score: meilleurScore(q, [
        [contenu.titre, 1],
        [contenu.chapo, 0.5],
        [g.slug.replace(/-/g, ' '), 0.7],
      ]),
    };
  });
}

async function chercherCasinos(q: string, pays: string | null, langue: Langue): Promise<ResultatRecherche[]> {
  const casinos = await prisma.casino.findMany({
    where: { actif: true, nom: { contains: q, mode: 'insensitive' } },
    select: { slug: true, nom: true, logo: true, pays: true },
  });

  /*
   * Le filtrage par pays se fait ici, et c'est possible parce que la route est
   * dynamique.
   *
   * Ailleurs sur le site il a lieu dans le navigateur : les pages sont rendues
   * avec `revalidate`, donc leur HTML est mutualisé, et filtrer au rendu
   * servirait le pays du premier arrivant à tous les suivants. Une réponse
   * d'API n'est mise en cache par personne — on peut donc répondre au pays de
   * celui qui demande, sans rien embarquer côté client.
   *
   * `filtrerCasinosParPays` ne descend jamais à zéro : quand aucun partenaire
   * ne couvre le pays, il rend la liste entière plutôt qu'un vide.
   */
  const { casinos: retenus } = filtrerCasinosParPays(casinos, pays);

  return retenus.map((c) => ({
    categorie: 'casino' as const,
    cle: `casino:${c.slug}`,
    titre: c.nom,
    /*
     * Le seul href déjà complet de la liste.
     *
     * `/go/<casino>` vit hors du segment de langue : le préfixer comme les
     * autres donnerait `/fr/go/spinaura`, qui n'existe pas. La langue passe
     * donc en paramètre, comme le fait le bloc « où jouer » — c'est elle qui
     * décide de la langue de l'écran de sortie.
     */
    href: `/go/${c.slug}?l=${langue}`,
    visuel: c.logo,
    score: score(q, c.nom),
  }));
}

/**
 * Le classement d'une catégorie : meilleur score d'abord, puis quota.
 *
 * ── Pourquoi le titre le plus court gagne à score égal ────────────────────
 *
 * « bonanza » sort huit jeux qui portent tous le mot entier : ils ont
 * exactement le même score, et le départage décide seul de ce que le visiteur
 * voit en premier. Par ordre alphabétique, c'était « Aztec Bonanza » devant
 * « Big Bass Bonanza » — un classement que rien ne justifie. Le titre le plus
 * court est celui qui ressemble le plus à ce qui a été tapé ; à défaut d'un
 * signal de popularité, c'est le seul départage qui veuille dire quelque chose.
 */
function retenir(resultats: ResultatRecherche[], categorie: CategorieRecherche): ResultatRecherche[] {
  return resultats
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.titre.length - b.titre.length || a.titre.localeCompare(b.titre),
    )
    .slice(0, QUOTAS[categorie]);
}

export async function rechercherTout({ q, langue, pays }: Demande): Promise<ReponseRecherche> {
  const terme = q.trim();
  if (terme.length < LONGUEUR_MINIMALE) return { q: terme, groupes: [], total: 0 };

  const [jeux, studios, casinos] = await Promise.all([
    chercherJeux(terme),
    chercherStudios(terme),
    chercherCasinos(terme, pays, langue),
  ]);

  const groupes: GroupeRecherche[] = (
    [
      { categorie: 'jeu' as const, resultats: retenir(jeux, 'jeu') },
      { categorie: 'studio' as const, resultats: retenir(studios, 'studio') },
      { categorie: 'guide' as const, resultats: retenir(chercherGuides(terme, langue), 'guide') },
      { categorie: 'casino' as const, resultats: retenir(casinos, 'casino') },
    ] satisfies GroupeRecherche[]
  )
    .filter((g) => g.resultats.length > 0)
    .sort(
      (a, b) =>
        b.resultats[0].score - a.resultats[0].score ||
        ORDRE_DE_REPLI[a.categorie] - ORDRE_DE_REPLI[b.categorie],
    );

  return {
    q: terme,
    groupes,
    total: groupes.reduce((n, g) => n + g.resultats.length, 0),
  };
}
