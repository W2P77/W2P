/**
 * La borne d'arcade au néon qui tient le flanc droit de l'accroche.
 *
 * ── Pourquoi elle est dessinée ────────────────────────────────────────────
 *
 * La maquette pose là une scène cyberpunk rendue en 3D. Tant qu'elle n'existe
 * pas, la moitié droite de l'accroche reste vide — et c'est la moitié qui
 * donne son poids à la page. Un aplat dégradé ne remplit pas ce vide : il le
 * signale.
 *
 * Ce tracé n'imite pas la 3D, il assume le trait : mêmes néons que le reste de
 * la charte, mêmes angles à 45°, même vocabulaire de conduites et de nœuds. Il
 * tient le cadre en attendant le rendu, et il ne dépend d'aucun fichier.
 */
export function BorneNeon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 460 620" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id="corps" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a2136" />
          <stop offset="55%" stopColor="#111726" />
          <stop offset="100%" stopColor="#0a0e1a" />
        </linearGradient>
        <linearGradient id="ecran" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16203a" />
          <stop offset="100%" stopColor="#0d1424" />
        </linearGradient>
        <linearGradient id="tube" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3f7" />
          <stop offset="55%" stopColor="#7b5cf0" />
          <stop offset="100%" stopColor="#f13fdc" />
        </linearGradient>
        {/* Le halo suit le trait : rayon court, forte opacité. Un rayon large
            se décolle du contour et produit un bloom qui délave le dessin. */}
        <filter id="lueur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="flou" />
          <feMerge>
            <feMergeNode in="flou" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Le corps de la borne, biseauté comme les panneaux du site ────── */}
      <path
        d="M70 96 L104 62 H356 L390 96 V470 L356 504 H104 L70 470 Z"
        fill="url(#corps)"
        stroke="#2a3350"
        strokeWidth="2"
      />

      {/* ── Le fronton lumineux ──────────────────────────────────────────── */}
      <g filter="url(#lueur)">
        <path d="M112 84 H348" stroke="url(#tube)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="230" cy="112" r="15" stroke="#22d3f7" strokeWidth="2.5" />
        <circle cx="230" cy="112" r="6" fill="#22d3f7" />
      </g>

      {/* ── L'écran d'information du haut ────────────────────────────────── */}
      <rect x="112" y="136" width="236" height="46" rx="4" fill="url(#ecran)" stroke="#2a3350" strokeWidth="1.5" />
      <g opacity="0.85">
        <path d="M126 168 h14 l6-14 6 22 5-16 6 8 h18" stroke="#22d3f7" strokeWidth="1.6" />
        <path d="M212 150 h60 M212 158 h40 M212 166 h72" stroke="#f13fdc" strokeWidth="1.6" strokeOpacity="0.65" />
        <rect x="298" y="148" width="36" height="8" fill="#ff9d4d" fillOpacity="0.7" />
        <rect x="298" y="162" width="22" height="8" fill="#22d3f7" fillOpacity="0.6" />
      </g>

      {/* ── Les trois rouleaux ───────────────────────────────────────────── */}
      <rect x="106" y="200" width="248" height="146" rx="6" fill="#080c17" stroke="url(#tube)" strokeWidth="2.5" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x={118 + i * 78}
            y={212}
            width="66"
            height="122"
            rx="3"
            fill="#101728"
            stroke="#26304c"
            strokeWidth="1.2"
          />
          {/* Le sept, tracé plutôt qu'écrit : une police ne serait pas garantie
              dans un SVG servi à froid, et un chiffre de repli casserait tout. */}
          <g filter="url(#lueur)">
            <path
              d={`M${132 + i * 78} 240 h38 l-20 62`}
              stroke={i === 1 ? '#f13fdc' : '#ff5a4d'}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      ))}

      {/* ── La ligne de gain, qui traverse les trois rouleaux ────────────── */}
      <path d="M106 273 H354" stroke="#ff9d4d" strokeWidth="1.6" strokeOpacity="0.55" strokeDasharray="7 6" />

      {/* ── Le bandeau de mise ───────────────────────────────────────────── */}
      <rect x="130" y="364" width="200" height="26" rx="3" fill="#0c1220" stroke="#26304c" strokeWidth="1.2" />
      <path d="M144 377 h44 M204 377 h30 M250 377 h66" stroke="#7b5cf0" strokeWidth="2" strokeOpacity="0.7" />

      {/* ── Les boutons ──────────────────────────────────────────────────── */}
      <g filter="url(#lueur)">
        <circle cx="168" cy="428" r="16" fill="#0d1322" stroke="#22d3f7" strokeWidth="2.5" />
        <circle cx="230" cy="428" r="11" fill="#0d1322" stroke="#7b5cf0" strokeWidth="2" />
        <circle cx="288" cy="428" r="16" fill="#f13fdc" fillOpacity="0.22" stroke="#f13fdc" strokeWidth="2.5" />
      </g>

      {/* ── Les montants latéraux, qui donnent l'épaisseur ───────────────── */}
      <g filter="url(#lueur)">
        <path d="M84 130 V440" stroke="#22d3f7" strokeWidth="3" strokeLinecap="round" />
        <path d="M376 130 V440" stroke="#f13fdc" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* ── Le bras, à droite ────────────────────────────────────────────── */}
      <path d="M390 250 H424 V178" stroke="#2a3350" strokeWidth="7" strokeLinecap="round" />
      <g filter="url(#lueur)">
        <path d="M390 250 H424 V178" stroke="#f13fdc" strokeWidth="3" strokeLinecap="round" />
        <circle cx="424" cy="166" r="13" fill="#f13fdc" fillOpacity="0.3" stroke="#f13fdc" strokeWidth="3" />
      </g>

      {/* ── Le socle et son reflet ───────────────────────────────────────── */}
      <path d="M96 504 H364 L392 560 H68 Z" fill="#0b1020" stroke="#212a47" strokeWidth="2" />
      <path d="M120 560 H340" stroke="url(#tube)" strokeWidth="3" strokeOpacity="0.75" filter="url(#lueur)" />
      <ellipse cx="230" cy="586" rx="168" ry="14" fill="#7b5cf0" fillOpacity="0.14" />

      {/* ── Les conduites qui la relient au décor ────────────────────────── */}
      <g strokeWidth="1.5" opacity="0.6">
        <path d="M0 300 H40 L70 270" stroke="#22d3f7" />
        <path d="M0 330 H30 L60 300" stroke="#ff9d4d" strokeOpacity="0.7" />
        <path d="M460 340 H420 L390 310" stroke="#f13fdc" />
      </g>
    </svg>
  );
}
