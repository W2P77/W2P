'use client';

import { useEffect, useState } from 'react';
import { Tirets } from './DecorNeon';
import { filtrerCasinosParPays, nomDuPays } from '@/lib/geo/filtrer-casinos';
import { useLangue } from '@/i18n/useLangue';

/**
 * « Où jouer à ce jeu » — le bloc qui transforme une visite en lead.
 *
 * Chaque lien passe par `/go/<casino>` : c'est là que le clickId préfixé est
 * généré et le clic enregistré. Un lien direct vers l'opérateur ferait perdre
 * l'attribution, et donc la commission.
 *
 * ── Pourquoi le filtrage par pays se fait ici, et après montage ──────────
 *
 * La page est rendue avec `revalidate` : son HTML est mutualisé. Filtrer au
 * rendu servirait le pays du premier arrivant à tous les suivants, et ferait
 * indexer par Google la sélection d'un pays au hasard. Le premier rendu liste
 * donc **tous** les partenaires — c'est ce que voient les moteurs — puis le
 * navigateur réduit la liste au pays du visiteur, lu dans le cookie posé par
 * le middleware.
 *
 * ── Ce qu'on ne dit jamais ───────────────────────────────────────────────
 *
 * Que l'opérateur refuse un pays. Le champ `pays` décrit **notre** couverture,
 * pas sa politique : l'information n'est pas dans les données. On parle donc
 * de notre sélection, toujours.
 */
/**
 * Ce qui traverse jusqu'au navigateur — et rien de plus.
 *
 * Chaque champ ajouté ici doit être sérialisable. `note` en était le
 * contre-exemple : `Decimal` côté Prisma, il n'a jamais été affiché et
 * cassait le passage serveur → client sans qu'aucun typecheck ne le voie,
 * parce que `unknown` accepte tout.
 */
export interface CasinoCta {
  slug: string;
  nom: string;
  logo: string | null;
  bonusTexte: string | null;
  pays: string[];
}

function lirePaysDuCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const trouve = document.cookie
    .split('; ')
    .find((c) => c.startsWith('w2p_pays='));
  return trouve ? decodeURIComponent(trouve.slice('w2p_pays='.length)) : null;
}

/**
 * Combien de partenaires on montre d'emblée.
 *
 * Trente-quatre liens alignés ne se lisent pas : le visiteur n'en compare
 * aucun et repart. Les casinos arrivent classés, les premiers sont donc les
 * meilleurs — au-delà, c'est du volume qui dilue. Le reste reste accessible
 * d'un clic, sans changer de page : on ne cache rien, on hiérarchise.
 */
const VISIBLES = 8;

export function OuJouer({
  jeu,
  studio,
  casinos,
}: {
  jeu: string;
  studio: string;
  casinos: CasinoCta[];
}) {
  const { t, langue } = useLangue();
  const [pays, setPays] = useState<string | null>(null);
  const [tout, setTout] = useState(false);
  useEffect(() => setPays(lirePaysDuCookie()), []);

  const resultat = filtrerCasinosParPays(casinos, pays);
  const liste = tout ? resultat.casinos : resultat.casinos.slice(0, VISIBLES);
  const caches = resultat.casinos.length - liste.length;

  return (
    <section className="biseau mt-6 border border-fond-bordure bg-fond-panneau p-5">
      <div className="mb-1 flex items-center gap-3">
        <h2 className="font-titre text-[19px] font-extrabold uppercase tracking-wide text-white">
          {t.ouJouer} {jeu}
        </h2>
        <Tirets />
      </div>

      {liste.length === 0 ? (
        <p className="mt-3 text-[13px] text-texte-doux">
          None of our partner casinos currently carries {studio} games.
        </p>
      ) : (
        <>
          <p className="mb-4 font-corps text-[12px] text-texte-faible">
            {resultat.filtre ? (
              <>
                {resultat.casinos.length} of our partners carry {studio} games
                and are part of our selection in {nomDuPays(resultat.pays!)}.
              </>
            ) : (
              <>
                {resultat.casinos.length} of our partners carry {studio} games. A
                brand-new release may still be exclusive to one operator for a
                few weeks.
              </>
            )}
          </p>

          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2">
            {liste.map((c) => (
              <li key={c.slug} className="min-w-0">
                <a
                  href={`/go/${c.slug}?slot=${encodeURIComponent(jeu)}&l=${langue}`}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="biseau-petit group flex items-center gap-3 border border-fond-bordure bg-fond p-2.5 transition-all hover:border-neon-magenta"
                >
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo}
                      alt={c.nom}
                      className="h-10 w-24 shrink-0 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid h-10 w-24 shrink-0 place-items-center bg-fond-carte font-ui text-[10px] font-bold uppercase tracking-wide">
                      {c.nom}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui text-[13px] font-semibold text-white">
                      {c.nom}
                    </span>
                    {c.bonusTexte && (
                      <span className="block truncate font-corps text-[11px] text-texte-doux">
                        {c.bonusTexte}
                      </span>
                    )}
                  </span>
                  <span className="biseau-petit shrink-0 border border-neon-magenta px-3 py-1 font-ui text-[10px] font-bold uppercase tracking-wide text-white transition group-hover:bg-neon-magenta/25">
                    Play
                  </span>
                </a>
              </li>
            ))}
          </ul>

          {caches > 0 && (
            <button
              type="button"
              onClick={() => setTout(true)}
              className="tube tube-cyan mt-4 w-full sm:w-auto"
            >
              Show {caches} more {caches === 1 ? 'partner' : 'partners'}
            </button>
          )}

          {/*
           * Quand la liste a été réduite par le pays, on le dit — sans quoi le
           * visiteur croit voir tous nos partenaires. Et on ne parle que de
           * notre sélection : ce que l'opérateur accepte n'est pas dans les
           * données.
           */}
          {resultat.filtre && casinos.length > resultat.casinos.length && (
            <p className="mt-3 font-corps text-[11px] text-texte-faible">
              {casinos.length - resultat.casinos.length} more partners carry{' '}
              {studio} games outside our {nomDuPays(resultat.pays!)} selection.
            </p>
          )}

          <p className="mt-3 font-corps text-[10px] leading-relaxed text-texte-faible">
            Advertising disclosure — we earn a commission when you sign up
            through these links. It never changes which games we list or the
            figures we publish.
          </p>
        </>
      )}
    </section>
  );
}
