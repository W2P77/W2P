import { prisma } from './prisma';

/**
 * Les fiches visibles dans la navigation.
 *
 * ── Pourquoi une liste de slugs et pas une condition Prisma ───────────────
 *
 * Le critère est celui de `estPublieable()` : un RTP **et** au moins une
 * capture. Prisma ne sait pas filtrer sur la longueur d'un tableau `jsonb` —
 * `captures: { not: null }` laisserait passer un tableau vide, qui est
 * précisément le cas à exclure. La liste est donc calculée en SQL une fois,
 * puis passée en `slug: { in: … }` aux requêtes de listing.
 *
 * Elle est mémoïsée quelques secondes : une page qui liste des jeux, compte le
 * total et affiche les studios ne la demande qu'une fois. La mémoïsation est
 * maison plutôt que le `cache()` de React, qui n'existe qu'en contexte serveur
 * et rendait ce module impossible à charger dans un test.
 *
 * ── Ce que « pas visible » veut dire, exactement ──────────────────────────
 *
 * La fiche sort du catalogue, de la recherche, des démos, des nouveautés et
 * des listes d'un studio — partout où on **propose** un jeu. Son URL continue
 * de répondre : un lien déjà partagé, un favori enregistré, un résultat encore
 * dans Google mènent à une page qui s'affiche (en `noindex`). On retire ce
 * qu'on met en avant, on ne casse pas ce qui existe.
 *
 * Une fiche entre dans la liste le jour où le pipeline la capture, sans que
 * personne ait à la valider à la main.
 */
/*
 * Dix secondes : assez pour dédupliquer les trois ou quatre requêtes d'un même
 * rendu, assez court pour qu'une fiche fraîchement capturée apparaisse sans
 * qu'on ait à redéployer. L'ISR met de toute façon plus longtemps à se
 * revalider.
 */
const DUREE = 10_000;
let memo: { a: number; slugs: Promise<string[]> } | null = null;

export function slugsPubliables(): Promise<string[]> {
  const maintenant = Date.now();
  if (memo && maintenant - memo.a < DUREE) return memo.slugs;

  const slugs = prisma
    .$queryRaw<Array<{ slug: string }>>`
      SELECT slug FROM jeux
      WHERE rtp_studio IS NOT NULL
        AND captures IS NOT NULL
        AND jsonb_array_length(captures) > 0
    `
    .then((lignes) => lignes.map((l) => l.slug))
    // Une requête ratée ne doit pas rester en cache : sans ça, une coupure
    // réseau d'une seconde viderait le catalogue pour dix.
    .catch((erreur) => {
      memo = null;
      throw erreur;
    });

  memo = { a: maintenant, slugs };
  return slugs;
}

/** Le filtre à ajouter à un `where` Prisma pour ne lister que le fini. */
export async function filtrePubliable(): Promise<{ slug: { in: string[] } }> {
  return { slug: { in: await slugsPubliables() } };
}
