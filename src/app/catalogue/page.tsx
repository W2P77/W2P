import type { Metadata } from 'next';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { BarreFiltres } from '@/components/BarreFiltres';
import { GrilleStudios } from '@/components/GrilleStudios';
import { Tirets } from '@/components/DecorNeon';
import { chercherJeux, studiosDuCatalogue } from '@/lib/donnees/catalogue';

export const metadata: Metadata = {
  title: 'Slot catalogue — RTP, volatility and demos',
  description:
    'Every slot with its RTP, volatility and max win — and where each number comes from.',
};

export default async function Catalogue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [resultat, studios] = await Promise.all([
    chercherJeux({
      q: sp.q,
      studio: sp.studio,
      volatilite: sp.volatilite,
      preuve: sp.preuve,
      rtpMin: sp.rtpMin ? Number(sp.rtpMin) : undefined,
      tri: sp.tri,
      page: sp.page ? Number(sp.page) : 1,
    }),
    studiosDuCatalogue(),
  ]);

  // Un filtre actif fait basculer l'affichage de la grille de fournisseurs
  // vers la liste de jeux.
  const aUnFiltre = Boolean(sp.q || sp.studio || sp.volatilite || sp.preuve || sp.rtpMin);

  const lien = (page: number) => {
    const p = new URLSearchParams(sp as Record<string, string>);
    p.set('page', String(page));
    return `/catalogue?${p.toString()}`;
  };

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-5 flex items-center gap-4">
          <h1 className="font-titre text-[24px] font-black uppercase tracking-tight text-white">
            Slot catalogue
          </h1>
          <Tirets />
          <span className="font-mono text-[12px] text-texte-faible">
            {resultat.total} games · {studios.length} providers
          </span>
        </div>

        <BarreFiltres studios={studios} />

        {/*
          * Deux vues, et le choix se fait tout seul.
          *
          * Sans filtre, on entre par le fournisseur : sept cents jaquettes
          * d'affilée ne se lisent pas, elles se font défiler. Dès qu'un filtre
          * ou une recherche est posé, la question change — « montre-moi ce qui
          * correspond » — et la grille de jeux devient la bonne réponse,
          * puisqu'elle traverse les fournisseurs.
          */}
        {!aUnFiltre ? (
          <GrilleStudios
            studios={studios.map((s) => ({
              slug: s.slug,
              nom: s.nom,
              logo: s.logoUrl,
              nbJeux: s._count.jeux,
            }))}
          />
        ) : resultat.jeux.length === 0 ? (
          <p className="panneau p-8 text-center text-sm text-texte-doux">
            No slot matches these filters. Try widening one of them.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {resultat.jeux.map((j, i) => (
              <CarteJeu key={j.slug} jeu={j} index={i} />
            ))}
          </div>
        )}

        {aUnFiltre && resultat.pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
            {resultat.page > 1 && (
              <a href={lien(resultat.page - 1)} className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan">
                ← Previous
              </a>
            )}
            <span className="font-mono text-[12px] text-texte-faible">
              {resultat.page} / {resultat.pages}
            </span>
            {resultat.page < resultat.pages && (
              <a href={lien(resultat.page + 1)} className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan">
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
