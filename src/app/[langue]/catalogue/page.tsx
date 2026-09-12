import type { Metadata } from 'next';
import { Lien } from '@/components/Lien';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { remplir, textes } from '@/i18n/textes';

import { metadonneesDePage } from '@/lib/metadonnees';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { BarreFiltres } from '@/components/BarreFiltres';
import { GrilleStudios } from '@/components/GrilleStudios';
import { Tirets } from '@/components/DecorNeon';
import { chercherJeux, studiosDuCatalogue } from '@/lib/donnees/catalogue';

/**
 * Les vues filtrées ne sont pas indexées, et c'est délibéré.
 *
 * Cinq filtres combinables sur sept cents jeux produisent des dizaines de
 * milliers d'adresses, toutes construites à partir du même contenu. Les
 * laisser indexer noierait les fiches — celles qui portent réellement le
 * trafic — sous des pages de listes interchangeables.
 *
 * La page nue reste indexable : c'est l'entrée du catalogue. Les
 * combinaisons, elles, existent pour être partagées et parcourues, pas
 * référencées.
 */
export async function generateMetadata({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  params: Promise<{ langue: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const { langue: brutLangue } = await params;
  const langue = estUneLangue(brutLangue) ? brutLangue : LANGUE_DEFAUT;
  const t = textes(langue);
  const filtre = sp.q || sp.studio || sp.volatilite || sp.preuve || sp.rtpMin || sp.page;

  const description = t.catalogueDescription;

  // Une vue filtrée n'est pas une page : elle pointe sa canonique et son
  // partage vers le catalogue entier, et sort de l'index.
  if (filtre) {
    return {
      ...metadonneesDePage({
        langue,
        titre: sp.q ? `Search: ${sp.q}` : 'Filtered catalogue',
        description,
        chemin: '/catalogue',
      }),
      robots: { index: false, follow: true },
    };
  }

  return metadonneesDePage({
    langue,
    titre: t.titrePageCatalogue,
    description,
    chemin: '/catalogue',
  });
}

export default async function Catalogue({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  params: Promise<{ langue: string }>;
}) {
  const sp = await searchParams;
  const { langue: brutL } = await params;
  const t = textes(estUneLangue(brutL) ? brutL : LANGUE_DEFAUT);
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
            {t.titreCatalogue}
          </h1>
          <Tirets />
          <span className="font-mono text-[12px] text-texte-faible">
            {remplir(t.nbJeux, { n: String(resultat.total) })} ·{' '}
            {remplir(t.nbStudios, { n: String(studios.length) })}
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
          <div className="panneau p-8 text-center">
            <p className="text-[15px] text-texte">
              {sp.q ? (
                <>{remplir(t.aucunResultatPour, { terme: sp.q ?? '' })}</>
              ) : (
                <>{t.aucunResultat}</>
              )}
            </p>
            <p className="mx-auto mt-2 max-w-md text-[13px] text-texte-doux">
              {sp.q ? t.catalogueRienRecherche : t.catalogueRienFiltres}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Lien href="/catalogue" className="tube tube-cyan">{t.effacerFiltres}</Lien>
              <Lien href="/demos" className="tube tube-magenta">{t.parcourirDemos}</Lien>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {resultat.jeux.map((j, i) => (
              <CarteJeu key={j.slug} jeu={j} index={i} />
            ))}
          </div>
        )}

        {aUnFiltre && resultat.pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label={t.pagination}>
            {resultat.page > 1 && (
              <Lien href={lien(resultat.page - 1)} className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan">
                {t.precedent}
              </Lien>
            )}
            <span className="font-mono text-[12px] text-texte-faible">
              {resultat.page} / {resultat.pages}
            </span>
            {resultat.page < resultat.pages && (
              <Lien href={lien(resultat.page + 1)} className="rounded-lg border border-fond-bordure px-4 py-2 text-[12px] hover:border-neon-cyan">
                {t.suivant}
              </Lien>
            )}
          </nav>
        )}
      </main>
      <PiedDePage />
    </div>
  );
}
