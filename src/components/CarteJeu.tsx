import { BadgePreuve, type Confiance } from './BadgePreuve';
import { EtoileEnregistrer } from './EtoileEnregistrer';

/**
 * La vignette d'un jeu.
 *
 * Les bordures néon alternent magenta / cyan le long d'une rangée : c'est ce
 * qui donne son rythme à la grille sur la maquette.
 *
 * Le RTP y figure **avec son niveau de preuve**, jamais seul. Un chiffre nu
 * dans une grille, c'est exactement ce que font les catalogues qui se trompent.
 */
export interface JeuVignette {
  slug: string;
  nom: string;
  rtpStudio: unknown;
  rtpConfiance: string;
  volatilite?: string | null;
  gainMaxMultiple?: number | null;
  visuelUrl?: string | null;
  studio: { nom: string; slug?: string };
}

const VOLATILITE_EN: Record<string, string> = {
  BASSE: 'Low',
  MOYENNE: 'Medium',
  HAUTE: 'High',
  TRES_HAUTE: 'Very high',
};

export function CarteJeu({ jeu, index = 0 }: { jeu: JeuVignette; index?: number }) {
  const cyan = index % 2 === 1;
  const rtp = jeu.rtpStudio == null ? null : Number(jeu.rtpStudio);

  return (
    <div className="relative">
      <EtoileEnregistrer jeu={jeu} />
      <a
      href={`/slot/${jeu.studio.slug ?? ''}/${jeu.slug}`}
      className={`group flex flex-col overflow-hidden rounded-lg border-2 bg-fond-carte transition-all ${
        cyan
          ? 'border-neon-cyan/60 hover:border-neon-cyan hover:shadow-neon-cyan'
          : 'border-neon-magenta/60 hover:border-neon-magenta hover:shadow-neon-magenta'
      }`}
    >
      {/*
       * Format paysage et `object-contain`, pas `object-cover`.
       *
       * Les jaquettes sont fournies en paysage (600×396, 335×177). Les forcer
       * dans un cadre portrait avec recadrage coupait les côtés — et donc le
       * titre du jeu, qui est justement ce qui permet de le reconnaître dans
       * une grille. Un léger bord noir vaut mieux qu'un « BASS / NANZA ».
       */}
      <div className="relative aspect-[16/10] overflow-hidden border-b border-fond-bordure bg-fond">
        {jeu.visuelUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={jeu.visuelUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          /*
           * Le repli sans jaquette.
           *
           * Il concerne les deux tiers du catalogue : les visuels disponibles
           * portaient le filigrane d'un concurrent et ont été écartés. Ce
           * repli doit donc avoir l'air d'un choix, pas d'une image qui n'a
           * pas chargé — d'où le liseré, le nom composé et la mention du
           * studio, plutôt qu'un rectangle vide.
           */
          <div className="grid h-full place-items-center bg-gradient-to-br from-neon-violet/25 via-fond-carte to-fond px-2.5 text-center">
            <span>
              <span className="block font-titre text-[13px] font-black uppercase leading-[1.1] tracking-tight text-white/90">
                {jeu.nom}
              </span>
              <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.2em] text-texte-faible">
                {jeu.studio.nom}
              </span>
            </span>
          </div>
        )}
        <span className="absolute left-1.5 top-1.5">
          <BadgePreuve niveau={jeu.rtpConfiance as Confiance} taille="petit" />
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-fond-bordure px-2 py-1.5">
        <span className="font-mono text-[11px] font-semibold text-white">
          {rtp == null ? '—' : `${rtp.toFixed(2)}%`}
        </span>
        <span className="truncate text-[9px] uppercase tracking-wide text-texte-faible">
          {jeu.volatilite ? VOLATILITE_EN[jeu.volatilite] ?? '' : jeu.studio.nom}
        </span>
      </div>
      </a>
    </div>
  );
}
