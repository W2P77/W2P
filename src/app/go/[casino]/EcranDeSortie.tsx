'use client';

import { useEffect, useState } from 'react';

import { textes } from '@/i18n/textes';
import { langue as trouverLangue, type Langue } from '@/i18n/langues';

/** Trois secondes : le temps de lire le bonus, pas celui de changer d'avis. */
const SECONDES = 3;

/**
 * L'écran d'attente avant le départ chez le partenaire.
 *
 * La cible est calculée côté serveur et arrive déjà construite : si le
 * JavaScript ne démarre pas, le `<noscript>` et le lien de secours emmènent
 * quand même le visiteur — un écran qui ne redirige pas serait pire que pas
 * d'écran du tout.
 */
export function EcranDeSortie({
  cible,
  nom,
  logo,
  bonus,
  langue,
}: {
  cible: string;
  nom: string;
  logo: string | null;
  bonus: string | null;
  langue: Langue;
}) {
  const t = textes(langue);
  const [reste, setReste] = useState(SECONDES);

  /*
   * Le layout de `/go` rend `lang="en"` : il n'a pas accès au paramètre de
   * requête qui porte la langue. On le corrige ici, où on la connaît — sans
   * quoi un lecteur d'écran prononcerait le français à l'anglaise.
   */
  useEffect(() => {
    document.documentElement.lang = trouverLangue(langue).htmlLang;
  }, [langue]);

  useEffect(() => {
    const tic = setInterval(() => setReste((n) => (n <= 1 ? 0 : n - 1)), 1000);
    const depart = setTimeout(() => {
      window.location.href = cible;
    }, SECONDES * 1000);
    return () => {
      clearInterval(tic);
      clearTimeout(depart);
    };
  }, [cible]);

  return (
    <main className="grid min-h-screen place-items-center bg-fond px-6 py-12">
      <noscript>
        <meta httpEquiv="refresh" content={`${SECONDES};url=${cible}`} />
      </noscript>

      <div className="w-full max-w-xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/marque-w2s.webp"
          alt="where2spin"
          className="mx-auto h-[92px] w-auto motion-safe:animate-respiration"
        />

        <h1 className="mt-8 font-titre text-[26px] font-extrabold uppercase tracking-wide text-white sm:text-[32px]">
          {t.sortieVers.replace('{casino}', nom)}
        </h1>

        {bonus ? (
          <p className="biseau-petit mt-5 border border-fond-bordure bg-fond-panneau px-5 py-4 font-corps text-[15px] text-texte">
            {bonus}
          </p>
        ) : null}

        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={nom} className="mx-auto mt-6 h-12 w-32 object-contain" />
        ) : null}

        <p aria-live="polite" className="mt-6 font-ui text-[13px] text-texte-doux">
          {t.sortieDans.replace('{n}', String(reste))}
        </p>

        <a
          href={cible}
          rel="nofollow sponsored noopener"
          className="mt-6 inline-block font-ui text-[13px] text-neon-cyan underline underline-offset-4 hover:text-neon-magenta"
        >
          {t.sortieSecours}
        </a>

        <p className="mt-8 font-ui text-[11px] text-texte-faible">{t.sortieResponsable}</p>
      </div>
    </main>
  );
}
