'use client';

/**
 * Le niveau de preuve d'un chiffre — l'argument du site, rendu visible.
 *
 * Tous les catalogues affichent un RTP avec le même aplomb, y compris quand il
 * est faux : palier opérateur pris pour la valeur studio, RTP d'achat de bonus
 * présenté comme celui du jeu. Mesuré et corrigé le 06/09/2026 sur 27 fiches.
 *
 * Dire ce qu'on ne sait pas est ce qui permet de publier vite sans mentir : une
 * nouveauté sort le jour même en `AUCUNE`, et la fiche se bonifie quand la
 * source arrive.
 */
import { useLangue } from '@/i18n/useLangue';

export type Confiance = 'STUDIO' | 'RECOUPE' | 'UNIQUE' | 'AUCUNE';

/*
 * Le niveau se dit dans la langue du visiteur : c'est l'argument du site, et
 * un argument qui ne se lit pas ne sert à rien. La couleur, elle, ne se
 * traduit pas — elle reste ici.
 */
const CLASSES: Record<Confiance, string> = {
  STUDIO: 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan',
  RECOUPE: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300',
  UNIQUE: 'border-note/50 bg-note/10 text-note',
  AUCUNE: 'border-texte-faible/40 bg-texte-faible/10 text-texte-doux',
};

export function BadgePreuve({
  niveau,
  taille = 'normal',
}: {
  niveau: Confiance;
  taille?: 'normal' | 'petit';
}) {
  const { t } = useLangue();
  const COURT: Record<Confiance, string> = {
    STUDIO: t.preuveStudioCourt,
    RECOUPE: t.preuveRecoupeCourt,
    UNIQUE: t.preuveUniqueCourt,
    AUCUNE: t.preuveAucuneCourt,
  };
  const DETAIL: Record<Confiance, string> = {
    STUDIO: t.preuveStudioDetail,
    RECOUPE: t.preuveRecoupeDetail,
    UNIQUE: t.preuveUniqueDetail,
    AUCUNE: t.preuveAucuneDetail,
  };
  return (
    <span
      title={DETAIL[niveau]}
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${CLASSES[niveau]} ${
        taille === 'petit' ? 'px-1.5 py-px text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
      }`}
    >
      {COURT[niveau]}
    </span>
  );
}
