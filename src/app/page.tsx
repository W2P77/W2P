import Link from 'next/link';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { Accroche } from '@/components/Accroche';
import { ChampRecherche } from '@/components/ChampRecherche';
import { ListeGuides } from '@/components/ListeGuides';
import { Panneau, TitreSection } from '@/components/DecorNeon';
import { BoutonFlottant } from '@/components/BoutonFlottant';
import { jeuxEnAvant, compterCatalogue } from '@/lib/donnees/jeux';
import { studiosDuCatalogue } from '@/lib/donnees/catalogue';

// Les chiffres viennent de la base, jamais du texte : un nombre recopié dans
// une page dérive dès qu'un jeu entre ou sort.
export const revalidate = 300;

export default async function Home() {
  const [jeux, compte, studios] = await Promise.all([
    jeuxEnAvant(8),
    compterCatalogue(),
    studiosDuCatalogue(),
  ]);

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />

      <Accroche>
        <div className="max-w-2xl">
          {/*
           * Pas de sur-titre : la maquette attaque directement au titre. Un
           * « SLOT CATALOGUE » au-dessus d'un titre qui dit déjà de quoi il
           * s'agit ne fait qu'ajouter une ligne avant l'argument.
           */}
          <h1 className="font-titre text-[34px] font-black uppercase leading-[0.86] tracking-[0.005em] text-white sm:text-[50px] md:text-[60px] lg:text-[72px]">
            Discover your next
            <br />
            reel adventure
          </h1>

          {/* Une seule ligne : sur deux, le bloc perd sa densité et le bouton
              descend hors du premier écran. */}
          <p className="mt-4 max-w-[36rem] font-corps text-[17px] leading-snug text-texte-doux">
            Thousands of free slots, demos and expert reviews — every number sourced.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/demos" className="tube tube-magenta">
              Play free demos
            </Link>
            <Link href="/catalogue" className="tube tube-cyan">
              Explore catalogue
            </Link>
          </div>
        </div>

        <ChampRecherche className="mt-6 max-w-[646px] sm:mt-7" />
      </Accroche>

      {/* ── Les deux panneaux ────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-[1440px] gap-6 px-6 py-7 lg:grid-cols-[1.75fr_1fr]">
        <Panneau teinte="mixte" className="p-6">
          <TitreSection>Top rated slots this week</TitreSection>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {jeux.map((j, i) => (
              <CarteJeu key={j.slug} jeu={j} index={i} />
            ))}
          </div>

          <p className="mt-5 font-ui text-[12px] tracking-wide text-texte-faible">
            {compte.jeux} games · {compte.studios} studios ·{' '}
            <span className="text-neon-cyan">{compte.sourcés} studio-verified RTPs</span>
          </p>
        </Panneau>

        <Panneau teinte="cyan" className="p-6">
          <TitreSection>Latest guides &amp; reviews</TitreSection>
          <ListeGuides />

          <div className="mt-5 border-t border-fond-bordure pt-5">
            <h3 className="mb-3 font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-texte-faible">
              Browse by provider
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {studios.slice(0, 6).map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/slot/${s.slug}`}
                    className="biseau-petit flex items-center gap-2 border border-fond-bordure bg-fond px-2 py-1.5 transition hover:border-neon-cyan"
                  >
                    <span className="min-w-0 flex-1 truncate font-corps text-[12px] text-texte">
                      {s.nom}
                    </span>
                    <span className="shrink-0 font-ui text-[11px] tabular-nums text-texte-faible">
                      {s._count.jeux}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/catalogue"
              className="mt-3 inline-block font-ui text-[12px] font-semibold uppercase tracking-wide text-neon-cyan hover:underline"
            >
              All {studios.length} providers →
            </Link>
          </div>
        </Panneau>
      </section>

      <BoutonFlottant />
      <PiedDePage />
    </div>
  );
}
