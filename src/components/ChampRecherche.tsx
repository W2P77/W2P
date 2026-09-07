/**
 * Le champ de recherche de l'accroche.
 *
 * ── Ce n'est pas un plateau, c'est un décrochement du cadre ───────────────
 *
 * Première lecture : un panneau bordé, flottant sur le fond. Faux. Sur la
 * référence, les traits qui entourent la barre **sont ceux du cadre de
 * l'accroche** : le contour arrive par le bord gauche, se coude à 45°, passe
 * au-dessus de la pilule, redescend à droite, et le bas du cadre referme
 * dessous. Le cadre contourne la barre au lieu de s'arrêter avant.
 *
 * La différence n'est pas décorative. Un panneau posé ajoute un objet de
 * plus ; un décrochement dit que la barre appartient au bloc — c'est ce qui
 * fait lire l'accroche comme un seul appareil.
 *
 * D'où les marges négatives : le bloc doit **rejoindre** le cadre, à gauche
 * (8 px) et en bas (28 px), sinon le trait s'arrête dans le vide au lieu de
 * se raccorder.
 *
 * ── Pourquoi les deux néons à la fois ─────────────────────────────────────
 *
 * La pilule est le seul élément de la page à porter le cyan et le magenta sur
 * un même contour. Partout ailleurs les deux teintes alternent ; ici elles se
 * rejoignent, et c'est ce qui la désigne comme le point d'entrée du site
 * plutôt qu'un champ de formulaire parmi d'autres.
 */
export function ChampRecherche({ className = '' }: { className?: string }) {
  return (
    <div className={`relative -ml-2 pl-5 pr-7 pt-3.5 ${className}`}>
      {/*
       * ── Une ligne ouverte, pas un cadre ─────────────────────────────────
       *
       * Premier essai : trait du haut, trait de droite, trait du bas. Les
       * trois se refermaient en rectangle, et la barre paraissait posée dans
       * une boîte noire — exactement ce que la référence ne fait pas.
       *
       * Ici la ligne **passe** : elle monte du bord gauche par une diagonale
       * à 45°, court au-dessus de la pilule, puis redescend à droite et
       * continue hors du bloc. Rien ne referme en bas, rien ne referme à
       * droite. La barre pend sous la ligne au lieu d'être enfermée dedans,
       * et c'est ce qui la rattache au cadre de l'accroche plutôt que d'en
       * faire un objet de plus.
       *
       * Et la ligne est **néon**, pas grise : c'est la même conduite que
       * celles qui courent sous l'en-tête et au bas de l'accroche. Un trait
       * gris en aurait fait une bordure de formulaire.
       */}
      <span
        className="pointer-events-none absolute left-0 top-[17px] h-px w-[24px] origin-left -rotate-45 bg-neon-cyan/60"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute left-[17px] right-0 top-0 h-px bg-gradient-to-r from-neon-cyan/60 via-neon-violet/40 to-neon-magenta/50"
        aria-hidden
      />
      {/*
       * La descente rejoint la conduite du bas.
       *
       * Longue de 124 px pour un dénivelé de 88 px à 45° — c'est la distance
       * exacte entre le trait du décrochement et le bord bas du cadre. Une
       * diagonale plus courte s'arrêtait en l'air : la ligne avait l'air
       * coupée, et le décrochement redevenait un objet posé au lieu d'être
       * un détour de la conduite.
       */}
      <span
        className="pointer-events-none absolute left-full top-0 hidden h-px w-[124px] origin-left rotate-45 bg-gradient-to-r from-neon-magenta/55 to-neon-magenta/25 lg:block"
        aria-hidden
      />

      <form role="search" action="/catalogue">
        <div className="champ-neon">
          {/*
           * Hauteur fixée, et non déduite du padding.
           *
           * Un `input[type=search]` porte une hauteur intrinsèque que ni `py`
           * ni `leading-tight` ne réduisent : le réglage annonçait 40 px, le
           * navigateur en rendait 50. La pilule se retrouvait plus haute que
           * les boutons alors qu'elle doit être plus basse — l'inversion se
           * voit immédiatement, même sans savoir la nommer.
           */}
          <div className="flex h-[38px] items-center gap-3 px-5 sm:px-6">
            <input
              type="search"
              name="q"
              placeholder="Search by slot name or provider..."
              aria-label="Search by slot name or provider"
              className="w-full bg-transparent font-corps text-[15px] leading-tight text-texte outline-none placeholder:text-texte-faible sm:text-[16px]"
            />
            <button
              type="submit"
              aria-label="Search"
              className="shrink-0 text-texte-doux transition hover:text-neon-cyan"
            >
              <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="M16.4 16.4 L21 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
