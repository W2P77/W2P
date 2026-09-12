'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useLangue } from '@/i18n/useLangue';
import { textes } from '@/i18n/textes';

/**
 * Les filtres du catalogue.
 *
 * Ils écrivent dans l'URL plutôt que dans un état local : le résultat se
 * partage, s'indexe et supporte le bouton retour. Un filtre qui ne change pas
 * l'adresse produit un site où l'on ne peut envoyer un lien à personne.
 */
/*
 * Les listes dépendent de la langue : elles se construisent donc dans le
 * composant, pas au chargement du module. Un tableau figé à l'import aurait
 * gardé l'anglais pour les trois versions du site.
 */
type Textes = ReturnType<typeof textes>;

const listes = (t: Textes) => ({
  VOLATILITES: [
    { valeur: '', libelle: t.filtreToutesVolatilites },
    { valeur: 'BASSE', libelle: t.volBasse },
    { valeur: 'MOYENNE', libelle: t.volMoyenne },
    { valeur: 'HAUTE', libelle: t.volHaute },
    { valeur: 'TRES_HAUTE', libelle: t.volTresHaute },
  ],
  PREUVES: [
    { valeur: '', libelle: t.filtreToutePreuve },
    { valeur: 'STUDIO', libelle: t.preuveStudioSeul },
    { valeur: 'RECOUPE', libelle: t.preuveRecoupeCourt },
    { valeur: 'AUCUNE', libelle: t.preuveAucuneCourt },
  ],
  TRIS: [
    { valeur: 'preuve', libelle: t.triMieuxSource },
    { valeur: 'nom', libelle: t.triNom },
    { valeur: 'rtp-desc', libelle: t.triRtp },
    { valeur: 'gain-desc', libelle: t.triGain },
    { valeur: 'recent', libelle: t.triRecent },
  ],
  RTP_MIN: [
    { valeur: '', libelle: t.filtreToutRtp },
    { valeur: '96', libelle: 'RTP 96%+' },
    { valeur: '96.5', libelle: 'RTP 96.5%+' },
    { valeur: '97', libelle: 'RTP 97%+' },
  ],
});

export function BarreFiltres({
  studios,
}: {
  studios: { slug: string; nom: string; _count: { jeux: number } }[];
}) {
  const { t } = useLangue();
  const { VOLATILITES, PREUVES, TRIS, RTP_MIN } = listes(t);
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
          placeholder={t.rechercherPlaceholder}
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-texte-faible"
          aria-label={t.rechercher}
        />
        <button type="submit" className="text-neon-cyan" aria-label={t.rechercher}>⌕</button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select
          className={champ}
          value={params.get('studio') ?? ''}
          onChange={(e) => majParam('studio', e.target.value)}
          aria-label={t.ficheFournisseur}
        >
          <option value="">{t.tousStudios}</option>
          {studios.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.nom} ({s._count.jeux})
            </option>
          ))}
        </select>

        {[
          { cle: 'volatilite', options: VOLATILITES, label: t.ficheVolatilite },
          { cle: 'rtpMin', options: RTP_MIN, label: t.filtreRtpMin },
          { cle: 'preuve', options: PREUVES, label: t.filtreNiveauPreuve },
          { cle: 'tri', options: TRIS, label: t.filtreTri },
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
