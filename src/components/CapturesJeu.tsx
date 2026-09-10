'use client';

import { GalerieCaptures } from './GalerieCaptures';
import type { Capture } from '@/data/captures';
import { useLangue } from '@/i18n/useLangue';

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
  captures,
  faitesLe,
}: {
  jeu: string;
  captures: unknown;
  faitesLe: Date | null;
}) {
  const { t } = useLangue();
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

  const date = faitesLe
    ? new Date(faitesLe).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <section className="biseau mt-6 border border-fond-bordure bg-fond-panneau p-5">
      <h2 className="font-titre text-[19px] font-extrabold uppercase tracking-wide text-white">
        {t.dansLeJeu}
      </h2>
      <p className="mt-2 max-w-3xl font-corps text-[13px] leading-relaxed text-texte-doux">
        Captured in the studio&apos;s own free demo{date ? ` on ${date}` : ''}. Nothing below is
        taken from a press release or another site — it is what the game shows when you open it.
      </p>

      <GalerieCaptures captures={lot} jeu={jeu} />
    </section>
  );
}
