'use client';

/*
 * Composant client : une page 404 ne reçoit pas de `params`, donc pas de
 * langue. Elle la lit dans l'URL, comme l'en-tête et le pied de page.
 */
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { Lien } from '@/components/Lien';
import { useLangue } from '@/i18n/useLangue';

/**
 * La page d'erreur.
 *
 * Une 404 sur un catalogue survient surtout quand quelqu'un cherche un jeu
 * qu'on n'a pas encore. Lui offrir la recherche vaut mieux qu'un cul-de-sac :
 * c'est le seul endroit où il peut encore trouver ce qu'il voulait.
 */
export default function Introuvable() {
  const { t } = useLangue();
  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-neon-cyan">404</p>
        <h1 className="mt-3 font-titre text-[32px] font-black uppercase leading-tight tracking-tight text-white">
          {t.introuvableTitre}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[14px] text-texte-doux">
          {t.introuvableTexte}
        </p>

        <form action="/catalogue" role="search" className="mx-auto mt-7 max-w-md">
          <div
            className="flex items-center gap-2 rounded-full border-2 border-neon-cyan/80 bg-fond/60 px-4 py-2"
            style={{ boxShadow: '0 0 4px rgba(34,224,255,0.55), inset 0 0 8px rgba(34,224,255,0.15)' }}
          >
            <input
              name="q"
              type="search"
              placeholder={t.rechercherPlaceholder}
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-texte-faible"
              aria-label={t.rechercher}
            />
            <button type="submit" className="text-[15px] text-neon-cyan" aria-label={t.rechercher}>⌕</button>
          </div>
        </form>

        <div className="mt-6 flex justify-center gap-3">
          <Lien href="/catalogue" className="tube tube-cyan">{t.parcourirCatalogue}</Lien>
          <Lien href="/demos" className="tube tube-magenta">{t.piedDemos}</Lien>
        </div>
      </main>
      <PiedDePage />
    </div>
  );
}
