'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Capture } from '@/data/captures';
import { RACINE_CAPTURES } from '@/lib/site';

/**
 * La galerie des captures, avec agrandissement au clic.
 *
 * ── Pourquoi un agrandissement était nécessaire ───────────────────────────
 *
 * Les captures les plus utiles sont les panneaux de règles : table de gains,
 * plage de multiplicateurs, RTP. Dans une grille à deux colonnes, ce texte
 * fait quatre pixels de haut — l'image est là, mais elle ne se lit pas. Une
 * capture illisible ne documente rien ; elle décore.
 *
 * ── Pourquoi la visionneuse passe par un portail ──────────────────────────
 *
 * Le panneau qui contient la galerie porte la découpe à 45° de la charte,
 * c'est-à-dire un `clip-path`. Or un `clip-path` **rogne ses descendants, y
 * compris ceux en `position: fixed`** : la visionneuse s'ouvrait à l'intérieur
 * du panneau, tronquée, au lieu de couvrir l'écran. Le même piège existe avec
 * `filter` et `transform`, qui redéfinissent le bloc conteneur d'un élément
 * fixe. La seule issue est de sortir du sous-arbre — donc un portail vers
 * `body`.
 *
 * ── Ce que la fermeture doit accepter ─────────────────────────────────────
 *
 * Échap, le clic sur le fond, et un bouton visible. Les trois, parce qu'un
 * visiteur qui ne trouve pas comment refermer une image plein écran quitte la
 * page — et c'est un coût bien supérieur au bénéfice de l'agrandissement.
 */
export function GalerieCaptures({ captures, jeu }: { captures: Capture[]; jeu: string }) {
  const [ouverte, setOuverte] = useState<number | null>(null);
  const fermer = useCallback(() => setOuverte(null), []);

  useEffect(() => {
    if (ouverte === null) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
      if (e.key === 'ArrowRight') setOuverte((i) => (i === null ? null : (i + 1) % captures.length));
      if (e.key === 'ArrowLeft') setOuverte((i) => (i === null ? null : (i - 1 + captures.length) % captures.length));
    };
    document.addEventListener('keydown', auClavier);
    // Le fond ne doit pas défiler derrière l'image ouverte.
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', auClavier);
      document.body.style.overflow = avant;
    };
  }, [ouverte, captures.length, fermer]);

  // Le portail n'existe qu'après le montage : au rendu serveur, `document`
  // n'est pas là. Sans ce drapeau, l'hydratation diverge.
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  const active = ouverte === null ? null : captures[ouverte];

  return (
    <>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {captures.map((c, i) => (
          <figure key={c.fichier}>
            <button
              type="button"
              onClick={() => setOuverte(i)}
              className="biseau-petit group relative block w-full overflow-hidden border border-fond-bordure bg-fond transition hover:border-neon-cyan"
              aria-label={`Enlarge: ${c.titre}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${RACINE_CAPTURES}/${c.fichier}`}
                alt={`${c.titre} — ${jeu}`}
                className="block w-full"
                loading="lazy"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-fond/0 transition group-hover:bg-fond/40">
                <span className="biseau-petit border-2 border-neon-cyan bg-fond/85 px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-neon-cyan opacity-0 transition group-hover:opacity-100">
                  Enlarge
                </span>
              </span>
            </button>
            <figcaption className="mt-2.5">
              <span className="block font-ui text-[13px] font-bold uppercase tracking-[0.05em] text-neon-cyan">
                {c.titre}
              </span>
              <span className="mt-1 block font-corps text-[13px] leading-relaxed text-texte-doux">
                {c.legende}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {/*
       * Le voile est **opaque**, et posé en style plutôt qu'en classe.
       *
       * Deux raisons distinctes. La classe d'abord : une opacité arbitraire
       * comme `bg-black/92` ne sort du générateur que si elle figure telle
       * quelle dans le source — ici elle n'en sortait pas, et le fond restait
       * transparent. L'opacité ensuite : à 95 %, la grille de captures
       * continuait de transparaître sous le panneau qu'on vient justement
       * d'ouvrir pour le lire. Un voile de visionneuse n'a pas à laisser
       * deviner la page ; il a à la faire disparaître.
       */}
      {active && monte && createPortal(
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4"
          style={{ background: 'rgb(3, 5, 10)' }}
          role="dialog"
          aria-modal="true"
          aria-label={active.titre}
          onClick={fermer}
        >
          <button
            type="button"
            onClick={fermer}
            className="biseau-petit absolute right-5 top-5 border-2 border-neon-magenta px-3.5 py-1.5 font-ui text-[12px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-neon-magenta/25"
          >
            Close
          </button>

          {/* Le clic sur l'image elle-même ne referme pas : on vient de
              l'ouvrir pour la lire, et se la voir disparaître sous le doigt
              en la parcourant est le défaut classique de ces panneaux. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${RACINE_CAPTURES}/${active.fichier}`}
            alt={`${active.titre} — ${jeu}`}
            className="max-h-[76vh] w-auto max-w-[94vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <p className="max-w-3xl text-center" onClick={(e) => e.stopPropagation()}>
            <span className="block font-ui text-[13px] font-bold uppercase tracking-[0.08em] text-neon-cyan">
              {active.titre}
            </span>
            <span className="mt-1.5 block font-corps text-[13px] leading-relaxed text-texte-doux">
              {active.legende}
            </span>
            {captures.length > 1 && (
              <span className="mt-2 block font-ui text-[11px] uppercase tracking-[0.1em] text-texte-faible">
                {ouverte! + 1} / {captures.length} — arrow keys to browse, Esc to close
              </span>
            )}
          </p>
        </div>,
        document.body,
      )}
    </>
  );
}
