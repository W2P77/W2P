import { NextResponse } from 'next/server';
import { prisma } from '@/lib/donnees/prisma';
import { filtrePubliable } from '@/lib/donnees/publiables';

/**
 * Les jeux d'un studio, à la demande.
 *
 * Le catalogue déplie un fournisseur sans changer de page : charger les 707
 * fiches d'avance pour n'en montrer qu'une poignée ferait payer à chaque
 * visiteur une page qu'il ne regardera pas.
 */
export async function GET(_req: Request, contexte: { params: Promise<unknown> }) {
  const { slug } = (await contexte.params) as { slug: string };

  const jeux = await prisma.jeu.findMany({
    where: { studio: { slug }, ...(await filtrePubliable()) },
    orderBy: [{ rtpConfiance: 'asc' }, { nom: 'asc' }],
    select: {
      slug: true, nom: true, rtpStudio: true, rtpConfiance: true,
      volatilite: true, gainMaxMultiple: true, visuelUrl: true,
      studio: { select: { nom: true, slug: true } },
    },
  });

  return NextResponse.json({
    jeux: jeux.map((j) => ({ ...j, rtpStudio: j.rtpStudio ? Number(j.rtpStudio) : null })),
  });
}
