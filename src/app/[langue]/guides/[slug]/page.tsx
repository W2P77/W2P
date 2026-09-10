import type { Metadata } from 'next';
import { Lien } from '@/components/Lien';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';

import { metadonneesDePage } from '@/lib/metadonnees';
import { notFound } from 'next/navigation';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { GUIDES, guideParSlug } from '@/data/guides';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; langue: string }>;
}): Promise<Metadata> {
  const { langue: brutLangue, slug } = await params;
  const g = guideParSlug(slug);
  if (!g) return { title: 'Guide not found' };
  return metadonneesDePage({
    langue: estUneLangue(brutLangue) ? brutLangue : LANGUE_DEFAUT,
    titre: g.titre,
    description: g.chapo,
    chemin: `/guides/${g.slug}`,
  });
}

export default async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guideParSlug(slug);
  if (!g) notFound();

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[760px] px-6 py-8">
        <nav className="mb-5 font-mono text-[11px] text-texte-faible">
          <Lien href="/guides" className="hover:text-neon-cyan">Guides</Lien>
        </nav>

        <h1 className="font-titre text-[28px] font-black uppercase leading-[1.05] tracking-tight text-white sm:text-[34px]">
          {g.titre}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-texte-doux">{g.chapo}</p>
        <p className="mt-2 font-mono text-[11px] text-texte-faible">{g.minutes} min read</p>

        <article className="mt-8 space-y-8">
          {g.sections.map((s) => (
            <section key={s.titre}>
              <h2 className="mb-2.5 font-titre text-[17px] font-bold text-white">{s.titre}</h2>
              {s.paragraphes.map((p, i) => (
                <p key={i} className="mb-3 text-[14px] leading-[1.7] text-texte-doux last:mb-0">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>

        <div className="mt-10 flex gap-3">
          <Lien href="/catalogue" className="tube tube-cyan">Browse the catalogue</Lien>
        </div>
      </main>
      <PiedDePage />
    </div>
  );
}
