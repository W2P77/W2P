'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './Logo';
import { Conduite, TraceCircuit } from './DecorNeon';

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
 * Un menu qui promet des sections vides abîme plus la confiance qu'un menu
 * court qui marche — surtout sur un site dont l'argument est de ne rien
 * affirmer qu'il ne puisse tenir. Chaque entrée ci-dessous mène à une page
 * réelle.
 */
const LIENS = [
  { label: 'HOME', href: '/' },
  { label: 'SLOT CATALOGUE', href: '/catalogue', chevron: true },
  { label: 'NEW', href: '/new-releases' },
  { label: 'REVIEWS', href: '/reviews' },
  { label: 'DEMOS', href: '/demos' },
  { label: 'GUIDES', href: '/guides' },
  { label: 'ACCOUNT', href: '/account' },
];

export function EnTete() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const actif = (href: string) => (href === '/' ? chemin === '/' : chemin.startsWith(href));

  return (
    <header className="relative z-30 bg-[#080b16]">
      {/*
       * Les tracés de circuit occupent leur propre bande, au-dessus de la
       * barre. Posés en absolu derrière elle, ils passaient sous le dernier
       * lien de navigation — « ACCOUNT » se lisait sur un enchevêtrement de
       * traits. Un décor qui abîme la lisibilité d'un lien n'est plus un
       * décor, et le régler en baissant l'opacité n'aurait fait que le rendre
       * sale au lieu d'illisible.
       */}
      <div className="relative hidden h-[17px] lg:block" aria-hidden>
        <TraceCircuit className="absolute left-0 top-0 h-[17px] w-[130px] opacity-80" />
        <TraceCircuit cote="droite" className="absolute right-0 top-0 h-[17px] w-[130px] opacity-80" />
      </div>

      <div className="mx-auto flex max-w-[1440px] items-center gap-8 px-6 pb-2.5 pt-1 lg:pt-0">
        <Link href="/" className="flex shrink-0 items-end gap-2.5">
          <Logo className="h-10 w-10 shrink-0 drop-shadow-lueur-cyan sm:h-12 sm:w-12" />
          <span className="flex flex-col">
            <span className="font-titre text-[21px] font-extrabold leading-none tracking-[0.005em] text-white sm:text-[26px] lg:text-[30px]">
              where<span className="text-neon-magenta">2</span>play
              <span className="font-normal text-texte-doux">.info</span>
            </span>
            {/* Les quatre points de la maquette : une ponctuation, pas un
                indicateur. Ils ancrent le mot-marque au bandeau de circuit
                au-dessus, et c'est leur seule fonction. */}
            <span className="mt-1 hidden gap-[5px] pl-[2px] sm:flex" aria-hidden>
              {[0.9, 0.7, 0.5, 0.35].map((o, i) => (
                <span key={i} className="h-[3px] w-[3px] rounded-full bg-neon-cyan" style={{ opacity: o }} />
              ))}
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 xl:flex">
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative font-ui text-[15px] font-semibold uppercase tracking-[0.05em] transition-colors ${
                actif(l.href) ? 'text-neon-magenta' : 'text-white/85 hover:text-neon-cyan'
              }`}
            >
              {l.label}
              {l.chevron && <span className="ml-1 text-neon-cyan">›</span>}
              {/* La barre d'état actif, sous le mot : sur la maquette c'est
                  elle qui dit où l'on est, pas seulement la couleur — une
                  différence de teinte seule ne se voit pas en daltonisme. */}
              {actif(l.href) && (
                <span
                  className="absolute -bottom-1.5 left-0 h-[2px] w-full bg-neon-magenta shadow-neon-magenta"
                  aria-hidden
                />
              )}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          className="biseau-petit ml-auto grid h-10 w-10 place-items-center border-2 border-neon-cyan/60 font-ui text-neon-cyan xl:hidden"
          aria-expanded={ouvert}
          aria-label={ouvert ? 'Close menu' : 'Open menu'}
        >
          {ouvert ? '✕' : '☰'}
        </button>
      </div>

      {ouvert && (
        <nav className="border-t border-fond-bordure bg-fond-panneau xl:hidden">
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOuvert(false)}
              className={`block border-b border-fond-bordure px-6 py-3.5 font-ui text-[13px] font-semibold uppercase tracking-wide last:border-0 ${
                actif(l.href) ? 'text-neon-magenta' : 'text-texte-doux'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}

      {/* La conduite néon qui court sous la barre et se coude à 45°. */}
      <Conduite className="h-[17px] w-full" />
    </header>
  );
}
