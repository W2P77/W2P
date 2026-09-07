import type { Metadata } from 'next';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { Tirets } from '@/components/DecorNeon';
import { prisma } from '@/lib/donnees/prisma';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Free slot demos — play without an account',
  description:
    'Play hundreds of slots for free, no sign-up and no deposit. Every demo links straight to the studio, never to another site.',
};

export default async function Demos({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
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
          Play for free, without an account and without a deposit. Every demo
          opens on the studio&apos;s own page — never on another comparison site.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {jeux.map((j, i) => (
            <CarteJeu key={j.slug} jeu={j} index={i} />
          ))}
        </div>

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
            {page > 1 && (
              <a href={`/demos?page=${page - 1}`} className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan">
                ← Previous
              </a>
            )}
            <span className="font-mono text-[12px] text-texte-faible">{page} / {pages}</span>
            {page < pages && (
              <a href={`/demos?page=${page + 1}`} className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan">
                Next →
              </a>
            )}
          </nav>
        )}
      </main>
      <PiedDePage />
    </div>
  );
}
