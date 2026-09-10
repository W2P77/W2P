'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { CHEMINS, idDepuisSlug, slugPublic } from '@/i18n/chemins';
import { LANGUES, LANGUE_DEFAUT, estUneLangue, type Langue } from '@/i18n/langues';

/**
 * Le sélecteur de langue de l'en-tête.
 *
 * ── Pourquoi il ne renvoie pas à l'accueil ────────────────────────────────
 *
 * Changer de langue depuis `/fr/slot/pragmatic-play/gates-of-olympus` doit
 * mener à la **même fiche** en allemand, pas à la page d'accueil allemande.
 * Un sélecteur qui perd la page en cours fait recommencer la navigation à
 * zéro, et c'est la première chose qu'on lui reproche.
 *
 * Le premier segment est donc retraduit — `/fr/avis` mène à `/de/tests` — et
 * le reste du chemin est conservé tel quel : ce sont des noms propres.
 *
 * ── Pourquoi des liens et pas un menu déroulant ───────────────────────────
 *
 * Chaque langue est une véritable adresse. En faire des `<a>` les rend
 * ouvrables dans un nouvel onglet, copiables, et suivables par les moteurs —
 * ce qui est précisément ce qu'on veut pour des versions linguistiques.
 */
export function SelecteurLangue({ compact = false }: { compact?: boolean }) {
  const chemin = usePathname() ?? '/';
  const routeur = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);

  const segments = chemin.split('/');
  const courante: Langue = estUneLangue(segments[1] ?? '') ? (segments[1] as Langue) : LANGUE_DEFAUT;
  const active = LANGUES.find((l) => l.code === courante) ?? LANGUES[0];

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('mousedown', dehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  /** La même page dans une autre langue, slug de section retraduit. */
  function versLaLangue(cible: Langue): string {
    const [, , premier, ...reste] = segments;
    if (!premier) return `/${cible}`;
    const id = idDepuisSlug(premier, courante) ?? CHEMINS.find((c) => c.id === premier)?.id;
    const traduit = id ? slugPublic(id, cible) : premier;
    return `/${cible}/${[traduit, ...reste].join('/')}`;
  }

  return (
    <div ref={boite} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label={`Language: ${active.nom}`}
        className={`grid place-items-center rounded-full border-2 border-neon-cyan/50 bg-fond-panneau text-[17px] leading-none transition hover:border-neon-cyan ${
          compact ? 'h-10 w-10' : 'h-9 w-9'
        }`}
      >
        <span aria-hidden>{active.drapeau}</span>
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-lg border border-fond-bordure bg-fond-panneau shadow-xl"
        >
          {LANGUES.map((l) => (
            <a
              key={l.code}
              role="menuitem"
              href={versLaLangue(l.code)}
              onClick={(e) => {
                // Navigation côté client quand c'est possible : le rechargement
                // complet perdrait la position dans la page.
                e.preventDefault();
                setOuvert(false);
                routeur.push(versLaLangue(l.code));
              }}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 font-ui text-[13px] transition ${
                l.code === courante
                  ? 'bg-white/5 text-neon-magenta'
                  : 'text-white/85 hover:bg-white/5 hover:text-neon-cyan'
              }`}
            >
              <span aria-hidden className="text-[16px]">
                {l.drapeau}
              </span>
              {l.nom}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
