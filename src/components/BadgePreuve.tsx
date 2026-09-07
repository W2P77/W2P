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
export type Confiance = 'STUDIO' | 'RECOUPE' | 'UNIQUE' | 'AUCUNE';

const NIVEAUX: Record<Confiance, { court: string; detail: string; classe: string }> = {
  STUDIO: {
    court: 'Studio-verified',
    detail: 'Published by the game studio — source on file',
    classe: 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan',
  },
  RECOUPE: {
    court: 'Cross-checked',
    detail: 'Two independent sources agree, no studio page on file',
    classe: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300',
  },
  UNIQUE: {
    court: 'Single source',
    detail: 'One source only, not cross-checked',
    classe: 'border-note/50 bg-note/10 text-note',
  },
  AUCUNE: {
    court: 'Unverified',
    detail: 'No reliable source yet — treat with caution',
    classe: 'border-texte-faible/40 bg-texte-faible/10 text-texte-doux',
  },
};

export function BadgePreuve({
  niveau,
  taille = 'normal',
}: {
  niveau: Confiance;
  taille?: 'normal' | 'petit';
}) {
  const n = NIVEAUX[niveau];
  return (
    <span
      title={n.detail}
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${n.classe} ${
        taille === 'petit' ? 'px-1.5 py-px text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
      }`}
    >
      {n.court}
    </span>
  );
}
