import type { Metadata } from 'next';

import { metadonneesDePage } from '@/lib/metadonnees';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { Tirets } from '@/components/DecorNeon';
import { prisma } from '@/lib/donnees/prisma';

export const revalidate = 600;

export const metadata: Metadata = metadonneesDePage({
  titre: 'Verified slots — RTP checked against the studio',
  description:
    'Slots whose RTP we checked against the studio itself, with the source on file. What we could not confirm is listed as unconfirmed.',
  chemin: '/reviews',
});

/**
 * « Reviews », version honnête.
 *
 * Le mot promet d'ordinaire un avis rédigé. On n'en a pas encore, et en
 * fabriquer pour remplir un menu serait exactement ce qu'on reproche aux
 * autres. Ce qu'on a en revanche — et que personne d'autre ne publie — c'est
 * le **travail de vérification** : quelles fiches ont été confrontées à la
 * source du studio, et lesquelles restent invérifiées.
 *
 * La page dit donc ce qu'elle est. Les avis rédigés viendront s'y ajouter.
 */
export default async function Reviews() {
  const [verifies, recoupes, total] = await Promise.all([
    prisma.jeu.findMany({
      where: { rtpConfiance: 'STUDIO' },
      orderBy: { nom: 'asc' },
      select: {
        slug: true, nom: true, rtpStudio: true, rtpConfiance: true,
        volatilite: true, gainMaxMultiple: true, visuelUrl: true,
        rtpSource: true, studio: { select: { nom: true, slug: true } },
      },
    }),
    prisma.jeu.count({ where: { rtpConfiance: 'RECOUPE' } }),
    prisma.jeu.count(),
  ]);

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-2 flex items-center gap-4">
          <h1 className="font-titre text-[24px] font-black uppercase tracking-tight text-white">
            Verified slots
          </h1>
          <Tirets />
        </div>
        <p className="mb-6 max-w-2xl text-[13px] leading-relaxed text-texte-doux">
          These {verifies.length} games have an RTP we checked against the
          studio, with the source recorded and openable from each page.{' '}
          {recoupes} more are cross-checked against two independent sources, and
          the rest of the {total} in the catalogue are shown as unverified —
          because pretending otherwise is the mistake we set out to avoid.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {verifies.map((j, i) => (
            <CarteJeu key={j.slug} jeu={j} index={i} />
          ))}
        </div>
      </main>
      <PiedDePage />
    </div>
  );
}
