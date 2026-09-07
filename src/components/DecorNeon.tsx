import type { ReactNode } from 'react';

/**
 * Les éléments de décor néon.
 *
 * Ils sont regroupés ici plutôt qu'éparpillés dans les pages, parce qu'ils
 * reviennent partout et qu'ils doivent rester cohérents. Tous les ornements
 * sont `aria-hidden` : ils n'ont rien à annoncer à un lecteur d'écran.
 */

type Teinte = 'cyan' | 'magenta' | 'mixte';

const DEGRADES: Record<Teinte, string> = {
  cyan: 'linear-gradient(135deg,#2fd8f5 0%,rgba(47,216,245,0.35) 45%,rgba(47,216,245,0.15) 100%)',
  magenta: 'linear-gradient(135deg,#f13fdc 0%,rgba(241,63,220,0.35) 45%,rgba(241,63,220,0.15) 100%)',
  mixte: 'linear-gradient(135deg,#2fd8f5 0%,#8b5cf6 50%,#f13fdc 100%)',
};

const LUEURS: Record<Teinte, string> = {
  cyan: 'drop-shadow(0 0 4px rgba(47,216,245,0.4))',
  magenta: 'drop-shadow(0 0 4px rgba(241,63,220,0.4))',
  mixte: 'drop-shadow(0 0 4px rgba(139,92,246,0.4))',
};

/**
 * Un panneau biseauté, liseré compris.
 *
 * ── Pourquoi deux éléments imbriqués ──────────────────────────────────────
 *
 * Parce qu'une `border` suit le rectangle et pas la découpe : dans les angles
 * coupés, le trait s'interrompt et le panneau se retrouve sans contour là où
 * il est le plus visible. On empile donc le dégradé dessous et le fond du
 * panneau dessus, décalé d'un pixel — le pixel qui dépasse **est** le liseré,
 * et il suit la diagonale parce qu'il porte la même découpe.
 *
 * Le halo passe par `filter`, jamais par `box-shadow` : une ombre portée
 * ignore le `clip-path` et redessine un rectangle autour du panneau.
 */
export function Panneau({
  children,
  teinte = 'mixte',
  className = '',
  epaisseur = 1,
}: {
  children: ReactNode;
  teinte?: Teinte;
  className?: string;
  epaisseur?: 1 | 2;
}) {
  return (
    <div
      className="biseau relative"
      style={{ background: DEGRADES[teinte], padding: epaisseur, filter: LUEURS[teinte] }}
    >
      <div className={`biseau h-full w-full bg-fond-panneau ${className}`}>{children}</div>
    </div>
  );
}

/**
 * Le motif de chevrons qui suit un titre de section.
 *
 * Sur la maquette, il n'est pas symétrique : deux barres pleines, puis une
 * traîne de barres de plus en plus fines. C'est ce dégradé de densité qui
 * donne la direction — un peigne régulier ferait tapisserie.
 */
export function Chevrons({ inverse = false }: { inverse?: boolean }) {
  const barres = [
    { h: 22, l: 5, c: '#f13fdc' },
    { h: 20, l: 5, c: '#f13fdc' },
    { h: 17, l: 3, c: '#a855f7' },
    { h: 15, l: 3, c: '#8b5cf6' },
    { h: 13, l: 2, c: '#7c6cf0' },
    { h: 11, l: 2, c: '#5f8ef2' },
    { h: 9, l: 2, c: '#42b3f4' },
    { h: 7, l: 2, c: '#2fd8f5' },
  ];
  return (
    <span
      className="flex shrink-0 items-center gap-[3px]"
      style={{ transform: inverse ? 'scaleX(-1)' : undefined }}
      aria-hidden
    >
      {barres.map((b, i) => (
        <span
          key={i}
          style={{
            height: b.h,
            width: b.l,
            background: b.c,
            transform: 'skewX(-20deg)',
            opacity: 1 - i * 0.07,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Un tracé de circuit imprimé.
 *
 * ── Pourquoi il est dessiné et non répété ─────────────────────────────────
 *
 * Un motif qui se répète se lit comme une texture ; un circuit se lit parce
 * qu'il va quelque part. Les coudes sont donc à 45°, comme la découpe des
 * panneaux, et chaque ligne se termine sur un nœud — sans terminaison, un
 * trait qui s'arrête au milieu du vide a l'air d'un bug d'affichage.
 */
export function TraceCircuit({
  cote = 'gauche',
  className = '',
}: {
  cote?: 'gauche' | 'droite';
  className?: string;
}) {
  const traits = [
    { d: 'M0 8 H46 L58 20 H150', c: '#2fd8f5', o: 0.85 },
    { d: 'M0 20 H30 L40 30 H92', c: '#f13fdc', o: 0.6 },
    { d: 'M0 32 H18 L28 42 H70 L78 34 H132', c: '#ff9d4d', o: 0.55 },
    { d: 'M0 44 H58', c: '#8b5cf6', o: 0.45 },
  ];
  const noeuds = [
    { x: 150, y: 8, c: '#2fd8f5' },
    { x: 92, y: 30, c: '#f13fdc' },
    { x: 132, y: 34, c: '#ff9d4d' },
  ];
  return (
    <svg
      viewBox="0 0 160 52"
      className={className}
      fill="none"
      aria-hidden
      style={{ transform: cote === 'droite' ? 'scaleX(-1)' : undefined }}
    >
      {traits.map((t, i) => (
        <path key={i} d={t.d} stroke={t.c} strokeOpacity={t.o} strokeWidth="1.4" />
      ))}
      {noeuds.map((n, i) => (
        <rect key={i} x={n.x - 2} y={n.y - 2} width="4" height="4" fill={n.c} />
      ))}
    </svg>
  );
}

/**
 * La conduite néon qui longe un bord et se coude en biseau.
 *
 * C'est l'élément que la maquette répète le plus : un double trait cyan et
 * orange qui court sous l'en-tête, se casse à 45°, et repart. Il ne sépare
 * rien — il relie, et c'est ce qui fait tenir la page comme un seul appareil
 * plutôt que comme une pile de blocs.
 */
export function Conduite({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 26"
      preserveAspectRatio="none"
      className={className}
      fill="none"
      aria-hidden
    >
      <path d="M0 5 H820 L840 25 H1200" stroke="#f13fdc" strokeWidth="2" strokeOpacity="0.9" />
      <path d="M0 11 H806 L826 31 H1200" stroke="#2fd8f5" strokeWidth="1.6" strokeOpacity="0.55" />
      <path d="M120 19 H780 L800 39 H1200" stroke="#ff9d4d" strokeWidth="1.4" strokeOpacity="0.5" />
    </svg>
  );
}

/** Équerre d'angle, pour souligner un coin sans enfermer le bloc. */
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

/** La paire de tirets qui ponctue un titre secondaire. */
export function Tirets() {
  return (
    <span className="flex shrink-0 items-center gap-1.5" aria-hidden>
      <span className="h-[3px] w-7 bg-neon-magenta shadow-neon-magenta" />
      <span className="h-[3px] w-3.5 bg-neon-violet" />
      <span className="h-[3px] w-1.5 bg-neon-cyan" />
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
      style={{
        clipPath: inverse ? 'polygon(4% 0, 100% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 96% 0, 100% 100%, 0 100%)',
      }}
      aria-hidden
    />
  );
}

/** Le petit chapeau néon posé au-dessus d'un titre. */
export function Chapeau({ texte }: { texte: string }) {
  return (
    <span className="mb-3 flex items-center gap-2">
      <span className="h-[3px] w-8 bg-neon-cyan shadow-neon-cyan" aria-hidden />
      <span className="font-ui text-[10px] font-semibold uppercase tracking-[0.3em] text-neon-cyan">
        {texte}
      </span>
    </span>
  );
}

/** Un titre de section, avec sa ponctuation de chevrons. */
export function TitreSection({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <h2 className="font-titre text-[20px] font-extrabold uppercase leading-none tracking-[0.01em] text-white sm:text-[23px]">
        {children}
      </h2>
      <Chevrons />
    </div>
  );
}

/**
 * La conduite du bas de l'accroche, décrochée pour laisser passer la barre
 * de recherche.
 *
 * ── Pourquoi elle remplace la conduite droite ─────────────────────────────
 *
 * Le champ de recherche doit se glisser **sous** une ligne qui existe déjà,
 * pas sous une ligne ajoutée pour lui. J'ai d'abord dessiné un cadre autour du
 * champ (il se lisait comme une bordure de formulaire), puis une ligne ouverte
 * au-dessus (elle ajoutait un objet de plus). Dans les deux cas, la conduite
 * du bas continuait tout droit en dessous, et il y avait donc deux traits là
 * où la référence n'en montre qu'un.
 *
 * Ici la conduite elle-même monte au-dessus du champ sur la partie gauche,
 * redescend à 45°, et reprend son niveau à droite. Un seul trait, qui contourne.
 *
 * ── Pourquoi en segments CSS et non en SVG ────────────────────────────────
 *
 * Un SVG étiré en `preserveAspectRatio="none"` déforme les diagonales : sur
 * une bande de 110 px de haut pour 1 440 de large, un « 45° » devient un angle
 * de quelques degrés. Les segments horizontaux s'étirent sans dommage, les
 * diagonales sont posées à longueur fixe et gardent leur angle.
 */
const LIGNES = [
  { haut: 0, palier: 585, chute: 61, couleur: '#f13fdc', opacite: 0.85 },
  { haut: 7, palier: 570, chute: 57, couleur: '#2fd8f5', opacite: 0.5 },
  { haut: 14, palier: 555, chute: 53, couleur: '#ff9d4d', opacite: 0.45 },
];

export function ConduiteDecrochee({ className = '' }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      {LIGNES.map((l, i) => {
        const commun = {
          position: 'absolute' as const,
          height: 1,
          background: l.couleur,
          opacity: l.opacite,
        };
        return (
          <div key={i}>
            {/* Le palier haut, au-dessus du champ de recherche. */}
            <span style={{ ...commun, left: 0, top: l.haut, width: l.palier }} />
            {/* La descente, à longueur fixe pour rester à 45°. */}
            <span
              style={{
                ...commun,
                left: l.palier,
                top: l.haut,
                width: l.chute * Math.SQRT2,
                transformOrigin: 'left center',
                transform: 'rotate(45deg)',
              }}
            />
            {/* Le palier bas, jusqu'au bord droit. */}
            <span style={{ ...commun, left: l.palier + l.chute, top: l.haut + l.chute, right: 0 }} />
          </div>
        );
      })}
    </div>
  );
}
