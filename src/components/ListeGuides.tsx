'use client';

import { contenuDuGuide, GUIDES } from '@/data/guides';
import { Lien } from '@/components/Lien';
import { useLangue } from '@/i18n/useLangue';

/**
 * La colonne « Latest guides & reviews ».
 *
 * ── La vignette est dessinée, pas photographiée ──────────────────────────
 *
 * La maquette pose une petite photo à gauche de chaque titre. On n'a pas ces
 * photos, et une image d'illustration générique — un casino, des jetons —
 * n'apprendrait rien et vieillirait mal. La vignette est donc un motif tracé,
 * dérivé du rang du guide : elle occupe la même place, tient la même colonne,
 * et n'affirme rien.
 */
const MOTIFS = [
  { fond: 'rgba(47,216,245,0.14)', trait: '#2fd8f5' },
  { fond: 'rgba(241,63,220,0.14)', trait: '#f13fdc' },
  { fond: 'rgba(255,157,77,0.14)', trait: '#ff9d4d' },
];

function Vignette({ rang }: { rang: number }) {
  const m = MOTIFS[rang % MOTIFS.length];
  return (
    <span
      className="biseau-petit grid h-[52px] w-[68px] shrink-0 place-items-center"
      style={{ background: m.fond }}
      aria-hidden
    >
      <svg viewBox="0 0 68 52" className="h-full w-full" fill="none">
        <path d="M8 40 H20 V22 H30 V34 H40 V14 H50 V40" stroke={m.trait} strokeWidth="1.6" strokeOpacity="0.9" />
        <path d="M6 44 H62" stroke={m.trait} strokeWidth="1.2" strokeOpacity="0.35" />
        <rect x="48" y="12" width="4" height="4" fill={m.trait} />
      </svg>
    </span>
  );
}

export function ListeGuides() {
  const { langue } = useLangue();
  return (
    <ul className="divide-y divide-fond-bordure">
      {GUIDES.map((g, i) => (
        <li key={g.slug}>
          <Lien href={`/guides/${g.slug}`} className="group flex items-start gap-3.5 py-3.5 first:pt-0">
            <Vignette rang={i} />
            <span className="min-w-0">
              <span className="block font-corps text-[14px] font-medium leading-snug text-texte transition-colors group-hover:text-white">
                {contenuDuGuide(g, langue).titre}
              </span>
              <span className="mt-1.5 flex items-center gap-2">
                <span className="font-ui text-[11px] font-semibold uppercase tracking-[0.08em] text-neon-cyan">
                  Read more
                </span>
                <span className="font-ui text-[11px] text-texte-faible">{g.minutes} min</span>
              </span>
            </span>
          </Lien>
        </li>
      ))}
    </ul>
  );
}
