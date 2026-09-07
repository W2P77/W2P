'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Les filtres du catalogue.
 *
 * Ils écrivent dans l'URL plutôt que dans un état local : le résultat se
 * partage, s'indexe et supporte le bouton retour. Un filtre qui ne change pas
 * l'adresse produit un site où l'on ne peut envoyer un lien à personne.
 */
const VOLATILITES = [
  { valeur: '', libelle: 'Any volatility' },
  { valeur: 'BASSE', libelle: 'Low' },
  { valeur: 'MOYENNE', libelle: 'Medium' },
  { valeur: 'HAUTE', libelle: 'High' },
  { valeur: 'TRES_HAUTE', libelle: 'Very high' },
];

const PREUVES = [
  { valeur: '', libelle: 'Any evidence level' },
  { valeur: 'STUDIO', libelle: 'Studio-verified only' },
  { valeur: 'RECOUPE', libelle: 'Cross-checked' },
  { valeur: 'AUCUNE', libelle: 'Unverified' },
];

const TRIS = [
  { valeur: 'preuve', libelle: 'Best sourced first' },
  { valeur: 'nom', libelle: 'Name A-Z' },
  { valeur: 'rtp-desc', libelle: 'Highest RTP' },
  { valeur: 'gain-desc', libelle: 'Biggest max win' },
  { valeur: 'recent', libelle: 'Newest first' },
];

const RTP_MIN = [
  { valeur: '', libelle: 'Any RTP' },
  { valeur: '96', libelle: 'RTP 96%+' },
  { valeur: '96.5', libelle: 'RTP 96.5%+' },
  { valeur: '97', libelle: 'RTP 97%+' },
];

export function BarreFiltres({
  studios,
}: {
  studios: { slug: string; nom: string; _count: { jeux: number } }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const majParam = useCallback(
    (cle: string, valeur: string) => {
      const p = new URLSearchParams(params.toString());
      if (valeur) p.set(cle, valeur);
      else p.delete(cle);
      // Tout changement de filtre ramène en page 1 : rester en page 7 d'un
      // résultat qui n'en compte plus que 2 afficherait une page vide.
      p.delete('page');
      router.push(`/catalogue?${p.toString()}`);
    },
    [params, router],
  );

  const champ =
    'rounded-lg border border-fond-bordure bg-fond-panneau px-3 py-2 text-[12.5px] text-texte outline-none transition focus:border-neon-cyan';

  return (
    <div className="panneau mb-6 p-4">
      <form
        className="mb-3 flex items-center gap-3 rounded-full border border-neon-cyan/60 bg-fond px-5 py-2.5"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const v = new FormData(e.currentTarget).get('q');
          majParam('q', String(v ?? ''));
        }}
      >
        <input
          name="q"
          type="search"
          defaultValue={params.get('q') ?? ''}
          placeholder="Search by slot name or provider..."
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-texte-faible"
          aria-label="Search by slot name or provider"
        />
        <button type="submit" className="text-neon-cyan" aria-label="Search">⌕</button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select
          className={champ}
          value={params.get('studio') ?? ''}
          onChange={(e) => majParam('studio', e.target.value)}
          aria-label="Provider"
        >
          <option value="">All providers</option>
          {studios.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.nom} ({s._count.jeux})
            </option>
          ))}
        </select>

        {[
          { cle: 'volatilite', options: VOLATILITES, label: 'Volatility' },
          { cle: 'rtpMin', options: RTP_MIN, label: 'Minimum RTP' },
          { cle: 'preuve', options: PREUVES, label: 'Evidence level' },
          { cle: 'tri', options: TRIS, label: 'Sort by' },
        ].map(({ cle, options, label }) => (
          <select
            key={cle}
            className={champ}
            value={params.get(cle) ?? ''}
            onChange={(e) => majParam(cle, e.target.value)}
            aria-label={label}
          >
            {options.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
