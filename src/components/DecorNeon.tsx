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
  { haut: 0, palier: 585, chute: 56, couleur: '#f13fdc', opacite: 0.85 },
  { haut: 7, palier: 570, chute: 52, couleur: '#2fd8f5', opacite: 0.5 },
  { haut: 14, palier: 555, chute: 48, couleur: '#ff9d4d', opacite: 0.45 },
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

/**
 * La conduite de l'en-tête, qui démarre après le logo.
 *
 * ── Pourquoi elle ne peut pas être un simple SVG étiré ────────────────────
 *
 * `Conduite` est un SVG en `preserveAspectRatio="none"` : ses coordonnées sont
 * **proportionnelles** à la largeur de la fenêtre. Le logo, lui, occupe une
 * largeur **fixe** en pixels. Faire partir le trait à « 143 unités sur 1200 »
 * le calerait sur le logo à 1440 px de large et le laisserait à 70 px du
 * logo à 1920 — l'écart grandirait avec l'écran, sans que rien ne le signale.
 *
 * D'où ce conteneur : le SVG est décalé d'un nombre de pixels fixe, et
 * l'attaque en biseau est dessinée en segments CSS à longueur fixe, qui
 * gardent leur angle quelle que soit la largeur.
 */
const ATTAQUE = [
  { y: 3, couleur: '#f13fdc', opacite: 0.9 },
  { y: 7, couleur: '#2fd8f5', opacite: 0.55 },
  { y: 12, couleur: '#ff9d4d', opacite: 0.5 },
];

export function ConduiteEnTete({
  depart,
  className = '',
}: {
  /** Distance en pixels entre le bord gauche et le début du trait. */
  depart: number;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      {ATTAQUE.map((a, i) => {
        const longueur = (17 - a.y) * Math.SQRT2;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: depart,
              top: a.y,
              width: longueur,
              height: 1,
              background: a.couleur,
              opacity: a.opacite,
              transformOrigin: 'left center',
              // Le trait monte depuis le bas du bandeau : il a l'air de sortir
              // de derrière le logo plutôt que de commencer dans le vide.
              transform: 'rotate(-45deg) scaleX(-1)',
            }}
          />
        );
      })}
      <div className="absolute inset-y-0 right-0" style={{ left: depart }}>
        <Conduite className="h-full w-full" />
      </div>
    </div>
  );
}
