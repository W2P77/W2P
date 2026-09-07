import { Tirets } from './DecorNeon';

/**
 * « Où jouer à ce jeu » — le bloc qui transforme une visite en lead.
 *
 * Chaque lien passe par `/go/<casino>` : c'est là que le clickId préfixé est
 * généré et le clic enregistré. Un lien direct vers l'opérateur ferait perdre
 * l'attribution, et donc la commission.
 */
export interface CasinoCta {
  slug: string;
  nom: string;
  logo: string | null;
  note: unknown;
  bonusTexte: string | null;
}

export function OuJouer({
  jeu,
  studio,
  casinos,
}: {
  jeu: string;
  studio: string;
  casinos: CasinoCta[];
}) {
  return (
    <section className="panneau mt-6 p-5">
      <div className="mb-1 flex items-center gap-3">
        <h2 className="font-titre text-[16px] font-bold uppercase tracking-wide text-white">
          Where to play {jeu}
        </h2>
        <Tirets />
      </div>

      {casinos.length === 0 ? (
        <p className="mt-3 text-[13px] text-texte-doux">
          None of our partner casinos currently carries {studio} games.
        </p>
      ) : (
        <>
          <p className="mb-4 text-[12px] text-texte-faible">
            {casinos.length} of our partners carry {studio} games. A brand-new
            release may still be exclusive to one operator for a few weeks.
          </p>

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {casinos.map((c) => (
              <li key={c.slug}>
                <a
                  href={`/go/${c.slug}?slot=${encodeURIComponent(jeu)}`}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="group flex items-center gap-3 rounded-lg border border-fond-bordure bg-fond p-2.5 transition-all hover:border-neon-magenta hover:shadow-neon-magenta"
                >
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo}
                      alt=""
                      className="h-9 w-20 shrink-0 rounded bg-fond-carte object-contain"
                    />
                  ) : (
                    <span className="grid h-9 w-20 shrink-0 place-items-center rounded bg-fond-carte text-[10px] font-bold uppercase">
                      {c.nom.slice(0, 8)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-white">
                      {c.nom}
                    </span>
                    {c.bonusTexte && (
                      <span className="block truncate text-[11px] text-texte-doux">
                        {c.bonusTexte}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-full border border-neon-magenta px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white transition group-hover:bg-neon-magenta/20">
                    Play
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[10px] leading-relaxed text-texte-faible">
            Advertising disclosure — we earn a commission when you sign up
            through these links. It never changes which games we list or the
            figures we publish.
          </p>
        </>
      )}
    </section>
  );
}
