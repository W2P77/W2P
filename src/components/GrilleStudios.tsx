'use client';

import { useState } from 'react';
import { CarteJeu, type JeuVignette } from './CarteJeu';

/**
 * Le catalogue par fournisseur, dépliable sur place.
 *
 * ── Pourquoi pas 707 vignettes d'un coup ──────────────────────────────────
 *
 * Une grille de sept cents jaquettes ne se lit pas : elle se fait défiler.
 * Entrer par le fournisseur donne une page qui tient à l'écran, et le visiteur
 * choisit ce qu'il veut ouvrir.
 *
 * Le dépliage se fait **sans changer de page** : la liste reste à sa place, on
 * ne perd pas sa position, et revenir en arrière ne renvoie pas en haut.
 *
 * Les jeux sont chargés au premier dépliage, pas d'avance : personne ne
 * regardera les quatorze fournisseurs.
 */
export interface StudioVignette {
  slug: string;
  nom: string;
  logo: string | null;
  nbJeux: number;
}

export function GrilleStudios({ studios }: { studios: StudioVignette[] }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, JeuVignette[]>>({});
  const [charge, setCharge] = useState<string | null>(null);

  const basculer = async (slug: string) => {
    if (ouvert === slug) {
      setOuvert(null);
      return;
    }
    setOuvert(slug);
    if (cache[slug]) return;

    setCharge(slug);
    try {
      const r = await fetch(`/api/studio/${slug}/jeux`);
      const d = await r.json();
      setCache((c) => ({ ...c, [slug]: d.jeux }));
    } catch {
      // Un chargement raté laisse le panneau ouvert et vide plutôt que de
      // refermer sous les doigts du visiteur.
    } finally {
      setCharge(null);
    }
  };

  return (
    <div className="space-y-3">
      {studios.map((s) => {
        const actif = ouvert === s.slug;
        return (
          <div
            key={s.slug}
            className={`panneau overflow-hidden transition-all ${
              actif ? 'border-neon-cyan/60' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => basculer(s.slug)}
              aria-expanded={actif}
              className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-fond-carte"
            >
              {s.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.logo}
                  alt=""
                  className="h-10 w-28 shrink-0 rounded bg-fond object-contain p-1"
                />
              ) : (
                <span className="grid h-10 w-28 shrink-0 place-items-center rounded bg-fond text-[11px] font-bold uppercase">
                  {s.nom}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block font-titre text-[15px] font-bold uppercase tracking-wide text-white">
                  {s.nom}
                </span>
                <span className="font-mono text-[11px] text-texte-faible">
                  {s.nbJeux} game{s.nbJeux > 1 ? 's' : ''}
                </span>
              </span>

              <span
                className={`shrink-0 text-lg transition-transform ${
                  actif ? 'rotate-90 text-neon-cyan' : 'text-texte-faible'
                }`}
                aria-hidden
              >
                ›
              </span>
            </button>

            {actif && (
              <div className="border-t border-fond-bordure p-4">
                {charge === s.slug ? (
                  <p className="py-6 text-center font-mono text-[12px] text-texte-faible">
                    Loading…
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                      {(cache[s.slug] ?? []).slice(0, 24).map((j, i) => (
                        <CarteJeu key={j.slug} jeu={j} index={i} />
                      ))}
                    </div>
                    {(cache[s.slug]?.length ?? 0) > 24 && (
                      <a
                        href={`/slot/${s.slug}`}
                        className="mt-4 inline-block text-[12px] text-neon-cyan hover:underline"
                      >
                        See all {cache[s.slug].length} {s.nom} games →
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
