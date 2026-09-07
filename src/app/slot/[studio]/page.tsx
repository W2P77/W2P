import type { Metadata } from 'next';
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
async function studioParSlug(slug: string) {
  return prisma.studio.findUnique({
    where: { slug },
    include: {
      jeux: {
        orderBy: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
        take: 60,
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
  params: Promise<{ studio: string }>;
}): Promise<Metadata> {
  const { studio } = await params;
  const s = await prisma.studio.findUnique({ where: { slug: studio } });
  if (!s) return { title: 'Provider not found' };
  return {
    title: `${s.nom} slots — RTP, volatility and demos`,
    description: `Every ${s.nom} slot with its RTP, volatility and max win — and where each number comes from.`,
  };
}

export default async function PageStudio({
  params,
}: {
  params: Promise<{ studio: string }>;
}) {
  const { studio } = await params;
  const s = await studioParSlug(studio);
  if (!s) notFound();

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <nav className="mb-4 font-mono text-[11px] text-texte-faible">
          <a href="/catalogue" className="hover:text-neon-cyan">Catalogue</a>
          <span className="mx-2">/</span>
          <span className="text-texte-doux">{s.nom}</span>
        </nav>

        <div className="mb-6 flex items-center gap-4">
          <h1 className="font-titre text-[26px] font-black uppercase tracking-tight text-white">
            {s.nom} slots
          </h1>
          <Tirets />
          <span className="font-mono text-[12px] text-texte-faible">
            {s._count.jeux} games
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {s.jeux.map((j, i) => (
            <CarteJeu key={j.slug} jeu={j} index={i} />
          ))}
        </div>
      </main>
      <PiedDePage />
    </div>
  );
}
