import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/donnees/prisma';
import { cheminPublic } from '@/i18n/chemins';
import { LANGUES, LANGUE_DEFAUT } from '@/i18n/langues';
import { SITE_URL } from '@/lib/site';
import { GUIDES } from '@/data/guides';

export const revalidate = 3600;

/**
 * Le sitemap.
 *
 * ── Pourquoi il compte plus ici que sur un site ordinaire ─────────────────
 *
 * Un catalogue vit de sa longue traîne : sept cents fiches aujourd'hui,
 * beaucoup plus demain, et aucune n'est atteignable en trois clics depuis
 * l'accueil. Sans sitemap, un domaine neuf laisse l'essentiel de son contenu
 * hors de l'index — le trafic n'arrive jamais.
 *
 * `lastModified` vient de la date de mise à jour réelle de la fiche : une date
 * du jour sur toutes les URLs apprend à Google à ne plus la croire.
 */
/**
 * ── Pourquoi la base est interrogée sous `try` ────────────────────────────
 *
 * Ce fichier est rendu **pendant le build**. Le premier déploiement Vercel a
 * échoué ici : sans `DATABASE_URL` dans l'environnement, Prisma retombe sur
 * `127.0.0.1:5432`, la requête lève, et **tout le build s'arrête** — le site
 * entier reste hors ligne à cause d'une seule route annexe.
 *
 * Une variable d'environnement manquante doit rester une erreur visible, pas
 * un site indisponible. La base injoignable produit donc un sitemap réduit
 * aux pages fixes, avec un avertissement dans le journal de build. Les fiches
 * y reviennent à la première revalidation, une heure plus tard.
 *
 * Ce repli ne dispense évidemment pas de configurer la variable : sans elle,
 * les pages de jeux n'ont rien à afficher au runtime non plus.
 */
async function contenuDeLaBase() {
  try {
    return await Promise.all([
      /*
       * Le filtre n'est pas un détail de performance.
       *
       * L'inventaire des catalogues studio crée des fiches dont on ne sait
       * que l'existence. Les proposer au crawl noierait les fiches
       * renseignées sous des centaines de pages vides — et un site jugé sur
       * la moyenne de ses pages perd le classement de ses meilleures. Elles
       * y entrent d'elles-mêmes dès qu'elles ont un RTP, sans que personne
       * ait à y repasser.
       *
       * Le critère est celui de `estPublieable()`, exprimé ici en requête :
       * les deux doivent rester d'accord, sinon le sitemap promet une page
       * que son `robots` refuse.
       */
      prisma.jeu.findMany({
        where: { rtpStudio: { not: null } },
        select: { slug: true, majLe: true, studio: { select: { slug: true } } },
      }),
      prisma.studio.findMany({ select: { slug: true, majLe: true } }),
    ]);
  } catch (erreur) {
    console.warn(
      '[sitemap] Base injoignable — sitemap réduit aux pages fixes. ' +
        'Vérifier DATABASE_URL (pooler, port 6543).',
      erreur instanceof Error ? erreur.message : erreur,
    );
    return [[], []] as const;
  }
}

/**
 * Une entrée par page **et par langue**, chacune déclarant ses sœurs.
 *
 * ── Pourquoi les `alternates` ne sont pas un détail ───────────────────────
 *
 * Sans elles, `/en/catalogue`, `/fr/catalogue` et `/de/katalog` sont trois
 * pages qui se ressemblent et se disputent le même classement : Google en
 * garde une et ignore les autres. Déclarées comme versions linguistiques,
 * elles se renforcent au lieu de se concurrencer, et chaque marché reçoit la
 * sienne.
 *
 * `x-default` désigne la version servie à qui ne correspond à aucune langue
 * déclarée — l'anglais, qui est aussi ce que sert la racine.
 */
function pourChaqueLangue(
  vers: string,
  reste: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  const langues = Object.fromEntries(
    LANGUES.map((l) => [l.htmlLang, `${SITE_URL}${cheminPublic(vers, l.code)}`]),
  );

  return LANGUES.map((l) => ({
    url: `${SITE_URL}${cheminPublic(vers, l.code)}`,
    ...reste,
    alternates: {
      languages: { ...langues, 'x-default': `${SITE_URL}${cheminPublic(vers, LANGUE_DEFAUT)}` },
    },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jeux, studios] = await contenuDeLaBase();

  return [
    ...pourChaqueLangue('/', { changeFrequency: 'daily', priority: 1 }),
    ...pourChaqueLangue('/catalogue', { changeFrequency: 'daily', priority: 0.9 }),
    ...pourChaqueLangue('/demos', { changeFrequency: 'weekly', priority: 0.8 }),
    ...pourChaqueLangue('/new-releases', { changeFrequency: 'daily', priority: 0.9 }),
    ...pourChaqueLangue('/reviews', { changeFrequency: 'weekly', priority: 0.8 }),
    ...pourChaqueLangue('/guides', { changeFrequency: 'monthly', priority: 0.7 }),
    ...GUIDES.flatMap((g) =>
      pourChaqueLangue(`/guides/${g.slug}`, { changeFrequency: 'monthly', priority: 0.6 }),
    ),
    ...studios.flatMap((s) =>
      pourChaqueLangue(`/slot/${s.slug}`, {
        lastModified: s.majLe,
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    ),
    ...jeux.flatMap((j) =>
      pourChaqueLangue(`/slot/${j.studio.slug}/${j.slug}`, {
        lastModified: j.majLe,
        changeFrequency: 'monthly',
        priority: 0.6,
      }),
    ),
  ];
}
