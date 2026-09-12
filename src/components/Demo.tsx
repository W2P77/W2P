'use client';

import { useState } from 'react';

import { useLangue } from '@/i18n/useLangue';
import { estUnLanceurDeDemo } from '@/lib/demo';

/**
 * La démo du studio, jouable sur la fiche.
 *
 * ── Pourquoi au clic, et pas au chargement ────────────────────────────────
 *
 * Un jeu embarqué pèse plusieurs mégaoctets et part chercher le studio dès
 * que la page s'ouvre. La majorité des visiteurs vient lire un RTP : leur
 * imposer ce poids serait payer très cher une fonction qu'ils n'utilisent
 * pas. Le cadre ne se charge donc qu'au clic, sur la jaquette du jeu.
 *
 * ── Pourquoi ici, entre les captures et les casinos ───────────────────────
 *
 * L'ordre de la fiche suit celui d'une décision : ce que le jeu est (les
 * captures), l'essayer (la démo), puis où y jouer pour de vrai (les casinos).
 * Le bouton vivait après la liste des casinos, c'est-à-dire après qu'on a
 * demandé au visiteur de choisir.
 */
export function Demo({
  url,
  nom,
  visuelUrl,
  studio,
}: {
  url: string | null;
  nom: string;
  visuelUrl: string | null;
  studio: string;
}) {
  const { t } = useLangue();
  const [ouverte, setOuverte] = useState(false);
  if (!url) return null;

  const embarquable = estUnLanceurDeDemo(url);

  return (
    <section className="biseau mt-6 border border-fond-bordure bg-fond-panneau p-5">
      <h2 className="font-titre text-[19px] font-extrabold uppercase tracking-wide text-white">
        {t.demoTitre}
      </h2>
      <p className="mt-2 max-w-3xl font-corps text-[13px] leading-relaxed text-texte-doux">
        {t.demoNote.replace('{studio}', studio)}
      </p>

      {embarquable ? (
        ouverte ? (
          <div className="mt-4 overflow-hidden border border-fond-bordure bg-black">
            <iframe
              src={url}
              title={`${nom} — demo`}
              className="aspect-video h-full w-full"
              allow="fullscreen; autoplay"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOuverte(true)}
            className="group relative mt-4 block w-full overflow-hidden border border-fond-bordure bg-fond-carte"
            aria-label={t.jouerDemo}
          >
            {visuelUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visuelUrl} alt={nom} className="aspect-video w-full object-cover opacity-60 transition-opacity group-hover:opacity-80" />
            ) : (
              <div className="aspect-video w-full bg-fond-carte" />
            )}
            <span className="tube tube-cyan absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {t.jouerDemo}
            </span>
          </button>
        )
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="tube tube-cyan mt-4 inline-block">
          {t.demoChezLeStudio.replace('{studio}', studio)}
        </a>
      )}
    </section>
  );
}
