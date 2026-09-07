import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { Equerre, Tirets, Liseré, Chapeau, CadreAnguleux } from '@/components/DecorNeon';
import { BoutonFlottant } from '@/components/BoutonFlottant';
import { MosaiqueAccroche } from '@/components/MosaiqueAccroche';
import { jeuxEnAvant, compterCatalogue } from '@/lib/donnees/jeux';
import { studiosDuCatalogue } from '@/lib/donnees/catalogue';

// Les chiffres viennent de la base, jamais du texte : un nombre recopié dans
// une page dérive dès qu'un jeu entre ou sort.
export const revalidate = 300;


export default async function Home() {
  const [jeux, compte, studios] = await Promise.all([
    jeuxEnAvant(8),
    compterCatalogue(),
    studiosDuCatalogue(),
  ]);

  return (
    <div className="min-h-screen bg-fond">
      <EnTete />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <CadreAnguleux />
        <div className="absolute inset-0 bg-grille-neon bg-grille opacity-40" aria-hidden />
        <div
          className="absolute right-0 top-0 hidden h-full w-1/2 bg-gradient-to-l from-neon-violet/20 to-transparent lg:block"
          aria-hidden
        />

        <MosaiqueAccroche visuels={jeux.map((j) => j.visuelUrl ?? '')} />

        <div className="relative mx-auto max-w-[1400px] px-6 py-10 lg:py-12">
          <div>
            <Chapeau texte="slot catalogue" />

            <h1 className="font-titre text-[38px] font-black uppercase leading-[0.9] tracking-tight text-white sm:text-[52px]">
              Discover your next
              <br />
              reel adventure
            </h1>

            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-texte-doux">
              Thousands of free slots, demos and expert reviews — with every
              number telling you where it comes from.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <a
                href="/demos"
                className="tube tube-magenta"
              >
                Play free demos
              </a>
              <a
                href="/catalogue"
                className="tube tube-cyan"
              >
                Explore catalogue
              </a>
            </div>

            <form className="relative mt-5 max-w-md" role="search" action="/catalogue">
              <div className="flex items-center gap-2 rounded-full border-2 border-neon-cyan/80 bg-fond/60 px-4 py-[7px]" style={{ boxShadow: '0 0 4px rgba(34,224,255,0.55), inset 0 0 8px rgba(34,224,255,0.15)' }}>
                <input
                  type="search"
                  placeholder="Search by slot name or provider..."
                  name="q"
                  className="w-full bg-transparent text-[12px] outline-none placeholder:text-texte-faible"
                  aria-label="Search by slot name or provider"
                />
                <button type="submit" className="text-[15px] text-neon-cyan" aria-label="Search">⌕</button>
              </div>
            </form>
          </div>

        </div>
      </section>

      <Liseré />

      {/* ── Panneaux ─────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-[1400px] gap-5 px-6 py-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="panneau relative p-5">
          <Equerre position="hg" couleur="magenta" />
          <div className="mb-4 flex items-center gap-4">
            <h2 className="font-titre text-[16px] font-bold uppercase tracking-wide text-white">
              Top rated slots this week
            </h2>
            <Tirets />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {jeux.map((j, i) => (
              <CarteJeu key={j.slug} jeu={j} index={i} />
            ))}
          </div>

          <p className="mt-4 font-mono text-[11px] text-texte-faible">
            {compte.jeux} games · {compte.studios} studios ·{' '}
            <span className="text-neon-cyan">{compte.sourcés} studio-verified RTPs</span>
          </p>
        </div>

        <div className="panneau relative p-5">
          <Equerre position="hd" couleur="cyan" />
          <div className="mb-4 flex items-center gap-4">
            <h2 className="font-titre text-[16px] font-bold uppercase tracking-wide text-white">
              Browse by provider
            </h2>
            <Tirets />
          </div>

          {/* Les fournisseurs remplacent une liste de guides qui n'existaient
              pas encore. Afficher des titres inventés sur un site dont
              l'argument est l'exactitude serait le pire endroit pour commencer. */}
          <ul className="space-y-2">
            {studios.slice(0, 6).map((s) => (
              <li key={s.slug}>
                <a
                  href={`/slot/${s.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-fond-bordure bg-fond p-2 transition hover:border-neon-cyan"
                >
                  {s.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.logoUrl} alt="" className="h-8 w-24 shrink-0 rounded object-contain p-0.5" />
                  ) : (
                    <span className="grid h-8 w-24 shrink-0 place-items-center rounded bg-fond-carte text-[10px] font-bold uppercase">
                      {s.nom}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-texte">{s.nom}</span>
                  <span className="shrink-0 font-mono text-[11px] text-texte-faible">
                    {s._count.jeux}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <a href="/catalogue" className="mt-4 inline-block text-[12px] text-neon-cyan hover:underline">
            All {studios.length} providers →
          </a>
        </div>
      </section>
      <BoutonFlottant />
      <PiedDePage />
    </div>
  );
}
