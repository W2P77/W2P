import { ImageResponse } from 'next/og';
import { jeuParSlug } from '@/lib/donnees/catalogue';
import { SITE_URL } from '@/lib/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'where2spin';

/**
 * L'image de partage d'une fiche de jeu.
 *
 * ── Pourquoi une route et pas un fichier ──────────────────────────────────
 *
 * Le catalogue compte 2 462 fiches. Pré-générer autant de PNG en 1200×630
 * pèserait une centaine de mégaoctets dans le dépôt, pour des images que la
 * plupart des fiches ne verront jamais partagées. Next les fabrique ici à la
 * demande et les met en cache — le dépôt ne porte que ce code.
 *
 * ── Pourquoi le visuel ne suffisait pas ───────────────────────────────────
 *
 * La version précédente servait l'artwork brut, 600×337. Il passait le seuil
 * des grandes cartes sociales (600×315) mais de justesse : les plateformes le
 * réduisent, le recadrent selon leur propre ratio, et le jeu se retrouve
 * rogné sans marque autour. Composé sur un fond noir au format exact, il est
 * lisible partout et il est identifiable comme venant d'ici.
 *
 * Une fiche sans artwork tombe sur le mot-marque seul : mieux vaut une carte
 * sobre qu'une carte cassée.
 */
/**
 * La jaquette, convertie en PNG.
 *
 * ── Pourquoi une conversion, et pas le fichier tel quel ───────────────────
 *
 * Satori — le moteur derrière `ImageResponse` — ne décode que le PNG, le JPEG
 * et le SVG. **Il ne lit pas le WebP**, et il ne le signale pas : il rend la
 * carte sans l'image, sans erreur ni avertissement. Nos 1 855 jaquettes étant
 * toutes en `.webp`, *toutes* les cartes de partage sortaient en texte seul —
 * nom du jeu, RTP, mot-marque, et un grand fond noir à la place du jeu.
 *
 * La conversion se fait ici plutôt qu'en amont parce que le `.webp` reste le
 * bon format pour le site lui-même : c'est l'OG qui a une contrainte
 * particulière, pas le catalogue.
 */
async function fondBase64(chemin: string | null): Promise<string | null> {
  if (!chemin) return null;

  /*
   * L'image est **téléchargée**, pas lue sur le disque.
   *
   * Dans une fonction serverless, `public/` n'existe pas : ces fichiers sont
   * servis par le CDN et ne sont pas embarqués dans le bundle. `existsSync`
   * y renvoyait donc toujours `false`, et la carte sortait sans jaquette — en
   * local tout marchait, ce qui a masqué le défaut jusqu'à ce qu'on regarde
   * l'image servie en production.
   */
  try {
    const reponse = await fetch(new URL(chemin, SITE_URL), { cache: 'force-cache' });
    if (!reponse.ok) return null;
    const octets = Buffer.from(await reponse.arrayBuffer());

    if (chemin.endsWith('.png')) return `data:image/png;base64,${octets.toString('base64')}`;
    if (chemin.endsWith('.jpg') || chemin.endsWith('.jpeg')) {
      return `data:image/jpeg;base64,${octets.toString('base64')}`;
    }

    /*
     * Satori ne décode que le PNG, le JPEG et le SVG — **pas le WebP**, et il
     * ne le signale pas. Nos 1 855 jaquettes étant toutes en `.webp`, il faut
     * convertir avant de les lui passer.
     */
    const sharp = (await import('sharp')).default;
    return `data:image/png;base64,${(await sharp(octets).png().toBuffer()).toString('base64')}`;
  } catch {
    // Une image indisponible ne doit pas casser la carte : on retombe sur le
    // mot-marque seul, le repli déjà prévu plus bas.
    return null;
  }
}

/**
 * La police des titres du site, pour la carte de partage.
 *
 * Satori n'a pas de CSS : il ne peut pas se servir de `next/font`, et sans
 * police fournie il compose dans sa fonte par défaut. La carte sortait donc
 * dans un caractère qui n'est nulle part sur le site — c'est justement ce que
 * les gens voient en premier quand un lien est partagé.
 *
 * Le fichier est servi par le CDN et téléchargé ici, comme la jaquette :
 * `public/` n'existe pas sur le disque d'une fonction serverless.
 */
async function policeDesTitres(): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(new URL('/fonts/saira-condensed-800.ttf', SITE_URL), {
      cache: 'force-cache',
    });
    return r.ok ? await r.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ studio: string; slug: string }>;
}) {
  const { slug } = await params;
  const jeu = await jeuParSlug(slug);

  const [visuel, logo, police] = await Promise.all([
    fondBase64(jeu?.visuelUrl ?? null),
    fondBase64('/images/marque-w2s.webp'),
    policeDesTitres(),
  ]);
  const rtp = jeu?.rtpStudio ? `${Number(jeu.rtpStudio).toFixed(2)}% RTP` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#05070d',
          position: 'relative',
          // La carte est recadrée par les plateformes : on ne colle rien au bord.
          padding: '26px 0',
        }}
      >
        {/* Le halo reprend le néon de la marque sans imiter le logo. */}
        <div
          style={{
            position: 'absolute',
            width: 900,
            height: 900,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(190,60,220,0.20) 0%, rgba(5,7,13,0) 62%)',
            display: 'flex',
          }}
        />
        {visuel ? (
          <img
            src={visuel}
            alt=""
            width={640}
            height={360}
            style={{ borderRadius: 18, objectFit: 'cover' }}
          />
        ) : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginTop: visuel ? 26 : 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: 'Saira Condensed',
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: '#ffffff',
            }}
          >
            {jeu?.nom ?? 'where2spin'}
          </div>
          {rtp ? (
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 700,
                color: '#0b0d14',
                background: '#4ee2ff',
                padding: '7px 16px',
                borderRadius: 999,
              }}
            >
              {rtp}
            </div>
          ) : null}
        </div>
        {/*
          * Le logo plutôt que le mot : une carte de partage se reconnaît à une
          * forme avant de se lire. Le mot reste en repli si l'image n'a pas pu
          * être chargée — une carte sans signature vaudrait moins que celle-ci.
          */}
        {logo ? (
          /*
           * 264 de large, pas 150 : à la taille d'une mention discrète, le
           * logo n'était plus qu'une tache — une signature illisible signe
           * moins bien qu'un mot lisible. Le ratio d'origine (677×369) est
           * conservé pour ne pas l'écraser.
           */
          <img src={logo} alt="" width={230} height={125} style={{ marginTop: 2 }} />
        ) : (
          <div style={{ display: 'flex', marginTop: 14, fontSize: 22, color: '#8b93a7' }}>
            where2spin
          </div>
        )}
      </div>
    ),
    {
      ...size,
      ...(police
        ? { fonts: [{ name: 'Saira Condensed', data: police, weight: 800 as const, style: 'normal' as const }] }
        : {}),
    },
  );
}
