/**
 * Les éléments de décor néon : équerres, tirets, encoches.
 *
 * Ils sont regroupés ici plutôt qu'éparpillés dans les pages, parce qu'ils
 * reviennent partout et qu'ils doivent rester cohérents. Tous sont
 * `aria-hidden` : ce sont des ornements, ils n'ont rien à annoncer à un
 * lecteur d'écran.
 */

/** Équerre d'angle, comme celles qui encadrent le visuel de l'accroche. */
export function Equerre({
  position,
  couleur = 'cyan',
}: {
  position: 'hg' | 'hd' | 'bg' | 'bd';
  couleur?: 'cyan' | 'magenta';
}) {
  const bord = {
    hg: 'border-l-2 border-t-2 -left-1 -top-1',
    hd: 'border-r-2 border-t-2 -right-1 -top-1',
    bg: 'border-l-2 border-b-2 -left-1 -bottom-1',
    bd: 'border-r-2 border-b-2 -right-1 -bottom-1',
  }[position];
  const teinte = couleur === 'cyan' ? 'border-neon-cyan' : 'border-neon-magenta';
  return <span className={`pointer-events-none absolute h-7 w-7 ${bord} ${teinte}`} aria-hidden />;
}

/** La paire de tirets qui ponctue les titres de section. */
export function Tirets() {
  return (
    <span className="flex shrink-0 items-center gap-1.5" aria-hidden>
      <span className="h-[3px] w-7 rounded-full bg-neon-magenta shadow-neon-magenta" />
      <span className="h-[3px] w-3.5 rounded-full bg-neon-violet" />
      <span className="h-[3px] w-1.5 rounded-full bg-neon-cyan" />
    </span>
  );
}

/** Le liseré horizontal qui sépare deux blocs, dégradé et biseauté. */
export function Liseré({ inverse = false }: { inverse?: boolean }) {
  return (
    <div
      className={`h-[2px] ${
        inverse
          ? 'bg-gradient-to-l from-neon-magenta via-neon-violet to-neon-cyan'
          : 'bg-gradient-to-r from-neon-magenta via-neon-violet to-neon-cyan'
      }`}
      style={{ clipPath: inverse ? 'polygon(4% 0, 100% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 96% 0, 100% 100%, 0 100%)' }}
      aria-hidden
    />
  );
}

/** Le petit chapeau néon posé au-dessus d'un titre. */
export function Chapeau({ texte }: { texte: string }) {
  return (
    <span className="mb-3 flex items-center gap-2">
      <span className="h-[3px] w-8 bg-neon-cyan shadow-neon-cyan" aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
        {texte}
      </span>
    </span>
  );
}

/**
 * Le cadre anguleux qui encercle un bloc.
 *
 * Sur la maquette, l'accroche est tenue par deux traits néon qui courent en
 * haut et sur les côtés, coupés en biseau aux angles. Ce n'est pas une bordure
 * : c'est ce qui donne au bloc son air de panneau de contrôle. Une simple
 * `border` produit un rectangle, pas une découpe.
 */
export function CadreAnguleux() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      {/* Trait supérieur, biseauté à droite */}
      <span
        className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-neon-magenta via-neon-violet to-transparent"
        style={{ clipPath: 'polygon(0 0, 92% 0, 96% 100%, 0 100%)' }}
      />
      {/* Trait inférieur, biseauté à gauche */}
      <span
        className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-neon-violet to-neon-cyan"
        style={{ clipPath: 'polygon(6% 0, 100% 0, 100% 100%, 2% 100%)' }}
      />
      {/* Montants latéraux, courts : ils suggèrent le cadre sans l'enfermer */}
      <span className="absolute left-0 top-0 h-16 w-[2px] bg-gradient-to-b from-neon-magenta to-transparent" />
      <span className="absolute bottom-0 right-0 h-16 w-[2px] bg-gradient-to-t from-neon-cyan to-transparent" />
      {/* Encoches d'angle */}
      <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-neon-magenta" />
      <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-neon-cyan" />
    </div>
  );
}
