'use client';

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

import { remplir, textes } from '@/i18n/textes';
import type { Langue } from '@/i18n/langues';
import type { CategorieRecherche, ResultatRecherche } from '@/lib/recherche/types';
import type { Recherche } from '@/lib/recherche/useRecherche';

/**
 * La liste déroulante des résultats, groupée par catégorie.
 *
 * ── Pourquoi des groupes plutôt qu'une liste unique ───────────────────────
 *
 * Les quatre choses qu'on peut chercher ici ne se comparent pas : un jeu, un
 * fournisseur, un guide et un casino ne mènent ni au même endroit ni au même
 * geste. Mélangés par score, « Pragmatic Play » se retrouve coincé entre deux
 * de ses propres jeux et le visiteur ne voit pas qu'il avait le choix. L'ordre
 * des groupes, lui, reste piloté par la pertinence — voir `donnees/recherche.ts`.
 *
 * ── Pourquoi les libellés se composent ici et pas dans la route ───────────
 *
 * La route renvoie des nombres et des noms propres. Les phrases — « 84 jeux »,
 * « 5 min » — vivent dans `textes.ts`, où le typage force les trois langues.
 * Une phrase assemblée côté serveur sortirait de ce garde-fou et reviendrait
 * en anglais pour tout le monde à la première étourderie.
 *
 * ── Pourquoi la liste est projetée dans `body` ────────────────────────────
 *
 * Le champ vit dans l'accroche, et l'accroche est en `overflow-hidden` — elle
 * doit l'être : ses halos et ses tracés débordent volontairement du cadre, et
 * sans confinement la page entière se met à défiler latéralement au téléphone.
 * Une liste déroulante posée dans le flux y était donc **coupée net sous la
 * pilule** : elle existait dans le DOM, répondait au clavier, et ne s'affichait
 * pas. Le portail est le seul moyen de sortir de ce confinement sans y
 * toucher ; la position est mesurée sur la pilule et refaite à chaque
 * défilement, ce qu'un positionnement absolu aurait donné gratuitement mais
 * dans un cadre qui la tronque.
 */

/** L'écart entre la pilule et la liste, et la marge gardée en bas d'écran. */
const ECART = 8;
const MARGE_BASSE = 16;
/**
 * Ce que le pied de liste occupe : le lien « tous les résultats » et l'aide au
 * clavier. La zone défilante doit le déduire de la hauteur disponible, sinon
 * l'aide se retrouve sous le bord de l'écran — là où personne ne la lit.
 */
const PIED = 76;

interface Cadre {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

/**
 * Le sous-titre d'une ligne : ce qu'on sait, dans la langue de la page.
 *
 * Un RTP absent n'est pas masqué. Sur un site dont l'argument est de dire d'où
 * vient chaque chiffre, laisser un blanc à sa place ferait croire à un oubli
 * d'affichage plutôt qu'à une donnée qu'on n'a pas encore.
 */
function sousTitre(r: ResultatRecherche, t: ReturnType<typeof textes>): string {
  if (r.categorie === 'jeu') {
    const rtp = r.rtp == null ? t.rtpInconnu : `RTP ${r.rtp.toFixed(2)}%`;
    return `${r.studio ?? ''} · ${rtp}`;
  }
  if (r.categorie === 'studio') {
    const n = r.nbJeux ?? 0;
    return n === 1 ? t.nbJeuxUn : remplir(t.nbJeux, { n: String(n) });
  }
  if (r.categorie === 'guide') {
    return remplir(t.minutesCourt, { n: String(r.minutes ?? 0) });
  }
  /*
   * Un casino sort du site par `/go/`, où le clic est enregistré et où une
   * commission se joue. Répéter le nom du groupe sous la ligne n'apprenait
   * rien ; le dire est à la fois plus honnête et plus informatif.
   */
  return t.rechercheLienPartenaire;
}

function libelleDeGroupe(c: CategorieRecherche, t: ReturnType<typeof textes>): string {
  if (c === 'jeu') return t.rechercheGroupeJeux;
  if (c === 'studio') return t.rechercheGroupeStudios;
  if (c === 'guide') return t.rechercheGroupeGuides;
  return t.rechercheGroupeCasinos;
}

/** La pastille de gauche : la jaquette quand elle existe, l'initiale sinon. */
function Vignette({ resultat }: { resultat: ResultatRecherche }) {
  if (resultat.visuel) {
    return (
      <span className="grid h-9 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-fond">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resultat.visuel} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }
  /*
   * Deux tiers du catalogue n'ont pas de jaquette — les visuels disponibles
   * portaient le filigrane d'un concurrent et ont été écartés. Le repli doit
   * donc avoir l'air d'un choix, pas d'une image qui n'a pas chargé.
   */
  return (
    <span className="grid h-9 w-12 shrink-0 place-items-center rounded-md border border-fond-bordure bg-fond font-titre text-[15px] font-black text-neon-cyan/70">
      {resultat.titre.charAt(0).toUpperCase()}
    </span>
  );
}

export function ListeRecherche({
  recherche,
  langue,
  ancre,
}: {
  recherche: Recherche;
  langue: Langue;
  /** La pilule : c'est sur elle que la liste s'aligne. */
  ancre: RefObject<HTMLElement | null>;
}) {
  const t = textes(langue);
  const { reponse, terme, charge, plat, actif, idDeLigne, ouvert } = recherche;
  const [cadre, setCadre] = useState<Cadre | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    const mesurer = () => {
      const r = ancre.current?.getBoundingClientRect();
      if (!r) return;
      setCadre({
        left: r.left,
        top: r.bottom + ECART,
        width: r.width,
        maxHeight: window.innerHeight - r.bottom - ECART - MARGE_BASSE,
      });
    };
    mesurer();
    window.addEventListener('resize', mesurer);
    // En capture : la pilule peut défiler dans un conteneur, pas seulement
    // dans la fenêtre. Sans ça, la liste reste accrochée au vide.
    window.addEventListener('scroll', mesurer, true);
    return () => {
      window.removeEventListener('resize', mesurer);
      window.removeEventListener('scroll', mesurer, true);
    };
  }, [ouvert, ancre]);

  /*
   * La ligne choisie au clavier doit rester visible.
   *
   * La liste défile ; la sélection, elle, avance quoi qu'il arrive. Sans ceci,
   * la quatrième flèche vers le bas sélectionne une ligne située hors du cadre
   * et l'écran ne bouge plus : le visiteur presse Entrée sur une fiche qu'il
   * n'a jamais vue. `nearest` ne recentre pas inutilement quand la ligne est
   * déjà à l'écran.
   */
  const cleActive = plat[actif]?.cle;
  useEffect(() => {
    if (!cleActive) return;
    document.getElementById(idDeLigne(cleActive))?.scrollIntoView({ block: 'nearest' });
  }, [cleActive, idDeLigne]);

  if (!ouvert || !cadre || typeof document === 'undefined') return null;

  const vide = reponse != null && reponse.total === 0;

  return createPortal(
    <div
      /* Le repère que cherche le « clic dehors » du champ : projetée dans
         `body`, la liste n'est plus un descendant du champ, et un test sur
         l'arbre DOM la considérerait comme extérieure — donc refermerait avant
         que le clic n'atteigne le lien. */
      data-recherche=""
      className="fixed z-50 overflow-hidden rounded-2xl border border-fond-bordure bg-fond-panneau shadow-carte"
      style={{
        left: cadre.left,
        top: cadre.top,
        width: cadre.width,
        maxHeight: cadre.maxHeight,
      }}
      /* La liste doit survivre au clic : `mousedown` sur une ligne retire le
         focus du champ, et un `onBlur` qui ferme aurait démonté le lien avant
         que le clic ne l'atteigne. Le champ garde donc la main sur le focus. */
      onMouseDown={(e) => e.preventDefault()}
    >
      {vide ? (
        <p className="px-5 py-6 text-center text-[13px] text-texte-doux">
          {remplir(t.rechercheRien, { terme })}
        </p>
      ) : reponse == null ? (
        <p className="px-5 py-6 text-center text-[13px] text-texte-faible">{t.rechercheEnCours}</p>
      ) : (
        <ul
          className="overflow-y-auto py-1"
          style={{ maxHeight: cadre.maxHeight - PIED }}
          role="listbox"
          id="recherche-resultats"
          aria-label={t.rechercheResultatsAria}
        >
          {reponse.groupes.map((groupe) => (
            <li key={groupe.categorie} role="presentation">
              <p className="px-4 pb-1 pt-2.5 font-ui text-[10px] font-bold uppercase tracking-[0.18em] text-neon-cyan/80">
                {libelleDeGroupe(groupe.categorie, t)}
              </p>
              <ul role="group" aria-label={libelleDeGroupe(groupe.categorie, t)}>
                {groupe.resultats.map((r) => {
                  const selectionne = plat[actif]?.cle === r.cle;
                  return (
                    <li key={r.cle} role="option" id={idDeLigne(r.cle)} aria-selected={selectionne}>
                      <Link
                        href={recherche.adresse(r)}
                        onClick={() => recherche.fermer()}
                        /* Les liens de sortie sont des liens commerciaux : ils
                           passent par `/go/`, où le clic est enregistré. On les
                           déclare comme tels plutôt que de laisser un moteur
                           les prendre pour une recommandation éditoriale. */
                        rel={r.categorie === 'casino' ? 'sponsored nofollow' : undefined}
                        className={`flex items-center gap-3 px-4 py-2 transition ${
                          selectionne ? 'bg-neon-magenta/15' : 'hover:bg-white/5'
                        }`}
                      >
                        <Vignette resultat={r} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-ui text-[13px] font-semibold text-white">
                            {r.titre}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-texte-faible">
                            {sousTitre(r, t)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {/* Le pied n'a de sens qu'avec des résultats : proposer « tous les
          résultats » pour une requête qui n'en a aucun mène à une page qui
          répète le vide, et l'aide au clavier annonce une navigation qui n'a
          rien à parcourir. */}
      {!vide && (
        <>
          <button
            type="button"
            onClick={() => recherche.versLeCatalogue()}
            className="flex w-full items-center justify-between border-t border-fond-bordure px-4 py-2.5 text-left font-ui text-[11.5px] text-texte-doux transition hover:text-neon-cyan"
          >
            <span>{remplir(t.rechercheVoirTout, { terme })}</span>
            <span aria-hidden>→</span>
          </button>

          {/* L'aide au clavier reste visible : la navigation aux flèches n'existe
          pour personne tant que rien ne l'annonce. Masquée au téléphone, où
          il n'y a pas de flèches et où elle volerait une ligne de résultat. */}
          <p className="hidden border-t border-fond-bordure px-4 py-1.5 font-mono text-[10px] text-texte-faible sm:block">
            {charge ? t.rechercheEnCours : t.rechercheAstuce}
          </p>
        </>
      )}
    </div>,
    document.body,
  );
}
