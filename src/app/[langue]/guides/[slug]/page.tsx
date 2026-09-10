import type { Metadata } from 'next';
import { Lien } from '@/components/Lien';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { textes } from '@/i18n/textes';

import { metadonneesDePage } from '@/lib/metadonnees';
import { notFound } from 'next/navigation';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { GUIDES, contenuDuGuide, guideParSlug } from '@/data/guides';
import { jeuxCites } from '@/lib/donnees/catalogue';
import { BadgePreuve, type Confiance } from '@/components/BadgePreuve';

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
  const c = contenuDuGuide(g, estUneLangue(brutLangue) ? brutLangue : LANGUE_DEFAUT);
  return metadonneesDePage({
    langue: estUneLangue(brutLangue) ? brutLangue : LANGUE_DEFAUT,
    titre: c.titre,
    description: c.chapo,
    chemin: `/guides/${g.slug}`,
  });
}

export default async function Guide({ params }: { params: Promise<{ slug: string; langue: string }> }) {
  const { langue: brutT } = await params;
  const t = textes(estUneLangue(brutT) ? brutT : LANGUE_DEFAUT);
  const { slug } = await params;
  const g = guideParSlug(slug);
  if (!g) notFound();
  const c = contenuDuGuide(g, estUneLangue(brutT) ? brutT : LANGUE_DEFAUT);

  /*
   * Les jeux cités sont chargés section par section, en une seule requête par
   * section. Le tableau suit l'ordre des sections : `cites[n]` appartient à
   * `c.sections[n]`.
   */
  const cites = await Promise.all(c.sections.map((s) => jeuxCites(s.jeux ?? [])));

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[760px] px-6 py-8">
        <nav className="mb-5 font-mono text-[11px] text-texte-faible">
          <Lien href="/guides" className="hover:text-neon-cyan">{t.navGuides}</Lien>
        </nav>

        <h1 className="font-titre text-[28px] font-black uppercase leading-[1.05] tracking-tight text-white sm:text-[34px]">
          {c.titre}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-texte-doux">{c.chapo}</p>
        <p className="mt-2 font-mono text-[11px] text-texte-faible">{g.minutes} min read</p>

        <article className="mt-8 space-y-8">
          {c.sections.map((section, n) => (
            <section key={section.titre}>
              <h2 className="mb-2.5 font-titre text-[17px] font-bold text-white">
                {section.titre}
              </h2>
              {section.paragraphes.map((paragraphe, i) => (
                <p key={i} className="mb-3 text-[14px] leading-[1.7] text-texte-doux last:mb-0">
                  {paragraphe}
                </p>
              ))}

              {/*
                * Les fiches citées, avec leur RTP **et son niveau de preuve**.
                *
                * C'est ce qui distingue ce maillage d'un simple lien : le
                * lecteur voit le chiffre sur lequel s'appuie le paragraphe et
                * ce qu'il vaut, sans quitter la page. Servir le RTP sans sa
                * preuve reviendrait à donner la même autorité à une valeur
                * confirmée et à une valeur reprise ailleurs.
                */}
              {cites[n].length > 0 && (
                <ul className="mt-4 divide-y divide-fond-bordure border-y border-fond-bordure">
                  {cites[n].map((jeu) => (
                    <li key={jeu.slug}>
                      <Lien
                        href={`/slot/${jeu.studio.slug}/${jeu.slug}`}
                        className="flex items-center justify-between gap-4 py-2.5 transition hover:text-neon-cyan"
                      >
                        <span className="text-[13px] text-texte">
                          {jeu.nom}
                          <span className="ml-2 font-mono text-[11px] text-texte-faible">
                            {jeu.studio.nom}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-[12px] text-texte">
                            {jeu.rtpStudio == null
                              ? t.rtpInconnu
                              : `${Number(jeu.rtpStudio).toFixed(2)}%`}
                          </span>
                          <BadgePreuve niveau={jeu.rtpConfiance as Confiance} />
                        </span>
                      </Lien>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <div className="mt-10 flex gap-3">
          <Lien href="/catalogue" className="tube tube-cyan">{t.parcourirCatalogue}</Lien>
        </div>
      </main>
      <PiedDePage />
    </div>
  );
}
