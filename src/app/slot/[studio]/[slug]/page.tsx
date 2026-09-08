import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { CarteJeu } from '@/components/CarteJeu';
import { BadgePreuve, type Confiance } from '@/components/BadgePreuve';
import { Tirets, Equerre } from '@/components/DecorNeon';
import { jeuParSlug, memeStudio, casinosPourStudio } from '@/lib/donnees/catalogue';
import { OuJouer } from '@/components/OuJouer';
import { CapturesJeu } from '@/components/CapturesJeu';
import { BoutonEnregistrer } from '@/components/BoutonEnregistrer';
import { baliseJeu } from '@/lib/donnees-structurees';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

/**
 * La fiche d'un jeu, construite sur « where to play ».
 *
 * ── Pourquoi cet angle ────────────────────────────────────────────────────
 *
 * « RTP de X » est une requête informationnelle : on répond, la personne
 * repart. « Où jouer à X » est commerciale : elle veut jouer, et cherche où.
 * C'est la même donnée qui sert les deux, mais seule la seconde produit un
 * lead — et c'est le nom même du site.
 *
 * ── Ce que la page ne fera jamais ─────────────────────────────────────────
 *
 * Afficher un RTP sans dire d'où il vient. C'est la faute qu'on a mesurée
 * ailleurs : palier opérateur pris pour la valeur studio, RTP d'achat de bonus
 * présenté comme celui du jeu. Ici, chaque chiffre porte son niveau de preuve.
 */
const VOLATILITE_EN: Record<string, string> = {
  BASSE: 'Low',
  MOYENNE: 'Medium',
  HAUTE: 'High',
  TRES_HAUTE: 'Very high',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studio: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const jeu = await jeuParSlug(slug);
  if (!jeu) return { title: 'Slot not found' };

  const rtp = jeu.rtpStudio ? `${Number(jeu.rtpStudio).toFixed(2)}% RTP` : 'RTP';
  return {
    title: `Where to play ${jeu.nom} — ${rtp}, demo and full specs`,
    description: `${jeu.nom} by ${jeu.studio.nom}: ${rtp}, volatility, max win and free demo. Every number sourced — we tell you when it is not.`,
    // La canonique est posée explicitement : la fiche est atteignable depuis
    // le catalogue, la page du studio et la recherche, chacune pouvant traîner
    // ses paramètres.
    alternates: { canonical: `${SITE_URL}/slot/${jeu.studio.slug}/${jeu.slug}` },
  };
}

function Fiche({ libelle, valeur }: { libelle: string; valeur: React.ReactNode }) {
  if (valeur == null || valeur === '') return null;
  return (
    <div className="border-b border-fond-bordure py-2.5 last:border-0">
      <dt className="text-[10px] uppercase tracking-wide text-texte-faible">{libelle}</dt>
      <dd className="mt-0.5 text-[13px] text-texte">{valeur}</dd>
    </div>
  );
}

export default async function PageJeu({
  params,
}: {
  params: Promise<{ studio: string; slug: string }>;
}) {
  const { studio, slug } = await params;
  const jeu = await jeuParSlug(slug);
  if (!jeu) notFound();

  /*
   * Une seule adresse par jeu.
   *
   * `/slot/netent/fire-hot-20` répondrait volontiers la même page que
   * `/slot/pragmatic-play/fire-hot-20` — et on aurait fabriqué du contenu
   * dupliqué à l'intérieur de notre propre site, autant de fois qu'il y a de
   * studios. La redirection impose la forme canonique.
   */
  if (studio !== jeu.studio.slug) {
    redirect(`/slot/${jeu.studio.slug}/${jeu.slug}`);
  }

  const [voisins, casinos] = await Promise.all([
    memeStudio(jeu.studioId, jeu.slug),
    casinosPourStudio(jeu.studio.cleCasino),
  ]);
  const rtp = jeu.rtpStudio == null ? null : Number(jeu.rtpStudio);
  const paliers = jeu.rtpPaliers.map((p) => Number(p));

  return (
    <div className="min-h-screen bg-fond">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            baliseJeu({
              slug: jeu.slug,
              nom: jeu.nom,
              rtpStudio: rtp,
              rtpConfiance: jeu.rtpConfiance,
              volatilite: jeu.volatilite,
              gainMaxMultiple: jeu.gainMaxMultiple,
              visuelUrl: jeu.visuelUrl,
              studio: { nom: jeu.studio.nom, slug: jeu.studio.slug },
            }),
          ),
        }}
      />
      <EnTete />

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <nav className="mb-5 font-mono text-[11px] text-texte-faible">
          <a href="/catalogue" className="hover:text-neon-cyan">Catalogue</a>
          <span className="mx-2">/</span>
          <a href={`/slot/${jeu.studio.slug}`} className="hover:text-neon-cyan">
            {jeu.studio.nom}
          </a>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <h1 className="font-titre text-[30px] font-black uppercase leading-[0.95] tracking-tight text-white sm:text-[40px]">
              Where to play {jeu.nom}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-[14px] text-texte-doux">
                {jeu.studio.nom}
                {jeu.sortieLe ? ` · released ${new Date(jeu.sortieLe).getFullYear()}` : ''}
              </p>
              <BoutonEnregistrer
                jeu={{
                  slug: jeu.slug,
                  nom: jeu.nom,
                  rtpStudio: rtp,
                  rtpConfiance: jeu.rtpConfiance,
                  volatilite: jeu.volatilite,
                  gainMaxMultiple: jeu.gainMaxMultiple,
                  visuelUrl: jeu.visuelUrl,
                  studio: { nom: jeu.studio.nom, slug: jeu.studio.slug },
                }}
              />
            </div>

            {jeu.visuelUrl && (
              <div className="relative mt-5 overflow-hidden rounded-lg border border-neon-violet/40 bg-fond-carte">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={jeu.visuelUrl} alt={jeu.nom} className="w-full object-contain" />
                <Equerre position="hg" couleur="cyan" />
                <Equerre position="bd" couleur="magenta" />
              </div>
            )}

            {/*
             * Les captures avant les partenaires, et pas l'inverse.
             *
             * La liste des casinos était placée juste sous le visuel : le
             * visiteur tombait sur huit boutons « Play » avant d'avoir lu une
             * seule information sur le jeu. C'est l'ordre d'un comparateur,
             * pas celui d'une fiche — et il dessert les deux, parce qu'un
             * lecteur sollicité avant d'être renseigné ne clique pas.
             *
             * On documente d'abord, on oriente ensuite.
             */}
            <CapturesJeu slug={jeu.slug} />

            <OuJouer jeu={jeu.nom} studio={jeu.studio.nom} casinos={casinos} />

            {jeu.demoUrl && (
              <a
                href={jeu.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tube tube-cyan mt-5 inline-block"
              >
                Play the free demo
              </a>
            )}
          </div>

          {/* ── Les chiffres, avec leur provenance ─────────────────────── */}
          <aside className="panneau relative h-fit p-5">
            <Equerre position="hd" couleur="cyan" />

            {/*
             * Le logo du studio ouvre le panneau de données.
             *
             * Le nom figurait déjà plus bas, en ligne « PROVIDER ». Le logo ne
             * le double pas : il se reconnaît avant d'être lu, et c'est ce qui
             * rattache le chiffre à celui qui le publie — sur une fiche dont
             * l'argument est la provenance des données, dire de qui elles
             * viennent avant de les donner n'est pas décoratif.
             *
             * Trois studios sur 27 n'ont pas de logo : le panneau s'ouvre
             * alors directement sur le titre, sans case vide.
             */}
            {jeu.studio.logoUrl && (
              <Link
                href={`/slot/${jeu.studio.slug}`}
                className="mb-4 block border-b border-fond-bordure pb-4"
                aria-label={jeu.studio.nom}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={jeu.studio.logoUrl}
                  alt={jeu.studio.nom}
                  className="h-14 w-auto max-w-[210px] object-contain object-left transition hover:opacity-80"
                />
              </Link>
            )}

            <h2 className="mb-4 font-titre text-[15px] font-bold uppercase tracking-wide text-white">
              Game data
            </h2>

            <div className="mb-4 rounded-lg border border-fond-bordure bg-fond p-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-wide text-texte-faible">
                  RTP
                </span>
                <BadgePreuve niveau={jeu.rtpConfiance as Confiance} taille="petit" />
              </div>
              <p className="mt-1 font-mono text-[26px] font-bold text-white">
                {rtp == null ? '—' : `${rtp.toFixed(2)}%`}
              </p>

              {paliers.length > 0 && (
                <p className="mt-2 text-[11px] leading-relaxed text-texte-doux">
                  Operators may configure a lower tier:{' '}
                  <span className="font-mono">{paliers.map((p) => `${p}%`).join(' · ')}</span>
                </p>
              )}
              {jeu.rtpAchatBonus != null && (
                <p className="mt-1 text-[11px] text-texte-doux">
                  Bonus buy:{' '}
                  <span className="font-mono">{Number(jeu.rtpAchatBonus).toFixed(2)}%</span>
                </p>
              )}
              {jeu.rtpSource ? (
                <a
                  href={jeu.rtpSource}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-2 inline-block text-[11px] text-neon-cyan hover:underline"
                >
                  Source: {new URL(jeu.rtpSource).hostname} →
                </a>
              ) : (
                <p className="mt-2 text-[11px] text-texte-faible">
                  No studio page on file — we have not confirmed this figure
                  ourselves.
                </p>
              )}
            </div>

            <dl>
              <Fiche libelle="Provider" valeur={jeu.studio.nom} />
              <Fiche
                libelle="Volatility"
                valeur={jeu.volatilite ? VOLATILITE_EN[jeu.volatilite] : null}
              />
              <Fiche
                libelle="Max win"
                valeur={jeu.gainMaxMultiple ? `${jeu.gainMaxMultiple.toLocaleString('en')}x` : null}
              />
              <Fiche libelle="Grid" valeur={jeu.grille} />
              <Fiche libelle="Paylines" valeur={jeu.lignesPaiement} />
              <Fiche
                libelle="Bonus buy"
                valeur={jeu.achatBonus == null ? null : jeu.achatBonus ? 'Yes' : 'No'}
              />
              <Fiche
                libelle="Features"
                valeur={jeu.mecaniques.length ? jeu.mecaniques.join(' · ') : null}
              />
            </dl>
          </aside>
        </div>

        {voisins.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-titre text-[16px] font-bold uppercase tracking-wide text-white">
                More from {jeu.studio.nom}
              </h2>
              <Tirets />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {voisins.map((v, i) => (
                <CarteJeu key={v.slug} jeu={v} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
      <PiedDePage />
    </div>
  );
}
