/**
 * Donne une démo jouable aux 355 jeux Red Tiger.
 *
 * ── Ce qui bloque le catalogue ────────────────────────────────────────────
 *
 * Vingt-six jeux Red Tiger sur 355 portent une `demoUrl`, et ces vingt-six
 * pointent la **fiche produit** du studio — une page de présentation, pas un
 * jeu. Les 329 autres n'ont rien du tout. Le pipeline de captures part de la
 * démo : sans elle, aucune de ces fiches n'est publiable. Red Tiger est donc
 * un studio entier absent du site, pour une URL manquante.
 *
 * ── Où se trouve la vraie démo ────────────────────────────────────────────
 *
 * Le bouton « Demo » de la fiche produit ne porte pas de lien : il pousse une
 * route côté client, `/demo/{tableId}`. Le `tableId` (`reactor000000000`) est
 * dans le `__NEXT_DATA__` de la page produit, avec le nom et les dates de
 * sortie du jeu. On lit la page, on prend le `tableId`, on reconstruit la
 * route que le bouton aurait poussée.
 *
 * La route `/demo/{tableId}` est servie en statique : elle répond **200 pour
 * n'importe quelle chaîne**, même inventée. Un code HTTP ne prouve donc rien
 * ici — la seule preuve qu'un jeu existe est son `tableId` lu dans sa propre
 * page produit. C'est pour ça que le script ne construit jamais une URL de
 * démo sans avoir lu la page, et qu'un slug qui répond 404 est un échec
 * rapporté par son nom, pas une démo devinée.
 *
 * ── Les deux slugs qui divergent ──────────────────────────────────────────
 *
 * 353 slugs de la base sur 355 sont exactement ceux du site. Les deux autres
 * (`gonzos-quest-megaways-red-tiger`, `pirates-plenty-the-sunken-treasure`)
 * répondent 404 chez Red Tiger, mais leur `demoUrl` actuelle porte déjà la
 * bonne page produit. D'où la règle : la page déjà en base fait foi, le slug
 * ne sert que quand il n'y a rien.
 *
 * Le nom lu dans la page est confronté à celui de la base : un slug qui mène
 * à un autre jeu écrirait une démo fausse sans que rien ne le signale.
 *
 * ── La cadence n'est pas une précaution de style ──────────────────────────
 *
 * Red Tiger est un partenaire, pas une cible. Quatre requêtes en parallèle
 * avec une pause : le lot passe en deux minutes, ce qui est sans importance
 * pour une opération qu'on ne refera pas. Se faire bloquer l'IP coûterait
 * l'accès aux démos, c'est-à-dire tout le chantier de captures.
 *
 * Usage : npx tsx --env-file=.env.local scripts/extraire-demos-red-tiger.ts [--appliquer] [--limite N]
 */
import { basename } from 'node:path';

const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PARALLELE = 4;
const PAUSE_MS = 250;

/**
 * Pour confronter deux noms sans buter sur la typographie.
 *
 * L'esperluette est le seul écart qui compte : le site écrit « Cake & Ice
 * Cream » là où la base écrit « Cake and Ice Cream », et le slug des deux
 * côtés est `cake-and-ice-cream`. Sans cette équivalence, quatre jeux
 * parfaitement identifiés ressortaient en écart de nom.
 */
const normaliserNom = (nom: string) =>
  nom.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export type FicheProduit = {
  tableId: string;
  nom: string;
  /** Dates de sortie : une démo annoncée pour plus tard n'est pas encore jouable. */
  demoReleaseDate: string | null;
  exclusiveReleaseDate: string | null;
};

/** La seule branche du `__NEXT_DATA__` qui nous intéresse. */
type PayloadNext = {
  props?: {
    pageProps?: {
      initialState?: {
        cmsApi?: {
          queries?: Record<
            string,
            {
              data?: {
                tableId?: string;
                name?: string;
                demoReleaseDate?: string | null;
                exclusiveReleaseDate?: string | null;
              };
            }
          >;
        };
      };
    };
  };
};

/**
 * Les données du jeu, lues dans le `__NEXT_DATA__` de la fiche produit.
 *
 * On passe par la requête `getPopulatedGameBySlugV2` plutôt que par un regex
 * sur `tableId` : la page embarque aussi des carrousels de jeux voisins, et
 * un regex y attraperait le `tableId` du premier venu.
 */
export function lireFicheProduit(html: string): FicheProduit | null {
  const bloc = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!bloc) return null;

  let donnees: PayloadNext;
  try {
    donnees = JSON.parse(bloc[1]) as PayloadNext;
  } catch {
    return null;
  }

  const requetes = donnees?.props?.pageProps?.initialState?.cmsApi?.queries ?? {};
  const cle = Object.keys(requetes).find((k) => k.startsWith('getPopulatedGameBySlugV2'));
  const jeu = cle ? requetes[cle]?.data : null;
  if (!jeu?.tableId || !jeu?.name) return null;

  return {
    tableId: jeu.tableId,
    nom: jeu.name,
    demoReleaseDate: jeu.demoReleaseDate ?? null,
    exclusiveReleaseDate: jeu.exclusiveReleaseDate ?? null,
  };
}

/** La route que le bouton « Demo » de la fiche produit aurait poussée. */
export const urlDemo = (tableId: string) =>
  `https://redtiger.com/demo/${tableId}?showNavbar=true`;

async function main() {
  const appliquer = process.argv.includes('--appliquer');
  const iL = process.argv.indexOf('--limite');
  const limite = iL >= 0 ? Number(process.argv[iL + 1]) : Infinity;

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  /*
   * Le filtre laisse volontairement passer les fiches déjà converties : une
   * `demoUrl` en `/demo/` n'est ni nulle ni une page produit, donc un second
   * passage du script ne la relit pas et ne la réécrit pas.
   */
  const jeux = (
    await prisma.jeu.findMany({
      where: {
        studio: { slug: 'red-tiger' },
        OR: [{ demoUrl: { contains: 'redtiger.com/games/' } }, { demoUrl: null }],
      },
      select: { id: true, slug: true, nom: true, demoUrl: true },
      orderBy: { slug: 'asc' },
    })
  ).slice(0, limite);

  /** La page produit : celle déjà en base, ou celle que le slug désigne. */
  const pageProduit = (j: { slug: string; demoUrl: string | null }) =>
    j.demoUrl ?? `https://redtiger.com/games/${j.slug}`;

  const sansDemo = jeux.filter((j) => !j.demoUrl).length;
  console.log(
    `${jeux.length} fiches produit Red Tiger à lire` +
      (sansDemo ? ` — dont ${sansDemo} sans demoUrl, page déduite du slug.` : '.') +
      '\n',
  );

  const maintenant = Date.now();
  const trouves: Array<{ id: string; slug: string; demo: string; tableId: string }> = [];
  const echecs: string[] = [];

  for (let i = 0; i < jeux.length; i += PARALLELE) {
    await Promise.all(
      jeux.slice(i, i + PARALLELE).map(async (j) => {
        try {
          const r = await fetch(pageProduit(j), { headers: { 'User-Agent': NAVIGATEUR } });
          if (!r.ok) return echecs.push(`${j.slug} (HTTP ${r.status})`);

          const fiche = lireFicheProduit(await r.text());
          if (!fiche) return echecs.push(`${j.slug} (pas de tableId dans la page)`);

          if (normaliserNom(fiche.nom) !== normaliserNom(j.nom)) {
            return echecs.push(`${j.slug} (la page annonce « ${fiche.nom} »)`);
          }

          /*
           * Red Tiger publie la fiche produit avant d'ouvrir la démo. Écrire
           * l'URL quand même donnerait un bouton qui répond « Demo is not
           * available yet » : mieux vaut l'échec, le jeu repassera au lot
           * suivant une fois la date atteinte.
           */
          const attente = [fiche.demoReleaseDate, fiche.exclusiveReleaseDate].find(
            (d) => d && Date.parse(d) > maintenant,
          );
          if (attente) return echecs.push(`${j.slug} (démo ouverte le ${attente.slice(0, 10)})`);

          trouves.push({ id: j.id, slug: j.slug, demo: urlDemo(fiche.tableId), tableId: fiche.tableId });
        } catch (e) {
          echecs.push(`${j.slug} (${e instanceof Error ? e.message.slice(0, 40) : 'erreur'})`);
        }
      }),
    );
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    if ((i / PARALLELE) % 20 === 0) process.stdout.write(`  ${i + PARALLELE}/${jeux.length}\r`);
  }

  console.log(`\n${trouves.length} démos trouvées, ${echecs.length} échecs.`);
  for (const t of trouves.slice(0, 4)) console.log(`  ${t.slug.padEnd(38)} ${t.demo}`);
  for (const e of echecs) console.log(`  ! ${e}`);

  if (!appliquer) {
    console.log('\nSIMULATION — rien n’a été écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  for (let i = 0; i < trouves.length; i += 25) {
    await Promise.all(
      trouves.slice(i, i + 25).map((t) =>
        prisma.jeu.update({ where: { id: t.id }, data: { demoUrl: t.demo } }),
      ),
    );
  }
  const jouables = await prisma.jeu.count({
    where: { studio: { slug: 'red-tiger' }, demoUrl: { contains: '/demo/' } },
  });
  console.log(`\n${trouves.length} URLs écrites. ${jouables} jeux Red Tiger ont une démo jouable.`);
  await prisma.$disconnect();
}

/*
 * Le script ne s'exécute que lancé directement.
 *
 * `lireFicheProduit` est exportée et réutilisable ; sans cette garde,
 * l'importer depuis un autre script déclencherait une campagne complète de
 * 355 requêtes chez un partenaire, en arrière-plan.
 */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
