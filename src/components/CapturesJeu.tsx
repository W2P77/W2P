'use client';

import { GalerieCaptures } from './GalerieCaptures';
import type { Capture } from '@/data/captures';
import { useLangue } from '@/i18n/useLangue';
import { remplir } from '@/i18n/textes';
import { legendeDeCapture, type FaitsDeCapture } from '@/lib/legendes';

/**
 * Les captures faites dans la démo officielle du studio.
 *
 * ── Pourquoi ce bloc existe ──────────────────────────────────────────────
 *
 * Toutes les fiches de jeu du web se ressemblent parce qu'elles reposent sur
 * les mêmes deux sources : la jaquette fournie par le studio et un RTP recopié
 * de proche en proche. Une capture du panneau de règles casse les deux à la
 * fois — elle n'existe nulle part ailleurs, et elle **montre** le chiffre au
 * lieu de l'affirmer.
 *
 * La date de capture est affichée, et ce n'est pas une coquetterie : un studio
 * peut livrer une nouvelle version d'un jeu avec des valeurs différentes. Une
 * capture sans date prétend valoir pour toujours.
 */
export function CapturesJeu({
  jeu,
  slug,
  captures,
  faitesLe,
  faits,
}: {
  jeu: string;
  slug: string;
  captures: unknown;
  faitesLe: Date | null;
  faits: Omit<FaitsDeCapture, 'nom'>;
}) {
  const { langue, t } = useLangue();
  /*
   * Le champ vient d'une colonne JSON : rien ne garantit sa forme à la
   * lecture. On la vérifie ici plutôt que de laisser une fiche tomber en 500
   * parce qu'un enregistrement plus ancien n'avait pas la même structure.
   */
  const lot = Array.isArray(captures)
    ? (captures.filter(
        (c): c is Capture =>
          !!c && typeof c === 'object' && typeof (c as Capture).fichier === 'string',
      ) as Capture[])
    : [];
  if (lot.length === 0) return null;

  const LOCALE = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE' } as const;
  const date = faitesLe
    ? new Date(faitesLe).toLocaleDateString(LOCALE[langue], { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  /*
   * La légende est calculée ici, pas lue en base : 5 018 captures sur 6 777
   * n'en avaient aucune, et celles qui existaient étaient en anglais sur les
   * trois versions du site. Voir `src/lib/legendes.ts`.
   */
  const legendees = lot.map((c) => ({
    ...c,
    legende: legendeDeCapture(c, { ...faits, nom: jeu, slug }, langue),
  }));

  return (
    <section className="biseau mt-6 border border-fond-bordure bg-fond-panneau p-5">
      <h2 className="font-titre text-[19px] font-extrabold uppercase tracking-wide text-white">
        {t.dansLeJeu}
      </h2>
      <p className="mt-2 max-w-3xl font-corps text-[13px] leading-relaxed text-texte-doux">
        {remplir(t.capturesIntro, {
          date: date ? (langue === 'fr' ? ` le ${date}` : langue === 'de' ? ` am ${date}` : ` on ${date}`) : '',
        })}
      </p>

      <GalerieCaptures captures={legendees} jeu={jeu} />
    </section>
  );
}
