import { useLangue } from '@/i18n/useLangue';'use client';

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
  const { t } = useLangue();
  return (
    /*
     * Plus de marge négative : elle servait à rejoindre le bord gauche du
     * cadre de l'accroche, qui n'existe plus. Sans elle, la pilule s'aligne
     * simplement sur le titre — ce qui était déjà l'intention, obtenue au
     * détour d'un décalage compensé.
     */
    <div className={`relative pt-3.5 ${className}`}>
      {/*
       * Aucun trait n'est dessiné ici, et c'est le point.
       *
       * Première version : trois traits — haut, droite, bas — qui se
       * refermaient en rectangle. Deuxième : une ligne ouverte au-dessus de
       * la pilule. Les deux ajoutaient un objet.
       *
       * La bonne réponse était ailleurs : **la conduite du bas de l'accroche
       * monte** au-dessus de la barre, puis redescend à droite. Le champ ne
       * porte donc rien ; il se glisse sous une ligne qui existait déjà.
       * Voir `ConduiteDecrochee`.
       */}
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
              placeholder={t.rechercherPlaceholder}
              aria-label={t.rechercher}
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
