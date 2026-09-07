import Link from 'next/link';
import { BadgePreuve, type Confiance } from './BadgePreuve';
import { EtoileEnregistrer } from './EtoileEnregistrer';

/**
 * La vignette d'un jeu.
 *
 * ── Le cadre ─────────────────────────────────────────────────────────────
 *
 * Bordure dégradée cyan → magenta, biseautée aux mêmes angles que les
 * panneaux. Les deux néons alternent de sens le long d'une rangée : c'est ce
 * qui donne son rythme à la grille sans que deux cartes voisines se
 * confondent.
 *
 * ── Ce qu'on met à la place des étoiles ──────────────────────────────────
 *
 * La maquette pose une rangée d'étoiles sous chaque jeu. On n'a pas de note
 * éditoriale sur where2play, et en inventer une serait exactement ce que le
 * site reproche aux catalogues qu'il veut remplacer. La bande du bas garde
 * donc sa place et son poids visuel, mais elle porte ce qu'on sait vraiment :
 * le RTP et son niveau de preuve. C'est aussi ce que le visiteur est venu
 * chercher — une étoile ne lui apprend rien qu'il puisse vérifier.
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
  const cyanDabord = index % 2 === 0;
  const rtp = jeu.rtpStudio == null ? null : Number(jeu.rtpStudio);
  const degrade = cyanDabord
    ? 'linear-gradient(145deg,#2fd8f5 0%,#8b5cf6 55%,#f13fdc 100%)'
    : 'linear-gradient(145deg,#f13fdc 0%,#8b5cf6 55%,#2fd8f5 100%)';
  const lueur = cyanDabord
    ? 'drop-shadow(0 0 5px rgba(47,216,245,0.4))'
    : 'drop-shadow(0 0 5px rgba(241,63,220,0.4))';

  /*
   * L'objet remis au composant client est normalisé ici, et pas ailleurs.
   *
   * `rtpStudio` arrive de Prisma en `Decimal`. Un Decimal ne traverse pas la
   * frontière serveur → client, et surtout il ne survit pas à `JSON.stringify`
   * : la liste « mes jeux » gardait alors `{"s":1,"e":1,"d":[…]}` à la place
   * du RTP, et la carte relue affichait un chiffre absurde. Le symptôme
   * n'apparaissait qu'après avoir enregistré un jeu puis rouvert la page.
   */
  const vignette = { ...jeu, rtpStudio: rtp };

  return (
    <div className="group/carte relative">
      <EtoileEnregistrer jeu={vignette} />
      <Link
        href={`/slot/${jeu.studio.slug ?? ''}/${jeu.slug}`}
        className="biseau-petit block transition-[filter] duration-200"
        style={{ background: degrade, padding: 2, filter: lueur }}
      >
        <span className="biseau-petit block bg-fond-carte">
          {/*
           * Format paysage et `object-contain`, pas `object-cover`.
           *
           * Les jaquettes sont fournies en paysage (600×396, 335×177). Les
           * forcer dans un cadre portrait avec recadrage coupait les côtés —
           * et donc le titre du jeu, qui est justement ce qui permet de le
           * reconnaître dans une grille. Un léger bord noir vaut mieux qu'un
           * « BASS / NANZA ».
           */}
          <span className="relative block aspect-[16/10] overflow-hidden bg-fond">
            {jeu.visuelUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={jeu.visuelUrl}
                alt=""
                className="h-full w-full object-contain transition-transform duration-300 group-hover/carte:scale-[1.04]"
              />
            ) : (
              /*
               * Le repli sans jaquette.
               *
               * Il concerne les deux tiers du catalogue : les visuels
               * disponibles portaient le filigrane d'un concurrent et ont été
               * écartés. Ce repli doit donc avoir l'air d'un choix, pas d'une
               * image qui n'a pas chargé — d'où le liseré, le nom composé et
               * la mention du studio, plutôt qu'un rectangle vide.
               */
              <span className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.35),transparent_70%)] px-3 text-center">
                <span>
                  <span className="block font-titre text-[15px] font-extrabold uppercase leading-[1.05] tracking-tight text-white/90">
                    {jeu.nom}
                  </span>
                  <span className="mt-1.5 block font-ui text-[8px] font-semibold uppercase tracking-[0.2em] text-texte-faible">
                    {jeu.studio.nom}
                  </span>
                </span>
              </span>
            )}
            <span className="absolute left-1.5 top-1.5">
              <BadgePreuve niveau={jeu.rtpConfiance as Confiance} taille="petit" />
            </span>
          </span>

          <span className="flex items-center justify-between gap-2 border-t border-fond-bordure px-2.5 py-2">
            <span className="font-ui text-[13px] font-bold tabular-nums text-white">
              {rtp == null ? <span className="text-texte-faible">RTP —</span> : `${rtp.toFixed(2)}%`}
            </span>
            <span className="truncate font-ui text-[9px] font-semibold uppercase tracking-[0.1em] text-texte-faible">
              {jeu.volatilite ? VOLATILITE_EN[jeu.volatilite] ?? jeu.studio.nom : jeu.studio.nom}
            </span>
          </span>
        </span>
      </Link>
    </div>
  );
}
