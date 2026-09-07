import Link from 'next/link';
import { Liseré } from './DecorNeon';

/**
 * Le pied de page.
 *
 * Il porte deux choses qu'un site de ce secteur ne peut pas omettre : la
 * mention de jeu responsable et l'information que les liens sortants sont
 * rémunérés. Les cacher serait à la fois malhonnête et contraire aux règles
 * des réseaux d'affiliation.
 */
export function PiedDePage() {
  return (
    <footer className="mt-12">
      <Liseré inverse />
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <p className="font-titre text-[17px] font-bold tracking-tight text-white">
              where<span className="text-neon-cyan">2</span>play
              <span className="text-texte-doux">.info</span>
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-texte-doux">
              A slot catalogue that tells you where every number comes from —
              studio-published, cross-checked, or not verified at all.
            </p>
          </div>

          <nav className="flex gap-10 text-[12px]">
            <div>
              <p className="mb-2 font-semibold uppercase tracking-wide text-texte-faible">Browse</p>
              <ul className="space-y-1.5">
                <li><Link href="/catalogue" className="text-texte-doux hover:text-neon-cyan">Catalogue</Link></li>
                <li><Link href="/demos" className="text-texte-doux hover:text-neon-cyan">Free demos</Link></li>
                <li><Link href="/reviews" className="text-texte-doux hover:text-neon-cyan">Verified slots</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold uppercase tracking-wide text-texte-faible">Learn</p>
              <ul className="space-y-1.5">
                <li><Link href="/guides" className="text-texte-doux hover:text-neon-cyan">Guides</Link></li>
                <li><Link href="/account" className="text-texte-doux hover:text-neon-cyan">My games</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-8 border-t border-fond-bordure pt-5">
          <p className="text-[11px] leading-relaxed text-texte-faible">
            18+ only. Gambling involves risk — never bet more than you can afford
            to lose. Free help is available at{' '}
            <a
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-texte-doux underline hover:text-neon-cyan"
            >
              BeGambleAware.org
            </a>
            .
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-texte-faible">
            We earn a commission when you sign up through our links. It never
            changes which games we list, nor the figures we publish.
          </p>
        </div>
      </div>
    </footer>
  );
}
