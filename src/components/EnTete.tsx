'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ConduiteEnTete } from './DecorNeon';
import { Lien } from '@/components/Lien';
import { SelecteurLangue } from '@/components/SelecteurLangue';
import type { CleTexte } from '@/i18n/textes';
import { useLangue } from '@/i18n/useLangue';

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
/*
 * Les liens portent une **clé** de texte, pas un libellé.
 *
 * Écrire « HOME » ici le figerait en anglais dans les trois langues. La clé
 * est résolue au rendu, avec la langue lue dans l'URL.
 */
const LIENS: Array<{ cle: CleTexte; href: string; chevron?: boolean }> = [
  { cle: 'navAccueil', href: '/' },
  { cle: 'navCatalogue', href: '/catalogue', chevron: true },
  { cle: 'navNouveautes', href: '/new-releases' },
  { cle: 'navAvis', href: '/reviews' },
  { cle: 'navDemos', href: '/demos' },
  { cle: 'navGuides', href: '/guides' },
  { cle: 'navFavoris', href: '/favorites' },
];

/**
 * Où commence la conduite, en pixels depuis le bord.
 *
 * Le logo fait 110 px de haut pour un rapport 1,40 — soit 154 px de large — et
 * la page ouvre sur 24 px de marge. 196 laisse donc une vingtaine de pixels
 * entre le logo et l'attaque du trait : assez pour qu'ils ne se touchent pas,
 * assez peu pour qu'ils se lisent ensemble.
 */
const DEPART_CONDUITE = 196;

export function EnTete() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const { t } = useLangue();
  const actif = (href: string) => (href === '/' ? chemin === '/' : chemin.startsWith(href));

  return (
    <header className="relative z-30 bg-[#080b16]">
      {/*
       * Plus de bande de tracés au-dessus de la barre.
       *
       * Ils venaient de la maquette, où le logo était un simple emblème. Le
       * logo actuel porte déjà son propre décor de circuit imprimé : deux
       * motifs du même vocabulaire, à 20 px l'un de l'autre, se disputaient
       * l'attention au lieu de s'additionner. Le supprimer resserre aussi le
       * bandeau de 17 px, ce qui remonte le logo d'autant.
       */}
      <div className="mx-auto flex max-w-[1440px] items-center gap-8 px-6 pb-2 pt-1.5">
        <Lien href="/" className="relative z-10 flex shrink-0 items-center">
          {/*
           * Le logo complet, sans mot-marque HTML à côté.
           *
           * La version précédente juxtaposait l'emblème découpé et le nom du
           * site en texte : le fichier de marque porte déjà son mot-marque, et
           * le doubler affichait la marque deux fois, dans deux typographies
           * différentes.
           *
           * Il déborde volontairement sous le bandeau (`-mb-[38px]`) : le
           * garder entier dans la hauteur de l'en-tête aurait obligé à
           * l'épaissir de 40 px ou à réduire le logo. C'est la conduite qui
           * s'écarte — elle démarre après lui, en biseau.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/marque-w2s.webp"
            alt="where2spin"
            className="-mb-[24px] h-[82px] w-auto shrink-0 sm:-mb-[38px] sm:h-[110px]"
          />
        </Lien>

        <nav className="ml-auto hidden items-center gap-7 xl:flex">
          {/* Le sélecteur ouvre la barre, avant le premier lien : c'est un
              réglage du site, pas une destination parmi les autres. */}
          <SelecteurLangue />
          {LIENS.map((l) => (
            <Lien
              key={l.href}
              href={l.href}
              className={`relative font-ui text-[15px] font-semibold uppercase tracking-[0.05em] transition-colors ${
                actif(l.href) ? 'text-neon-magenta' : 'text-white/85 hover:text-neon-cyan'
              }`}
            >
              {t[l.cle]}
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
            </Lien>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 xl:hidden">
          <SelecteurLangue compact />
        </div>

        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          className="biseau-petit grid h-10 w-10 place-items-center border-2 border-neon-cyan/60 font-ui text-neon-cyan xl:hidden"
          aria-expanded={ouvert}
          aria-label={ouvert ? 'Close menu' : 'Open menu'}
        >
          {ouvert ? '✕' : '☰'}
        </button>
      </div>

      {ouvert && (
        <nav className="border-t border-fond-bordure bg-fond-panneau xl:hidden">
          {LIENS.map((l) => (
            <Lien
              key={l.href}
              href={l.href}
              onClick={() => setOuvert(false)}
              className={`block border-b border-fond-bordure px-6 py-3.5 font-ui text-[13px] font-semibold uppercase tracking-wide last:border-0 ${
                actif(l.href) ? 'text-neon-magenta' : 'text-texte-doux'
              }`}
            >
              {t[l.cle]}
            </Lien>
          ))}
        </nav>
      )}

      {/* La conduite néon qui court sous la barre et se coude à 45°. */}
      <ConduiteEnTete depart={DEPART_CONDUITE} className="h-[17px] w-full" />
    </header>
  );
}
