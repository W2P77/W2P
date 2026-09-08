import { CAPTURES } from '@/data/captures';
import { GalerieCaptures } from './GalerieCaptures';

/**
 * Les captures faites dans la démo officielle du studio.
 *
 * ── Pourquoi ce bloc existe ──────────────────────────────────────────────
 *
 * Toutes les fiches de jeu du web se ressemblent parce qu'elles reposent sur
 * les mêmes deux sources : la jaquette fournie par le studio et un RTP recopié
 * de proche en proche. Une capture de la table de gains casse les deux à la
 * fois — elle n'existe nulle part ailleurs, et elle **montre** le chiffre au
 * lieu de l'affirmer.
 *
 * La date de capture est affichée, et ce n'est pas une coquetterie : un studio
 * peut livrer une nouvelle version d'un jeu avec des valeurs différentes. Une
 * capture sans date prétend valoir pour toujours.
 */
export function CapturesJeu({ slug }: { slug: string }) {
  const lot = CAPTURES[slug];
  if (!lot) return null;

  const date = new Date(lot.faitesLe).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="biseau mt-6 border border-fond-bordure bg-fond-panneau p-5">
      <h2 className="font-titre text-[19px] font-extrabold uppercase tracking-wide text-white">
        Inside the game
      </h2>
      <p className="mt-2 max-w-3xl font-corps text-[13px] leading-relaxed text-texte-doux">
        Captured in the studio&apos;s own free demo on {date}, at {lot.source}. Nothing
        below is taken from a press release or another site — it is what the game
        shows when you open it.
      </p>

      <GalerieCaptures captures={lot.captures} jeu={slug} />
    </section>
  );
}
