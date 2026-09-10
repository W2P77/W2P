/**
 * Confronte notre catalogue à celui que le studio publie.
 *
 * ── Ce que ce script apporte, et que la checklist ne pouvait pas dire ─────
 *
 * `checklist-catalogue.ts` dit ce qui manque **sur les fiches qu'on a**. Il ne
 * peut rien dire des jeux qu'on n'a pas : l'information n'est pas dans notre
 * base. Celui-ci va la chercher là où elle fait autorité — le site du studio —
 * et rend les trois nombres qui comptent : ce qu'ils publient, ce qu'on a, ce
 * qui manque.
 *
 * ── Les fiches créées sont volontairement muettes ─────────────────────────
 *
 * Une fiche créée ici ne porte qu'un slug, un nom déduit de l'URL et son
 * studio. Aucun RTP, aucune volatilité : **on ne sait rien de ce jeu**, et le
 * seul fait honnête dont on dispose est qu'il existe. Inventer le reste serait
 * exactement ce que le site reproche aux agrégateurs.
 *
 * Ces fiches sortent donc de l'index et du sitemap tant qu'elles n'ont pas de
 * RTP — la règle est dans `estPublieable()`, et elle se lève toute seule dès
 * qu'une fiche est renseignée. Sans ce garde-fou, on déclarerait à Google des
 * centaines de pages vides d'un coup, ce qui abîmerait celles qui sont bonnes.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/inventorier-studios.ts
 *   npx tsx --env-file=.env.local scripts/inventorier-studios.ts --appliquer
 *   npx tsx --env-file=.env.local scripts/inventorier-studios.ts --studio bgaming
 */
import { prisma } from '@/lib/donnees/prisma';
import { SOURCES, slugDepuisUrl } from '@/lib/inventaire/sources';

const APPLIQUER = process.argv.includes('--appliquer');
const iS = process.argv.indexOf('--studio');
const SEUL = iS >= 0 ? process.argv[iS + 1] : null;

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function recuperer(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'user-agent': NAVIGATEUR } });
  if (!r.ok) throw new Error(`${r.status} sur ${url}`);
  return r.text();
}

/** Un nom lisible depuis le slug, en attendant mieux que « mieux » soit lu. */
function nomDepuisSlug(slug: string): string {
  return slug
    .split('-')
    .map((mot) => (mot.length <= 2 ? mot : mot[0].toUpperCase() + mot.slice(1)))
    .join(' ');
}

async function main() {
  const sources = SEUL ? SOURCES.filter((s) => s.studio === SEUL) : SOURCES;
  if (!sources.length) {
    console.log(`Aucune source pour « ${SEUL} ». Connus : ${SOURCES.map((s) => s.studio).join(', ')}`);
    return;
  }

  console.log(
    '\n' +
      'studio'.padEnd(18) +
      'publiés'.padStart(9) +
      'chez nous'.padStart(11) +
      'manquants'.padStart(11) +
      'chez nous seulement'.padStart(21),
  );
  console.log('─'.repeat(70));

  let creees = 0;
  const collisions: string[] = [];
  for (const source of sources) {
    const studio = await prisma.studio.findUnique({ where: { slug: source.studio } });
    if (!studio) {
      console.log(`${source.studio.padEnd(18)}  studio absent de la base`);
      continue;
    }

    let urls: string[];
    try {
      urls = await source.lister(recuperer);
    } catch (e) {
      console.log(`${source.studio.padEnd(18)}  ${e instanceof Error ? e.message : 'échec'}`);
      continue;
    }

    const chezEux = new Map(urls.map((u) => [slugDepuisUrl(u), u]));
    const nos = await prisma.jeu.findMany({ where: { studioId: studio.id }, select: { slug: true } });
    const chezNous = new Set(nos.map((j) => j.slug));

    const manquants = [...chezEux.keys()].filter((s) => !chezNous.has(s));
    const orphelins = [...chezNous].filter((s) => !chezEux.has(s));

    console.log(
      source.studio.padEnd(18) +
        String(chezEux.size).padStart(9) +
        String(chezNous.size).padStart(11) +
        String(manquants.length).padStart(11) +
        String(orphelins.length).padStart(21),
    );

    if (APPLIQUER && manquants.length) {
      /*
       * `Jeu.slug` est unique **globalement**, pas par studio. Deux éditeurs
       * qui publient un jeu du même nom entrent donc en collision — et c'est
       * fréquent, les titres se ressemblent d'un catalogue à l'autre.
       *
       * On ne crée pas, on ne renomme pas d'office : un slug pris est une
       * question à trancher (est-ce le même jeu porté par deux studios, ou
       * deux jeux homonymes ?), pas un incident à contourner en silence.
       */
      const pris = await prisma.jeu.findMany({
        where: { slug: { in: manquants } },
        select: { slug: true, studio: { select: { slug: true } } },
      });
      const dejaPris = new Map(pris.map((j) => [j.slug, j.studio.slug]));

      for (const slug of manquants) {
        if (dejaPris.has(slug)) {
          collisions.push(`${source.studio}/${slug} — slug déjà pris par ${dejaPris.get(slug)}`);
          continue;
        }
        await prisma.jeu.create({
          data: { slug, nom: nomDepuisSlug(slug), studioId: studio.id },
        });
        creees += 1;
      }
    }
  }

  console.log('─'.repeat(70));
  if (APPLIQUER) {
    console.log(`\n${creees} fiches créées, sans aucune donnée inventée.`);
    if (collisions.length) {
      console.log(`\n${collisions.length} slugs déjà pris par un autre studio, non créés :`);
      for (const c of collisions.slice(0, 20)) console.log(`  ${c}`);
      if (collisions.length > 20) console.log(`  … et ${collisions.length - 20} autres.`);
    }
    console.log('Elles restent hors index et hors sitemap tant qu\'elles n\'ont pas de RTP.');
  } else {
    console.log('\nSIMULATION — rien n\'a été écrit. Ajouter --appliquer.');
  }
  console.log(
    '\n« chez nous seulement » : jeux que le studio ne liste plus (retirés de son',
    'site) ou dont le slug diverge du sien. À regarder, jamais à supprimer d\'office.\n',
  );
}

main().finally(() => prisma.$disconnect());
