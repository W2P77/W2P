/**
 * Le visuel de l'accroche : une mosaïque de vraies jaquettes, à fond perdu.
 *
 * ── Pourquoi elle sort du cadre ───────────────────────────────────────────
 *
 * Sur la maquette, le visuel occupe tout le flanc droit et file jusqu'au bord
 * de l'écran, coupé en diagonale. Une première version l'avait enfermé dans
 * une colonne de grille : ça donnait une vignette posée à côté du texte, pas
 * une composition. Il est donc positionné en absolu sur toute la hauteur de
 * l'accroche.
 *
 * ── Pourquoi des jaquettes plutôt qu'une illustration ─────────────────────
 *
 * On n'a pas le visuel de la maquette, et l'accroche d'un site dont l'argument
 * est l'exactitude est le pire endroit où commencer à faire semblant. Des
 * jaquettes réelles disent la même chose — « il y a un catalogue ici » — et
 * elles le prouvent.
 */
export function MosaiqueAccroche({ visuels }: { visuels: string[] }) {
  const tuiles = visuels.filter(Boolean);
  if (tuiles.length === 0) return null;

  // On répète le lot tant que la grille n'est pas pleine : la mosaïque doit
  // occuper toute la surface même quand le catalogue est encore petit.
  const remplies = Array.from({ length: 9 }, (_, i) => tuiles[i % tuiles.length]);

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block"
      style={{ clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0 100%)' }}
      aria-hidden
    >

      <div className="grid h-full grid-cols-3 grid-rows-3 gap-1.5 p-1.5">
        {remplies.map((src, i) => (
          <div key={i} className="relative overflow-hidden bg-fond-carte">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>


      {/* Fondu vers le fond à gauche : la mosaïque doit se fondre dans la page,
          pas s'y coller comme un bloc rapporté. */}
      <div className="absolute inset-0 bg-gradient-to-r from-fond via-fond/45 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-fond via-transparent to-fond/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-neon-magenta/15 via-transparent to-neon-cyan/20" />

      {/* Le liseré diagonal qui borde la découpe, comme sur la maquette. */}
      <div
        className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-neon-cyan via-neon-violet to-neon-magenta"
        style={{ transform: 'skewX(-8deg)', transformOrigin: 'top' }}
      />
    </div>
  );
}
