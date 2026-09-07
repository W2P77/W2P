import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/donnees/prisma';
import { nouveauClickId } from '@/lib/tracking/click-id';
import { buildAffiliateRedirectUrl, resolveCasinoPlayUrl } from '@/lib/tracking/url-partenaire';
import { enregistrerClic } from '@/lib/tracking/clics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * La sortie vers un partenaire : le seul endroit où un lead se crée.
 *
 * ── Ce qui se joue ici, et nulle part ailleurs ────────────────────────────
 *
 * Le clic est le seul moment où l'on sait de quel site vient le visiteur. Le
 * postback arrive ensuite sur un déploiement partagé avec BetsRank, qui ne
 * connaît que le clickId. Si le préfixe `w2p-` n'est pas posé ici, l'origine
 * n'existe nulle part — et elle ne se reconstitue pas après coup, les clics
 * expirant à 90 jours quand les conversions sont permanentes.
 */
export async function GET(req: NextRequest, contexte: { params: Promise<unknown> }) {
  const { casino: slug } = (await contexte.params) as { casino: string };

  const casino = await prisma.casino.findUnique({ where: { slug } });
  if (!casino || !casino.actif) {
    return NextResponse.redirect(new URL('/catalogue', req.url), 302);
  }

  const clickId = nouveauClickId();
  const pays = req.headers.get('x-vercel-ip-country');
  const playUrl = resolveCasinoPlayUrl(
    { playUrl: casino.playUrl, playUrlByCountry: undefined },
    pays,
  );

  // Le clic est enregistré avant la redirection, jamais après : une fois le
  // visiteur parti, il n'y a plus de requête pour le faire.
  await enregistrerClic({
    clickId,
    casinoSlug: casino.slug,
    jeu: req.nextUrl.searchParams.get('slot'),
    pays,
    referer: req.headers.get('referer'),
  }).catch(() => {
    // Un enregistrement raté ne doit pas retenir le visiteur : on perd la
    // trace, pas le lead.
  });

  return NextResponse.redirect(buildAffiliateRedirectUrl(playUrl, clickId), 302);
}
