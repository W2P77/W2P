import type { Metadata } from 'next';
import { Lien } from '@/components/Lien';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { remplir, textes } from '@/i18n/textes';

import { metadonneesDePage } from '@/lib/metadonnees';
import { notFound } from 'next/navigation';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { Tirets } from '@/components/DecorNeon';
import { prisma } from '@/lib/donnees/prisma';

export const revalidate = 3600;

/**
 * La page d'un studio.
 *
 * Elle existe parce que l'URL le promet : `/slot/pragmatic-play/fire-hot-20`
 * laisse entendre que `/slot/pragmatic-play` mène quelque part. Un niveau
 * intermédiaire qui renvoie une 404 est une promesse cassée — pour le visiteur
 * qui remonte le fil d'Ariane comme pour le robot qui suit la hiérarchie.
 */
const PAR_PAGE = 36;

async function studioParSlug(slug: string, page: number) {
  return prisma.studio.findUnique({
    where: { slug },
    include: {
      jeux: {
        orderBy: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
        skip: (page - 1) * PAR_PAGE,
        take: PAR_PAGE,
        select: {
          slug: true, nom: true, rtpStudio: true, rtpConfiance: true,
          volatilite: true, gainMaxMultiple: true, visuelUrl: true,
          studio: { select: { nom: true, slug: true } },
        },
      },
      _count: { select: { jeux: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studio: string; langue: string }>;
}): Promise<Metadata> {
  const { langue: brutLangue, studio } = await params;
  const s = await prisma.studio.findUnique({ where: { slug: studio } });
  if (!s) return { title: textes(estUneLangue(brutLangue) ? brutLangue : LANGUE_DEFAUT).studioIntrouvable };
  // Cette page n'avait pas non plus de canonique : elle est atteignable
  // depuis le catalogue et la navigation, chacune pouvant traîner ses
  // paramètres de pagination.
  return metadonneesDePage({
    langue: estUneLangue(brutLangue) ? brutLangue : LANGUE_DEFAUT,
    titre: remplir(textes(estUneLangue(brutLangue) ? brutLangue : LANGUE_DEFAUT).studioTitre, { studio: s.nom }),
    description: remplir(textes(estUneLangue(brutLangue) ? brutLangue : LANGUE_DEFAUT).studioDescription, { studio: s.nom }),
    chemin: `/slot/${s.slug}`,
  });
}

export default async function PageStudio({
  params,
  searchParams,
}: {
  params: Promise<{ studio: string; langue: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { langue: brutT } = await params;
  const t = textes(estUneLangue(brutT) ? brutT : LANGUE_DEFAUT);
  const [{ studio }, { page: pageBrute }] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(pageBrute ?? 1));
  const s = await studioParSlug(studio, page);
  if (!s) notFound();

  // 624 jeux chez le plus fourni : sans pagination, la page en montrait
  // soixante et taisait les cinq cent soixante-quatre autres.
  const pages = Math.max(1, Math.ceil(s._count.jeux / PAR_PAGE));

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <nav className="mb-4 font-mono text-[11px] text-texte-faible">
          <Lien href="/catalogue" className="hover:text-neon-cyan">{t.titreCatalogue}</Lien>
          <span className="mx-2">/</span>
          <span className="text-texte-doux">{s.nom}</span>
        </nav>

        <div className="mb-6 flex items-center gap-4">
          <h1 className="font-titre text-[26px] font-black uppercase tracking-tight text-white">
            {remplir(t.slotsDuStudio, { studio: s.nom })}
          </h1>
          <Tirets />
          <span className="font-mono text-[12px] text-texte-faible">
            {remplir(t.nbJeux, { n: String(s._count.jeux) })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {s.jeux.map((j, i) => (
            <CarteJeu key={j.slug} jeu={j} index={i} />
          ))}
        </div>

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3" aria-label={t.pagination}>
            {page > 1 && (
              <Lien
                href={`/slot/${s.slug}?page=${page - 1}`}
                className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan"
              >
                {t.precedent}
              </Lien>
            )}
            <span className="font-mono text-[12px] text-texte-faible">
              {page} / {pages}
            </span>
            {page < pages && (
              <Lien
                href={`/slot/${s.slug}?page=${page + 1}`}
                className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan"
              >
                {t.suivant}
              </Lien>
            )}
          </nav>
        )}
      </main>
      <PiedDePage />
    </div>
  );
}
