/**
 * La marque : une borne de machine à sous au néon, puis le mot.
 *
 * ── Pourquoi un tracé et non un emoji ─────────────────────────────────────
 *
 * La version d'amorçage posait 🎰 dans un carré. Un emoji est rendu par la
 * police du système : il change d'un appareil à l'autre, ne prend pas la
 * couleur de la charte, et n'a aucun rapport de style avec le reste. Une
 * marque qui change d'aspect selon le téléphone n'est pas une marque.
 *
 * Le tracé, lui, hérite des néons du site et se coupe aux mêmes angles que
 * les panneaux — la borne est biseautée comme eux.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" aria-hidden>
      {/* Le corps de la borne, biseauté en haut à gauche comme les panneaux */}
      <path
        d="M9 12 L13 8 H35 V30 L31 34 H9 Z"
        stroke="#2fd8f5"
        strokeWidth="1.8"
        fill="rgba(47,216,245,0.06)"
      />
      {/* L'écran et ses trois rouleaux */}
      <rect x="14" y="13" width="16" height="9" stroke="#f13fdc" strokeWidth="1.4" />
      <path d="M19.3 13 V22 M24.7 13 V22" stroke="#f13fdc" strokeWidth="1" strokeOpacity="0.7" />
      {/* Le bandeau lumineux du fronton */}
      <path d="M15 10.5 H33" stroke="#ff9d4d" strokeWidth="1.6" strokeOpacity="0.85" />
      {/* Le bouton de mise */}
      <circle cx="22" cy="28" r="2.6" stroke="#2fd8f5" strokeWidth="1.4" />
      {/* Le bras, à droite */}
      <path d="M35 18 H39 V13" stroke="#f13fdc" strokeWidth="1.6" />
      <circle cx="39" cy="11" r="2.2" fill="#f13fdc" />
      {/* Le socle */}
      <path d="M12 37 H32" stroke="#2fd8f5" strokeWidth="1.6" strokeOpacity="0.5" />
    </svg>
  );
}
