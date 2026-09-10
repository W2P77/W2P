import type { Metadata } from 'next';

import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { textes } from '@/i18n/textes';
import { metadonneesDePage } from '@/lib/metadonnees';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { Tirets } from '@/components/DecorNeon';
import { prisma } from '@/lib/donnees/prisma';

// Une heure : c'est la page dont la fraîcheur est l'argument.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ langue: string }>;
}): Promise<Metadata> {
  const { langue: brut } = await params;
  const langue = estUneLangue(brut) ? brut : LANGUE_DEFAUT;
  const t = textes(langue);
  return metadonneesDePage({
    titre: t.titrePageNouveautes,
    description: t.descPageNouveautes,
    chemin: '/new-releases',
    langue,
  });
}

const CHAMPS = {
  slug: true, nom: true, rtpStudio: true, rtpConfiance: true,
  volatilite: true, gainMaxMultiple: true, visuelUrl: true, sortieLe: true,
  studio: { select: { nom: true, slug: true } },
} as const;

function moisDe(d: Date) {
  return d.toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

export default async function Nouveautes() {
  const jeux = await prisma.jeu.findMany({
    where: { sortieLe: { not: null } },
    orderBy: { sortieLe: 'desc' },
    take: 60,
    select: CHAMPS,
  });

  /*
   * Regroupé par mois plutôt qu'en une grille continue.
   *
   * Sur une page de nouveautés, la date n'est pas une métadonnée : c'est le
   * sujet. Une grille sans repère temporel oblige à ouvrir chaque fiche pour
   * savoir ce qui est réellement récent.
   */
  const parMois = new Map<string, typeof jeux>();
  for (const j of jeux) {
    const cle = moisDe(new Date(j.sortieLe!));
    parMois.set(cle, [...(parMois.get(cle) ?? []), j]);
  }

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-2 flex items-center gap-4">
          <h1 className="font-titre text-[24px] font-black uppercase tracking-tight text-white">
            New releases
          </h1>
          <Tirets />
        </div>
        <p className="mb-7 max-w-2xl text-[13px] leading-relaxed text-texte-doux">
          The most recent games in the catalogue. A brand-new slot rarely has a
          published RTP on day one — when that is the case we say so rather than
          copying a number from elsewhere, and the page is updated once the
          studio publishes.
        </p>

        <div className="space-y-9">
          {[...parMois.entries()].map(([mois, lot]) => (
            <section key={mois}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-mono text-[12px] uppercase tracking-[0.2em] text-neon-cyan">
                  {mois}
                </h2>
                <span className="h-px flex-1 bg-gradient-to-r from-neon-cyan/40 to-transparent" />
                <span className="font-mono text-[11px] text-texte-faible">{lot.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {lot.map((j, i) => (
                  <CarteJeu key={j.slug} jeu={j} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <PiedDePage />
    </div>
  );
}
