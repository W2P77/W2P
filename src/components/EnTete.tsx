'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

/**
 * L'en-tête, et son menu mobile.
 *
 * ── Pourquoi le menu mobile n'est pas un détail ───────────────────────────
 *
 * La première version masquait la navigation sous 1280 px : sur téléphone, le
 * site n'avait plus aucun lien. Or un catalogue se consulte surtout au
 * téléphone — quelqu'un cherche un jeu pendant qu'il y joue.
 *
 * ── Les liens décrivent ce qui existe ─────────────────────────────────────
 *
 * `REVIEWS`, `GUIDES` et `ACCOUNT` renvoyaient une 404. Un menu qui promet
 * quatre sections vides abîme plus la confiance qu'un menu de trois entrées
 * qui marchent — surtout sur un site dont l'argument est de ne rien affirmer
 * qu'il ne puisse tenir.
 */
const LIENS = [
  { label: 'HOME', href: '/' },
  { label: 'SLOT CATALOGUE', href: '/catalogue', chevron: true },
  { label: 'DEMOS', href: '/demos' },
];

export function EnTete() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const actif = (href: string) =>
    href === '/' ? chemin === '/' : chemin.startsWith(href);

  return (
    <header className="relative z-30 border-b border-neon-cyan/20">
      <div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center border-2 border-neon-cyan bg-fond-carte text-xl shadow-neon-cyan"
            style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)' }}
            aria-hidden
          >
            🎰
          </span>
          <span className="font-titre text-[20px] font-bold tracking-tight text-white sm:text-[22px]">
            where<span className="text-neon-cyan">2</span>play
            <span className="text-texte-doux">.info</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 lg:flex">
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[13px] font-semibold tracking-[0.04em] transition-colors ${
                actif(l.href) ? 'text-neon-magenta' : 'text-texte-doux hover:text-neon-cyan'
              }`}
            >
              {l.label}
              {l.chevron && <span className="ml-1.5 text-neon-cyan">›</span>}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          className="ml-auto grid h-9 w-9 place-items-center rounded border border-neon-cyan/50 text-neon-cyan lg:hidden"
          aria-expanded={ouvert}
          aria-label={ouvert ? 'Close menu' : 'Open menu'}
        >
          {ouvert ? '✕' : '☰'}
        </button>
      </div>

      {ouvert && (
        <nav className="border-t border-fond-bordure bg-fond-panneau lg:hidden">
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOuvert(false)}
              className={`block border-b border-fond-bordure px-6 py-3.5 text-[13px] font-semibold tracking-wide last:border-0 ${
                actif(l.href) ? 'text-neon-magenta' : 'text-texte-doux'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}

      <div
        className="h-[3px] bg-gradient-to-r from-neon-magenta via-neon-violet to-neon-cyan"
        style={{ clipPath: 'polygon(0 0, 96% 0, 100% 100%, 0 100%)' }}
        aria-hidden
      />
    </header>
  );
}
