/**
 * Le champ de recherche de l'accroche.
 *
 * ── Le plateau compte autant que le tube ──────────────────────────────────
 *
 * Sur la maquette, la barre n'est pas posée sur le fond : elle est encastrée
 * dans un plateau biseauté, bordé et matelassé, qui la tient. Une première
 * version n'avait que le tube — il flottait, et l'accroche paraissait finir
 * dans le vide. Le plateau lui donne son assise et raccorde la barre au reste
 * de la charte : même coupe à 45° que les panneaux, même liseré discret.
 *
 * ── Pourquoi les deux néons à la fois ─────────────────────────────────────
 *
 * C'est le seul élément de la page à porter le cyan et le magenta sur un même
 * contour. Partout ailleurs les deux teintes alternent ; ici elles se
 * rejoignent, et c'est ce qui désigne la barre comme le point d'entrée du
 * site plutôt qu'un champ de formulaire parmi d'autres.
 */
export function ChampRecherche({ className = '' }: { className?: string }) {
  return (
    <div className={`biseau border border-white/[0.14] bg-[#0d1220]/80 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6 ${className}`}
      style={{ ["--coupe" as string]: "22px" }}>
      <form role="search" action="/catalogue">
        <div className="champ-neon">
          <div className="flex items-center gap-3 px-5 py-3.5 sm:px-7 sm:py-4">
            <input
              type="search"
              name="q"
              placeholder="Search by slot name or provider..."
              aria-label="Search by slot name or provider"
              className="w-full bg-transparent font-corps text-[15px] text-texte sm:text-[17px] outline-none placeholder:text-texte-faible"
            />
            <button
              type="submit"
              aria-label="Search"
              className="shrink-0 text-texte-doux transition hover:text-neon-cyan"
            >
              <svg viewBox="0 0 24 24" className="h-[25px] w-[25px]" fill="none" aria-hidden>
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
