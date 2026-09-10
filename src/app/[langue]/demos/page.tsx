import type { Metadata } from 'next';
import { Lien } from '@/components/Lien';

import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { textes } from '@/i18n/textes';
import { metadonneesDePage } from '@/lib/metadonnees';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { Tirets } from '@/components/DecorNeon';
import { prisma } from '@/lib/donnees/prisma';

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ langue: string }>;
}): Promise<Metadata> {
  const { langue: brut } = await params;
  const langue = estUneLangue(brut) ? brut : LANGUE_DEFAUT;
  const t = textes(langue);
  return metadonneesDePage({
    titre: t.titrePageDemos,
    description: t.descPageDemos,
    chemin: '/demos',
    langue,
  });
}

export default async function Demos({
  searchParams,
  params,
}: {
  searchParams: Promise<{ page?: string }>;
  params: Promise<{ langue: string }>;
}) {
  const { langue: brutL } = await params;
  const t = textes(estUneLangue(brutL) ? brutL : LANGUE_DEFAUT);
  const { page: pageBrute } = await searchParams;
  const page = Math.max(1, Number(pageBrute ?? 1));
  const parPage = 24;

  const [jeux, total] = await Promise.all([
    prisma.jeu.findMany({
      where: { demoUrl: { not: null } },
      orderBy: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
      skip: (page - 1) * parPage,
      take: parPage,
      select: {
        slug: true, nom: true, rtpStudio: true, rtpConfiance: true,
        volatilite: true, gainMaxMultiple: true, visuelUrl: true,
        studio: { select: { nom: true, slug: true } },
      },
    }),
    prisma.jeu.count({ where: { demoUrl: { not: null } } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / parPage));

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-2 flex items-center gap-4">
          <h1 className="font-titre text-[24px] font-black uppercase tracking-tight text-white">
            Free demos
          </h1>
          <Tirets />
          <span className="font-mono text-[12px] text-texte-faible">{total} games</span>
        </div>
        <p className="mb-6 max-w-2xl text-[13px] text-texte-doux">
          {t.accrocheDemos}
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {jeux.map((j, i) => (
            <CarteJeu key={j.slug} jeu={j} index={i} />
          ))}
        </div>

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3" aria-label={t.pagination}>
            {page > 1 && (
              <Lien href={`/demos?page=${page - 1}`} className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan">
                ← Previous
              </Lien>
            )}
            <span className="font-mono text-[12px] text-texte-faible">{page} / {pages}</span>
            {page < pages && (
              <Lien href={`/demos?page=${page + 1}`} className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan">
                Next →
              </Lien>
            )}
          </nav>
        )}
      </main>
      <PiedDePage />
    </div>
  );
}
