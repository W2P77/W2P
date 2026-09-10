import { ImageResponse } from 'next/og';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { jeuParSlug } from '@/lib/donnees/catalogue';

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
function fondBase64(chemin: string | null): string | null {
  if (!chemin) return null;
  const fichier = join(process.cwd(), 'public', chemin);
  if (!existsSync(fichier)) return null;
  const ext = chemin.endsWith('.png') ? 'png' : chemin.endsWith('.jpg') ? 'jpeg' : 'webp';
  return `data:image/${ext};base64,${readFileSync(fichier).toString('base64')}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ studio: string; slug: string }>;
}) {
  const { slug } = await params;
  const jeu = await jeuParSlug(slug);

  const visuel = fondBase64(jeu?.visuelUrl ?? null);
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={visuel}
            alt=""
            width={760}
            height={427}
            style={{ borderRadius: 18, objectFit: 'cover' }}
          />
        ) : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginTop: visuel ? 34 : 0,
          }}
        >
          <div style={{ display: 'flex', fontSize: 46, fontWeight: 800, color: '#ffffff' }}>
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
        <div style={{ display: 'flex', marginTop: 14, fontSize: 22, color: '#8b93a7' }}>
          where2spin
        </div>
      </div>
    ),
    size,
  );
}
