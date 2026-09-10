/**
 * L'état du catalogue, studio par studio.
 *
 * ── À quoi ça sert, et à quoi ça ne sert pas ──────────────────────────────
 *
 * Ce rapport dit ce qui **manque** sur les fiches qu'on a. Il ne dit pas
 * combien de jeux un studio a publié au total : cette information n'est nulle
 * part dans notre base, et l'inventer serait pire que de l'ignorer. La
 * couverture face au catalogue réel d'un studio se mesure sur son site, pas
 * ici.
 *
 * ── Ce que « prêt » veut dire ─────────────────────────────────────────────
 *
 * Une fiche est comptée prête quand elle porte les cinq choses qui font sa
 * valeur : un RTP **de source studio** — pas juste un nombre —, une
 * volatilité, un gain maximum, un visuel et une démo jouable. Le reste
 * (mécaniques, grille, lignes) est présent presque partout et ne discrimine
 * plus rien.
 *
 * Les captures sont comptées à part : c'est le chantier en cours, et c'est
 * ce qui distingue une fiche documentée d'une fiche renseignée.
 *
 * Usage : npx tsx --env-file=.env.local scripts/checklist-catalogue.ts
 */
import { prisma } from '@/lib/donnees/prisma';

interface Ligne {
  studio: string;
  total: number;
  prets: number;
  sansRtpStudio: number;
  sansVolatilite: number;
  sansGainMax: number;
  sansVisuel: number;
  sansDemo: number;
  captures: number;
}

function barre(part: number, total: number, largeur = 12): string {
  const pleins = total === 0 ? 0 : Math.round((part / total) * largeur);
  return '█'.repeat(pleins) + '·'.repeat(largeur - pleins);
}

async function main() {
  const studios = await prisma.studio.findMany({
    select: { id: true, nom: true, slug: true },
    orderBy: { nom: 'asc' },
  });

  const lignes: Ligne[] = [];
  for (const s of studios) {
    const ou = { studioId: s.id };
    const [total, sansRtpStudio, sansVolatilite, sansGainMax, sansVisuel, sansDemo, captures, prets] =
      await Promise.all([
        prisma.jeu.count({ where: ou }),
        prisma.jeu.count({ where: { ...ou, rtpConfiance: { not: 'STUDIO' } } }),
        prisma.jeu.count({ where: { ...ou, volatilite: null } }),
        prisma.jeu.count({ where: { ...ou, gainMaxMultiple: null } }),
        prisma.jeu.count({ where: { ...ou, visuelUrl: null } }),
        prisma.jeu.count({ where: { ...ou, demoUrl: null } }),
        prisma.jeu.count({ where: { ...ou, capturesLe: { not: null } } }),
        prisma.jeu.count({
          where: {
            ...ou,
            rtpConfiance: 'STUDIO',
            volatilite: { not: null },
            gainMaxMultiple: { not: null },
            visuelUrl: { not: null },
            demoUrl: { not: null },
          },
        }),
      ]);
    if (total > 0) {
      lignes.push({ studio: s.nom, total, prets, sansRtpStudio, sansVolatilite, sansGainMax, sansVisuel, sansDemo, captures });
    }
  }

  lignes.sort((a, b) => b.total - a.total);

  const somme = (c: (l: Ligne) => number) => lignes.reduce((t, l) => t + c(l), 0);
  const total = somme((l) => l.total);

  console.log(`\nCATALOGUE — ${total} fiches sur ${lignes.length} studios\n`);
  console.log(
    'studio'.padEnd(20) +
      'fiches'.padStart(7) +
      'prêtes'.padStart(8) +
      '  ' +
      'avancement'.padEnd(14) +
      'sans RTP studio'.padStart(16) +
      'sans vola'.padStart(10) +
      'sans gain'.padStart(10) +
      'sans visuel'.padStart(12) +
      'sans démo'.padStart(10) +
      'captures'.padStart(9),
  );
  console.log('─'.repeat(118));

  for (const l of lignes) {
    console.log(
      l.studio.slice(0, 19).padEnd(20) +
        String(l.total).padStart(7) +
        String(l.prets).padStart(8) +
        '  ' +
        barre(l.prets, l.total).padEnd(14) +
        String(l.sansRtpStudio).padStart(16) +
        String(l.sansVolatilite).padStart(10) +
        String(l.sansGainMax).padStart(10) +
        String(l.sansVisuel).padStart(12) +
        String(l.sansDemo).padStart(10) +
        String(l.captures).padStart(9),
    );
  }

  console.log('─'.repeat(118));
  console.log(
    'TOTAL'.padEnd(20) +
      String(total).padStart(7) +
      String(somme((l) => l.prets)).padStart(8) +
      '  ' +
      barre(somme((l) => l.prets), total).padEnd(14) +
      String(somme((l) => l.sansRtpStudio)).padStart(16) +
      String(somme((l) => l.sansVolatilite)).padStart(10) +
      String(somme((l) => l.sansGainMax)).padStart(10) +
      String(somme((l) => l.sansVisuel)).padStart(12) +
      String(somme((l) => l.sansDemo)).padStart(10) +
      String(somme((l) => l.captures)).padStart(9),
  );

  const traductions = await prisma.traduction.count({ where: { presentation: { not: null } } });
  console.log(`\nTexte éditorial : ${traductions} fiches sur ${total}.`);
  console.log('« Prête » = RTP de source studio + volatilité + gain max + visuel + démo.\n');
}

main().finally(() => prisma.$disconnect());
