import type { Metadata } from 'next';

import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { textes } from '@/i18n/textes';
import { metadonneesDePage } from '@/lib/metadonnees';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { Tirets } from '@/components/DecorNeon';
import { GUIDES } from '@/data/guides';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ langue: string }>;
}): Promise<Metadata> {
  const { langue: brut } = await params;
  const langue = estUneLangue(brut) ? brut : LANGUE_DEFAUT;
  const t = textes(langue);
  return metadonneesDePage({
    titre: t.titrePageGuides,
    description: t.descPageGuides,
    chemin: '/guides',
    langue,
  });
}

export default async function Guides({
  params,
}: {
  params: Promise<{ langue: string }>;
}) {
  const { langue: brutL } = await params;
  const t = textes(estUneLangue(brutL) ? brutL : LANGUE_DEFAUT);
  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[900px] px-6 py-8">
        <div className="mb-2 flex items-center gap-4">
          <h1 className="font-titre text-[24px] font-black uppercase tracking-tight text-white">
            Guides
          </h1>
          <Tirets />
        </div>
        <p className="mb-7 max-w-2xl text-[13px] text-texte-doux">
          {t.accrocheGuides}
        </p>

        <ul className="space-y-3">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <a
                href={`/guides/${g.slug}`}
                className="panneau block p-5 transition hover:border-neon-cyan/60"
              >
                <p className="font-titre text-[16px] font-bold text-white">{g.titre}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-texte-doux">{g.chapo}</p>
                <span className="mt-2.5 inline-block font-mono text-[11px] text-neon-cyan">
                  {g.minutes} min read →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
      <PiedDePage />
    </div>
  );
}
